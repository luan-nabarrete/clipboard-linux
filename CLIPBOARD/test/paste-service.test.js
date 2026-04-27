'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { buildUnavailablePasteMessage, detectPasteBackend } = require('../src/main/paste-service');

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
    supportsTargetWindow: true
  });
});

test('usa wtype em Wayland quando xdotool nao esta disponivel', () => {
  const backend = detectPasteBackend({
    env: {
      WAYLAND_DISPLAY: 'wayland-0',
      PATH: '/fake'
    },
    resolveBinary(binaryName) {
      return binaryName === 'wtype' ? `/usr/bin/${binaryName}` : null;
    }
  });

  assert.deepEqual(backend, {
    name: 'wtype',
    path: '/usr/bin/wtype',
    displayName: 'wtype (Wayland)',
    supportsTargetWindow: false
  });
});

test('monta mensagem de indisponibilidade adequada para Wayland', () => {
  const message = buildUnavailablePasteMessage({
    WAYLAND_DISPLAY: 'wayland-0'
  });

  assert.match(message, /Wayland/);
  assert.match(message, /wtype ou ydotool/);
});
