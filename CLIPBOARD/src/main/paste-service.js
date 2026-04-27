'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFile, execFileSync } = require('node:child_process');

function resolveBinary(binaryName, envPath = process.env.PATH || '') {
  if (typeof binaryName !== 'string' || binaryName.length === 0) {
    return null;
  }

  for (const segment of envPath.split(path.delimiter)) {
    if (!segment) {
      continue;
    }

    const candidate = path.join(segment, binaryName);

    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      return candidate;
    } catch {
      // Seguimos procurando no PATH.
    }
  }

  return null;
}

function buildUnavailablePasteMessage(env = process.env) {
  const onWayland = Boolean(env.WAYLAND_DISPLAY);

  if (onWayland) {
    return 'Colagem automatica indisponivel neste Wayland. Instale wtype ou ydotool para enviar Ctrl+V ao app ativo.';
  }

  return 'Colagem automatica indisponivel. Instale xdotool em X11 ou use wtype/ydotool em Wayland para enviar Ctrl+V ao app ativo.';
}

function buildAvailablePasteMessage(backend, env = process.env) {
  const onWayland = Boolean(env.WAYLAND_DISPLAY);

  if (backend?.name === 'xdotool' && onWayland) {
    return [
      'Colagem via xdotool esta limitada a apps X11/XWayland nesta sessao Wayland.',
      'Instale wtype ou ydotool para colar tambem em apps Wayland nativos.'
    ].join(' ');
  }

  return `Colagem direta pronta via ${backend.displayName}.`;
}

function detectPasteBackend(options = {}) {
  const env = options.env || process.env;
  const resolve = options.resolveBinary || resolveBinary;
  const envPath = env.PATH || '';
  const onWayland = Boolean(env.WAYLAND_DISPLAY);
  const onX11 = Boolean(env.DISPLAY);

  const xdotoolPath = resolve('xdotool', envPath);
  const wtypePath = resolve('wtype', envPath);
  const ydotoolPath = resolve('ydotool', envPath);

  if (onWayland) {
    if (wtypePath) {
      return {
        name: 'wtype',
        path: wtypePath,
        displayName: 'wtype (Wayland)',
        supportsTargetWindow: false,
        limitedOnWayland: false
      };
    }

    if (ydotoolPath) {
      return {
        name: 'ydotool',
        path: ydotoolPath,
        displayName: 'ydotool (Wayland)',
        supportsTargetWindow: false,
        limitedOnWayland: false
      };
    }

    if (xdotoolPath && onX11) {
      return {
        name: 'xdotool',
        path: xdotoolPath,
        displayName: 'xdotool (X11)',
        supportsTargetWindow: true,
        limitedOnWayland: true
      };
    }
  }

  if (xdotoolPath && onX11) {
    return {
      name: 'xdotool',
      path: xdotoolPath,
      displayName: 'xdotool (X11)',
      supportsTargetWindow: true,
      limitedOnWayland: false
    };
  }

  if (ydotoolPath) {
    return {
      name: 'ydotool',
      path: ydotoolPath,
      displayName: 'ydotool (Wayland)',
      supportsTargetWindow: false,
      limitedOnWayland: false
    };
  }

  return {
    name: null,
    path: null,
    displayName: 'indisponivel',
    supportsTargetWindow: false,
    limitedOnWayland: false
  };
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function buildCommandErrorMessage(error, stderr) {
  const stderrMessage = typeof stderr === 'string' ? stderr.trim() : '';
  if (stderrMessage.length > 0) {
    return stderrMessage;
  }

  if (error instanceof Error && typeof error.message === 'string' && error.message.trim().length > 0) {
    return error.message.trim();
  }

  return 'erro desconhecido';
}

function isBadWindowError(error, stderr) {
  return /BadWindow/i.test(buildCommandErrorMessage(error, stderr));
}

class PasteAutomationService {
  constructor(options = {}) {
    this.env = options.env || process.env;
    this.execFile = options.execFile || execFile;
    this.execFileSync = options.execFileSync || execFileSync;
    this.resolveBinary = options.resolveBinary;
    this.backend = null;
    this.#refreshBackend();
  }

  getStatus() {
    this.#refreshBackend();

    if (!this.backend.name) {
      return {
        available: false,
        backend: null,
        displayName: null,
        supportsTargetWindow: false,
        limited: false,
        message: buildUnavailablePasteMessage(this.env)
      };
    }

    return {
      available: true,
      backend: this.backend.name,
      displayName: this.backend.displayName,
      supportsTargetWindow: this.backend.supportsTargetWindow,
      limited: Boolean(this.backend.limitedOnWayland),
      message: buildAvailablePasteMessage(this.backend, this.env)
    };
  }

  canPaste() {
    this.#refreshBackend();
    return Boolean(this.backend.name);
  }

  canTargetWindow() {
    this.#refreshBackend();
    return Boolean(this.backend.supportsTargetWindow);
  }

  captureTargetWindow() {
    this.#refreshBackend();

    if (this.backend.name !== 'xdotool') {
      return null;
    }

    try {
      const stdout = this.execFileSync(this.backend.path, ['getactivewindow'], {
        encoding: 'utf8',
        timeout: 1500
      });

      const targetWindowId = String(stdout || '').trim();
      return targetWindowId || null;
    } catch {
      return null;
    }
  }

  async activateWindow(targetWindowId, options = {}) {
    this.#refreshBackend();

    if (this.backend.name !== 'xdotool') {
      return {
        ok: false,
        message: 'Reativacao de janela disponivel apenas via xdotool no X11.'
      };
    }

    if (typeof targetWindowId !== 'string' || targetWindowId.trim().length === 0) {
      return {
        ok: false,
        message: 'Janela de destino nao informada.'
      };
    }

    const delayMs = Math.max(0, Number(options.delayMs) || 0);
    if (delayMs > 0) {
      await wait(delayMs);
    }

    return this.#runCommand(['windowactivate', '--sync', targetWindowId.trim()], {
      failurePrefix: `Nao foi possivel reativar a janela via ${this.backend.displayName}`,
      successMessage: `Janela reativada via ${this.backend.displayName}.`
    });
  }

  async pasteClipboard(options = {}) {
    this.#refreshBackend();

    if (!this.backend.name) {
      return {
        ok: false,
        message: buildUnavailablePasteMessage(this.env)
      };
    }

    const delayMs = Math.max(0, Number(options.delayMs) || 0);
    if (delayMs > 0) {
      await wait(delayMs);
    }

    switch (this.backend.name) {
      case 'xdotool': {
        const targetWindowId = typeof options.targetWindowId === 'string' && options.targetWindowId.trim().length > 0
          ? options.targetWindowId.trim()
          : null;

        if (targetWindowId) {
          const activationResult = await this.#runCommand(['windowactivate', '--sync', targetWindowId], {
            failurePrefix: `Nao foi possivel reativar a janela via ${this.backend.displayName}`,
            successMessage: `Janela reativada via ${this.backend.displayName}.`
          });

          if (!activationResult.ok && !activationResult.badWindow) {
            return {
              ok: false,
              message: activationResult.message.replace(
                `Nao foi possivel reativar a janela via ${this.backend.displayName}`,
                `Nao foi possivel enviar Ctrl+V via ${this.backend.displayName}`
              )
            };
          }
        }

        return this.#runCommand(['key', '--clearmodifiers', 'ctrl+v'], {
          failurePrefix: `Nao foi possivel enviar Ctrl+V via ${this.backend.displayName}`,
          successMessage: `Colado via ${this.backend.displayName}.`
        });
      }

      case 'wtype':
        return this.#runCommand(['-M', 'ctrl', 'v', '-m', 'ctrl'], {
          failurePrefix: `Nao foi possivel enviar Ctrl+V via ${this.backend.displayName}`,
          successMessage: `Colado via ${this.backend.displayName}.`
        });

      case 'ydotool':
        return this.#runCommand(['key', '29:1', '47:1', '47:0', '29:0'], {
          failurePrefix: `Nao foi possivel enviar Ctrl+V via ${this.backend.displayName}`,
          successMessage: `Colado via ${this.backend.displayName}.`
        });

      default:
        return {
          ok: false,
          message: buildUnavailablePasteMessage(this.env)
        };
    }
  }

  #runCommand(args, options = {}) {
    return new Promise((resolve) => {
      this.execFile(this.backend.path, args, { timeout: 4000 }, (error, _stdout, stderr) => {
        if (error) {
          const detail = buildCommandErrorMessage(error, stderr);
          resolve({
            ok: false,
            badWindow: isBadWindowError(error, stderr),
            message: `${options.failurePrefix || 'Nao foi possivel executar o comando'}: ${detail}`
          });
          return;
        }

        resolve({
          ok: true,
          message: options.successMessage || `Comando executado via ${this.backend.displayName}.`
        });
      });
    });
  }

  #refreshBackend() {
    this.backend = detectPasteBackend({
      env: this.env,
      resolveBinary: this.resolveBinary
    });
  }
}

module.exports = {
  PasteAutomationService,
  buildUnavailablePasteMessage,
  detectPasteBackend,
  resolveBinary
};
