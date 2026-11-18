import { KIND } from '../../../shared/kinds';
import type { MessageKey } from '../../../shared/messages';
import { SEARCH_ENGINES } from '../../../shared/search-engines';
import type { AppEntry, WebSearch } from '../../../shared/types';

// 名前か種類の名前に入力が含まれるものを残す（大文字小文字は区別しない）
export function filterApps(apps: AppEntry[], query: string, kindLabel: (app: AppEntry) => string): AppEntry[] {
  const q = query.trim().toLowerCase();
  return apps.filter((app) => app.name.toLowerCase().includes(q) || kindLabel(app).toLowerCase().includes(q));
}

// 入力が空のときに出す、お気に入りのアプリ（入れた順。一覧にもう無いアプリは出さない）
export function favoriteApps(apps: AppEntry[], favorites: string[]): AppEntry[] {
  const byPath = new Map(apps.map((app) => [app.path, app]));
  return favorites.map((appPath) => byPath.get(appPath)).filter((app): app is AppEntry => app !== undefined);
}

// 「g 文字列」（キーワード＋空白＋検索語）なら、その検索先と検索語（空白は全角でもよい）。そうでなければ null。
// キーワードだけ（「g」）や、キーワードのあとの空白がまだ無いときは、アプリ名を打っている途中かもしれないので、検索にしない
export function parseWebSearch(query: string): WebSearch | null {
  const match = /^(\S+)\s+(.+)$/.exec(query.trimStart());
  if (!match) return null;
  const engine = SEARCH_ENGINES.find((e) => e.keyword === match[1].toLowerCase());
  const text = match[2].trim();
  return engine && text ? { engine: engine.id, query: text } : null;
}

// Web 検索の項目（一覧の先頭に出す）。メインの一覧には無く、入力から、画面が作る
function webSearchEntry(webSearch: WebSearch, t: (key: MessageKey) => string): AppEntry {
  const engine = SEARCH_ENGINES.find((e) => e.id === webSearch.engine)!;
  return {
    name: t(engine.nameKey).replace('{query}', webSearch.query),
    path: `search:${webSearch.engine}:${webSearch.query}`,
    kind: KIND.SEARCH,
    webSearch,
  };
}

// 今の入力に合わせた一覧。入力が空のときは、お気に入りだけ。「g 文字列」なら、先頭に Web 検索を足す
export function computeResults(
  apps: AppEntry[],
  favorites: string[],
  query: string,
  kindLabel: (app: AppEntry) => string,
  t: (key: MessageKey) => string,
): AppEntry[] {
  if (query.trim() === '') return favoriteApps(apps, favorites);
  const found = filterApps(apps, query, kindLabel);
  const webSearch = parseWebSearch(query);
  return webSearch ? [webSearchEntry(webSearch, t), ...found] : found;
}
