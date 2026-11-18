// メイン・preload・画面で共有する型

import type { Kind } from './kinds';
import type { Language, Messages } from './messages';

// 一覧に出す1件のアプリ
export interface AppEntry {
  name: string;
  path: string; // 起動に使う値（.app / .lnk / steam://… / shell:AppsFolder\…）。一覧の中で重ならない
  kind: Kind;
  steamId?: string; // Steam のゲームの番号（重なりを除くために使う）
  iconFile?: string | null; // アイコンの画像ファイルが分かっているときの、その場所
  webSearch?: WebSearch; // Web 検索の項目のとき（画面が、入力から作る。メインの一覧には無い）
}

// 「g 文字列」の、検索先と検索語
export interface WebSearch {
  engine: string; // SEARCH_ENGINES の id
  query: string;
}

// 設定（settings.json に保存するもの）
export interface Settings {
  language: Language;
  hotkey: string; // Electron の Accelerator の書き方
  autoStart: boolean;
}

export interface SetSettingsResult {
  settings: Settings;
  error?: 'hotkey'; // ホットキーを登録できなかったとき
}

// 設定画面がホットキーの入力中に、メインから受け取るキー入力
export interface HotkeyKeyEvent {
  key: string;
  code: string;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
}

export interface AppInfo {
  platform: string; // process.platform（'darwin'・'win32' など）
}

// onXxx で登録した関数を、登録から外す
export type Unsubscribe = () => void;

// preload が画面に公開する関数（window.api）。メインの ipcMain.handle / on と対応する
export interface Api {
  getApps: () => Promise<AppEntry[]>;
  // 1件のアイコン（data URL。無ければ null）。画面に出す行の分だけ呼ぶ
  getIcon: (appPath: string) => Promise<string | null>;
  // キャッシュ（取ってあるアイコンと、ストアアプリの一覧）を削除する。終わるまで待てる
  clearCache: () => Promise<void>;
  // 「〜のときに呼ばれる関数を登録する」onXxx は、どれも、登録を解除する関数を返す
  // アプリの一覧が変わったとき（再スキャンで、追加・削除が見つかったとき）
  onAppsChanged: (callback: () => void) => Unsubscribe;
  // キャッシュが削除されたとき（一覧とアイコンを取り直すため）
  onCacheCleared: (callback: () => void) => Unsubscribe;
  getMessages: () => Promise<Messages>;
  getSettings: () => Promise<Settings>;
  getDefaultSettings: () => Promise<Settings>;
  getAppInfo: () => Promise<AppInfo>;
  openSettings: () => void;
  // ホットキーの入力中かどうかを、メインに伝える。入力中に押されたキーは、メインから届く
  setHotkeyRecording: (recording: boolean) => void;
  onHotkeyKey: (callback: (data: HotkeyKeyEvent) => void) => Unsubscribe;
  setSettings: (partial: Partial<Settings>) => Promise<SetSettingsResult>;
  // 言語が変わって、文言が入れ替わったとき
  onMessagesChanged: (callback: () => void) => Unsubscribe;
  // お気に入り（入れた順の、アプリの path の配列）。toggleFavorite は、切り替えた後の配列を返す
  getFavorites: () => Promise<string[]>;
  toggleFavorite: (appPath: string) => Promise<string[]>;
  launchApp: (appPath: string) => Promise<void>;
  // 検索先（SEARCH_ENGINES の id）と検索語で、既定のブラウザで Web 検索を開く
  openWebSearch: (engine: string, query: string) => Promise<void>;
  resizeWindow: (height: number) => void;
  // 窓が表示されたとき
  onShown: (callback: () => void) => Unsubscribe;
}
