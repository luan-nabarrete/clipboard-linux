'use strict';

const { EventEmitter } = require('node:events');
const { clipboard } = require('electron');

class ClipboardService extends EventEmitter {
  constructor(options = {}) {
    super();
    this.intervalMs = options.intervalMs ?? 350;
    this.intervalId = null;
    this.lastSeenText = null;
  }

  start() {
    if (this.intervalId !== null) {
      return;
    }

    try {
      // Ao iniciar do zero, adotamos o clipboard atual como referencia,
      // sem importar esse conteudo para o historico.
      this.lastSeenText = clipboard.readText();
    } catch (error) {
      this.emit('error', error);
    }

    this.intervalId = setInterval(() => {
      this.#pollClipboard();
    }, this.intervalMs);
  }

  stop() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  writeText(text) {
    try {
      clipboard.writeText(text);
      this.lastSeenText = text;
    } catch (error) {
      this.emit('error', error);
    }
  }

  #pollClipboard() {
    try {
      const nextText = clipboard.readText();

      if (nextText === this.lastSeenText) {
        return;
      }

      // No Linux, observar o clipboard costuma ser mais confiavel do que capturar Ctrl+C globalmente.
      this.lastSeenText = nextText;

      if (!nextText) {
        return;
      }

      this.emit('copied', nextText);
    } catch (error) {
      this.emit('error', error);
    }
  }
}

module.exports = {
  ClipboardService
};
