const { contextBridge, ipcRenderer } = require('electron');

// 画面側（renderer.js）に渡す関数だけを公開する
contextBridge.exposeInMainWorld('api', {
  getApps: () => ipcRenderer.invoke('get-apps'),
});
