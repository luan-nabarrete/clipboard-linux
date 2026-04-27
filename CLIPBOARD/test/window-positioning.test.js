'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { computeCursorAnchoredPosition } = require('../src/main/window-positioning');

test('posiciona a janela ao lado inferior direito do cursor quando ha espaco', () => {
  const position = computeCursorAnchoredPosition({
    cursor: { x: 120, y: 180 },
    workArea: { x: 0, y: 0, width: 1440, height: 900 },
    windowSize: { width: 420, height: 550 }
  });

  assert.deepEqual(position, {
    x: 138,
    y: 198
  });
});

test('reposiciona para a esquerda e para cima quando o cursor esta perto da borda', () => {
  const position = computeCursorAnchoredPosition({
    cursor: { x: 1400, y: 860 },
    workArea: { x: 0, y: 0, width: 1440, height: 900 },
    windowSize: { width: 420, height: 550 }
  });

  assert.deepEqual(position, {
    x: 962,
    y: 292
  });
});

test('mantem a janela dentro da area visivel mesmo em telas pequenas', () => {
  const position = computeCursorAnchoredPosition({
    cursor: { x: 40, y: 40 },
    workArea: { x: 0, y: 0, width: 420, height: 320 },
    windowSize: { width: 420, height: 550 }
  });

  assert.deepEqual(position, {
    x: 16,
    y: 16
  });
});
