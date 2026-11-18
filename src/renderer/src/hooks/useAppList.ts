import { useCallback, useEffect, useState } from 'react';
import type { Aliases, AppEntry } from '../../../shared/types';

// アプリの一覧と、お気に入り（入れた順の path）と、別名。起動時に取り、アプリの追加・削除が見つかったとき、
// キャッシュが削除されたときに、取り直す（アイコンは、表示する行の分だけ、あとから取る）
// version は、取り直すたびに増える（一覧が入れ替わったら、選択を先頭に戻すために使う）
export function useAppList(onCacheCleared: () => void) {
  const [apps, setApps] = useState<AppEntry[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [aliases, setAliases] = useState<Aliases>({});
  const [version, setVersion] = useState(0);

  const load = useCallback(() => {
    // お気に入りと別名も一緒に取る（入力が空のときの一覧にはお気に入りが、検索には別名が要るため）
    Promise.all([window.api.getApps(), window.api.getFavorites(), window.api.getAliases()]).then(
      ([loadedApps, loadedFavorites, loadedAliases]) => {
        setApps(loadedApps);
        setFavorites(loadedFavorites);
        setAliases(loadedAliases);
        setVersion((v) => v + 1);
      },
    );
  }, []);

  useEffect(() => {
    load();
    const offAppsChanged = window.api.onAppsChanged(load);
    const offCacheCleared = window.api.onCacheCleared(() => {
      onCacheCleared();
      load();
    });
    return () => {
      offAppsChanged();
      offCacheCleared();
    };
  }, [load, onCacheCleared]);

  return { apps, favorites, setFavorites, aliases, setAliases, version };
}
