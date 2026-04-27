'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { PreferenceStore, DEFAULT_PREFERENCES } = require('../src/main/preferences-store');

test('carrega preferencias padrao quando o arquivo ainda nao existe', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'clipstack-preferences-'));
  const store = new PreferenceStore({
    filePath: path.join(tempDir, 'preferences.json')
  });

  assert.deepEqual(store.getAll(), DEFAULT_PREFERENCES);
});

test('persiste preferencias normalizadas em disco', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'clipstack-preferences-'));
  const filePath = path.join(tempDir, 'preferences.json');
  const store = new PreferenceStore({ filePath });

  const nextPreferences = store.update({
    hotkey: '  Ctrl+Alt+Space  ',
    alwaysOnTop: 1
  });

  assert.deepEqual(nextPreferences, {
    hotkey: 'Ctrl+Alt+Space',
    alwaysOnTop: true
  });

  const persisted = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  assert.deepEqual(persisted, nextPreferences);
});

test('hotkey vazio volta para o padrao', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'clipstack-preferences-'));
  const store = new PreferenceStore({
    filePath: path.join(tempDir, 'preferences.json')
  });

  const nextPreferences = store.update({
    hotkey: '   '
  });

  assert.equal(nextPreferences.hotkey, DEFAULT_PREFERENCES.hotkey);
});
