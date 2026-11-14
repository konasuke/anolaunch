const { contextBridge, ipcRenderer } = require('electron');

// 画面側（renderer.js）に渡す関数だけを公開する
contextBridge.exposeInMainWorld('api', {
  getApps: () => ipcRenderer.invoke('get-apps'),
  // 1件のアイコン（data URL。無ければ null）。画面に出す行の分だけ呼ぶ
  getIcon: (appPath) => ipcRenderer.invoke('get-icon', appPath),
  // キャッシュ（取ってあるアイコンと、ストアアプリの一覧）を削除する。終わるまで待てる
  clearCache: () => ipcRenderer.invoke('clear-cache'),
  // キャッシュが削除されたときに呼ばれる関数を登録する（一覧とアイコンを取り直すため）
  onCacheCleared: (callback) => ipcRenderer.on('cache-cleared', () => callback()),
  getMessages: () => ipcRenderer.invoke('get-messages'),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  getDefaultSettings: () => ipcRenderer.invoke('get-default-settings'),
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  openSettings: () => ipcRenderer.send('open-settings'),
  // ホットキーの入力中かどうかを、メインに伝える。入力中に押されたキーは、メインから届く
  setHotkeyRecording: (recording) => ipcRenderer.send('hotkey-recording', recording),
  onHotkeyKey: (callback) => ipcRenderer.on('hotkey-key', (event, data) => callback(data)),
  setSettings: (partial) => ipcRenderer.invoke('set-settings', partial),
  // 言語が変わって、文言が入れ替わったときに呼ばれる関数を登録する
  onMessagesChanged: (callback) => ipcRenderer.on('messages-changed', () => callback()),
  launchApp: (appPath) => ipcRenderer.invoke('launch-app', appPath),
  resizeWindow: (height) => ipcRenderer.send('resize-window', height),
  // 窓が表示されたときに呼ばれる関数を登録する
  onShown: (callback) => ipcRenderer.on('window-shown', () => callback()),
});
