'use strict';

const path = require('node:path');
const { nativeImage } = require('electron');

const ICON_PATH = path.join(__dirname, '..', '..', 'assets', 'icon.svg');

function createAppIcon(size = 64) {
  const image = nativeImage.createFromPath(ICON_PATH);
  return image.resize({ width: size, height: size });
}

module.exports = {
  createAppIcon
};
