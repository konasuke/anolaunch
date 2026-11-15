import { registerAppsIpc } from './apps';
import { registerFavoritesIpc } from './favorites';
import { registerSettingsIpc } from './settings';
import { registerWindowIpc } from './window';

// 画面とのやり取り（IPC）を、機能ごとに登録する。画面側の入口は preload/index.ts
function registerIpc(): void {
  registerAppsIpc();
  registerFavoritesIpc();
  registerSettingsIpc();
  registerWindowIpc();
}

export { registerIpc };
