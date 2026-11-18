import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import type { MessageKey } from '../../../shared/messages';
import type { AppEntry } from '../../../shared/types';
import { AliasButton } from './AliasButton';
import { StarButton } from './StarButton';

interface Props {
  app: AppEntry;
  selected: boolean;
  favorite: boolean;
  aliases: string[]; // このアプリの別名（無ければ空）
  // アイコン（data URL）。取れなかったときは null、まだ取っていないときは undefined
  icon: string | null | undefined;
  kindLabel: string;
  isMac: boolean;
  t: (key: MessageKey) => string;
  listRef: RefObject<HTMLUListElement | null>; // 一覧（見えているかの判定の基準）
  onSelect: () => void;
  onLaunch: () => void;
  onToggleFavorite: () => void;
  onEditAlias: () => void;
  onNeedIcon: (appPath: string) => void;
}

// 一覧の1行
export function ResultRow({
  app, selected, favorite, aliases, icon, kindLabel, isMac, t, listRef, onSelect, onLaunch, onToggleFavorite, onEditAlias,
  onNeedIcon,
}: Props) {
  const rowRef = useRef<HTMLLIElement>(null);

  // 一覧の中で、見える位置に来たら、アイコンを取る（まだ取っていないときだけ）
  useEffect(() => {
    const row = rowRef.current;
    if (icon !== undefined || !row) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        onNeedIcon(app.path);
      },
      { root: listRef.current, rootMargin: '40px' }, // 見える範囲の少し先まで、先に取る
    );
    observer.observe(row);
    return () => observer.disconnect();
  }, [icon, app.path, listRef, onNeedIcon]);

  const classNames = [selected ? 'selected' : '', favorite ? 'favorite' : ''].filter(Boolean).join(' ');

  return (
    <li
      ref={rowRef}
      className={classNames || undefined}
      // マウス：動かすと、その行を選び、クリックすると起動する（クリックしても、入力欄からフォーカスを外さない）
      // （mouseenter ではなく mousemove にして、キーで一覧がスクロールしたとき、動いていないマウスの下の行に、選択が移らないようにする）
      onMouseMove={onSelect}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onLaunch}
    >
      <img src={icon ?? undefined} alt="" />
      <span>{app.name}</span>
      {/* 別名があれば、名前の横に小さく出す（どの名前で見つかったか分かるように） */}
      {aliases.length > 0 && <span className="aliases">{aliases.join(', ')}</span>}
      {/* 行の右端に、種類（Application、Game など）を出す */}
      <span className="kind">{kindLabel}</span>
      {/* 入力から作った Web 検索の行は、別名もお気に入りも付けられないので、ボタンを出さない */}
      {!app.webSearch && <AliasButton isMac={isMac} t={t} onEdit={onEditAlias} />}
      {!app.webSearch && <StarButton favorite={favorite} isMac={isMac} t={t} onToggle={onToggleFavorite} />}
    </li>
  );
}
