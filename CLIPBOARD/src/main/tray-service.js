'use strict';

const { EventEmitter } = require('node:events');
const { Menu, Tray } = require('electron');

class TrayService extends EventEmitter {
  constructor(icon, appName) {
    super();
    this.icon = icon;
    this.appName = appName;
    this.tray = null;
    this.available = false;
  }

  start() {
    try {
      this.tray = new Tray(this.icon);
      this.available = true;
      this.tray.setToolTip(this.appName);
      this.tray.on('click', () => this.emit('toggle'));
      this.tray.on('double-click', () => this.emit('toggle'));
      this.#refreshMenu();
    } catch (error) {
      this.available = false;
      this.emit(
        'unavailable',
        `Bandeja do sistema indisponivel neste ambiente. Detalhe: ${
          error instanceof Error ? error.message : error
        }`
      );
    }
  }

  updateTooltip(count) {
    if (!this.tray) {
      return;
    }

    this.tray.setToolTip(`${this.appName} - ${count} item(ns) no historico`);
    this.#refreshMenu();
  }

  destroy() {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }

  #refreshMenu() {
    if (!this.tray) {
      return;
    }

    const menu = Menu.buildFromTemplate([
      {
        label: 'Abrir historico',
        click: () => this.emit('toggle')
      },
      {
        label: 'Limpar historico',
        click: () => this.emit('clear')
      },
      {
        type: 'separator'
      },
      {
        label: 'Sair',
        click: () => this.emit('quit')
      }
    ]);

    this.tray.setContextMenu(menu);
  }
}

module.exports = {
  TrayService
};
