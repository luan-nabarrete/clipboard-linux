'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { PasteTargetTracker } = require('../src/main/paste-target-tracker');

test('prime captura a janela ativa atual', () => {
  const tracker = new PasteTargetTracker({
    pasteService: {
      canTargetWindow() {
        return true;
      },
      captureTargetWindow() {
        return '0x100001';
      }
    },
    panelWindow: {
      isVisible() {
        return false;
      },
      isFocused() {
        return false;
      }
    }
  });

  assert.equal(tracker.prime(), '0x100001');
  assert.equal(tracker.getTargetWindowId(), '0x100001');
});

test('refresh atualiza o alvo enquanto o painel esta visivel e sem foco', () => {
  let scheduledRefresh = null;
  let currentTarget = '0x100001';

  const tracker = new PasteTargetTracker({
    pasteService: {
      canTargetWindow() {
        return true;
      },
      captureTargetWindow() {
        return currentTarget;
      }
    },
    panelWindow: {
      isVisible() {
        return true;
      },
      isFocused() {
        return false;
      }
    },
    scheduleInterval(callback) {
      scheduledRefresh = callback;
      return {
        unref() {}
      };
    },
    clearScheduledInterval() {}
  });

  tracker.prime();
  currentTarget = '0x200002';
  tracker.start();
  scheduledRefresh();

  assert.equal(tracker.getTargetWindowId(), '0x200002');
});

test('refresh preserva o alvo quando o painel esta focado', () => {
  let focused = false;
  let captures = 0;

  const tracker = new PasteTargetTracker({
    pasteService: {
      canTargetWindow() {
        return true;
      },
      captureTargetWindow() {
        captures += 1;
        return captures === 1 ? '0x100001' : '0x200002';
      }
    },
    panelWindow: {
      isVisible() {
        return true;
      },
      isFocused() {
        return focused;
      }
    }
  });

  tracker.prime();
  focused = true;
  tracker.refresh();

  assert.equal(captures, 1);
  assert.equal(tracker.getTargetWindowId(), '0x100001');
});

test('stop limpa o intervalo agendado', () => {
  const handles = [];
  const clearedHandles = [];

  const tracker = new PasteTargetTracker({
    pasteService: {
      canTargetWindow() {
        return true;
      },
      captureTargetWindow() {
        return '0x100001';
      }
    },
    panelWindow: {
      isVisible() {
        return false;
      },
      isFocused() {
        return false;
      }
    },
    scheduleInterval() {
      const handle = { id: 1 };
      handles.push(handle);
      return handle;
    },
    clearScheduledInterval(handle) {
      clearedHandles.push(handle);
    }
  });

  tracker.start();
  tracker.stop();

  assert.equal(handles.length, 1);
  assert.deepEqual(clearedHandles, handles);
});
