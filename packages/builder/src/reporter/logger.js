// Adapted from parcel-bundler's logger
import { formatError } from "../utils/error";

const colorette = require( "colorette" );
const readline = require( "readline" );
const stripAnsi = require( "strip-ansi" );
const ora = require( "ora" );
const path = require( "path" );
const fs = require( "fs" );

const supportsEmoji = process.platform !== "win32" || process.env.TERM === "xterm-256color";

// Fallback symbols for Windows from https://en.wikipedia.org/wiki/Code_page_437
const emoji = {
  progress: supportsEmoji ? "⏳" : "∞",
  success: supportsEmoji ? "✨" : "√",
  error: supportsEmoji ? "🚨" : "×",
  warning: supportsEmoji ? "⚠️" : "‼",
  info: supportsEmoji ? "ℹ" : "i"
};

// Pad a string with spaces on either side
function pad( text, length, align = "left" ) {
  let pad = " ".repeat( length - text.length );
  if ( align === "right" ) {
    return pad + text;
  }
  return text + pad;
}

function countLines( message ) {
  return stripAnsi( message )
    .split( "\n" )
    .reduce( ( p, line ) => {
      if ( process.stdout.columns ) {
        return p + Math.ceil( ( line.length || 1 ) / process.stdout.columns );
      }
      return p + 1;
    }, 0 );
}

// 0 Logging disabled
// 1 Only log errors
// 2 Log errors and warnings
// 3 Log everything (shows progress with spinner)
// 4 Verbose (keep everything in log with timestamps) (shows progress with text)
// 5 Debug (save everything to a file with timestamps) (shows progress with text)

export default class Logger {
  constructor( options = {} ) {
    this.lines = 0;
    this.spinner = null;

    this.logLevel =
      options && isNaN( options.logLevel ) === false
        ? Number( options.logLevel )
        : 3;
    this.color = colorette.options.enabled =
      options && typeof options.color === "boolean"
        ? options.color
        : colorette.options.enabled;
    this.emoji = ( options && options.emoji ) || emoji;
    this.isTest = !!options.isTest;
  }

  _log( message ) {
    if ( this.logLevel > 3 ) {
      message = `[${new Date().toLocaleTimeString()}]: ${message}`;
    }
    console.log( message ); // eslint-disable-line no-console
    if ( this.logLevel > 4 ) {
      if ( !this.logFile ) {
        this.logFile = fs.createWriteStream(
          path.join( process.cwd(), "quase-builder-debug.log" )
        );
      }
      this.logFile.write( stripAnsi( message ) + "\n" );
    }
  }

  _writeError( err, emoji, color ) {
    const { message, stack } = formatError( err );
    this.write( color( `${emoji}  ${message}` ) );
    if ( stack ) {
      this.write( stack );
    }
  }

  write( message, persistent = false ) {
    if ( !persistent ) {
      this.lines += countLines( message );
    }
    this.stopSpinner();
    this._log( message );
  }

  log( message ) {
    if ( this.logLevel > 2 ) {
      this.write( message );
    }
  }

  persistent( message ) {
    if ( this.logLevel > 2 ) {
      this.write( colorette.bold( message ), true );
    }
  }

  info( message ) {
    this.log( `${this.emoji.info}  ${colorette.bold( colorette.blue( message ) )}` );
  }

  success( message ) {
    this.log( `${this.emoji.success}  ${colorette.bold( colorette.green( message ) )}` );
  }

  warn( err ) {
    if ( this.logLevel > 1 ) {
      this._writeError( err, this.emoji.warning, colorette.yellow );
    }
  }

  error( err ) {
    if ( this.logLevel > 0 ) {
      this._writeError( err, this.emoji.error, m => colorette.bold( colorette.red( m ) ) );
    }
  }

  progress( message ) {
    if ( this.logLevel < 3 ) {
      return;
    }

    if ( this.logLevel > 3 ) {
      return this.log( message );
    }

    const styledMessage = colorette.bold( colorette.gray( message ) );
    if ( this.spinner ) {
      this.spinner.text = styledMessage;
    } else {
      this.spinner = ora( {
        text: styledMessage,
        stream: process.stdout,
        enabled: this.isTest ? false : undefined
      } ).start();
    }
  }

  stopSpinner() {
    if ( this.spinner ) {
      this.spinner.stop();
      this.spinner = null;
    }
  }

  clear() {
    if ( !this.color || this.isTest || this.logLevel > 3 ) {
      return;
    }

    while ( this.lines > 0 ) {
      readline.clearLine( process.stdout, 0 );
      readline.moveCursor( process.stdout, 0, -1 );
      this.lines--;
    }

    readline.cursorTo( process.stdout, 0 );
    this.stopSpinner();
  }

  table( columns, table ) {
    // Measure column widths
    const colWidths = [];
    for ( let row of table ) {
      let i = 0;
      for ( let item of row ) {
        colWidths[ i ] = Math.max( colWidths[ i ] || 0, item.length );
        i++;
      }
    }

    // Render rows
    for ( let row of table ) {
      const items = row.map( ( item, i ) => {
        return ` ${pad( item, colWidths[ i ], columns[ i ].align )} `;
      } );

      this.log( items.join( "" ) );
    }
  }
}
