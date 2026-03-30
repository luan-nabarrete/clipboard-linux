'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { buildPreview } = require('../src/shared/formatting');

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
