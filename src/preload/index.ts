import { contextBridge, ipcRenderer } from 'electron';
import type { IpcRendererEvent } from 'electron';
import type { Api, Unsubscribe } from '../shared/types';
import { INVOKE, SEND, EVENT } from '../shared/ipc-channels';

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
  getApps: () => ipcRenderer.invoke(INVOKE.getApps),
  getIcon: (appPath) => ipcRenderer.invoke(INVOKE.getIcon, appPath),
  clearCache: () => ipcRenderer.invoke(INVOKE.clearCache),
  onAppsChanged: (callback) => subscribe(EVENT.appsChanged, callback),
  onCacheCleared: (callback) => subscribe(EVENT.cacheCleared, callback),
  getMessages: () => ipcRenderer.invoke(INVOKE.getMessages),
  getSettings: () => ipcRenderer.invoke(INVOKE.getSettings),
  getDefaultSettings: () => ipcRenderer.invoke(INVOKE.getDefaultSettings),
  getAppInfo: () => ipcRenderer.invoke(INVOKE.getAppInfo),
  openSettings: () => ipcRenderer.send(SEND.openSettings),
  setHotkeyRecording: (recording) => ipcRenderer.send(SEND.hotkeyRecording, recording),
  onHotkeyKey: (callback) => subscribe(EVENT.hotkeyKey, callback),
  setSettings: (partial) => ipcRenderer.invoke(INVOKE.setSettings, partial),
  onMessagesChanged: (callback) => subscribe(EVENT.messagesChanged, callback),
  getFavorites: () => ipcRenderer.invoke(INVOKE.getFavorites),
  toggleFavorite: (appPath) => ipcRenderer.invoke(INVOKE.toggleFavorite, appPath),
  launchApp: (appPath) => ipcRenderer.invoke(INVOKE.launchApp, appPath),
  resizeWindow: (height) => ipcRenderer.send(SEND.resizeWindow, height),
  onShown: (callback) => subscribe(EVENT.windowShown, callback),
};

contextBridge.exposeInMainWorld('api', api);
