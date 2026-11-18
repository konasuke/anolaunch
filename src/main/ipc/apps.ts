import { ipcMain } from 'electron';
import { getAppList, findApp, refreshApps } from '../app-list';
import { getIcon, clearIconCache } from '../icons';
import { launch } from '../launch';
import { isCommandPath, runCommand } from '../commands';
import { hideLauncher, sendToLauncher } from '../windows/launcher';
import { INVOKE, EVENT } from '../../shared/ipc-channels';

// アプリの一覧・アイコン・起動
function registerAppsIpc(): void {
  // アプリの一覧は、アイコン抜きで、すぐ返す。アイコンは、画面が表示する行の分だけ、あとから get-icon で取りに来る
  // （画面から来る要求は、一覧にあるアプリだけ受け付ける）
  ipcMain.handle(INVOKE.getApps, () => getAppList());
  ipcMain.handle(INVOKE.getIcon, (event, appPath) => {
    const found = findApp(appPath);
    return found ? getIcon(found) : null;
  });

  // キャッシュを削除する：取ってあるアイコンを（ファイルも）捨て、一覧も取り直す。
  // 終わったら、ランチャーの窓に伝えて、一覧とアイコンを取り直させる
  ipcMain.handle(INVOKE.clearCache, async () => {
    clearIconCache();
    await refreshApps({ force: true });
    sendToLauncher(EVENT.cacheCleared);
  });

  // 一覧にあるアプリ・コマンドだけ実行する（画面側から任意のパスを渡されても開かない）
  ipcMain.handle(INVOKE.launchApp, async (event, appPath) => {
    if (!findApp(appPath)) return;
    hideLauncher();
    if (isCommandPath(appPath)) {
      await runCommand(appPath);
      return;
    }
    const error = await launch(appPath);
    if (error) console.error(`起動できませんでした: ${appPath}: ${error}`);
  });
}

export { registerAppsIpc };
