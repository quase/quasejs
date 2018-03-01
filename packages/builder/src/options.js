import JsLanguage from "./languages/js";
import HtmlLanguage from "./languages/html";
import Language from "./language";
import Reporter from "./reporter";
import { check } from "./checker";
import { getType, resolvePath } from "./id";

const { ValidationError } = require( "@quase/config" );
const { getPlugins, getOnePlugin } = require( "@quase/get-plugins" );
const fs = require( "fs-extra" );
const path = require( "path" );

function defaultPlugin() {
  return {
    name: "quase_builder_internal_plugin",
    async load( path, builder ) {
      return {
        type: getType( path ),
        data: await builder.fileSystem.readFile( path, path )
      };
    },
    getLanguage( module, builder ) {
      if ( module.type === "js" ) {
        return new JsLanguage( {}, module, builder );
      }
      if ( module.type === "html" ) {
        return new HtmlLanguage( {}, module, builder );
      }
      return new Language( {}, module, builder );
    },
    async resolve( importee, importerModule, builder ) {
      return importerModule.lang.resolve( importee, importerModule.path, builder );
    },
    isSplitPoint( required, module ) {
      return required.type !== module.type;
    },
    checker: check
  };
}

export default function( _opts ) {

  const options = Object.assign( {}, _opts );

  if ( !Array.isArray( options.entries ) || options.entries.length === 0 ) {
    throw new ValidationError( "Missing entries." );
  }

  if ( typeof options.context !== "string" ) {
    throw new ValidationError( "Missing context option." );
  }

  if ( typeof options.dest !== "string" ) {
    throw new ValidationError( "Missing dest option." );
  }

  options.cwd = typeof options.cwd === "string" ? path.resolve( options.cwd ) : process.cwd();
  options.context = resolvePath( options.context, options.cwd );
  options.dest = resolvePath( options.dest, options.cwd );

  options.publicPath = ( options.publicPath || "/" ).replace( /\/+$/, "" ) + "/";

  options.fs = options.fs || fs;

  options.sourceMaps = options.sourceMaps === "inline" ? options.sourceMaps : !!options.sourceMaps;
  options.hashing = !!options.hashing;
  options.warn = options.warn || ( () => {} );

  options.cli = options.cli || {};

  options.watch = !!options.watch;
  options.watchOptions = Object.assign( {}, options.watchOptions );

  options.reporter = getOnePlugin( options.reporter || Reporter );

  options.plugins = getPlugins( options.plugins || [] );
  options.plugins.push( { plugin: defaultPlugin } );
  options.plugins.forEach( ( { plugin, name } ) => {
    if ( typeof plugin !== "function" ) {
      throw new ValidationError( `Expected plugin ${name ? name + " " : ""}to be a function` );
    }
  } );

  options.performance = Object.assign( {
    hints: "warning",
    maxEntrypointSize: 250000,
    maxAssetSize: 250000,
    assetFilter( f ) {
      return !( /\.map$/.test( f ) );
    }
  }, options.performance );

  if ( options.performance.hints === true ) {
    options.performance.hints = "warning";
  }

  options.serviceWorker = Object.assign( {
    staticFileGlobs: [],
    stripPrefixMulti: {}
  }, options.serviceWorker );

  options.cleanBeforeBuild = !!options.cleanBeforeBuild;

  return options;
}
