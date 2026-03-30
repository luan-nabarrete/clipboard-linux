'use strict';

const { createHash } = require('node:crypto');

class ClipboardHistoryStore {
  constructor() {
    this.entries = [];
  }

  add(payload) {
    const normalized = this.#normalizePayload(payload);
    if (!normalized) {
      return false;
    }

    if (this.entries[0] && this.entries[0].signature === normalized.signature) {
      return false;
    }

    this.entries.unshift(this.#createEntry(normalized));
    return true;
  }

  promote(payload) {
    const normalized = this.#normalizePayload(payload);
    if (!normalized) {
      return false;
    }

    if (this.entries[0] && this.entries[0].signature === normalized.signature) {
      return false;
    }

    const existingIndex = this.entries.findIndex((entry) => entry.signature === normalized.signature);
    if (existingIndex >= 0) {
      const [entry] = this.entries.splice(existingIndex, 1);
      entry.createdAt = new Date().toISOString();
      Object.assign(entry, normalized);
      this.entries.unshift(entry);
      return true;
    }

    this.entries.unshift(this.#createEntry(normalized));
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

  getById(id) {
    const entry = this.entries.find((item) => item.id === id);
    return entry ? { ...entry } : null;
  }

  count() {
    return this.entries.length;
  }

  #createEntry(payload) {
    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      createdAt: new Date().toISOString(),
      ...payload
    };
  }

  #normalizePayload(payload) {
    if (typeof payload === 'string') {
      if (payload.length === 0) {
        return null;
      }

      return {
        type: 'text',
        text: payload,
        signature: this.#buildTextSignature(payload)
      };
    }

    if (!payload || typeof payload !== 'object') {
      return null;
    }

    if (payload.type === 'text') {
      if (typeof payload.text !== 'string' || payload.text.length === 0) {
        return null;
      }

      return {
        type: 'text',
        text: payload.text,
        signature: payload.signature || this.#buildTextSignature(payload.text)
      };
    }

    if (payload.type === 'image') {
      if (typeof payload.imageDataUrl !== 'string' || payload.imageDataUrl.length === 0) {
        return null;
      }

      return {
        type: 'image',
        imageDataUrl: payload.imageDataUrl,
        thumbnailDataUrl: typeof payload.thumbnailDataUrl === 'string' && payload.thumbnailDataUrl.length > 0
          ? payload.thumbnailDataUrl
          : payload.imageDataUrl,
        width: Number(payload.width) || 0,
        height: Number(payload.height) || 0,
        byteLength: Number(payload.byteLength) || 0,
        signature: payload.signature || this.#buildImageSignature(payload.imageDataUrl)
      };
    }

    return null;
  }

  #buildTextSignature(text) {
    return `text:${createHash('sha1').update(text).digest('hex')}`;
  }

  #buildImageSignature(imageDataUrl) {
    return `image:${createHash('sha1').update(imageDataUrl).digest('hex')}`;
  }
}

module.exports = {
  ClipboardHistoryStore
};
