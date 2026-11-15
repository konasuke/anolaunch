import { contextBridge, ipcRenderer } from 'electron';
import type { IpcRendererEvent } from 'electron';
import type { Api, Unsubscribe } from '../shared/types';

// メインからの通知を受け取る関数を登録する。登録を外す関数を返す
function subscribe<T = undefined>(channel: string, callback: (data: T) => void): Unsubscribe {
  const handler = (_event: IpcRendererEvent, data: T) => callback(data);
  ipcRenderer.on(channel, handler);
  return () => {
    ipcRenderer.removeListener(channel, handler);
  };
}

// 画面側に渡す関数だけを公開する（各関数の説明は、shared/types.ts の Api）
const api: Api = {
  getApps: () => ipcRenderer.invoke('get-apps'),
  getIcon: (appPath) => ipcRenderer.invoke('get-icon', appPath),
  clearCache: () => ipcRenderer.invoke('clear-cache'),
  onAppsChanged: (callback) => subscribe('apps-changed', callback),
  onCacheCleared: (callback) => subscribe('cache-cleared', callback),
  getMessages: () => ipcRenderer.invoke('get-messages'),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  getDefaultSettings: () => ipcRenderer.invoke('get-default-settings'),
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  openSettings: () => ipcRenderer.send('open-settings'),
  setHotkeyRecording: (recording) => ipcRenderer.send('hotkey-recording', recording),
  onHotkeyKey: (callback) => subscribe('hotkey-key', callback),
  setSettings: (partial) => ipcRenderer.invoke('set-settings', partial),
  onMessagesChanged: (callback) => subscribe('messages-changed', callback),
  getFavorites: () => ipcRenderer.invoke('get-favorites'),
  toggleFavorite: (appPath) => ipcRenderer.invoke('toggle-favorite', appPath),
  launchApp: (appPath) => ipcRenderer.invoke('launch-app', appPath),
  resizeWindow: (height) => ipcRenderer.send('resize-window', height),
  onShown: (callback) => subscribe('window-shown', callback),
};

contextBridge.exposeInMainWorld('api', api);
