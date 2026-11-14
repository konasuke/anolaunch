const { contextBridge, ipcRenderer } = require('electron');

// 画面側（renderer.js）に渡す関数だけを公開する
contextBridge.exposeInMainWorld('api', {
  getApps: () => ipcRenderer.invoke('get-apps'),
  getMessages: () => ipcRenderer.invoke('get-messages'),
  launchApp: (appPath) => ipcRenderer.invoke('launch-app', appPath),
  resizeWindow: (height) => ipcRenderer.send('resize-window', height),
  // 窓が表示されたときに呼ばれる関数を登録する
  onShown: (callback) => ipcRenderer.on('window-shown', () => callback()),
});
