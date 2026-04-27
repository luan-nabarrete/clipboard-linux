'use strict';

const historyList = document.getElementById('historyList');
const emptyState = document.getElementById('emptyState');
const statusText = document.getElementById('statusText');
const helperText = document.getElementById('helperText');
const closeButton = document.getElementById('closeButton');
const resizeHandle = document.getElementById('resizeHandle');
const dragRail = document.getElementById('dragRail');
const themeButton = document.getElementById('themeButton');
const themePopover = document.getElementById('themePopover');
const themeResetButton = document.getElementById('themeResetButton');
const alwaysOnTopToggle = document.getElementById('alwaysOnTopToggle');
const hotkeyForm = document.getElementById('hotkeyForm');
const hotkeyInput = document.getElementById('hotkeyInput');
const hotkeySaveButton = document.getElementById('hotkeySaveButton');
const hotkeyHint = document.getElementById('hotkeyHint');
const pasteCapability = document.getElementById('pasteCapability');

const themeInputs = {
  text: document.getElementById('themeTextColor'),
  panel: document.getElementById('themePanelColor'),
  surface: document.getElementById('themeSurfaceColor'),
  bars: document.getElementById('themeBarsColor'),
  accent: document.getElementById('themeAccentColor'),
  danger: document.getElementById('themeDangerColor')
};

const THEME_STORAGE_KEY = 'clipstack.theme.v1';
const DEFAULT_THEME = Object.freeze({
  text: '#f4f7ff',
  panel: '#161616',
  surface: '#2c2c2c',
  bars: '#0d3a86',
  accent: '#5754d2',
  danger: '#ef2929'
});

let resizeState = null;
let dragPointerId = null;
let currentTheme = { ...DEFAULT_THEME };
let currentState = null;
let hotkeyDirty = false;
let isSavingHotkey = false;
const actionFeedbackTimers = new WeakMap();

function normalizeHexColor(value) {
  if (typeof value !== 'string' || !/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value)) {
    return null;
  }

  if (value.length === 4) {
    return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`.toLowerCase();
  }

  return value.toLowerCase();
}

function hexToRgb(color) {
  const normalized = normalizeHexColor(color) || '#000000';

  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16)
  };
}

function channelToHex(value) {
  return value.toString(16).padStart(2, '0');
}

function mix(colorA, colorB, ratioToB) {
  const left = hexToRgb(colorA);
  const right = hexToRgb(colorB);
  const ratio = Math.min(1, Math.max(0, ratioToB));

  const r = Math.round(left.r * (1 - ratio) + right.r * ratio);
  const g = Math.round(left.g * (1 - ratio) + right.g * ratio);
  const b = Math.round(left.b * (1 - ratio) + right.b * ratio);

  return `#${channelToHex(r)}${channelToHex(g)}${channelToHex(b)}`;
}

function rgba(color, alpha) {
  const { r, g, b } = hexToRgb(color);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function sanitizeTheme(candidate) {
  return Object.fromEntries(
    Object.entries(DEFAULT_THEME).map(([key, fallback]) => [key, normalizeHexColor(candidate?.[key]) || fallback])
  );
}

function buildThemeVariables(theme) {
  const text = theme.text;
  const panel = theme.panel;
  const surface = theme.surface;
  const bars = theme.bars;
  const accent = theme.accent;
  const danger = theme.danger;

  const shellTop = mix(surface, bars, 0.18);
  const shellBottom = mix(panel, '#000000', 0.08);
  const helperSurface = mix(surface, panel, 0.45);
  const emptyTop = mix(surface, '#ffffff', 0.03);
  const emptyBottom = mix(panel, '#000000', 0.08);
  const cardTop = mix(bars, '#ffffff', 0.08);
  const cardBottom = mix(surface, panel, 0.35);
  const cardHoverTop = mix(bars, accent, 0.25);
  const cardHoverBottom = mix(surface, accent, 0.16);
  const indexBorder = mix(text, panel, 0.45);
  const deleteBase = mix(danger, panel, 0.72);
  const deleteHover = mix(danger, panel, 0.5);

  return {
    '--paper': panel,
    '--paper-strong': surface,
    '--surface': mix(surface, panel, 0.16),
    '--surface-soft': rgba(helperSurface, 0.78),
    '--ink': text,
    '--muted': mix(text, panel, 0.48),
    '--accent-green': text,
    '--accent-blue': bars,
    '--accent-purple': accent,
    '--accent-soft': rgba(bars, 0.26),
    '--success-soft': rgba(accent, 0.18),
    '--success-line': accent,
    '--danger': danger,
    '--line': rgba(accent, 0.28),
    '--line-strong': rgba(text, 0.24),
    '--shadow': rgba(panel, 0.5),
    '--shell-background': `linear-gradient(180deg, ${shellTop}, ${shellBottom})`,
    '--shell-shadow': `0 10px 20px ${rgba(panel, 0.22)}`,
    '--ghost-background': rgba(surface, 0.96),
    '--ghost-hover-background': rgba(accent, 0.18),
    '--ghost-hover-border': text,
    '--status-background': `linear-gradient(135deg, ${rgba(bars, 0.48)}, ${rgba(accent, 0.24)})`,
    '--status-border': rgba(accent, 0.34),
    '--helper-background': rgba(helperSurface, 0.94),
    '--empty-border': rgba(accent, 0.42),
    '--empty-background': `linear-gradient(180deg, ${emptyTop}, ${emptyBottom})`,
    '--card-border': rgba(accent, 0.2),
    '--card-background': `linear-gradient(135deg, ${rgba(cardTop, 0.78)}, ${rgba(cardBottom, 0.98)})`,
    '--card-hover-background': `linear-gradient(135deg, ${rgba(cardHoverTop, 0.86)}, ${rgba(cardHoverBottom, 0.98)})`,
    '--card-hover-border': rgba(text, 0.34),
    '--index-background': `linear-gradient(135deg, ${rgba(accent, 0.48)}, ${rgba(bars, 0.7)})`,
    '--index-border': rgba(indexBorder, 0.52),
    '--delete-border': rgba(danger, 0.32),
    '--delete-background': rgba(deleteBase, 0.94),
    '--delete-hover-background': rgba(deleteHover, 0.98),
    '--drag-border': rgba(accent, 0.34),
    '--drag-background': `linear-gradient(90deg, ${bars}, ${accent})`,
    '--drag-shadow': `0 10px 24px ${rgba(panel, 0.32)}`,
    '--drag-line': rgba(text, 0.92),
    '--resize-color': rgba(accent, 0.82),
    '--scrollbar-thumb': `linear-gradient(180deg, ${rgba(bars, 0.92)}, ${rgba(accent, 0.92)})`,
    '--theme-preview': `conic-gradient(from 180deg, ${bars}, ${accent}, ${text}, ${danger}, ${bars})`
  };
}

function persistTheme(theme) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(theme));
  } catch {
    // Se o storage falhar, seguimos com o tema atual na sessao.
  }
}

function readStoredTheme() {
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    return raw ? sanitizeTheme(JSON.parse(raw)) : { ...DEFAULT_THEME };
  } catch {
    return { ...DEFAULT_THEME };
  }
}

function hydrateThemeInputs(theme) {
  Object.entries(themeInputs).forEach(([key, input]) => {
    if (input) {
      input.value = theme[key];
    }
  });
}

function applyTheme(theme) {
  currentTheme = sanitizeTheme(theme);

  const themeVariables = buildThemeVariables(currentTheme);
  Object.entries(themeVariables).forEach(([token, value]) => {
    document.documentElement.style.setProperty(token, value);
  });
}

function setThemePopoverOpen(isOpen) {
  themePopover.hidden = !isOpen;
  themeButton.setAttribute('aria-expanded', String(isOpen));
}

function buildFallbackHelperText() {
  const hotkeyLabel = currentState?.preferences?.hotkey || 'Super+C';
  return `${hotkeyLabel} abre o painel perto do cursor. Clique em um item para colar imediatamente no app ativo.`;
}

function showActionFeedback(button, feedbackLabel) {
  const existingTimer = actionFeedbackTimers.get(button);
  if (existingTimer) {
    window.clearTimeout(existingTimer);
  }

  button.classList.remove('is-copied');
  button.dataset.feedback = feedbackLabel;

  // Reinicia a animacao mesmo em cliques repetidos no mesmo item.
  void button.offsetWidth;
  button.classList.add('is-copied');

  const timer = window.setTimeout(() => {
    button.classList.remove('is-copied');
    delete button.dataset.feedback;
    actionFeedbackTimers.delete(button);
  }, 1150);

  actionFeedbackTimers.set(button, timer);
}

function syncHotkeySaveState() {
  const savedHotkey = currentState?.preferences?.hotkey || 'Super+C';
  const candidate = hotkeyInput.value.trim();
  const hasChanged = candidate.length > 0 && candidate !== savedHotkey;
  hotkeySaveButton.disabled = isSavingHotkey || !hasChanged;
}

function syncPreferenceControls(state) {
  const preferences = state?.preferences || {};
  alwaysOnTopToggle.checked = Boolean(preferences.alwaysOnTop);

  if (!hotkeyDirty && document.activeElement !== hotkeyInput) {
    hotkeyInput.value = preferences.hotkey || 'Super+C';
  }

  hotkeyHint.textContent = `Atalho atual: ${preferences.hotkey || 'Super+C'}. Use o formato do Electron, como Super+C ou Ctrl+Alt+Space.`;
  pasteCapability.textContent = state?.pasteStatus?.displayName
    ? state.pasteStatus.displayName
    : 'Sem backend';

  syncHotkeySaveState();
}

function renderState(state) {
  currentState = state;
  const entries = Array.isArray(state.entries) ? state.entries : [];

  statusText.textContent = entries.length
    ? `${entries.length} item(ns) capturado(s)`
    : 'Aguardando copias...';
  helperText.textContent = state.helperText || buildFallbackHelperText();
  syncPreferenceControls(state);

  historyList.innerHTML = '';

  if (!entries.length) {
    historyList.hidden = true;
    emptyState.hidden = false;
    return;
  }

  entries.forEach((entry) => {
    const item = document.createElement('li');
    item.className = 'history-item';

    const row = document.createElement('div');
    row.className = 'history-row';

    const button = document.createElement('button');
    button.className = 'history-button';
    button.type = 'button';
    button.title = entry.tooltip || '';

    const index = document.createElement('span');
    index.className = 'item-index';
    index.textContent = String(entry.index);

    const content = document.createElement('span');
    content.className = 'item-content';

    if (entry.type === 'image') {
      const thumbnail = document.createElement('img');
      thumbnail.className = 'item-thumbnail';
      thumbnail.alt = 'Preview da imagem copiada';
      thumbnail.src = entry.thumbnailDataUrl;

      const meta = document.createElement('span');
      meta.className = 'item-meta';

      const title = document.createElement('strong');
      title.className = 'item-title';
      title.textContent = 'Imagem copiada';

      const preview = document.createElement('span');
      preview.className = 'item-preview item-preview-image';
      preview.textContent = entry.preview || 'Imagem copiada';

      meta.append(title, preview);
      content.append(thumbnail, meta);
    } else {
      const preview = document.createElement('span');
      preview.className = 'item-preview';
      preview.textContent = entry.preview || entry.text;
      content.append(preview);
    }

    button.append(index, content);
    button.addEventListener('click', async () => {
      if (button.disabled) {
        return;
      }

      button.disabled = true;

      try {
        const result = await window.clipstack.pasteEntry(entry.id);
        showActionFeedback(button, result?.ok ? 'Colado' : 'Falhou');
      } finally {
        button.disabled = false;
      }
    });

    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete-button';
    deleteButton.type = 'button';
    deleteButton.title = 'Remover item';
    deleteButton.setAttribute('aria-label', `Remover item ${entry.index}`);
    deleteButton.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M4 7h16" />
        <path d="M10 11v6" />
        <path d="M14 11v6" />
        <path d="M6 7l1 12h10l1-12" />
        <path d="M9 7V4h6v3" />
      </svg>
    `;
    deleteButton.addEventListener('click', (event) => {
      event.stopPropagation();
      window.clipstack.deleteEntry(entry.id);
    });

    row.append(button, deleteButton);
    item.append(row);
    historyList.append(item);
  });

  historyList.hidden = false;
  emptyState.hidden = true;

  const firstButton = historyList.querySelector('button');
  const shouldFocusFirstItem = document.hasFocus()
    && (document.activeElement === document.body || document.activeElement === null);
  if (shouldFocusFirstItem && firstButton instanceof HTMLButtonElement) {
    firstButton.focus();
  }
}

closeButton.addEventListener('click', () => {
  window.clipstack.hidePanel();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    if (!themePopover.hidden) {
      setThemePopoverOpen(false);
      return;
    }

    window.clipstack.hidePanel();
  }
});

themeButton.addEventListener('click', (event) => {
  event.stopPropagation();
  setThemePopoverOpen(themePopover.hidden);
});

themePopover.addEventListener('pointerdown', (event) => {
  event.stopPropagation();
});

document.addEventListener('pointerdown', (event) => {
  if (themePopover.hidden) {
    return;
  }

  if (themePopover.contains(event.target) || themeButton.contains(event.target)) {
    return;
  }

  setThemePopoverOpen(false);
});

themeResetButton.addEventListener('click', () => {
  applyTheme(DEFAULT_THEME);
  hydrateThemeInputs(currentTheme);
  persistTheme(currentTheme);
});

alwaysOnTopToggle.addEventListener('change', async () => {
  const nextValue = alwaysOnTopToggle.checked;
  const result = await window.clipstack.updatePreferences({
    alwaysOnTop: nextValue
  });

  if (!result?.ok) {
    alwaysOnTopToggle.checked = Boolean(currentState?.preferences?.alwaysOnTop);
  }
});

hotkeyInput.addEventListener('input', () => {
  hotkeyDirty = true;
  syncHotkeySaveState();
});

hotkeyForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const nextHotkey = hotkeyInput.value.trim();
  if (!nextHotkey || isSavingHotkey) {
    return;
  }

  isSavingHotkey = true;
  syncHotkeySaveState();

  try {
    const result = await window.clipstack.updatePreferences({
      hotkey: nextHotkey
    });

    hotkeyDirty = false;
    hotkeyInput.value = result?.preferences?.hotkey || currentState?.preferences?.hotkey || 'Super+C';
  } finally {
    isSavingHotkey = false;
    syncHotkeySaveState();
  }
});

Object.entries(themeInputs).forEach(([key, input]) => {
  input.addEventListener('input', () => {
    currentTheme = {
      ...currentTheme,
      [key]: normalizeHexColor(input.value) || DEFAULT_THEME[key]
    };

    applyTheme(currentTheme);
    persistTheme(currentTheme);
  });
});

dragRail.addEventListener('pointerdown', (event) => {
  dragPointerId = event.pointerId;
  dragRail.setPointerCapture(event.pointerId);
  window.clipstack.startDrag(event.screenX, event.screenY);
  event.preventDefault();
});

dragRail.addEventListener('pointermove', (event) => {
  if (dragPointerId !== event.pointerId) {
    return;
  }

  window.clipstack.dragTo(event.screenX, event.screenY);
});

function finishDrag(event) {
  if (dragPointerId !== event.pointerId) {
    return;
  }

  dragPointerId = null;
  window.clipstack.endDrag();
}

dragRail.addEventListener('pointerup', finishDrag);
dragRail.addEventListener('pointercancel', finishDrag);

resizeHandle.addEventListener('mousedown', (event) => {
  resizeState = {
    startX: event.clientX,
    startY: event.clientY,
    startWidth: window.innerWidth,
    startHeight: window.innerHeight
  };

  document.body.classList.add('is-resizing');
  event.preventDefault();
});

window.addEventListener('mousemove', (event) => {
  if (!resizeState) {
    return;
  }

  const nextWidth = resizeState.startWidth + (event.clientX - resizeState.startX);
  const nextHeight = resizeState.startHeight + (event.clientY - resizeState.startY);
  window.clipstack.setPanelSize(nextWidth, nextHeight);
});

window.addEventListener('mouseup', () => {
  resizeState = null;
  document.body.classList.remove('is-resizing');
});

window.clipstack.onStateUpdate((state) => {
  renderState(state);
});

applyTheme(readStoredTheme());
hydrateThemeInputs(currentTheme);
window.clipstack.ready();
