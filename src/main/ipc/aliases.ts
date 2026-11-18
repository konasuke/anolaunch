import { ipcMain } from 'electron';
import { findApp } from '../app-list';
import { getAliases, setAliases } from '../store/aliases';
import { INVOKE } from '../../shared/ipc-channels';

// アプリの別名
function registerAliasesIpc(): void {
  ipcMain.handle(INVOKE.getAliases, () => getAliases());
  // 一覧にあるアプリ（・コマンド）だけ受け付ける（画面側から任意のパスを渡されても保存しない）
  ipcMain.handle(INVOKE.setAliases, (event, appPath, aliases) => {
    if (typeof appPath !== 'string' || !findApp(appPath)) return getAliases();
    return setAliases(appPath, aliases);
  });
}

export { registerAliasesIpc };
