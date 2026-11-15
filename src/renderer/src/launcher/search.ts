import type { AppEntry } from '../../../shared/types';

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

// 今の入力に合わせた一覧。入力が空のときは、お気に入りだけ
export function computeResults(
  apps: AppEntry[],
  favorites: string[],
  query: string,
  kindLabel: (app: AppEntry) => string,
): AppEntry[] {
  return query.trim() === '' ? favoriteApps(apps, favorites) : filterApps(apps, query, kindLabel);
}
