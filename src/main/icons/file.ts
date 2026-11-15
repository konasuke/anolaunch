import { nativeImage } from 'electron';
import { ICON_SIZE } from './constants';

// アイコンの画像ファイル（.jpg・.png・.ico）を、そのまま読む。Steam のゲームのように、アイコンのファイルが分かっているときに使う
function iconFromImageFile(file: string): string | null {
  const image = nativeImage.createFromPath(file);
  return image.isEmpty() ? null : image.resize({ height: ICON_SIZE }).toDataURL();
}

export { iconFromImageFile };
