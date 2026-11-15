import { useEffect, useState } from 'react';
import type { MessageKey } from '../../../shared/messages';
import { SettingRow } from './SettingRow';
import { displayHotkey, isModifierKey, needsModifier, toAccelerator } from './hotkey';

interface Props {
  hotkey: string;
  defaultHotkey: string;
  isMac: boolean;
  recording: boolean; // ホットキーの入力中か（Esc で画面を閉じるかの判定にも使うので、親が持つ）
  t: (key: MessageKey) => string;
  onRecordingChange: (recording: boolean) => void;
  // ホットキーを変える。登録できたら true
  onChange: (accelerator: string) => Promise<boolean>;
}

// ホットキー。クリックして入力を始め、次に押したキーに変える。登録できなければ、保存されず、今のキーのまま
export function HotkeyRow({ hotkey, defaultHotkey, isMac, recording, t, onRecordingChange, onChange }: Props) {
  // エラーの文言のキー。キーで持っておき、言語が変わったら、言い直す
  const [errorKey, setErrorKey] = useState<MessageKey | null>(null);

  async function change(accelerator: string) {
    const ok = await onChange(accelerator);
    setErrorKey(ok ? null : 'settings.hotkey.failed');
  }

  // 入力中かどうかを、メインに伝える。入力中に押されたキーは、メインプロセスが受け取って渡してくれる
  // （Alt+Space など、Windows が窓の操作に使うキーは、ページには届かないため）
  useEffect(() => {
    window.api.setHotkeyRecording(recording);
  }, [recording]);

  // 入力中に押されたキー（メインプロセスから届く）
  useEffect(() => {
    if (!recording) return;
    return window.api.onHotkeyKey((event) => {
      if (event.key === 'Escape') return onRecordingChange(false);
      if (isModifierKey(event.key)) return; // 修飾キーだけのときは、次を待つ
      const accelerator = toAccelerator(event, isMac);
      if (!accelerator) return;
      onRecordingChange(false);
      if (needsModifier(accelerator)) {
        setErrorKey('settings.hotkey.needModifier');
        return;
      }
      change(accelerator);
    });
    // 登録し直すのは、入力の始まり・終わりのときだけ（change は毎回作り直されるが、使うのは props の onChange だけ）
  }, [recording, isMac, onRecordingChange]);

  return (
    <SettingRow label={<div className="label">{t('settings.hotkey')}</div>}>
      <div className="control-line">
        {hotkey !== defaultHotkey && (
          <button id="reset" type="button" onClick={() => change(defaultHotkey)}>
            {t('settings.hotkey.reset')}
          </button>
        )}
        <button
          id="hotkey"
          type="button"
          className={recording ? 'recording' : undefined}
          onClick={() => {
            setErrorKey(null);
            onRecordingChange(true);
          }}
          onBlur={() => {
            if (recording) onRecordingChange(false);
          }}
        >
          {recording ? t('settings.hotkey.recording') : displayHotkey(hotkey, isMac)}
        </button>
      </div>
      <div className="error">{errorKey ? t(errorKey) : ''}</div>
    </SettingRow>
  );
}
