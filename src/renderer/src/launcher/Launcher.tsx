import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { AppEntry } from '../../../shared/types';
import logo from '../../assets/logo.png';
import { useAppList } from '../hooks/useAppList';
import { useIcons } from '../hooks/useIcons';
import { useIsMac } from '../hooks/useIsMac';
import { useMessages } from '../hooks/useMessages';
import { ResultRow } from './ResultRow';
import { SettingsButton } from './SettingsButton';
import { computeResults } from './search';
import { SEARCH_ICON } from './searchIcon';

// ランチャーの画面全体：入力欄・歯車ボタン・一覧
export function Launcher() {
  const { t, ready } = useMessages();
  const isMac = useIsMac();
  const { icons, request: requestIcon, reset: resetIcons } = useIcons();
  const { apps, favorites, setFavorites, version } = useAppList(resetIcons);

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0); // 一覧の中で選んでいる位置
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const skipScroll = useRef(false); // マウスで選んだときは、一覧をスクロールしない

  // アプリの種類の、画面に出す名前（Application、Game、Store App など）
  const kindLabel = useCallback((app: AppEntry) => t(`kind.${app.kind}`), [t]);

  // 絞り込んだ結果。入力が空のときは、お気に入りだけ
  const results = useMemo(
    () => computeResults(apps, favorites, query, kindLabel, t),
    [apps, favorites, query, kindLabel, t],
  );

  // 一覧が取り直されたら（アプリの追加・削除、キャッシュの削除）、先頭を選ぶ
  useEffect(() => setSelected(0), [version]);

  // お気に入りを外して一覧が縮んだときは、選んでいる位置を範囲内に収める
  useEffect(() => {
    const last = Math.max(results.length - 1, 0);
    if (selected > last) setSelected(last);
  }, [results, selected]);

  // 選んでいる行が見えるようにスクロールする（マウスで選んだときは、動かさない）
  useEffect(() => {
    if (skipScroll.current) {
      skipScroll.current = false;
      return;
    }
    listRef.current?.children[selected]?.scrollIntoView({ block: 'nearest' });
  }, [selected, results]);

  // 中身の高さに窓を合わせる（入力欄だけのときは小さく、結果があれば大きく）
  useLayoutEffect(() => {
    window.api.resizeWindow(document.body.offsetHeight);
  });

  // 窓が出たら、入力欄に残っている文字を全選択する（そのまま打てば置き換わり、残したければ、そのまま使える）
  useEffect(
    () =>
      window.api.onShown(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }),
    [],
  );

  // Ctrl+,（Mac は Cmd+,）で、設定画面を開く
  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.isComposing || !(event.ctrlKey || event.metaKey)) return;
      if (event.code === 'Comma' || event.key === ',') {
        event.preventDefault();
        window.api.openSettings();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  function launch(app: AppEntry) {
    // Web 検索の項目は、検索先と検索語を渡して、ブラウザで開く
    if (app.webSearch) window.api.openWebSearch(app.webSearch.engine, app.webSearch.query);
    else window.api.launchApp(app.path);
    setQuery('');
    setSelected(0);
  }

  // お気に入りに入れる・外す。選んでいる位置は動かさない（入力から作った Web 検索の項目は、入れられない）
  function toggleFavorite(app: AppEntry) {
    if (app.webSearch) return;
    window.api.toggleFavorite(app.path).then(setFavorites);
  }

  // マウスで指した行を選ぶ
  function selectByMouse(index: number) {
    if (index === selected) return;
    skipScroll.current = true;
    setSelected(index);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // 日本語入力の変換中の Enter や矢印は、変換のために使うので無視する
    if (event.nativeEvent.isComposing) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (results.length > 0) setSelected((selected + 1) % results.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (results.length > 0) setSelected((selected - 1 + results.length) % results.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const app = results[selected];
      if (app) launch(app);
    } else if (event.code === 'KeyD' && (isMac ? event.metaKey : event.ctrlKey) && !event.altKey && !event.shiftKey) {
      // Cmd+D（Windows は Ctrl+D）：選んでいるアプリを、お気に入りに入れる・外す
      event.preventDefault();
      const app = results[selected];
      if (app) toggleFavorite(app);
    }
  }

  return (
    <>
      <div className="search">
        <img className="logo" src={logo} alt="" draggable={false} />
        <input
          id="query"
          ref={inputRef}
          type="text"
          autoFocus
          value={query}
          placeholder={ready ? t('search.placeholder') : ''}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelected(0); // 入力が変わったら、先頭を選ぶ
          }}
          onKeyDown={onKeyDown}
        />
        <SettingsButton isMac={isMac} t={t} />
      </div>
      <ul id="results" ref={listRef}>
        {results.map((app, index) => (
          <ResultRow
            key={app.path}
            app={app}
            selected={index === selected}
            favorite={favorites.includes(app.path)}
            icon={app.webSearch ? SEARCH_ICON : icons[app.path]}
            kindLabel={kindLabel(app)}
            isMac={isMac}
            t={t}
            listRef={listRef}
            onSelect={() => selectByMouse(index)}
            onLaunch={() => launch(app)}
            onToggleFavorite={() => toggleFavorite(app)}
            onNeedIcon={requestIcon}
          />
        ))}
      </ul>
    </>
  );
}
