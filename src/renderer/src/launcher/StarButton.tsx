import type { MessageKey } from '../../../shared/messages';

interface Props {
  favorite: boolean;
  isMac: boolean;
  t: (key: MessageKey) => string;
  onToggle: () => void;
}

// 行の右端の星ボタン（星の形は Feather Icons、MIT）。お気に入りのときは塗りつぶす（CSS）。クリックで入れる・外す
export function StarButton({ favorite, isMac, t, onToggle }: Props) {
  const label = `${t(favorite ? 'favorite.remove' : 'favorite.add')} (${isMac ? '⌘D' : 'Ctrl+D'})`;
  return (
    <button
      type="button"
      className="star"
      data-tooltip={label} // 見た目の吹き出し（CSS）に使う
      aria-label={label}
      // クリックしても、入力欄からフォーカスを外さない。行のクリック（起動）にもしない
      onMouseDown={(event) => event.preventDefault()}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    </button>
  );
}
