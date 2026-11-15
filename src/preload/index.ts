import { contextBridge, ipcRenderer } from 'electron';
import type { Api } from '../shared/types';

// 画面側に渡す関数だけを公開する（各関数の説明は、shared/types.ts の Api）
const api: Api = {
  getApps: () => ipcRenderer.invoke('get-apps'),
  getIcon: (appPath) => ipcRenderer.invoke('get-icon', appPath),
  clearCache: () => ipcRenderer.invoke('clear-cache'),
  onAppsChanged: (callback) => {
    ipcRenderer.on('apps-changed', () => callback());
  },
  onCacheCleared: (callback) => {
    ipcRenderer.on('cache-cleared', () => callback());
  },
  getMessages: () => ipcRenderer.invoke('get-messages'),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  getDefaultSettings: () => ipcRenderer.invoke('get-default-settings'),
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  openSettings: () => ipcRenderer.send('open-settings'),
  setHotkeyRecording: (recording) => ipcRenderer.send('hotkey-recording', recording),
  onHotkeyKey: (callback) => {
    ipcRenderer.on('hotkey-key', (_event, data) => callback(data));
  },
  setSettings: (partial) => ipcRenderer.invoke('set-settings', partial),
  onMessagesChanged: (callback) => {
    ipcRenderer.on('messages-changed', () => callback());
  },
  getFavorites: () => ipcRenderer.invoke('get-favorites'),
  toggleFavorite: (appPath) => ipcRenderer.invoke('toggle-favorite', appPath),
  launchApp: (appPath) => ipcRenderer.invoke('launch-app', appPath),
  resizeWindow: (height) => ipcRenderer.send('resize-window', height),
  onShown: (callback) => {
    ipcRenderer.on('window-shown', () => callback());
  },
};

contextBridge.exposeInMainWorld('api', api);
