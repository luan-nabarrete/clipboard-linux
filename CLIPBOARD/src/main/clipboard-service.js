'use strict';

const { EventEmitter } = require('node:events');
const { createHash } = require('node:crypto');
const { clipboard, nativeImage } = require('electron');

class ClipboardService extends EventEmitter {
  constructor(options = {}) {
    super();
    this.intervalMs = options.intervalMs ?? 350;
    this.intervalId = null;
    this.lastSeenSignature = null;
  }

  start() {
    if (this.intervalId !== null) {
      return;
    }

    try {
      // Ao iniciar do zero, adotamos o clipboard atual como referencia,
      // sem importar esse conteudo para o historico.
      this.lastSeenSignature = this.#readClipboardPayload()?.signature ?? null;
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
    this.writeEntry({ type: 'text', text });
  }

  writeEntry(entry) {
    try {
      if (entry?.type === 'image' && typeof entry.imageDataUrl === 'string') {
        const image = nativeImage.createFromDataURL(entry.imageDataUrl);
        if (image.isEmpty()) {
          return;
        }

        clipboard.writeImage(image);
        this.lastSeenSignature = entry.signature || this.#buildImageSignature(image.toPNG());
        return;
      }

      const text = entry?.type === 'text' ? entry.text : entry;
      if (typeof text !== 'string') {
        return;
      }

      clipboard.writeText(text);
      this.lastSeenSignature = entry?.signature || this.#buildTextSignature(text);
    } catch (error) {
      this.emit('error', error);
    }
  }

  #pollClipboard() {
    try {
      const payload = this.#readClipboardPayload();
      const nextSignature = payload?.signature ?? null;

      if (nextSignature === this.lastSeenSignature) {
        return;
      }

      // No Linux, observar o clipboard costuma ser mais confiavel do que capturar Ctrl+C globalmente.
      this.lastSeenSignature = nextSignature;

      if (!payload) {
        return;
      }

      this.emit('copied', payload);
    } catch (error) {
      this.emit('error', error);
    }
  }

  #readClipboardPayload() {
    const image = clipboard.readImage();
    if (image && !image.isEmpty()) {
      const png = image.toPNG();
      if (png.length > 0) {
        const { width, height } = image.getSize();

        return {
          type: 'image',
          imageDataUrl: image.toDataURL(),
          thumbnailDataUrl: this.#buildThumbnail(image),
          width,
          height,
          byteLength: png.length,
          signature: this.#buildImageSignature(png)
        };
      }
    }

    const text = clipboard.readText();
    if (!text) {
      return null;
    }

    return {
      type: 'text',
      text,
      signature: this.#buildTextSignature(text)
    };
  }

  #buildThumbnail(image) {
    const { width, height } = image.getSize();
    if (width <= 0 || height <= 0) {
      return image.toDataURL();
    }

    const maxWidth = 88;
    const maxHeight = 64;
    const scale = Math.min(maxWidth / width, maxHeight / height, 1);

    const nextWidth = Math.max(1, Math.round(width * scale));
    const nextHeight = Math.max(1, Math.round(height * scale));

    return image.resize({ width: nextWidth, height: nextHeight, quality: 'good' }).toDataURL();
  }

  #buildTextSignature(text) {
    return `text:${createHash('sha1').update(text).digest('hex')}`;
  }

  #buildImageSignature(imageBuffer) {
    return `image:${createHash('sha1').update(imageBuffer).digest('hex')}`;
  }
}

module.exports = {
  ClipboardService
};
