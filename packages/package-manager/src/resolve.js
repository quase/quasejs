// @flow
import type { Name, Version, Resolved, Integrity, ResolvedObj, Options } from "./types";
import { toStr } from "./types";
import pacoteOptions from "./pacote-options";

const npa = require( "npm-package-arg" );
const pacote = require( "pacote" );
const filenamify = require( "filenamify" );

const reSha = /^sha\d+-/;

// Because of case insensitive OS's
function lowerCaseIntegrity( integrity: Integrity ): string {
  const integrityStr = toStr( integrity );
  const prefix = ( integrityStr.match( reSha ) || [ "" ] )[ 0 ];
  return prefix + Buffer.from( integrityStr.substring( prefix.length ), "base64" ).toString( "hex" );
}

export function buildId( resolved: Resolved, integrity: Integrity ): string {
  return filenamify( resolved ) + "/" + lowerCaseIntegrity( integrity );
}

export default async function( name: Name, version: Version, opts: Options ): Promise<ResolvedObj> {

  if ( !name ) {
    throw new Error( "Missing name" );
  }

  if ( !version ) {
    throw new Error( `Missing version for name '${toStr( name )}'` );
  }

  const spec = npa.resolve( name, version );

  const pkg = await pacote.manifest( spec, pacoteOptions( opts ) );

  if ( pkg.name !== spec.name ) {
    throw new Error( `Name '${toStr( name )}' does not match the name in the manifest: ${pkg.name} (version: ${pkg.version})` );
  }

  return {
    name: pkg.name,
    version: pkg.version,
    resolved: pkg._resolved,
    integrity: pkg._integrity + "",
    deps: pkg.dependencies
  };
}
