'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  PasteAutomationService,
  buildUnavailablePasteMessage,
  detectTerminalPasteShortcut,
  detectPasteBackend,
  looksLikeTerminalProcessName,
  looksLikeTerminalWindowClass
} = require('../src/main/paste-service');

test('prefere xdotool quando ha sessao X11 e binario disponivel', () => {
  const backend = detectPasteBackend({
    env: {
      DISPLAY: ':0',
      PATH: '/fake'
    },
    resolveBinary(binaryName) {
      return binaryName === 'xdotool' ? `/usr/bin/${binaryName}` : null;
    }
  });

  assert.deepEqual(backend, {
    name: 'xdotool',
    path: '/usr/bin/xdotool',
    displayName: 'xdotool (X11)',
    supportsTargetWindow: true,
    limitedOnWayland: false
  });
});

test('prefere wtype em Wayland mesmo quando xdotool tambem esta disponivel', () => {
  const backend = detectPasteBackend({
    env: {
      DISPLAY: ':0',
      WAYLAND_DISPLAY: 'wayland-0',
      PATH: '/fake'
    },
    resolveBinary(binaryName) {
      return binaryName === 'wtype' || binaryName === 'xdotool'
        ? `/usr/bin/${binaryName}`
        : null;
    }
  });

  assert.deepEqual(backend, {
    name: 'wtype',
    path: '/usr/bin/wtype',
    displayName: 'wtype (Wayland)',
    supportsTargetWindow: false,
    limitedOnWayland: false
  });
});

test('prefere ydotool em Wayland quando wtype nao esta disponivel', () => {
  const backend = detectPasteBackend({
    env: {
      DISPLAY: ':0',
      WAYLAND_DISPLAY: 'wayland-0',
      PATH: '/fake'
    },
    resolveBinary(binaryName) {
      return binaryName === 'ydotool' || binaryName === 'xdotool'
        ? `/usr/bin/${binaryName}`
        : null;
    }
  });

  assert.deepEqual(backend, {
    name: 'ydotool',
    path: '/usr/bin/ydotool',
    displayName: 'ydotool (Wayland)',
    supportsTargetWindow: false,
    limitedOnWayland: false
  });
});

test('monta mensagem de indisponibilidade adequada para Wayland', () => {
  const message = buildUnavailablePasteMessage({
    DISPLAY: ':0',
    WAYLAND_DISPLAY: 'wayland-0'
  });

  assert.match(message, /Wayland/);
  assert.match(message, /wtype ou ydotool/);
});

test('marca xdotool como limitado quando ele e o unico backend em sessao Wayland', () => {
  const service = new PasteAutomationService({
    env: {
      DISPLAY: ':0',
      WAYLAND_DISPLAY: 'wayland-0',
      PATH: '/fake'
    },
    resolveBinary(binaryName) {
      return binaryName === 'xdotool' ? `/usr/bin/${binaryName}` : null;
    }
  });

  assert.deepEqual(service.getStatus(), {
    available: true,
    backend: 'xdotool',
    displayName: 'xdotool (X11)',
    supportsTargetWindow: true,
    limited: true,
    message: 'Colagem via xdotool esta limitada a apps X11/XWayland nesta sessao Wayland. Instale wtype ou ydotool para colar tambem em apps Wayland nativos.'
  });
});

test('detecta classes conhecidas de terminal', () => {
  assert.equal(looksLikeTerminalWindowClass('kitty'), true);
  assert.equal(looksLikeTerminalWindowClass('org.wezfurlong.wezterm'), true);
  assert.equal(looksLikeTerminalWindowClass('Google-chrome'), false);
});

test('detecta processos conhecidos de terminal', () => {
  assert.equal(looksLikeTerminalProcessName('ghostty'), true);
  assert.equal(looksLikeTerminalProcessName('gnome-terminal-server'), true);
  assert.equal(looksLikeTerminalProcessName('firefox'), false);
});

test('prefere Ctrl+Shift+V para terminais modernos', () => {
  assert.deepEqual(detectTerminalPasteShortcut({
    windowClass: 'kitty',
    processName: 'kitty',
    windowName: 'shell'
  }), {
    label: 'Ctrl+Shift+V',
    xdotoolKey: 'ctrl+shift+v'
  });
});

test('prefere Shift+Insert para terminais legados', () => {
  assert.deepEqual(detectTerminalPasteShortcut({
    windowClass: 'xterm',
    processName: 'xterm',
    windowName: 'shell'
  }), {
    label: 'Shift+Insert',
    xdotoolKey: 'shift+Insert'
  });
});

test('detecta terminal integrado em IDE e usa Ctrl+Shift+V', () => {
  assert.deepEqual(detectTerminalPasteShortcut({
    windowClass: 'code',
    processName: 'code',
    windowName: 'Terminal - bash - Visual Studio Code'
  }), {
    label: 'Ctrl+Shift+V',
    xdotoolKey: 'ctrl+shift+v'
  });
});

test('ignora BadWindow ao tentar reativar janela via xdotool e ainda envia Ctrl+V', async () => {
  const calls = [];
  const service = new PasteAutomationService({
    env: {
      DISPLAY: ':0',
      PATH: '/fake'
    },
    resolveBinary(binaryName) {
      return binaryName === 'xdotool' ? `/usr/bin/${binaryName}` : null;
    },
    execFile(_command, args, _options, callback) {
      calls.push(args);

      if (args[0] === 'windowactivate') {
        callback(
          new Error('X Error of failed request: BadWindow'),
          '',
          'X Error of failed request: BadWindow (invalid Window parameter)'
        );
        return;
      }

      callback(null, '', '');
    }
  });

  const result = await service.pasteClipboard({
    targetWindowId: '0x2a00004'
  });

  assert.equal(result.ok, true);
  assert.deepEqual(calls, [
    ['windowactivate', '--sync', '0x2a00004'],
    ['key', '--clearmodifiers', 'ctrl+v']
  ]);
});

test('envia Ctrl+Shift+V quando a janela alvo parece ser um terminal moderno', async () => {
  const calls = [];
  const service = new PasteAutomationService({
    env: {
      DISPLAY: ':0',
      PATH: '/fake'
    },
    resolveBinary(binaryName) {
      return binaryName === 'xdotool' ? `/usr/bin/${binaryName}` : null;
    },
    execFileSync(_command, args) {
      if (args[0] === 'getwindowclassname' && args[1] === '0x2a00004') {
        return 'kitty';
      }

      throw new Error(`unexpected sync call: ${args.join(' ')}`);
    },
    execFile(_command, args, _options, callback) {
      calls.push(args);
      callback(null, '', '');
    }
  });

  const result = await service.pasteClipboard({
    targetWindowId: '0x2a00004'
  });

  assert.equal(result.ok, true);
  assert.deepEqual(calls, [
    ['windowactivate', '--sync', '0x2a00004'],
    ['key', '--clearmodifiers', 'ctrl+shift+v']
  ]);
});

test('envia Shift+Insert quando a janela alvo parece ser um terminal legado', async () => {
  const calls = [];
  const service = new PasteAutomationService({
    env: {
      DISPLAY: ':0',
      PATH: '/fake'
    },
    resolveBinary(binaryName) {
      return binaryName === 'xdotool' ? `/usr/bin/${binaryName}` : null;
    },
    execFileSync(_command, args) {
      if (args[0] === 'getwindowclassname' && args[1] === '0x2a00004') {
        return 'xterm';
      }

      if (args[0] === 'getwindowname' && args[1] === '0x2a00004') {
        return 'xterm';
      }

      throw new Error(`unexpected sync call: ${args.join(' ')}`);
    },
    execFile(_command, args, _options, callback) {
      calls.push(args);
      callback(null, '', '');
    }
  });

  const result = await service.pasteClipboard({
    targetWindowId: '0x2a00004'
  });

  assert.equal(result.ok, true);
  assert.deepEqual(calls, [
    ['windowactivate', '--sync', '0x2a00004'],
    ['key', '--clearmodifiers', 'shift+Insert']
  ]);
});

test('usa processo da janela para detectar terminal quando a classe nao ajuda', async () => {
  const calls = [];
  const service = new PasteAutomationService({
    env: {
      DISPLAY: ':0',
      PATH: '/fake'
    },
    resolveBinary(binaryName) {
      return binaryName === 'xdotool' ? `/usr/bin/${binaryName}` : null;
    },
    execFileSync(_command, args) {
      if (args[0] === 'getwindowclassname' && args[1] === '0x2a00004') {
        return 'WrapperApp';
      }

      if (args[0] === 'getwindowpid' && args[1] === '0x2a00004') {
        return '4242';
      }

      throw new Error(`unexpected sync call: ${args.join(' ')}`);
    },
    execFile(_command, args, _options, callback) {
      calls.push(args);
      callback(null, '', '');
    }
  });

  const originalReadFileSync = require('node:fs').readFileSync;
  require('node:fs').readFileSync = (filePath, encoding) => {
    if (filePath === '/proc/4242/comm' && encoding === 'utf8') {
      return 'ghostty\n';
    }

    return originalReadFileSync(filePath, encoding);
  };

  try {
    const result = await service.pasteClipboard({
      targetWindowId: '0x2a00004'
    });

    assert.equal(result.ok, true);
  } finally {
    require('node:fs').readFileSync = originalReadFileSync;
  }

  assert.deepEqual(calls, [
    ['windowactivate', '--sync', '0x2a00004'],
    ['key', '--clearmodifiers', 'ctrl+shift+v']
  ]);
});

test('usa Shift+Insert como fallback para foco interno em janelas do VS Code', async () => {
  const calls = [];
  const service = new PasteAutomationService({
    env: {
      DISPLAY: ':0',
      PATH: '/fake'
    },
    resolveBinary(binaryName) {
      return binaryName === 'xdotool' ? `/usr/bin/${binaryName}` : null;
    },
    execFileSync(_command, args) {
      if (args[0] === 'getwindowclassname' && args[1] === '0xchild') {
        return '';
      }

      if (args[0] === 'getwindowclassname' && args[1] === '0xcode') {
        return 'code';
      }

      if (args[0] === 'getwindowname' && args[1] === '0xchild') {
        return '';
      }

      if (args[0] === 'getwindowname' && args[1] === '0xcode') {
        return 'workspace - Visual Studio Code';
      }

      throw new Error(`unexpected sync call: ${args.join(' ')}`);
    },
    execFile(_command, args, _options, callback) {
      calls.push(args);
      callback(null, '', '');
    }
  });

  const result = await service.pasteClipboard({
    targetWindowId: '0xcode',
    focusedWindowId: '0xchild'
  });

  assert.equal(result.ok, true);
  assert.deepEqual(calls, [
    ['windowactivate', '--sync', '0xcode'],
    ['key', '--clearmodifiers', 'shift+Insert']
  ]);
});

test('falha ao colar quando xdotool retorna erro diferente de BadWindow ao reativar janela', async () => {
  const service = new PasteAutomationService({
    env: {
      DISPLAY: ':0',
      PATH: '/fake'
    },
    resolveBinary(binaryName) {
      return binaryName === 'xdotool' ? `/usr/bin/${binaryName}` : null;
    },
    execFile(_command, args, _options, callback) {
      if (args[0] === 'windowactivate') {
        callback(new Error('unable to activate window'), '', 'unable to activate window');
        return;
      }

      callback(null, '', '');
    }
  });

  const result = await service.pasteClipboard({
    targetWindowId: '0x2a00004'
  });

  assert.equal(result.ok, false);
  assert.match(result.message, /Nao foi possivel enviar Ctrl\+V via xdotool \(X11\)/);
  assert.match(result.message, /unable to activate window/);
});
