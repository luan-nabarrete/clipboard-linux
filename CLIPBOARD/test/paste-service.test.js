'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  PasteAutomationService,
  buildUnavailablePasteMessage,
  detectPasteBackend
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
