'use strict';

process.env.ELECTRON_NO_ASAR = '1';
process.noAsar = true;

const { build } = require('electron-builder');

function printHelp() {
  console.log(`Usage: electron ./scripts/run-electron-builder.js [target ...] [--dir]

Examples:
  electron ./scripts/run-electron-builder.js deb
  electron ./scripts/run-electron-builder.js AppImage deb
  electron ./scripts/run-electron-builder.js --dir
`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    return;
  }

  if (args.includes('--version') || args.includes('-v')) {
    console.log(require('../node_modules/electron-builder/package.json').version);
    return;
  }

  const dir = args.includes('--dir');
  const targets = args.filter((arg) => !arg.startsWith('-'));

  const options = {
    publish: 'never'
  };

  if (dir) {
    options.dir = true;
  }

  if (targets.length > 0) {
    options.linux = targets;
  }

  await build(options);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
