'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildPreview,
  buildImagePreview,
  buildImageTooltip
} = require('../src/shared/formatting');

test('preserva literalmente espacos e quebras de linha no preview', () => {
  const copiedText = '  linha 1\nlinha 2  ';

  assert.equal(buildPreview(copiedText), copiedText);
});

test('nao substitui texto em branco por marcador artificial', () => {
  const copiedText = '   ';

  assert.equal(buildPreview(copiedText), copiedText);
});

test('continua abreviando textos longos com reticencias', () => {
  assert.equal(buildPreview('abcdef', 5), 'ab...');
});

test('gera preview de imagem com dimensoes', () => {
  assert.equal(buildImagePreview({ width: 1280, height: 720 }), '1280 x 720');
});

test('gera tooltip de imagem com dimensoes e tamanho', () => {
  assert.equal(buildImageTooltip({ width: 1280, height: 720, byteLength: 153600 }), 'Imagem copiada · 1280 x 720 · 150.0 KB');
});
