import { ipcMain, shell } from 'electron';
import { hideLauncher } from '../windows/launcher';
import { SEARCH_ENGINES } from '../../shared/search-engines';
import { INVOKE } from '../../shared/ipc-channels';

const MAX_QUERY_LENGTH = 1000; // 検索語の長さの上限（URL が長くなりすぎないように）

// Web 検索：検索先の URL に検索語をつなげて、既定のブラウザで開く
// （画面から来る要求は、決まった検索先の URL にしかつなげない。任意の URL は開かない）
function registerSearchIpc(): void {
  ipcMain.handle(INVOKE.openWebSearch, async (event, engineId, query) => {
    const engine = SEARCH_ENGINES.find((e) => e.id === engineId);
    if (!engine || typeof query !== 'string') return;
    const text = query.trim();
    if (!text || text.length > MAX_QUERY_LENGTH) return;
    hideLauncher();
    try {
      await shell.openExternal(engine.url + encodeURIComponent(text));
    } catch (error) {
      console.error(`検索を開けませんでした: ${String(error)}`);
    }
  });
}

export { registerSearchIpc };
