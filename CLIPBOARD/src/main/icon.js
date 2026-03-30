'use strict';

const { nativeImage } = require('electron');

const ICON_SVG = `
<svg width="128" height="128" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="26" y="22" width="76" height="92" rx="18" fill="#FFF8EF" stroke="#0F172A" stroke-width="6"/>
  <rect x="42" y="12" width="44" height="24" rx="12" fill="#DBEEE2" stroke="#0F172A" stroke-width="6"/>
  <rect x="42" y="52" width="44" height="10" rx="5" fill="#D97706"/>
  <rect x="42" y="72" width="34" height="10" rx="5" fill="#D97706" opacity="0.78"/>
  <rect x="42" y="92" width="22" height="10" rx="5" fill="#D97706" opacity="0.56"/>
</svg>
`.trim();

function createAppIcon(size = 64) {
  const dataUrl = `data:image/svg+xml;base64,${Buffer.from(ICON_SVG).toString('base64')}`;
  return nativeImage.createFromDataURL(dataUrl).resize({ width: size, height: size });
}

module.exports = {
  createAppIcon
};
