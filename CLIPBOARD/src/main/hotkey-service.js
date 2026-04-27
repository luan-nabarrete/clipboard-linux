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
        accelerator: this.accelerator,
        label: this.getLabel()
      };
    }

    this.started = true;
    return this.#registerAccelerator(this.accelerator);
  }

  updateAccelerator(nextAccelerator, options = {}) {
    const normalized = this.#normalizeAccelerator(nextAccelerator);
    const silent = options.silent === true;

    if (!normalized) {
      return {
        ok: false,
        accelerator: this.accelerator,
        message: 'Informe um atalho valido com pelo menos um modificador e uma tecla final.'
      };
    }

    if (normalized === this.accelerator && this.registeredAccelerator === normalized) {
      return {
        ok: true,
        accelerator: normalized,
        label: this.getLabel()
      };
    }

    const previousDesiredAccelerator = this.accelerator;
    const previousRegisteredAccelerator = this.registeredAccelerator;

    this.accelerator = normalized;

    if (!this.started) {
      return {
        ok: true,
        accelerator: this.accelerator,
        label: this.getLabel()
      };
    }

    if (previousRegisteredAccelerator) {
      globalShortcut.unregister(previousRegisteredAccelerator);
      this.registeredAccelerator = null;
    }

    const result = this.#registerAccelerator(normalized, silent);
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

  getLabel() {
    return this.accelerator;
  }

  stop() {
    if (this.registeredAccelerator) {
      globalShortcut.unregister(this.registeredAccelerator);
      this.registeredAccelerator = null;
    }

    globalShortcut.unregisterAll();
    this.started = false;
  }

  #registerAccelerator(accelerator, silent = false) {
    try {
      const registered = globalShortcut.register(accelerator, () => {
        this.emit('activated');
      });

      if (!registered) {
        if (!silent) {
          this.emit('unavailable', this.#buildUnavailableMessage(accelerator));
        }

        return {
          ok: false,
          accelerator,
          message: this.#buildUnavailableMessage(accelerator)
        };
      }

      this.registeredAccelerator = accelerator;
      this.emit('registered', accelerator);
      return {
        ok: true,
        accelerator,
        label: this.getLabel()
      };
    } catch (error) {
      const message = `${this.#buildUnavailableMessage(accelerator)} Detalhe: ${
        error instanceof Error ? error.message : error
      }`;

      if (!silent) {
        this.emit('unavailable', message);
      }

      return {
        ok: false,
        accelerator,
        message
      };
    }
  }

  #normalizeAccelerator(value) {
    if (typeof value !== 'string') {
      return '';
    }

    const normalized = value
      .split('+')
      .map((part) => part.trim())
      .filter(Boolean)
      .join('+');

    if (!normalized.includes('+')) {
      return '';
    }

    return normalized;
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
