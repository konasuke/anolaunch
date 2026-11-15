import { app, globalShortcut } from 'electron';
import { initAppList, refreshApps } from './app-list';
import { cleanupIcons, pruneIconCache } from './icons';
import { createTray } from './system/tray';
import { getSettings } from './store/settings';
import { registerHotkey } from './system/hotkey';
import { applyAutoStart } from './system/autostart';
import { openSettingsWindow } from './windows/settings';
import { setLanguage } from '../shared/messages';
import { registerIpc } from './ipc';
import { createLauncherWindow, showLauncher, toggleLauncher, sendToLauncher } from './windows/launcher';
import { EVENT } from '../shared/ipc-channels';

// 二重起動を防ぐ。すでに動いているときは、あとから起動したほうがすぐ終わる
const hasLock = app.requestSingleInstanceLock();
if (!hasLock) app.quit();

// あとから起動されたら、動いているほうの窓を出す（ホットキーの代わりに使える）
app.on('second-instance', showLauncher);

app.whenReady().then(() => {
  if (!hasLock) return;

  // Mac：常駐するので、Dock にアイコンを出さない（目印はメニューバーのトレイ）
  if (process.platform === 'darwin') app.dock?.hide();

  // 保存してある設定を反映してから、トレイを作る（言語がトレイの文言に効くため）
  const settings = getSettings();
  setLanguage(settings.language);
  createTray({ onShow: showLauncher, onSettings: openSettingsWindow });
  applyAutoStart(settings.autoStart);

  registerIpc();

  // 再スキャンで一覧が変わったら、ランチャーの窓に知らせて、取り直させる
  initAppList({ onListChange: () => sendToLauncher(EVENT.appsChanged) });

  // 起動の少しあとに、一覧を最新にする（保存してあったストアアプリの一覧は、古いかもしれない）。
  // ログイン直後の、ほかのアプリの起動と取り合わないよう、すぐにはやらない
  setTimeout(() => refreshApps({ force: true }), 5000);

  createLauncherWindow();

  // 長く使われていないアイコンのファイルを、起動の少しあとに掃除する（起動の邪魔をしないため）
  setTimeout(pruneIconCache, 30 * 1000);

  if (!registerHotkey(settings.hotkey, toggleLauncher)) {
    console.error(`ホットキー ${settings.hotkey} を登録できませんでした`);
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  cleanupIcons();
});

// ランチャーなので、窓を全部閉じても終了しない（常駐する）
app.on('window-all-closed', () => {});
