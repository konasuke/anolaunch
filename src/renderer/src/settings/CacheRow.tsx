import { useEffect, useRef, useState } from 'react';
import type { MessageKey } from '../../../shared/messages';
import { SettingRow } from './SettingRow';

interface Props {
  t: (key: MessageKey) => string;
}

// ボタンの状態（ボタンの文字になる文言のキー）
type State = 'settings.cache.clear' | 'settings.cache.clearing' | 'settings.cache.cleared';

// キャッシュ（取ってあるアイコンと、ストアアプリの一覧）の削除
export function CacheRow({ t }: Props) {
  const [state, setState] = useState<State>('settings.cache.clear');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 画面を閉じるとき、「削除しました」を戻すタイマーを止める
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  // キャッシュを削除する。終わるまでボタンを押せなくし、終わったら、2 秒だけ「削除しました」と出す
  async function clear() {
    setState('settings.cache.clearing');
    await window.api.clearCache();
    setState('settings.cache.cleared');
    timer.current = setTimeout(() => setState('settings.cache.clear'), 2000);
  }

  return (
    <SettingRow label={<div className="label">{t('settings.cache')}</div>}>
      <button id="clear-cache" type="button" disabled={state !== 'settings.cache.clear'} onClick={clear}>
        {t(state)}
      </button>
      <div className="note">{t('settings.cache.note')}</div>
    </SettingRow>
  );
}
