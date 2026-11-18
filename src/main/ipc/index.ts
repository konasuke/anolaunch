import { registerAliasesIpc } from './aliases';
import { registerAppsIpc } from './apps';
import { registerFavoritesIpc } from './favorites';
import { registerSearchIpc } from './search';
import { registerSettingsIpc } from './settings';
import { registerWindowIpc } from './window';

// 画面とのやり取り（IPC）を、機能ごとに登録する。画面側の入口は preload/index.ts
function registerIpc(): void {
  registerAliasesIpc();
  registerAppsIpc();
  registerFavoritesIpc();
  registerSearchIpc();
  registerSettingsIpc();
  registerWindowIpc();
}

export { registerIpc };
