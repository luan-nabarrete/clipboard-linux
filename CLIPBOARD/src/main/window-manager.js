'use strict';

const path = require('node:path');
const { EventEmitter } = require('node:events');
const { BrowserWindow, ipcMain, screen } = require('electron');

class PanelWindow extends EventEmitter {
  constructor(icon) {
    super();
    this.icon = icon;
    this.window = null;
    this.isLoaded = false;
    this.lastState = null;
    this.dragState = null;
    this.hasCustomPosition = false;

    this.#createWindow();
    this.#registerIpc();
  }

  show() {
    if (!this.window) {
      return;
    }

    if (!this.hasCustomPosition) {
      this.#positionBottomRight();
    }
    this.window.show();
    this.window.focus();
  }

  hide() {
    if (this.window && this.window.isVisible()) {
      this.window.hide();
    }
  }

  toggle() {
    if (!this.window) {
      return;
    }

    if (this.window.isVisible()) {
      this.hide();
      return;
    }

    this.show();
  }

  sendState(nextState) {
    this.lastState = nextState;

    if (!this.window || this.window.isDestroyed() || !this.isLoaded) {
      return;
    }

    this.window.webContents.send('panel:state', nextState);
  }

  destroy() {
    if (this.window && !this.window.isDestroyed()) {
      this.window.destroy();
    }

    ipcMain.removeAllListeners('panel:ready');
    ipcMain.removeAllListeners('panel:restore');
    ipcMain.removeAllListeners('panel:delete-entry');
    ipcMain.removeAllListeners('panel:hide');
    ipcMain.removeAllListeners('panel:start-drag');
    ipcMain.removeAllListeners('panel:drag');
    ipcMain.removeAllListeners('panel:end-drag');
    ipcMain.removeAllListeners('panel:set-size');
  }

  #createWindow() {
    this.window = new BrowserWindow({
      width: 300,
      height: 550,
      minWidth: 400,
      minHeight: 320,
      show: false,
      frame: false,
      resizable: true,
      alwaysOnTop: false,
      skipTaskbar: true,
      autoHideMenuBar: true,
      transparent: true,
      backgroundColor: '#00000000',
      title: 'ClipStack',
      icon: this.icon,
      webPreferences: {
        preload: path.join(__dirname, '..', 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      }
    });

    this.window.loadFile(path.join(__dirname, '..', 'renderer', 'panel.html'));
    this.window.webContents.on('did-finish-load', () => {
      this.isLoaded = true;
      if (this.lastState) {
        this.window.webContents.send('panel:state', this.lastState);
      }
    });
  }

  #registerIpc() {
    ipcMain.on('panel:ready', () => {
      if (this.lastState && this.window && !this.window.isDestroyed()) {
        this.window.webContents.send('panel:state', this.lastState);
      }
    });

    ipcMain.on('panel:restore', (_event, text) => {
      this.emit('restore', text);
    });

    ipcMain.on('panel:delete-entry', (_event, id) => {
      this.emit('delete-entry', id);
    });

    ipcMain.on('panel:hide', () => {
      this.hide();
    });

    ipcMain.on('panel:start-drag', (_event, pointer) => {
      this.#startDrag(pointer);
    });

    ipcMain.on('panel:drag', (_event, pointer) => {
      this.#dragTo(pointer);
    });

    ipcMain.on('panel:end-drag', () => {
      this.dragState = null;
    });

    ipcMain.on('panel:set-size', (_event, size) => {
      this.#setWindowSize(size);
    });
  }

  #positionBottomRight() {
    if (!this.window) {
      return;
    }

    // Abrimos sempre no canto inferior direito da tela ativa.
    const cursorPoint = screen.getCursorScreenPoint();
    const display = screen.getDisplayNearestPoint(cursorPoint);
    const { x, y, width, height } = display.workArea;
    const [windowWidth, windowHeight] = this.window.getSize();

    const left = x + width - windowWidth - 16;
    const top = y + height - windowHeight - 16;

    this.window.setPosition(left, top, false);
  }

  #setWindowSize(size) {
    if (!this.window || !size) {
      return;
    }

    const cursorPoint = screen.getCursorScreenPoint();
    const display = screen.getDisplayNearestPoint(cursorPoint);
    const { width: maxWidth, height: maxHeight } = display.workArea;

      const nextWidth = Math.max(400, Math.min(Math.round(size.width || 0), maxWidth - 24));
      const nextHeight = Math.max(320, Math.min(Math.round(size.height || 0), maxHeight - 24));

    this.window.setSize(nextWidth, nextHeight);
  }

  #startDrag(pointer) {
    if (!this.window || !pointer) {
      return;
    }

    this.dragState = {
      startX: Number(pointer.screenX) || 0,
      startY: Number(pointer.screenY) || 0,
      bounds: this.window.getBounds()
    };
  }

  #dragTo(pointer) {
    if (!this.window || !this.dragState || !pointer) {
      return;
    }

    const deltaX = (Number(pointer.screenX) || 0) - this.dragState.startX;
    const deltaY = (Number(pointer.screenY) || 0) - this.dragState.startY;
    const nextX = this.dragState.bounds.x + deltaX;
    const nextY = this.dragState.bounds.y + deltaY;

    this.hasCustomPosition = true;
    this.window.setPosition(nextX, nextY);
  }
}

module.exports = {
  PanelWindow
};
