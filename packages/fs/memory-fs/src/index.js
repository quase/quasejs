import { dirname, makeAbsolute } from "./util";
import createFile from "./file";

export default class FileSystem {
  constructor( opts ) {
    const { files, data } = opts || {};
    this.files = files || new Set();
    this.data = data || Object.create( null );
  }

  getObjFile( file ) {
    file = makeAbsolute( file );
    let obj = this.data[ file ];
    if ( !obj ) {
      this.files.add( file );
      obj = this.data[ file ] = createFile( file );
    }
    return obj;
  }

  async isFile( file ) {
    return this.getObjFile( file ).isFile();
  }

  async getFileBuffer( file ) {
    return this.getObjFile( file ).getBuffer();
  }

  async getFile( file ) {
    return this.getObjFile( file ).getString();
  }

  async readdir( dir ) {
    return this.getObjFile( dir ).readdir();
  }

  getFileBufferSync( file ) {
    return this.getObjFile( file ).getBufferSync();
  }

  getFileSync( file ) {
    return this.getObjFile( file ).getStringSync();
  }

  readdirSync( dir ) {
    return this.getObjFile( dir ).readdirSync();
  }

  putFile( obj ) {
    const overwrite = !!this.data[ obj.location ];
    if ( !overwrite ) {
      this.files.add( obj.location );
    }
    this.data[ obj.location ] = obj;
    return overwrite;
  }

  purge( what ) {
    const file = makeAbsolute( what );
    const obj = this.data[ file ];
    if ( obj ) {
      if ( obj.fromFS() ) {
        const parent = dirname( obj.location );
        if ( this.files.delete( parent ) ) {
          this.data[ parent ] = null;
        }
      }
      this.data[ file ] = null;
      this.files.delete( file );
    }
  }

  clone() {
    return new FileSystem( this );
  }

}
