'use strict';

const { app, Notification } = require('electron');

const { ClipboardService } = require('./clipboard-service');
const { ClipboardHistoryStore } = require('./history-store');
const { GlobalHotkeyService } = require('./hotkey-service');
const { createAppIcon } = require('./icon');
const { TrayService } = require('./tray-service');
const { PanelWindow } = require('./window-manager');
const {
  buildPreview,
  buildTooltip,
  buildImagePreview,
  buildImageTooltip
} = require('../shared/formatting');

const APP_NAME = 'ClipStack';
const HOTKEY_LABEL = 'Super+C';
const DEFAULT_HELPER_TEXT = `${HOTKEY_LABEL} abre o painel. Clique em um item para restaurar texto ou imagem.`;
let panelWindowRef = null;

// Evita falhas de GPU em alguns ambientes Linux empacotados.
app.disableHardwareAcceleration();

if (process.env.WAYLAND_DISPLAY) {
  app.commandLine.appendSwitch('enable-features', 'GlobalShortcutsPortal');
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

function createNotifier() {
  return {
    warn(message) {
      console.warn(message);

      if (Notification.isSupported()) {
        new Notification({
          title: APP_NAME,
          body: message
        }).show();
      }
    }
  };
}

function bootstrap() {
  const notifier = createNotifier();
  const historyStore = new ClipboardHistoryStore();
  const windowIcon = createAppIcon(64);
  const trayIcon = createAppIcon(22);

  const panelWindow = new PanelWindow(windowIcon);
  panelWindowRef = panelWindow;
  const trayService = new TrayService(trayIcon, APP_NAME);
  const clipboardService = new ClipboardService({ intervalMs: 350 });
  const hotkeyService = new GlobalHotkeyService(HOTKEY_LABEL);

  let helperText = DEFAULT_HELPER_TEXT;

  function buildState() {
    // A renderer recebe o historico ja pronto para exibir, sem conhecer a regra de negocio.
    const entries = historyStore.snapshot().map((entry, index) => {
      if (entry.type === 'image') {
        return {
          id: entry.id,
          type: entry.type,
          index: index + 1,
          thumbnailDataUrl: entry.thumbnailDataUrl,
          width: entry.width,
          height: entry.height,
          byteLength: entry.byteLength,
          preview: buildImagePreview(entry),
          tooltip: buildImageTooltip(entry)
        };
      }

      return {
        id: entry.id,
        type: 'text',
        text: entry.text,
        index: index + 1,
        preview: buildPreview(entry.text),
        tooltip: buildTooltip(entry.text)
      };
    });

    return {
      helperText,
      count: entries.length,
      entries
    };
  }

  function refreshUi() {
    const state = buildState();
    panelWindow.sendState(state);
    trayService.updateTooltip(state.count);
  }

  function updateHelperText(message) {
    helperText = message || DEFAULT_HELPER_TEXT;
    refreshUi();
  }

  clipboardService.on('copied', (text) => {
    if (historyStore.add(text)) {
      refreshUi();
    }
  });

  clipboardService.on('error', (error) => {
    notifier.warn(`Falha ao acessar o clipboard: ${error instanceof Error ? error.message : error}`);
  });

  panelWindow.on('restore', (entryId) => {
    const entry = historyStore.getById(entryId);
    if (!entry) {
      return;
    }

    // Restaurar um item nao deve reordenar o historico; apenas devolve o conteudo ao clipboard.
    clipboardService.writeEntry(entry);
  });

  panelWindow.on('delete-entry', (id) => {
    if (historyStore.remove(id)) {
      refreshUi();
    }
  });

  trayService.on('toggle', () => panelWindow.toggle());
  trayService.on('clear', () => {
    historyStore.clear();
    refreshUi();
  });
  trayService.on('quit', () => app.quit());
  trayService.on('unavailable', (message) => {
    updateHelperText(message);
    panelWindow.show();
  });

  hotkeyService.on('activated', () => panelWindow.toggle());
  hotkeyService.on('unavailable', (message) => {
    updateHelperText(message);
    notifier.warn(message);
  });

  app.on('activate', () => {
    panelWindow.toggle();
  });

  app.on('before-quit', () => {
    clipboardService.stop();
    hotkeyService.stop();
    trayService.destroy();
    panelWindow.destroy();
  });

  trayService.start();
  hotkeyService.start();
  clipboardService.start();
  refreshUi();
  panelWindow.show();
}

app.whenReady().then(() => {
  app.setName(APP_NAME);
  bootstrap();
});

app.on('second-instance', () => {
  if (panelWindowRef) {
    panelWindowRef.show();
  }
});
