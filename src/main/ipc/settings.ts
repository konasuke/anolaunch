import { BrowserWindow, ipcMain } from 'electron';
import { allMessages, setLanguage } from '../../shared/messages';
import { getSettings, updateSettings, getDefaults, isValidHotkey } from '../store/settings';
import { registerHotkey } from '../system/hotkey';
import { applyAutoStart } from '../system/autostart';
import { refreshTray } from '../system/tray';
import { openSettingsWindow, refreshSettingsWindowTitle, setHotkeyRecording } from '../windows/settings';
import { toggleLauncher, sendToLauncher } from '../windows/launcher';
import { INVOKE, SEND, EVENT } from '../../shared/ipc-channels';

// 設定と文言。設定の読み書きは、保存したら、すぐ反映する
function registerSettingsIpc(): void {
  // 画面に出す文言（今の言語のもの）を、画面側に渡す
  ipcMain.handle(INVOKE.getMessages, () => allMessages());

  ipcMain.handle(INVOKE.getSettings, () => getSettings());
  ipcMain.handle(INVOKE.getDefaultSettings, () => getDefaults());
  // 設定画面が、キーの表示と入力の変換を、どの OS に合わせるかを知るための情報
  ipcMain.handle(INVOKE.getAppInfo, () => ({ platform: process.platform }));
  // ランチャーの歯車ボタン・ショートカットから、設定画面を開く
  ipcMain.on(SEND.openSettings, () => openSettingsWindow());

  // 設定画面がホットキーの入力を始めた・やめたことを受け取る（入力中だけ、キーをメイン側で受け取る）
  ipcMain.on(SEND.hotkeyRecording, (event, recording) => setHotkeyRecording(Boolean(recording)));

  ipcMain.handle(INVOKE.setSettings, (event, partial) => {
    const before = getSettings();
    // ホットキーは、先に登録を試す。登録できなければ、何も保存せずに、失敗を返す
    if (partial && partial.hotkey !== undefined && partial.hotkey !== before.hotkey) {
      if (!isValidHotkey(partial.hotkey) || !registerHotkey(partial.hotkey, toggleLauncher)) {
        return { settings: before, error: 'hotkey' };
      }
    }
    const after = updateSettings(partial);
    if (after.autoStart !== before.autoStart) applyAutoStart(after.autoStart);
    if (after.language !== before.language) {
      setLanguage(after.language);
      refreshTray();
      refreshSettingsWindowTitle();
      // 開いている窓（ランチャーと設定画面）に、文言が変わったことを伝える
      for (const w of BrowserWindow.getAllWindows()) w.webContents.send(EVENT.messagesChanged);
      // コマンドの名前は言語で変わるので、ランチャーに一覧を取り直させる
      sendToLauncher(EVENT.appsChanged);
    }
    return { settings: after };
  });
}

export { registerSettingsIpc };
