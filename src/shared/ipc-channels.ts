// IPC のチャンネル名。メイン・preload で同じ名前を使うため、ここに一元化する

// 画面 → メイン（返事あり：invoke / handle）
export const INVOKE = {
  getApps: 'get-apps',
  getIcon: 'get-icon',
  clearCache: 'clear-cache',
  launchApp: 'launch-app',
  openWebSearch: 'open-web-search',
  getMessages: 'get-messages',
  getSettings: 'get-settings',
  getDefaultSettings: 'get-default-settings',
  setSettings: 'set-settings',
  getAppInfo: 'get-app-info',
  getFavorites: 'get-favorites',
  toggleFavorite: 'toggle-favorite',
} as const;

// 画面 → メイン（返事なし：send / on）
export const SEND = {
  openSettings: 'open-settings',
  hotkeyRecording: 'hotkey-recording',
  resizeWindow: 'resize-window',
} as const;

// メイン → 画面（通知：webContents.send / ipcRenderer.on）
export const EVENT = {
  appsChanged: 'apps-changed',
  cacheCleared: 'cache-cleared',
  messagesChanged: 'messages-changed',
  hotkeyKey: 'hotkey-key',
  windowShown: 'window-shown',
} as const;
