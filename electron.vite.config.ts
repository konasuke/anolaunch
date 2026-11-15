import { resolve } from 'path';
import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';

// 開発中（npm start）だけ、Content-Security-Policy にインラインのスクリプトを許す。
// Vite と React の更新用の仕組み（HMR）が、HTML に小さなスクリプトを差し込むため。ビルドしたものには、効かない
function relaxCspInDev(): Plugin {
  return {
    name: 'relax-csp-in-dev',
    apply: 'serve',
    transformIndexHtml: (html) => html.replace("default-src 'self';", "default-src 'self'; script-src 'self' 'unsafe-inline';"),
  };
}

// メイン・preload・画面の3つを、それぞれビルドする（出力は out/）
export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    plugins: [react(), relaxCspInDev()],
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
