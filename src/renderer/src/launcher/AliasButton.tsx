import type { MessageKey } from '../../../shared/messages';

interface Props {
  isMac: boolean;
  t: (key: MessageKey) => string;
  onEdit: () => void;
}

// 行の右端の、別名を設定するボタン（タグの形は Feather Icons、MIT）。クリックで、別名の入力に切り替わる
export function AliasButton({ isMac, t, onEdit }: Props) {
  const label = `${t('alias.edit')} (${isMac ? '⌘E' : 'Ctrl+E'})`;
  return (
    <button
      type="button"
      className="alias-button"
      data-tooltip={label} // 見た目の吹き出し（CSS）に使う
      aria-label={label}
      // クリックしても、入力欄からフォーカスを外さない。行のクリック（起動）にもしない
      onMouseDown={(event) => event.preventDefault()}
      onClick={(event) => {
        event.stopPropagation();
        onEdit();
      }}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
        <line x1="7" y1="7" x2="7.01" y2="7" />
      </svg>
    </button>
  );
}
