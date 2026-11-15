import { join } from 'path';
import type { BrowserWindow } from 'electron';

// preload（画面に window.api を渡すスクリプト）の場所
const PRELOAD = join(__dirname, '../preload/index.js');

// 画面（HTML）を読み込む。page は、画面のフォルダからの場所（例：'index.html'）。
// 開発中（npm start）は Vite のサーバーから、ビルドしたあとは out/renderer のファイルから読む
function loadPage(win: BrowserWindow, page: string): void {
  const devUrl = process.env.ELECTRON_RENDERER_URL;
  if (devUrl) win.loadURL(`${devUrl}/${page}`);
  else win.loadFile(join(__dirname, '../renderer', page));
}

export { PRELOAD, loadPage };
