'use strict';

const DEFAULT_CURSOR_OFFSET = 18;
const DEFAULT_EDGE_MARGIN = 16;

function clamp(value, min, max) {
  if (max < min) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}

function computeCursorAnchoredPosition(options) {
  const cursor = options?.cursor || { x: 0, y: 0 };
  const workArea = options?.workArea || { x: 0, y: 0, width: 0, height: 0 };
  const windowSize = options?.windowSize || { width: 0, height: 0 };
  const cursorOffset = Number(options?.cursorOffset) || DEFAULT_CURSOR_OFFSET;
  const edgeMargin = Number(options?.edgeMargin) || DEFAULT_EDGE_MARGIN;

  const minX = workArea.x + edgeMargin;
  const minY = workArea.y + edgeMargin;
  const maxX = Math.max(minX, workArea.x + workArea.width - windowSize.width - edgeMargin);
  const maxY = Math.max(minY, workArea.y + workArea.height - windowSize.height - edgeMargin);

  let x = cursor.x + cursorOffset;
  if (x > maxX) {
    x = cursor.x - windowSize.width - cursorOffset;
  }

  let y = cursor.y + cursorOffset;
  if (y > maxY) {
    y = cursor.y - windowSize.height - cursorOffset;
  }

  return {
    x: Math.round(clamp(x, minX, maxX)),
    y: Math.round(clamp(y, minY, maxY))
  };
}

module.exports = {
  DEFAULT_CURSOR_OFFSET,
  DEFAULT_EDGE_MARGIN,
  computeCursorAnchoredPosition
};
