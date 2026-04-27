'use strict';

const path = require('node:path');
const { EventEmitter } = require('node:events');
const { BrowserWindow, ipcMain, screen } = require('electron');
const { computeCursorAnchoredPosition } = require('./window-positioning');

class PanelWindow extends EventEmitter {
  constructor(icon, options = {}) {
    super();
    this.icon = icon;
    this.window = null;
    this.isLoaded = false;
    this.lastState = null;
    this.dragState = null;
    this.hasCustomPosition = false;
    this.preferenceAlwaysOnTop = Boolean(options.alwaysOnTop);
    this.transientAlwaysOnTop = false;

    this.#createWindow();
    this.#registerIpc();
  }

  show(options = {}) {
    if (!this.window) {
      return;
    }

    if (options.nearCursor) {
      this.#positionNearCursor();
    } else if (!this.hasCustomPosition) {
      this.#positionBottomRight();
    }

    this.#showWindow(options);
    this.moveTop();

    if (options.focus !== false) {
      this.window.focus();
    }
  }

  showNearCursor(options = {}) {
    this.show({
      ...options,
      nearCursor: true
    });
  }

  hide() {
    if (this.window && this.window.isVisible()) {
      this.window.hide();
    }

    this.clearTransientAlwaysOnTop();
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

  isVisible() {
    return Boolean(this.window && this.window.isVisible());
  }

  isFocused() {
    return Boolean(this.window && this.window.isFocused());
  }

  setAlwaysOnTop(enabled) {
    this.preferenceAlwaysOnTop = Boolean(enabled);
    this.#applyAlwaysOnTop();
  }

  setTransientAlwaysOnTop(enabled) {
    this.transientAlwaysOnTop = Boolean(enabled);
    this.#applyAlwaysOnTop();
  }

  clearTransientAlwaysOnTop() {
    this.setTransientAlwaysOnTop(false);
  }

  blur() {
    if (this.window && !this.window.isDestroyed()) {
      this.window.blur();
    }
  }

  moveTop() {
    if (this.window && !this.window.isDestroyed()) {
      this.window.moveTop();
    }
  }

  #applyAlwaysOnTop() {
    if (!this.window || this.window.isDestroyed()) {
      return;
    }

    const nextValue = this.preferenceAlwaysOnTop || this.transientAlwaysOnTop;
    this.window.setAlwaysOnTop(nextValue);

    if (nextValue && this.window.isVisible()) {
      this.window.moveTop();
    }
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
    ipcMain.removeAllListeners('panel:delete-entry');
    ipcMain.removeAllListeners('panel:hide');
    ipcMain.removeAllListeners('panel:start-drag');
    ipcMain.removeAllListeners('panel:drag');
    ipcMain.removeAllListeners('panel:end-drag');
    ipcMain.removeAllListeners('panel:set-size');
    ipcMain.removeHandler('panel:paste-entry');
    ipcMain.removeHandler('panel:update-preferences');
  }

  #createWindow() {
    this.window = new BrowserWindow({
      width: 420,
      height: 550,
      minWidth: 400,
      minHeight: 320,
      show: false,
      frame: false,
      resizable: true,
      alwaysOnTop: this.preferenceAlwaysOnTop,
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

    this.window.on('closed', () => {
      this.window = null;
      this.isLoaded = false;
    });
  }

  #registerIpc() {
    ipcMain.on('panel:ready', () => {
      if (this.lastState && this.window && !this.window.isDestroyed()) {
        this.window.webContents.send('panel:state', this.lastState);
      }
    });

    ipcMain.handle('panel:paste-entry', async (_event, entryId) => this.#invokeListener('paste-entry', entryId));

    ipcMain.handle('panel:update-preferences', async (_event, patch) => this.#invokeListener('update-preferences', patch));

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

  #positionNearCursor() {
    if (!this.window) {
      return;
    }

    const cursor = screen.getCursorScreenPoint();
    const display = screen.getDisplayNearestPoint(cursor);
    const [windowWidth, windowHeight] = this.window.getSize();
    const nextPosition = computeCursorAnchoredPosition({
      cursor,
      workArea: display.workArea,
      windowSize: {
        width: windowWidth,
        height: windowHeight
      }
    });

    this.hasCustomPosition = true;
    this.window.setPosition(nextPosition.x, nextPosition.y, false);
  }

  #showWindow(options = {}) {
    if (!this.window) {
      return;
    }

    if (options.focus === false && this.#supportsInactiveShow()) {
      this.window.showInactive();
      return;
    }

    this.window.show();
  }

  #supportsInactiveShow() {
    return process.platform !== 'linux';
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
    this.#keepWindowInsideWorkArea(display.workArea);
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

  #keepWindowInsideWorkArea(workArea) {
    if (!this.window) {
      return;
    }

    const bounds = this.window.getBounds();
    const minX = workArea.x + 16;
    const minY = workArea.y + 16;
    const maxX = Math.max(minX, workArea.x + workArea.width - bounds.width - 16);
    const maxY = Math.max(minY, workArea.y + workArea.height - bounds.height - 16);
    const nextX = Math.min(Math.max(bounds.x, minX), maxX);
    const nextY = Math.min(Math.max(bounds.y, minY), maxY);

    this.window.setPosition(nextX, nextY, false);
  }

  #invokeListener(eventName, payload) {
    const [listener] = this.listeners(eventName);

    if (typeof listener !== 'function') {
      return {
        ok: false,
        message: 'Acao indisponivel no momento.'
      };
    }

    return listener(payload);
  }
}

module.exports = {
  PanelWindow
};
