'use strict';

class PasteTargetTracker {
  constructor(options = {}) {
    this.pasteService = options.pasteService;
    this.panelWindow = options.panelWindow;
    this.intervalMs = Math.max(50, Number(options.intervalMs) || 120);
    this.scheduleInterval = options.scheduleInterval || setInterval;
    this.clearScheduledInterval = options.clearScheduledInterval || clearInterval;
    this.target = null;
    this.intervalHandle = null;
  }

  start() {
    if (this.intervalHandle) {
      return;
    }

    this.intervalHandle = this.scheduleInterval(() => {
      this.refresh();
    }, this.intervalMs);

    if (typeof this.intervalHandle?.unref === 'function') {
      this.intervalHandle.unref();
    }
  }

  stop() {
    if (!this.intervalHandle) {
      return;
    }

    this.clearScheduledInterval(this.intervalHandle);
    this.intervalHandle = null;
  }

  prime() {
    this.target = this.#captureCurrentTarget();
    return this.target;
  }

  refresh() {
    if (!this.pasteService?.canTargetWindow?.()) {
      this.target = null;
      return this.target;
    }

    if (!this.panelWindow?.isVisible?.() || this.panelWindow?.isFocused?.()) {
      return this.target;
    }

    const nextTarget = this.#captureCurrentTarget();
    if (nextTarget?.activationWindowId) {
      this.target = nextTarget;
    }

    return this.target;
  }

  clear() {
    this.target = null;
  }

  getTarget() {
    return this.target;
  }

  getTargetWindowId() {
    return this.target?.activationWindowId || null;
  }

  #captureCurrentTarget() {
    if (!this.pasteService?.canTargetWindow?.()) {
      return null;
    }

    const activationWindowId = this.pasteService.captureTargetWindow();
    if (!activationWindowId) {
      return null;
    }

    const focusedWindowId = this.pasteService.captureFocusedWindow() || activationWindowId;
    return {
      activationWindowId,
      focusedWindowId
    };
  }
}

module.exports = {
  PasteTargetTracker
};
