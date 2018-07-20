// @flow
import type Runner from "./runner";
import skipReasons from "./skip-reasons";
import type { Status, IRunReturn, GenericRunnable, IRunnableResult, ITestResult, IRunnable, ITest, TestMetadata } from "./types";
import type { Runnable } from "./test";
import type { ContextRef } from "./context";

class ProxyImpl<R: IRunnableResult, T: GenericRunnable<R>> implements GenericRunnable<R> {
  test: T;
  seq: SequenceImpl<R, T>;
  proxyFn: ( ContextRef, T, SequenceImpl<R, T> ) => IRunReturn<R>;
  constructor( test: T, seq: SequenceImpl<R, T>, proxyFn: ( ContextRef, T, SequenceImpl<R, T> ) => IRunReturn<R> ) {
    this.test = test;
    this.seq = seq;
    this.proxyFn = proxyFn;

    const _this: any = this;
    _this.run = this.run.bind( this );
  }
  run( context: ContextRef ) {
    return this.proxyFn( context, this.test, this.seq );
  }
  runSkip( skipReason: ?string ) {
    return this.test.runSkip( skipReason );
  }
  runTodo() {
    return this.test.runTodo();
  }
}

class Proxy extends ProxyImpl<IRunnableResult, IRunnable> implements IRunnable {}

class ClonableProxy extends ProxyImpl<ITestResult, ITest> implements ITest {
  clone(): ClonableProxy {
    return new ClonableProxy( this.test.clone(), this.seq, this.proxyFn );
  }
}

class SequenceImpl<R: IRunnableResult, T: GenericRunnable<R>> implements IRunnableResult, GenericRunnable<R> {

  tests: Array<T>;
  runner: Runner;
  isConcurrent: boolean;
  level: number;
  failedBecauseOfHook: ?{ level: number };
  skipReason: ?string;
  status: Status;
  failTest: boolean;
  skipTest: boolean;
  bailTestBecauseOfHook: boolean;

  constructor( runner: Runner, isConcurrent: boolean, level: number ) {
    this.tests = [];
    this.runner = runner;
    this.isConcurrent = isConcurrent;
    this.level = level;
    this.failedBecauseOfHook = null;
    this.skipReason = undefined;
    this.status = undefined;
    this.failTest = false;
    this.skipTest = false;
    this.bailTestBecauseOfHook = false;

    const _this: any = this;
    _this.addResult = this.addResult.bind( this );
    _this.getResult = this.getResult.bind( this );
    _this.run = this.run.bind( this );
  }

  shouldBail(): boolean {
    return this.runner.shouldBail();
  }

  // $FlowIgnore
  getResult(): SequenceImpl<R, T> {
    this.status = this.failTest ? "failed" : this.skipTest ? "skipped" : "passed";
    if ( this.failTest ) {
      this.skipReason = undefined;
    }
    return this;
  }

  runSkip( reason: ?string ) {
    const tests = this.tests;
    this.skipReason = reason;
    for ( let i = 0; i < tests.length; i++ ) {
      this.addResult( tests[ i ].runSkip( reason ) );
    }
    return this.getResult();
  }

  runTodo() {
    const tests = this.tests;
    for ( let i = 0; i < tests.length; i++ ) {
      this.addResult( tests[ i ].runTodo() );
    }
    return this.getResult();
  }

  run( context: ContextRef ) {

    const tests = this.tests;

    for ( let i = 0; i < tests.length; i++ ) {

      let result = tests[ i ].run( context );

      if ( result instanceof Promise ) {

        if ( this.isConcurrent ) {

          let promises = [ result.then( this.addResult ) ];

          for ( let j = i + 1; j < tests.length; j++ ) {

            result = tests[ j ].run( context );

            if ( result instanceof Promise ) {
              promises.push( result.then( this.addResult ) );
            } else {
              this.addResult( result );
            }

          }

          return Promise.all( promises ).then( this.getResult );
        }

        result = result.then( this.addResult );

        for ( let j = i + 1; j < tests.length; j++ ) {
          result = result.then( () => tests[ j ].run( context ) ).then( this.addResult );
        }

        return result.then( this.getResult );

      }

      this.addResult( result );

    }

    return this.getResult();
  }

  updateFailedBecauseOfHook( result: R ) {
    if ( result.failedBecauseOfHook ) {
      if ( result.failedBecauseOfHook.level <= this.level ) {
        this.bailTestBecauseOfHook = true;
      }
      const failedBecauseOfHook = this.failedBecauseOfHook;
      if ( failedBecauseOfHook ) {
        failedBecauseOfHook.level = Math.min( failedBecauseOfHook.level, result.failedBecauseOfHook.level );
      } else {
        this.failedBecauseOfHook = { level: result.failedBecauseOfHook.level };
      }
    }
  }

  addResult( result: R ) { // eslint-disable-line
    throw new Error( "Abstract" );
  }

}

export class Sequence extends SequenceImpl<IRunnableResult, IRunnable> implements IRunnableResult, IRunnable {

  static proxy( context: ContextRef, t: IRunnable, seq: SequenceImpl<IRunnableResult, IRunnable> ) {
    if ( seq.bailTestBecauseOfHook ) {
      return t.runSkip( skipReasons.hookFailed );
    }
    if ( seq.shouldBail() ) {
      return t.runSkip( skipReasons.bailed );
    }
    return t.run( context.copy() );
  }

  add( t: IRunnable ) {
    this.tests.push( new Proxy( t, this, Sequence.proxy ) );
  }

  addResult( result: IRunnableResult ) {
    if ( result.status === "failed" ) {
      this.failTest = true;
      this.updateFailedBecauseOfHook( result );
    }
  }

}

export class InTestSequence extends SequenceImpl<ITestResult, ITest> implements ITestResult, ITest {

  slow: boolean;
  metadata: TestMetadata;
  errors: Object[];
  assertions: Object[];
  logs: string[];
  runtime: number;
  middleRunnable: Runnable;
  middleRunnableProxy: ClonableProxy;

  constructor( level: number, metadata: TestMetadata, middleRunnable: Runnable ) {
    super( false, false, level );
    this.errors = [];
    this.assertions = [];
    this.logs = [];
    this.status = undefined;
    this.runtime = 0;
    this.metadata = metadata;
    this.slow = false;
    this.middleRunnable = middleRunnable;
    this.middleRunnableProxy = new ClonableProxy( middleRunnable, this, InTestSequence.proxy );
  }

  static proxy( context: ContextRef, t: ITest, seq: SequenceImpl<ITestResult, ITest> ) {
    if ( seq.bailTestBecauseOfHook ) {
      return t.runSkip( skipReasons.hookFailed );
    }
    if ( seq.skipTest ) {
      return t.runSkip( seq.skipReason );
    }
    return t.run( context );
  }

  clone() {
    const seq = new InTestSequence( this.level, this.metadata, this.middleRunnable.clone() );
    this.tests.forEach( t => {
      if ( t === this.middleRunnableProxy ) {
        seq.pushMiddle();
      } else {
        seq.add( t.clone() );
      }
    } );
    return seq;
  }

  add( t: ITest ) {
    this.tests.push( t );
  }

  pushMiddle() {
    this.tests.push( this.middleRunnableProxy );
  }

  addResult( result: ITestResult ) {

    const metadata = result.metadata || {};

    if ( result.status === "failed" ) {
      this.failTest = true;
      this.updateFailedBecauseOfHook( result );
    } else if ( result.status === "skipped" && metadata.status !== "skipped" && metadata.type !== "afterEach" ) {
      this.skipTest = true;
      if ( !this.skipReason ) {
        this.skipReason = result.skipReason;
      }
    }

    result.errors.forEach( x => this.errors.push( x ) );
    result.assertions.forEach( x => this.assertions.push( x ) );
    result.logs.forEach( x => this.logs.push( x ) );
    this.runtime += result.runtime;

    if ( result.slow ) {
      this.slow = true;
    }

  }

}

export class BeforeTestsAfterSequence extends SequenceImpl<IRunnableResult, IRunnable> implements IRunnableResult, IRunnable {

  constructor( runner: Runner, level: number ) {
    super( runner, false, level );
  }

  static proxy( context: ContextRef, t: IRunnable, seq: SequenceImpl<IRunnableResult, IRunnable> ) {
    if ( seq.bailTestBecauseOfHook ) {
      return t.runSkip( skipReasons.hookFailed );
    }
    if ( seq.shouldBail() ) {
      return t.runSkip( skipReasons.bailed );
    }
    if ( seq.skipTest ) {
      return t.runSkip( seq.skipReason );
    }
    return t.run( context.copy() );
  }

  add( t: IRunnable, inMiddle: ?boolean ) {
    if ( inMiddle ) {
      this.tests.push( new Proxy( t, this, BeforeTestsAfterSequence.proxy ) );
    } else {
      this.tests.push( t );
    }
  }

  addResult( result: IRunnableResult | ITestResult ) {

    const metadata = result.metadata || {};

    if ( result.status === "failed" ) {
      this.failTest = true;
      this.updateFailedBecauseOfHook( result );
    } else if ( result.status === "skipped" && metadata.status !== "skipped" && metadata.type !== "after" ) {
      this.skipTest = true;
      if ( !this.skipReason ) {
        this.skipReason = result.skipReason;
      }
    }

  }

}
