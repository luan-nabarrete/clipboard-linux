'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_PREFERENCES = Object.freeze({
  hotkey: 'Super+C',
  alwaysOnTop: false
});

function normalizeHotkey(value) {
  if (typeof value !== 'string') {
    return DEFAULT_PREFERENCES.hotkey;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : DEFAULT_PREFERENCES.hotkey;
}

function normalizePreferences(candidate) {
  const next = candidate && typeof candidate === 'object' ? candidate : {};

  return {
    hotkey: normalizeHotkey(next.hotkey),
    alwaysOnTop: Boolean(next.alwaysOnTop)
  };
}

function resolveDefaultFilePath() {
  const { app } = require('electron');
  return path.join(app.getPath('userData'), 'preferences.json');
}

class PreferenceStore {
  constructor(options = {}) {
    this.filePath = options.filePath || resolveDefaultFilePath();
    this.preferences = this.#load();
  }

  getAll() {
    return { ...this.preferences };
  }

  update(patch = {}) {
    this.preferences = normalizePreferences({
      ...this.preferences,
      ...patch
    });

    this.#persist();
    return this.getAll();
  }

  #load() {
    try {
      const raw = fs.readFileSync(this.filePath, 'utf8');
      return normalizePreferences(JSON.parse(raw));
    } catch {
      return { ...DEFAULT_PREFERENCES };
    }
  }

  #persist() {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(this.preferences, null, 2));
  }
}

module.exports = {
  PreferenceStore,
  DEFAULT_PREFERENCES,
  normalizeHotkey,
  normalizePreferences
};
