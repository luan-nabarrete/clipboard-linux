'use strict';

const { EventEmitter } = require('node:events');
const { globalShortcut } = require('electron');

class GlobalHotkeyService extends EventEmitter {
  constructor(accelerator = 'Super+C') {
    super();
    this.accelerator = accelerator;
  }

  start() {
    try {
      const registered = globalShortcut.register(this.accelerator, () => {
        this.emit('activated');
      });

      if (!registered) {
        this.emit('unavailable', this.#buildUnavailableMessage());
      }
    } catch (error) {
      this.emit(
        'unavailable',
        `${this.#buildUnavailableMessage()} Detalhe: ${error instanceof Error ? error.message : error}`
      );
    }
  }

  stop() {
    globalShortcut.unregisterAll();
  }

  #buildUnavailableMessage() {
    const onWayland = Boolean(process.env.WAYLAND_DISPLAY && !process.env.DISPLAY);

    if (onWayland) {
      return 'Atalho global indisponivel neste Wayland. Use o icone da tray para abrir o painel.';
    }

    return 'Nao foi possivel registrar o atalho global Super+C. Ele pode ja estar em uso por outro aplicativo.';
  }
}

module.exports = {
  GlobalHotkeyService
};
