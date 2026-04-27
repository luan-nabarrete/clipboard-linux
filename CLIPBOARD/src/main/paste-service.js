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
    return 'Colagem automatica indisponivel neste Wayland. Instale wtype ou ydotool para enviar o atalho de colagem ao app ativo.';
  }

  return 'Colagem automatica indisponivel. Instale xdotool em X11 ou use wtype/ydotool em Wayland para enviar o atalho de colagem ao app ativo.';
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

const TERMINAL_WINDOW_CLASS_TOKENS = [
  'alacritty',
  'cool-retro-term',
  'contour',
  'deepin-terminal',
  'foot',
  'ghostty',
  'gnome-terminal',
  'guake',
  'hyper',
  'io.elementary.terminal',
  'kitty',
  'konsole',
  'lxterminal',
  'mate-terminal',
  'org.wezfurlong.wezterm',
  'ptyxis',
  'rio',
  'rxvt',
  'st',
  'tabby',
  'terminator',
  'terminal',
  'terminology',
  'tilix',
  'urxvt',
  'wezterm',
  'xfce4-terminal',
  'xterm'
];

const TERMINAL_PROCESS_NAME_TOKENS = [
  'alacritty',
  'contour',
  'deepin-terminal',
  'foot',
  'ghostty',
  'gnome-terminal',
  'gnome-terminal-server',
  'guake',
  'hyper',
  'kitty',
  'konsole',
  'lxterminal',
  'mate-terminal',
  'ptyxis',
  'rio',
  'tabby',
  'terminator',
  'terminology',
  'tilix',
  'wezterm',
  'xfce4-terminal',
  'xterm'
];

const SHIFT_INSERT_TERMINAL_TOKENS = [
  'cool-retro-term',
  'deepin-terminal',
  'gnome-terminal',
  'gnome-terminal-server',
  'guake',
  'konsole',
  'lxterminal',
  'mate-terminal',
  'rxvt',
  'st',
  'terminator',
  'terminology',
  'tilix',
  'urxvt',
  'xfce4-terminal',
  'xterm'
];

const CTRL_SHIFT_V_TERMINAL_TOKENS = [
  'alacritty',
  'contour',
  'foot',
  'ghostty',
  'hyper',
  'io.elementary.terminal',
  'kitty',
  'org.wezfurlong.wezterm',
  'ptyxis',
  'rio',
  'tabby',
  'wezterm'
];

const IDE_WINDOW_CLASS_TOKENS = [
  'code',
  'codium',
  'cursor',
  'windsurf',
  'jetbrains',
  'idea',
  'pycharm',
  'webstorm',
  'goland',
  'clion',
  'rubymine',
  'phpstorm',
  'android-studio'
];

const TERMINAL_WINDOW_NAME_TOKENS = [
  ' terminal',
  'terminal ',
  'terminal-',
  'terminal:',
  'bash',
  'zsh',
  'fish',
  'sh -',
  'shell',
  'powershell',
  'pwsh'
];

function normalizeLookupValue(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function matchesLookupToken(normalizedValue, token) {
  const normalizedToken = normalizeLookupValue(token);
  if (!normalizedValue || !normalizedToken) {
    return false;
  }

  if (/^[a-z0-9]+$/.test(normalizedToken) && normalizedToken.length <= 3) {
    return normalizedValue === normalizedToken
      || normalizedValue.startsWith(`${normalizedToken}-`)
      || normalizedValue.endsWith(`-${normalizedToken}`)
      || normalizedValue.startsWith(`${normalizedToken}.`)
      || normalizedValue.endsWith(`.${normalizedToken}`)
      || normalizedValue.includes(` ${normalizedToken} `);
  }

  return normalizedValue.includes(normalizedToken);
}

function includesAnyToken(value, tokens) {
  const normalizedValue = normalizeLookupValue(value);
  if (!normalizedValue) {
    return false;
  }

  return tokens.some((token) => matchesLookupToken(normalizedValue, token));
}

function looksLikeTerminalWindowClass(windowClass) {
  return includesAnyToken(windowClass, TERMINAL_WINDOW_CLASS_TOKENS);
}

function looksLikeTerminalProcessName(processName) {
  return includesAnyToken(processName, TERMINAL_PROCESS_NAME_TOKENS);
}

function looksLikeIdeWindowClass(windowClass) {
  return includesAnyToken(windowClass, IDE_WINDOW_CLASS_TOKENS);
}

function detectTerminalPasteShortcut(context = {}) {
  const windowClass = normalizeLookupValue(context.windowClass);
  const processName = normalizeLookupValue(context.processName);
  const windowName = normalizeLookupValue(context.windowName);

  const terminalLike = looksLikeTerminalWindowClass(windowClass) || looksLikeTerminalProcessName(processName);
  const ideIntegratedTerminal = includesAnyToken(windowClass, IDE_WINDOW_CLASS_TOKENS)
    && includesAnyToken(windowName, TERMINAL_WINDOW_NAME_TOKENS);

  if (!terminalLike && !ideIntegratedTerminal) {
    return null;
  }

  const terminalFingerprint = `${windowClass} ${processName}`.trim();
  if (includesAnyToken(terminalFingerprint, SHIFT_INSERT_TERMINAL_TOKENS)) {
    return {
      label: 'Shift+Insert',
      xdotoolKey: 'shift+Insert'
    };
  }

  if (includesAnyToken(terminalFingerprint, CTRL_SHIFT_V_TERMINAL_TOKENS) || ideIntegratedTerminal) {
    return {
      label: 'Ctrl+Shift+V',
      xdotoolKey: 'ctrl+shift+v'
    };
  }

  return {
    label: 'Ctrl+Shift+V',
    xdotoolKey: 'ctrl+shift+v'
  };
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

  captureFocusedWindow() {
    this.#refreshBackend();

    if (this.backend.name !== 'xdotool') {
      return null;
    }

    try {
      const stdout = this.execFileSync(this.backend.path, ['getwindowfocus', '-f'], {
        encoding: 'utf8',
        timeout: 1500
      });

      const focusedWindowId = String(stdout || '').trim();
      return focusedWindowId || null;
    } catch {
      return null;
    }
  }

  getWindowClass(targetWindowId) {
    this.#refreshBackend();

    if (this.backend.name !== 'xdotool') {
      return null;
    }

    if (typeof targetWindowId !== 'string' || targetWindowId.trim().length === 0) {
      return null;
    }

    try {
      const stdout = this.execFileSync(this.backend.path, ['getwindowclassname', targetWindowId.trim()], {
        encoding: 'utf8',
        timeout: 1500
      });

      const windowClass = String(stdout || '').trim();
      return windowClass || null;
    } catch {
      return null;
    }
  }

  getWindowPid(targetWindowId) {
    this.#refreshBackend();

    if (this.backend.name !== 'xdotool') {
      return null;
    }

    if (typeof targetWindowId !== 'string' || targetWindowId.trim().length === 0) {
      return null;
    }

    try {
      const stdout = this.execFileSync(this.backend.path, ['getwindowpid', targetWindowId.trim()], {
        encoding: 'utf8',
        timeout: 1500
      });

      const pid = String(stdout || '').trim();
      return pid || null;
    } catch {
      return null;
    }
  }

  getWindowName(targetWindowId) {
    this.#refreshBackend();

    if (this.backend.name !== 'xdotool') {
      return null;
    }

    if (typeof targetWindowId !== 'string' || targetWindowId.trim().length === 0) {
      return null;
    }

    try {
      const stdout = this.execFileSync(this.backend.path, ['getwindowname', targetWindowId.trim()], {
        encoding: 'utf8',
        timeout: 1500
      });

      const windowName = String(stdout || '').trim();
      return windowName || null;
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
        const focusedWindowId = typeof options.focusedWindowId === 'string' && options.focusedWindowId.trim().length > 0
          ? options.focusedWindowId.trim()
          : null;
        const pasteShortcut = this.#resolveShortcutForWindow(targetWindowId, focusedWindowId);

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
                `Nao foi possivel enviar ${pasteShortcut.label} via ${this.backend.displayName}`
              )
            };
          }
        }

        return this.#runCommand(['key', '--clearmodifiers', pasteShortcut.xdotoolKey], {
          failurePrefix: `Nao foi possivel enviar ${pasteShortcut.label} via ${this.backend.displayName}`,
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

  #resolveShortcutForWindow(targetWindowId, focusedWindowId = null) {
    if (!targetWindowId && !focusedWindowId) {
      return {
        label: 'Ctrl+V',
        xdotoolKey: 'ctrl+v'
      };
    }

    const inspectWindowIds = [
      focusedWindowId,
      targetWindowId
    ].filter(Boolean);

    for (const inspectWindowId of inspectWindowIds) {
      const windowClass = this.getWindowClass(inspectWindowId);
      const processName = this.#readProcessNameForWindow(inspectWindowId);
      const windowName = this.getWindowName(inspectWindowId);
      const terminalShortcut = detectTerminalPasteShortcut({
        windowClass,
        processName,
        windowName
      });

      if (terminalShortcut) {
        return terminalShortcut;
      }
    }

    if (focusedWindowId && targetWindowId && focusedWindowId !== targetWindowId) {
      const topLevelWindowClass = this.getWindowClass(targetWindowId);
      if (looksLikeIdeWindowClass(topLevelWindowClass)) {
        return {
          label: 'Shift+Insert',
          xdotoolKey: 'shift+Insert'
        };
      }
    }

    return {
      label: 'Ctrl+V',
      xdotoolKey: 'ctrl+v'
    };
  }

  #readProcessNameForWindow(targetWindowId) {
    const pid = this.getWindowPid(targetWindowId);
    if (!pid) {
      return null;
    }

    try {
      const processName = fs.readFileSync(`/proc/${pid}/comm`, 'utf8');
      const normalizedProcessName = String(processName || '').trim();
      return normalizedProcessName || null;
    } catch {
      return null;
    }
  }
}

module.exports = {
  PasteAutomationService,
  buildUnavailablePasteMessage,
  detectTerminalPasteShortcut,
  detectPasteBackend,
  looksLikeTerminalProcessName,
  looksLikeTerminalWindowClass,
  resolveBinary
};
