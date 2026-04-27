'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('clipstack', {
  ready() {
    ipcRenderer.send('panel:ready');
  },
  pasteEntry(entryId) {
    return ipcRenderer.invoke('panel:paste-entry', entryId);
  },
  deleteEntry(id) {
    ipcRenderer.send('panel:delete-entry', id);
  },
  updatePreferences(patch) {
    return ipcRenderer.invoke('panel:update-preferences', patch);
  },
  hidePanel() {
    ipcRenderer.send('panel:hide');
  },
  startDrag(screenX, screenY) {
    ipcRenderer.send('panel:start-drag', { screenX, screenY });
  },
  dragTo(screenX, screenY) {
    ipcRenderer.send('panel:drag', { screenX, screenY });
  },
  endDrag() {
    ipcRenderer.send('panel:end-drag');
  },
  setPanelSize(width, height) {
    ipcRenderer.send('panel:set-size', { width, height });
  },
  onStateUpdate(callback) {
    ipcRenderer.on('panel:state', (_event, payload) => {
      callback(payload);
    });
  }
});
