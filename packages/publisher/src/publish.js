import { exec } from "./util";

// Adapted from https://github.com/sindresorhus/np

const execa = require( "execa" );
const listrInput = require( "listr-input" );
const Observable = require( "any-observable" );
const chalk = require( "chalk" );

const npmPublish = opts => {
  const args = [ "publish" ];

  if ( opts.tag ) {
    args.push( "--tag", opts.tag );
  }

  if ( opts.otp ) {
    args.push( "--otp", opts.otp );
  }

  return execa( "npm", args, {
    cwd: opts.folder
  } );
};

const handleError = ( task, err, opts, message ) => {
  if ( err.stderr.indexOf( "one-time pass" ) !== -1 ) {
    const title = task.title;
    task.title = `${title} ${chalk.yellow( "(waiting for input…)" )}`;

    return listrInput( message || "Enter OTP:", {
      done: otp => {
        task.title = title;

        return npmPublish( { folder: opts.folder, tag: opts.tag, otp } );
      }
    } ).catch( err => handleError( task, err, opts, "OTP was incorrect, try again:" ) );
  }

  return Observable.throw( err );
};

export default function( task, opts ) {
  if ( opts.yarn ) {
    // This will not run "version" again
    // https://github.com/yarnpkg/yarn/pull/3103
    const args = [ "publish", "--new-version", opts.version ];

    if ( opts.tag ) {
      args.push( "--tag", opts.tag );
    }

    if ( opts.access ) {
      args.push( "--access", opts.access );
    }

    return exec( "yarn", args, {
      cwd: opts.folder
    } );
  }
  return Observable.fromPromise( npmPublish( { folder: opts.folder, tag: opts.tag } ) ).catch( err => handleError( task, err, opts ) );
}
