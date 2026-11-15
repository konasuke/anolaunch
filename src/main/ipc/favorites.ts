import { ipcMain } from 'electron';
import { findApp } from '../app-list';
import { getFavorites, toggleFavorite } from '../store/favorites';
import { INVOKE } from '../../shared/ipc-channels';

// お気に入り。入れた順の path の配列を返す。切り替えは、一覧にあるアプリだけ受け付け、切り替えた後の配列を返す
function registerFavoritesIpc(): void {
  ipcMain.handle(INVOKE.getFavorites, () => getFavorites());
  ipcMain.handle(INVOKE.toggleFavorite, (event, appPath) => (findApp(appPath) ? toggleFavorite(appPath) : getFavorites()));
}

export { registerFavoritesIpc };
