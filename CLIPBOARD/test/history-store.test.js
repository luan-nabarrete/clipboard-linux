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

test('abrevia previews longos com reticencias', () => {
  assert.equal(buildPreview('a'.repeat(50), 12), 'aaaaaaaaa...');
});

test('preview preserva texto com espacos e quebras literalmente', () => {
  assert.equal(buildPreview('   \n\t', 20), '   \n\t');
});
