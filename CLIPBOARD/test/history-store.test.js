'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { ClipboardHistoryStore } = require('../src/main/history-store');
const { buildPreview } = require('../src/shared/formatting');

test('adiciona novos itens no topo', () => {
  const store = new ClipboardHistoryStore();

  store.add('primeiro');
  store.add('segundo');

  assert.deepEqual(
    store.snapshot().map((entry) => entry.text),
    ['segundo', 'primeiro']
  );
});

test('ignora duplicacao consecutiva identica', () => {
  const store = new ClipboardHistoryStore();

  store.add('repetido');
  const added = store.add('repetido');

  assert.equal(added, false);
  assert.equal(store.count(), 1);
});

test('promove item existente para o topo', () => {
  const store = new ClipboardHistoryStore();

  store.add('um');
  store.add('dois');
  store.add('tres');
  store.promote('um');

  assert.deepEqual(
    store.snapshot().map((entry) => entry.text),
    ['um', 'tres', 'dois']
  );
});

test('remove item especifico pelo id', () => {
  const store = new ClipboardHistoryStore();

  store.add('um');
  store.add('dois');

  const [latest, older] = store.snapshot();
  const removed = store.remove(older.id);

  assert.equal(removed, true);
  assert.deepEqual(
    store.snapshot().map((entry) => entry.text),
    [latest.text]
  );
});

test('armazena imagem como item do historico', () => {
  const store = new ClipboardHistoryStore();

  store.add({
    type: 'image',
    imageDataUrl: 'data:image/png;base64,abc123',
    thumbnailDataUrl: 'data:image/png;base64,thumb123',
    width: 640,
    height: 360,
    byteLength: 2048,
    signature: 'image:abc123'
  });

  const [entry] = store.snapshot();
  assert.equal(entry.type, 'image');
  assert.equal(entry.width, 640);
  assert.equal(entry.height, 360);
  assert.equal(entry.imageDataUrl, 'data:image/png;base64,abc123');
});

test('ignora duplicacao consecutiva identica de imagem', () => {
  const store = new ClipboardHistoryStore();

  store.add({
    type: 'image',
    imageDataUrl: 'data:image/png;base64,abc123',
    signature: 'image:abc123'
  });

  const added = store.add({
    type: 'image',
    imageDataUrl: 'data:image/png;base64,abc123',
    signature: 'image:abc123'
  });

  assert.equal(added, false);
  assert.equal(store.count(), 1);
});

test('abrevia previews longos com reticencias', () => {
  assert.equal(buildPreview('a'.repeat(50), 12), 'aaaaaaaaa...');
});

test('preview preserva texto com espacos e quebras literalmente', () => {
  assert.equal(buildPreview('   \n\t', 20), '   \n\t');
});
