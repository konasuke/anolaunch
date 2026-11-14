const { nativeImage } = require('electron');
const { ICON_SIZE } = require('./constants');

// アイコンの画像ファイル（.jpg・.png・.ico）を、そのまま読む。Steam のゲームのように、アイコンのファイルが分かっているときに使う
function iconFromImageFile(file) {
  const image = nativeImage.createFromPath(file);
  return image.isEmpty() ? null : image.resize({ height: ICON_SIZE }).toDataURL();
}

module.exports = { iconFromImageFile };
