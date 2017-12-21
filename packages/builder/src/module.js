// @flow

import error from "./utils/error";
import { hashName } from "./utils/hash";
import type Builder from "./builder";
import type { Result, Loc, Deps, Transformer } from "./types";
import { type ID, getType, resolvePath, depsSorter } from "./id";

const { joinSourceMaps } = require( "@quase/source-map" );

function isObject( obj ) {
  return obj != null && typeof obj === "object";
}

function handleLoaderOutput( obj: any, module: Module ): ?Result { // eslint-disable-line no-use-before-define
  if ( obj == null ) {
    return;
  }
  if ( isObject( obj ) ) {
    return obj;
  }
  throw module.moduleError( "Plugin should return an object." );
}

async function callChain(
  array: Transformer[],
  module: Module, // eslint-disable-line no-use-before-define
  init: Result
): Promise<Result[]> {
  const outputs: Result[] = [];
  let prev = init;
  for ( const fn of array ) {
    const out = handleLoaderOutput( await fn( prev, module.id, module.builder ), module ); // eslint-disable-line no-await-in-loop
    if ( out ) {
      outputs.push( out );
      prev = Object.assign( {}, out );
    }
  }
  return outputs;
}

// Note: don't save references for other modules in a module. That can break incremental builds.

export default class Module {

  +id: ID;
  +normalizedId: string;
  +hashId: string;
  +dest: string;
  +isEntry: boolean;
  +builder: Builder;
  +sourceToResolved: Map<string, { resolved: ID, src: string, loc: ?Object, splitPoint: ?boolean, async: ?boolean }>;
  loadingCode: ?Promise<string>;
  code: ?string;
  loadingOutputs: ?Promise<Result[]>;
  outputs: ?( Result[] );
  loadingDeps: ?Promise<Deps>;
  deps: ?Deps;
  initialLoad: boolean;

  constructor( id: ID, isEntry: boolean, builder: Builder ) {
    this.id = id;
    this.normalizedId = builder.idToString( id, builder.context );
    this.hashId = hashName( this.normalizedId, builder.idHashes );
    this.dest = resolvePath( this.normalizedId, builder.dest );
    this.isEntry = isEntry;
    this.builder = builder;
    this.sourceToResolved = new Map();

    this.loadingCode = null;
    this.code = null;

    this.loadingOutputs = null;
    this.outputs = null;

    this.loadingDeps = null;
    this.deps = null;

    this.initialLoad = false;
  }

  clone( builder: Builder ): Module {
    const m = new Module( this.id, this.isEntry, builder );
    m.loadingCode = this.loadingCode;
    m.code = this.code;
    m.loadingOutputs = this.loadingOutputs;
    m.outputs = this.outputs;
    return m;
  }

  moduleError( message: string ) {
    throw new Error( `${message}. Module: ${this.normalizedId}` );
  }

  getMaps(): Object {
    // $FlowFixMe
    return this.outputs.map( o => o.map ).filter( Boolean );
  }

  error( message: string, loc: ?Loc ) {
    error( message, {
      id: this.builder.idToString( this.id, this.builder.context ),
      code: this.code,
      map: joinSourceMaps( this.getMaps() )
    }, loc );
  }

  async _getFile() {
    try {
      return await this.builder.fileSystem.getFile( this.id );
    } catch ( err ) {
      if ( err.code === "ENOENT" ) {
        throw new Error( `Could not find ${this.normalizedId}` );
      }
      throw err;
    }
  }

  // TODO use buffer
  async getCode(): Promise<string> {
    if ( this.code == null ) {
      this.code = await ( this.loadingCode || ( this.loadingCode = this._getFile() ) );
      this.loadingCode = null;
    }
    return this.code;
  }

  async _runLoader(): Promise<Result[]> {
    const code = await this.getCode();
    return callChain( this.builder.transformers, this, { code, type: getType( this.id ) } );
  }

  async runLoader(): Promise<Result[]> {
    if ( this.outputs == null ) {
      this.outputs = await ( this.loadingOutputs || ( this.loadingOutputs = this._runLoader() ) );
      this.loadingOutputs = null;
    }
    return this.outputs;
  }

  getLastOutput( key: string ) {
    if ( !this.outputs ) {
      return;
    }
    const out = this.outputs[ this.outputs.length - 1 ];
    return out && key ? out[ key ] : out;
  }

  async runResolvers( obj: { type: string, src: string, loc: ?Object, splitPoint: ?boolean, async: ?boolean } ): Promise<string | ?false> {
    for ( const fn of this.builder.resolvers ) {
      const r = await fn( obj, this.id, this.builder );
      if ( r != null ) {
        return r;
      }
    }
  }

  async _runDepsExtracter(): Promise<Deps> {
    const output = ( await this.runLoader() ).find( o => Array.isArray( o.deps ) );
    if ( !output || !output.deps ) {
      return [];
    }

    const deps = Promise.all( output.deps.map( async( { src, loc, splitPoint, async } ) => {
      if ( !src ) {
        throw this.error( "Empty import", loc );
      }

      const r = await this.runResolvers( { type: output.type, src, loc, splitPoint, async } );
      if ( !r ) {
        throw this.error( `Could not resolve ${src}`, loc );
      }

      const resolved = this.builder.resolveId( r );

      if ( resolved === this.id ) {
        throw this.error( "A module cannot import itself", loc );
      }

      if ( this.builder.isDest( resolved ) ) {
        throw this.error( "Don't import the destination file", loc );
      }

      const obj = { resolved, src, loc, splitPoint, async };
      this.sourceToResolved.set( src, obj );
      return obj;
    } ) );

    return ( await deps ).sort( depsSorter );
  }

  async runDepsExtracter(): Promise<Deps> {
    if ( this.deps == null ) {
      this.deps = await ( this.loadingDeps || ( this.loadingDeps = this._runDepsExtracter() ) );
      this.loadingDeps = null;
    }
    return this.deps;
  }

  async saveDeps() {
    if ( this.initialLoad ) {
      return;
    }
    this.initialLoad = true;

    const deps = await this.runDepsExtracter();
    for ( const { resolved } of deps ) {
      this.builder.addModule( resolved );
    }
  }

  getDeps() {
    return ( this.deps || [] ).map( ( { resolved, src, splitPoint, async } ) => ( {
      src,
      splitPoint,
      async,
      required: this.builder.getModule( resolved )
    } ) );
  }

}
