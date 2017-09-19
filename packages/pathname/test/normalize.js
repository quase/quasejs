import pathname from "../src";
import assert from "../../assert";

it( "normalize", () => {

  /* eslint no-multi-spaces: 0 */
  /* eslint comma-spacing: [0] */

  [
    [ ""               , "." ],
    [ "../../../1"     , "../../../1" ],
    [ "../1"           , "../1" ],
    [ "./././1"        , "1" ],
    [ "./1"            , "1" ],
    [ "/../../../1"    , "/1" ],
    [ "/../1"          , "/1"  ],
    [ "/./././1"       , "/1" ],
    [ "/./1"           , "/1" ],
    [ "../../../1/2/3" , "../../../1/2/3" ],
    [ "../1/2/3"       , "../1/2/3" ],
    [ "./././1/2/3"    , "1/2/3" ],
    [ "./1/2/3"        , "1/2/3" ],
    [ "/../../../1/2/3", "/1/2/3" ],
    [ "..///../..///1/2/3" , "../../../1/2/3" ],
    [ "../1/2///3"       , "../1/2/3" ],
    [ "./././//1/2/3"    , "1/2/3" ],
    [ "./1///2/3"        , "1/2/3" ],
    [ "/../../../1/2/3", "/1/2/3" ],
    [ "/../1/2/3"      , "/1/2/3" ],
    [ "/./././1/2/3"   , "/1/2/3" ],
    [ "/./1/2/3"       , "/1/2/3" ],
    [ ".././.././1"    , "../../1" ],
    [ ".././.././1/.." , "../.." ],
    [ ".././.././1/."  , "../../1" ],
    [ "/.././.././1"    , "/1" ],
    [ "/.././.././1/.." , "/" ],
    [ "/.././.././1/."  , "/1" ]
  ].forEach( t => {
    assert.strictEqual( pathname.normalize( t[ 0 ] ), t[ 1 ] );
    assert.strictEqual( pathname.normalize( t[ 0 ].replace( /\//g, "\\" ) ), t[ 1 ] );
  } );

  assert.strictEqual( pathname.normalize( "/foo/bar//baz/asdf/quux/.." ), "/foo/bar/baz/asdf" );
  assert.strictEqual( pathname.normalize( "///..//./foo/.//bar" ), "/foo/bar" );

  assert.throws( pathname.normalize.bind( null, {} ), TypeError );
  assert.throws( pathname.normalize.bind( null, {} ), TypeError ); // Repeat test because of cache

} );
