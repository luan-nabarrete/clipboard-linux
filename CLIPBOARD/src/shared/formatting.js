'use strict';

function buildPreview(text, maxLength = 92) {
  const asString = String(text);

  if (asString.length <= maxLength) {
    return asString;
  }

  return `${asString.slice(0, maxLength - 3)}...`;
}

function buildTooltip(text, maxLength = 1200) {
  const asString = String(text);

  if (asString.length <= maxLength) {
    return asString;
  }

  return `${asString.slice(0, maxLength - 3)}...`;
}

function formatByteSize(byteLength) {
  const asNumber = Number(byteLength) || 0;

  if (asNumber <= 0) {
    return '';
  }

  if (asNumber < 1024) {
    return `${asNumber} B`;
  }

  if (asNumber < 1024 * 1024) {
    return `${(asNumber / 1024).toFixed(1)} KB`;
  }

  return `${(asNumber / (1024 * 1024)).toFixed(1)} MB`;
}

function buildImagePreview({ width, height } = {}) {
  if (width > 0 && height > 0) {
    return `${width} x ${height}`;
  }

  return 'Imagem copiada';
}

function buildImageTooltip({ width, height, byteLength } = {}) {
  const parts = ['Imagem copiada'];

  if (width > 0 && height > 0) {
    parts.push(`${width} x ${height}`);
  }

  const sizeLabel = formatByteSize(byteLength);
  if (sizeLabel) {
    parts.push(sizeLabel);
  }

  return parts.join(' · ');
}

module.exports = {
  buildPreview,
  buildTooltip,
  buildImagePreview,
  buildImageTooltip,
  formatByteSize
};
