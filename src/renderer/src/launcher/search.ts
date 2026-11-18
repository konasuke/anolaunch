import { KIND } from '../../../shared/kinds';
import type { MessageKey } from '../../../shared/messages';
import { SEARCH_ENGINES } from '../../../shared/search-engines';
import type { Aliases, AppEntry, WebSearch } from '../../../shared/types';

// 名前・別名・種類の名前に入力が含まれるものを残す（大文字小文字は区別しない）。
// 別名が、入力と完全に同じものは、先頭に出す（短い別名を打ったとき、名前に含むだけのアプリに埋もれないように）
export function filterApps(
  apps: AppEntry[],
  aliases: Aliases,
  query: string,
  kindLabel: (app: AppEntry) => string,
): AppEntry[] {
  const q = query.trim().toLowerCase();
  const aliasesOf = (app: AppEntry) => (aliases[app.path] ?? []).map((a) => a.toLowerCase());
  const found = apps.filter(
    (app) =>
      app.name.toLowerCase().includes(q) ||
      kindLabel(app).toLowerCase().includes(q) ||
      aliasesOf(app).some((a) => a.includes(q)),
  );
  const exact = (app: AppEntry) => aliasesOf(app).includes(q);
  return [...found.filter(exact), ...found.filter((app) => !exact(app))];
}

// 入力が空のときに出す、お気に入りのアプリ（入れた順。一覧にもう無いアプリは出さない）
export function favoriteApps(apps: AppEntry[], favorites: string[]): AppEntry[] {
  const byPath = new Map(apps.map((app) => [app.path, app]));
  return favorites.map((appPath) => byPath.get(appPath)).filter((app): app is AppEntry => app !== undefined);
}

// 「g 文字列」（キーワード＋空白＋検索語）なら、その検索先と検索語（空白は全角でもよい）。そうでなければ null。
// 「g 」のように、キーワードと空白までのときは、検索語が空（案内の行を出すため）。
// キーワードだけ（「g」）や、キーワードのあとの空白がまだ無いときは、アプリ名を打っている途中かもしれないので、検索にしない
export function parseWebSearch(query: string): WebSearch | null {
  const match = /^(\S+)\s+(.*)$/.exec(query.trimStart());
  if (!match) return null;
  const engine = SEARCH_ENGINES.find((e) => e.keyword === match[1].toLowerCase());
  return engine ? { engine: engine.id, query: match[2].trim() } : null;
}

// Web 検索の項目（一覧の先頭に出す）。メインの一覧には無く、入力から、画面が作る。
// 検索語がまだ空のときは、「検索語を入力」という案内の行になる（Enter を押しても、何も起きない）
function webSearchEntry(webSearch: WebSearch, t: (key: MessageKey) => string): AppEntry {
  const engine = SEARCH_ENGINES.find((e) => e.id === webSearch.engine)!;
  return {
    name: webSearch.query ? t(engine.nameKey).replace('{query}', webSearch.query) : t(engine.hintKey),
    path: `search:${webSearch.engine}:${webSearch.query}`,
    kind: KIND.SEARCH,
    webSearch,
  };
}

// 今の入力に合わせた一覧。入力が空のときは、お気に入りだけ。「g 文字列」なら、先頭に Web 検索を足す
export function computeResults(
  apps: AppEntry[],
  favorites: string[],
  aliases: Aliases,
  query: string,
  kindLabel: (app: AppEntry) => string,
  t: (key: MessageKey) => string,
): AppEntry[] {
  if (query.trim() === '') return favoriteApps(apps, favorites);
  const found = filterApps(apps, aliases, query, kindLabel);
  const webSearch = parseWebSearch(query);
  return webSearch ? [webSearchEntry(webSearch, t), ...found] : found;
}
