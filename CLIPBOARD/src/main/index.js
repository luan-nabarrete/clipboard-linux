'use strict';

const { app, Notification } = require('electron');

const { ClipboardService } = require('./clipboard-service');
const { ClipboardHistoryStore } = require('./history-store');
const { GlobalHotkeyService } = require('./hotkey-service');
const { createAppIcon } = require('./icon');
const { PasteAutomationService } = require('./paste-service');
const { PasteTargetTracker } = require('./paste-target-tracker');
const { PreferenceStore } = require('./preferences-store');
const { TrayService } = require('./tray-service');
const { PanelWindow } = require('./window-manager');
const {
  buildPreview,
  buildTooltip,
  buildImagePreview,
  buildImageTooltip
} = require('../shared/formatting');

const APP_NAME = 'ClipStack';
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
  const preferenceStore = new PreferenceStore();
  let preferences = preferenceStore.getAll();
  const windowIcon = createAppIcon(64);
  const trayIcon = createAppIcon(22);
  const pasteService = new PasteAutomationService();

  const panelWindow = new PanelWindow(windowIcon, {
    alwaysOnTop: preferences.alwaysOnTop
  });
  panelWindowRef = panelWindow;
  const trayService = new TrayService(trayIcon, APP_NAME);
  const clipboardService = new ClipboardService({ intervalMs: 350 });
  const hotkeyService = new GlobalHotkeyService(preferences.hotkey);
  const pasteTargetTracker = new PasteTargetTracker({
    pasteService,
    panelWindow
  });

  let helperText = buildDefaultHelperText(preferences, pasteService);

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
      preferences,
      pasteStatus: pasteService.getStatus(),
      entries
    };
  }

  function refreshUi() {
    const state = buildState();
    panelWindow.sendState(state);
    trayService.updateTooltip(state.count);
  }

  function updateHelperText(message) {
    helperText = message || buildDefaultHelperText(preferences, pasteService);
    refreshUi();
  }

  function primePasteTarget() {
    return pasteTargetTracker.prime();
  }

  async function restoreTargetFocusAfterPanelShow() {
    const pasteTargetWindowId = pasteTargetTracker.getTargetWindowId();
    if (!pasteTargetWindowId || !pasteService.canTargetWindow()) {
      return;
    }

    const activationResult = await pasteService.activateWindow(pasteTargetWindowId, {
      delayMs: 45
    });

    if (!activationResult.ok) {
      return;
    }

    panelWindow.blur();
    panelWindow.moveTop();
  }

  async function restoreTargetFocusAfterPaste() {
    const pasteTargetWindowId = pasteTargetTracker.getTargetWindowId();
    if (!pasteTargetWindowId || !pasteService.canTargetWindow()) {
      return;
    }

    panelWindow.blur();
    await pasteService.activateWindow(pasteTargetWindowId, {
      delayMs: 45
    });
    panelWindow.moveTop();
  }

  async function showPanelNearCursor() {
    const pasteTarget = primePasteTarget();
    const pasteTargetWindowId = pasteTarget?.activationWindowId || null;
    const shouldKeepPinned = Boolean(preferences.alwaysOnTop);
    panelWindow.setTransientAlwaysOnTop(shouldKeepPinned);

    const shouldPreserveFocus = shouldKeepPinned && Boolean(pasteTargetWindowId && pasteService.canTargetWindow());

    panelWindow.showNearCursor({
      focus: !shouldPreserveFocus
    });

    if (shouldPreserveFocus) {
      await restoreTargetFocusAfterPanelShow();
      return;
    }

    panelWindow.moveTop();
  }

  function persistPreferences(nextPreferences) {
    preferences = preferenceStore.update(nextPreferences);
    return preferences;
  }

  async function applyPreferences(patch) {
    const desiredPreferences = {
      ...preferences,
      ...patch
    };

    if (desiredPreferences.hotkey !== preferences.hotkey) {
      const hotkeyResult = hotkeyService.updateAccelerator(desiredPreferences.hotkey, {
        silent: true
      });
      if (!hotkeyResult.ok) {
        updateHelperText(hotkeyResult.message);
        notifier.warn(hotkeyResult.message);
        return {
          ok: false,
          message: hotkeyResult.message,
          preferences
        };
      }
    }

    panelWindow.setAlwaysOnTop(desiredPreferences.alwaysOnTop);
    if (!desiredPreferences.alwaysOnTop) {
      panelWindow.clearTransientAlwaysOnTop();
    }

    try {
      persistPreferences(desiredPreferences);
    } catch (error) {
      const message = `Nao foi possivel salvar as preferencias: ${
        error instanceof Error ? error.message : error
      }`;
      updateHelperText(message);
      notifier.warn(message);

      return {
        ok: false,
        message,
        preferences
      };
    }

    updateHelperText();
    return {
      ok: true,
      preferences
    };
  }

  clipboardService.on('copied', (text) => {
    if (historyStore.add(text)) {
      refreshUi();
    }
  });

  clipboardService.on('error', (error) => {
    notifier.warn(`Falha ao acessar o clipboard: ${error instanceof Error ? error.message : error}`);
  });

  panelWindow.on('paste-entry', async (entryId) => {
    const entry = historyStore.getById(entryId);
    if (!entry) {
      return {
        ok: false,
        message: 'Item nao encontrado no historico.'
      };
    }

    clipboardService.writeEntry(entry);
    const pasteTarget = pasteTargetTracker.getTarget();
    const pasteTargetWindowId = pasteTarget?.activationWindowId || null;
    const shouldKeepVisibleDuringPaste = Boolean(
      preferences.alwaysOnTop && pasteService.canTargetWindow() && pasteTargetWindowId
    );

    if (!shouldKeepVisibleDuringPaste) {
      panelWindow.hide();
    }

    const pasteResult = await pasteService.pasteClipboard({
      targetWindowId: pasteService.canTargetWindow() ? pasteTargetWindowId : null,
      focusedWindowId: pasteService.canTargetWindow() ? pasteTarget?.focusedWindowId || null : null,
      delayMs: shouldKeepVisibleDuringPaste ? 0 : 140
    });

    if (shouldKeepVisibleDuringPaste) {
      await restoreTargetFocusAfterPaste();
    }

    if (!pasteResult.ok) {
      updateHelperText(pasteResult.message);
      notifier.warn(pasteResult.message);
      return pasteResult;
    }

    updateHelperText();
    return pasteResult;
  });

  panelWindow.on('delete-entry', (id) => {
    if (historyStore.remove(id)) {
      refreshUi();
    }
  });

  panelWindow.on('update-preferences', (patch) => applyPreferences(patch));

  trayService.on('toggle', () => {
    if (panelWindow.isVisible()) {
      panelWindow.clearTransientAlwaysOnTop();
      panelWindow.hide();
      return;
    }

    void showPanelNearCursor();
  });
  trayService.on('clear', () => {
    historyStore.clear();
    refreshUi();
  });
  trayService.on('quit', () => app.quit());
  trayService.on('unavailable', (message) => {
    updateHelperText(message);
    panelWindow.show();
  });

  hotkeyService.on('activated', () => {
    if (panelWindow.isVisible()) {
      panelWindow.clearTransientAlwaysOnTop();
      panelWindow.hide();
      return;
    }

    void showPanelNearCursor();
  });
  hotkeyService.on('unavailable', (message) => {
    updateHelperText(message);
    notifier.warn(message);
  });
  hotkeyService.on('registered', () => {
    updateHelperText();
  });

  app.on('activate', () => {
    void showPanelNearCursor();
  });

  app.on('before-quit', () => {
    clipboardService.stop();
    hotkeyService.stop();
    pasteTargetTracker.stop();
    trayService.destroy();
    panelWindow.destroy();
  });

  trayService.start();
  hotkeyService.start();
  clipboardService.start();
  pasteTargetTracker.start();
  refreshUi();
}

function buildDefaultHelperText(preferences, pasteService) {
  const hotkeyLabel = preferences?.hotkey || 'Super+C';
  const pasteStatus = pasteService.getStatus();

  if (pasteStatus.available && pasteStatus.limited) {
    return `${hotkeyLabel} abre o painel perto do cursor. ${pasteStatus.message}`;
  }

  if (pasteStatus.available) {
    return `${hotkeyLabel} abre o painel perto do cursor. Clique em um item para colar imediatamente no app ativo.`;
  }

  return `${hotkeyLabel} abre o painel perto do cursor. ${pasteStatus.message}`;
}

app.whenReady().then(() => {
  app.setName(APP_NAME);
  bootstrap();
});

app.on('second-instance', () => {
  if (panelWindowRef) {
    panelWindowRef.setTransientAlwaysOnTop(true);
    panelWindowRef.showNearCursor();
  }
});
