'use strict';

class PasteTargetTracker {
  constructor(options = {}) {
    this.pasteService = options.pasteService;
    this.panelWindow = options.panelWindow;
    this.intervalMs = Math.max(50, Number(options.intervalMs) || 120);
    this.scheduleInterval = options.scheduleInterval || setInterval;
    this.clearScheduledInterval = options.clearScheduledInterval || clearInterval;
    this.targetWindowId = null;
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
    this.targetWindowId = this.#captureCurrentTarget();
    return this.targetWindowId;
  }

  refresh() {
    if (!this.pasteService?.canTargetWindow?.()) {
      this.targetWindowId = null;
      return this.targetWindowId;
    }

    if (!this.panelWindow?.isVisible?.() || this.panelWindow?.isFocused?.()) {
      return this.targetWindowId;
    }

    const nextTargetWindowId = this.#captureCurrentTarget();
    if (nextTargetWindowId) {
      this.targetWindowId = nextTargetWindowId;
    }

    return this.targetWindowId;
  }

  clear() {
    this.targetWindowId = null;
  }

  getTargetWindowId() {
    return this.targetWindowId;
  }

  #captureCurrentTarget() {
    if (!this.pasteService?.canTargetWindow?.()) {
      return null;
    }

    return this.pasteService.captureTargetWindow();
  }
}

module.exports = {
  PasteTargetTracker
};
