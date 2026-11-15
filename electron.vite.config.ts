import { resolve } from 'path';
import { defineConfig } from 'electron-vite';

// メイン・preload・画面の3つを、それぞれビルドする（出力は out/）
export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    build: {
      rollupOptions: {
        // 画面の入口は2つ（ランチャーと設定画面）
        input: {
          index: resolve(__dirname, 'src/renderer/index.html'),
          'settings/index': resolve(__dirname, 'src/renderer/settings/index.html'),
        },
      },
    },
  },
});
