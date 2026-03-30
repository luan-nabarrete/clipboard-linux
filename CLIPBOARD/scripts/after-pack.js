'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

module.exports = async function afterPack(context) {
  if (context.electronPlatformName !== 'linux') {
    return;
  }

  const executableName = context.packager.executableName;
  const appOutDir = context.appOutDir;
  const originalBinaryPath = path.join(appOutDir, executableName);
  const wrappedBinaryPath = path.join(appOutDir, `${executableName}-bin`);

  try {
    await fs.access(originalBinaryPath);
  } catch {
    return;
  }

  try {
    await fs.access(wrappedBinaryPath);
    return;
  } catch {
    // Seguimos apenas quando ainda nao existe wrapper aplicado.
  }

  await fs.rename(originalBinaryPath, wrappedBinaryPath);

  const wrapperScript = `#!/usr/bin/env sh
unset ELECTRON_RUN_AS_NODE
unset ELECTRON_NO_ATTACH_CONSOLE
SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
exec "$SCRIPT_DIR/${executableName}-bin" "$@"
`;

  await fs.writeFile(originalBinaryPath, wrapperScript, { mode: 0o755 });
  await fs.chmod(wrappedBinaryPath, 0o755);
};
