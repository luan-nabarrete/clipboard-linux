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

module.exports = {
  buildPreview,
  buildTooltip
};
