#!/usr/bin/env node
/* eslint-disable no-console */

const help = `
Usage
  $ quase-publisher [version] [options]

Options
  --no-cleanup
`;

// TODO

require( "@quase/cli" ).default( {
  help,
  configFiles: "quase-publisher.config.js",
  configKey: "quase-publisher",
  validate: false,
  schema: {
    cleanup: {
      type: "boolean",
      default: true
    }
  }
} ).then( ( { input, options } ) => {
  options.version = input[ 0 ];
  require( "../dist" ).default( options );
} );
