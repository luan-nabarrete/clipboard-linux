'use strict';

const { EventEmitter } = require('node:events');
const { globalShortcut } = require('electron');

class GlobalHotkeyService extends EventEmitter {
  constructor(accelerator = 'Super+C') {
    super();
    this.accelerator = accelerator;
    this.registeredAccelerator = null;
    this.started = false;
  }

  start() {
    if (this.started) {
      return {
        ok: Boolean(this.registeredAccelerator),
        accelerator: this.accelerator
      };
    }

    this.started = true;
    const result = this.#registerAccelerator(this.accelerator);

    if (!result.ok) {
      this.emit('unavailable', result.message);
    }

    return result;
  }

  updateAccelerator(nextAccelerator) {
    const normalized = typeof nextAccelerator === 'string' && nextAccelerator.trim().length > 0
      ? nextAccelerator.trim()
      : this.accelerator;

    if (normalized === this.accelerator && this.registeredAccelerator === normalized) {
      return {
        ok: true,
        accelerator: normalized
      };
    }

    const previousDesiredAccelerator = this.accelerator;
    const previousRegisteredAccelerator = this.registeredAccelerator;

    this.accelerator = normalized;

    if (!this.started) {
      return {
        ok: true,
        accelerator: this.accelerator
      };
    }

    if (previousRegisteredAccelerator) {
      globalShortcut.unregister(previousRegisteredAccelerator);
      this.registeredAccelerator = null;
    }

    const result = this.#registerAccelerator(normalized);
    if (result.ok) {
      return result;
    }

    this.accelerator = previousDesiredAccelerator;

    if (previousRegisteredAccelerator) {
      const rollback = this.#registerAccelerator(previousRegisteredAccelerator);
      if (!rollback.ok) {
        this.emit('unavailable', rollback.message);
      }
    }

    return {
      ok: false,
      accelerator: this.accelerator,
      message: result.message
    };
  }

  stop() {
    if (this.registeredAccelerator) {
      globalShortcut.unregister(this.registeredAccelerator);
      this.registeredAccelerator = null;
    }

    globalShortcut.unregisterAll();
    this.started = false;
  }

  #registerAccelerator(accelerator) {
    try {
      const registered = globalShortcut.register(accelerator, () => {
        this.emit('activated');
      });

      if (!registered) {
        return {
          ok: false,
          accelerator,
          message: this.#buildUnavailableMessage(accelerator)
        };
      }

      this.registeredAccelerator = accelerator;
      return {
        ok: true,
        accelerator
      };
    } catch (error) {
      return {
        ok: false,
        accelerator,
        message: `${this.#buildUnavailableMessage(accelerator)} Detalhe: ${
          error instanceof Error ? error.message : error
        }`
      };
    }
  }

  #buildUnavailableMessage(accelerator = this.accelerator) {
    const onWayland = Boolean(process.env.WAYLAND_DISPLAY && !process.env.DISPLAY);

    if (onWayland) {
      return `Atalho global ${accelerator} indisponivel neste Wayland. Use o icone da tray para abrir o painel.`;
    }

    return `Nao foi possivel registrar o atalho global ${accelerator}. Ele pode ja estar em uso por outro aplicativo.`;
  }
}

module.exports = {
  GlobalHotkeyService
};
