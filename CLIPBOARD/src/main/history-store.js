'use strict';

class ClipboardHistoryStore {
  constructor() {
    this.entries = [];
  }

  add(text) {
    if (typeof text !== 'string' || text.length === 0) {
      return false;
    }

    if (this.entries[0] && this.entries[0].text === text) {
      return false;
    }

    this.entries.unshift(this.#createEntry(text));
    return true;
  }

  promote(text) {
    if (typeof text !== 'string' || text.length === 0) {
      return false;
    }

    if (this.entries[0] && this.entries[0].text === text) {
      return false;
    }

    const existingIndex = this.entries.findIndex((entry) => entry.text === text);
    if (existingIndex >= 0) {
      const [entry] = this.entries.splice(existingIndex, 1);
      entry.createdAt = new Date().toISOString();
      this.entries.unshift(entry);
      return true;
    }

    this.entries.unshift(this.#createEntry(text));
    return true;
  }

  clear() {
    this.entries = [];
  }

  remove(id) {
    const nextEntries = this.entries.filter((entry) => entry.id !== id);

    if (nextEntries.length === this.entries.length) {
      return false;
    }

    this.entries = nextEntries;
    return true;
  }

  snapshot() {
    return this.entries.map((entry) => ({ ...entry }));
  }

  count() {
    return this.entries.length;
  }

  #createEntry(text) {
    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      text,
      createdAt: new Date().toISOString()
    };
  }
}

module.exports = {
  ClipboardHistoryStore
};
