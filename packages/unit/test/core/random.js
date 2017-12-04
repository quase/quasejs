import Runner from "../../src/core/runner";
import assert from "../../../assert";

describe( "unit", () => {

  it( "random - with seed", () => {

    const runner = Runner.init( { random: "0x5F379806" } );
    const t = runner.test;

    assert.strictEqual( runner.randomizer.hex, "0x5F379806" );

    const actual = [];
    const expected = [
      "before",
      "beforeEach",
      "test 3",
      "afterEach",
      "beforeEach",
      "test 1",
      "afterEach",
      "beforeEach",
      "test 2",
      "afterEach",
      "after"
    ];

    t.before( () => {
      actual.push( "before" );
    } );

    t.after( () => {
      actual.push( "after" );
    } );

    t.beforeEach( () => {
      actual.push( "beforeEach" );
    } );

    t( () => {
      actual.push( "test 1" );
    } );

    t( () => {
      actual.push( "test 2" );
    } );

    t( () => {
      actual.push( "test 3" );
    } );

    t.afterEach( () => {
      actual.push( "afterEach" );
    } );

    return runner.run().then( () => {
      assert.deepEqual( actual, expected );
    } );

  } );

  it( "random - disallow randomization inside group", () => {

    const runner = Runner.init( { random: "0x5F379806" } );
    const t = runner.test;

    assert.strictEqual( runner.randomizer.hex, "0x5F379806" );

    const actual = [];
    const expected = [
      "before",
      "beforeEach",
      "test 1",
      "afterEach",
      "beforeEach",
      "test 2",
      "afterEach",
      "beforeEach",
      "test 3",
      "afterEach",
      "after"
    ];

    t.group( group => {

      assert.strictEqual( group.allowRandomization(), true );
      group.allowRandomization( false );
      assert.strictEqual( group.allowRandomization(), false );

      t.before( () => {
        actual.push( "before" );
      } );

      t.after( () => {
        actual.push( "after" );
      } );

      t.beforeEach( () => {
        actual.push( "beforeEach" );
      } );

      t( () => {
        actual.push( "test 1" );
      } );

      t( () => {
        actual.push( "test 2" );
      } );

      t( () => {
        actual.push( "test 3" );
      } );

      t.afterEach( () => {
        actual.push( "afterEach" );
      } );

    } );

    return runner.run().then( () => {
      assert.deepEqual( actual, expected );
    } );

  } );

} );
