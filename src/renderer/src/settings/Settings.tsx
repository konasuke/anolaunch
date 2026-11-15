import { useEffect, useState } from 'react';
import type { Language } from '../../../shared/messages';
import type { Settings as SettingsData } from '../../../shared/types';
import { useIsMac } from '../hooks/useIsMac';
import { useMessages } from '../hooks/useMessages';
import { AutostartRow } from './AutostartRow';
import { CacheRow } from './CacheRow';
import { HotkeyRow } from './HotkeyRow';
import { LanguageRow } from './LanguageRow';

// 設定画面。変えた時点で保存するので、画面の値と保存してある値は、いつも同じ
export function Settings() {
  const { t, ready } = useMessages();
  const isMac = useIsMac();
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [defaults, setDefaults] = useState<SettingsData | null>(null);
  const [recording, setRecording] = useState(false); // ホットキーの入力中か

  useEffect(() => {
    Promise.all([window.api.getSettings(), window.api.getDefaultSettings()]).then(([current, initial]) => {
      setSettings(current);
      setDefaults(initial);
    });
  }, []);

  // 窓のタイトル（Electron は、ページのタイトルを窓のタイトルにする）
  useEffect(() => {
    if (ready) document.title = t('settings.title');
  }, [ready, t]);

  // Esc で設定画面を閉じる（ホットキーの入力中の Esc は、メインから届き、入力をやめるだけ）
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !recording) window.close();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [recording]);

  async function save(partial: Partial<SettingsData>) {
    const result = await window.api.setSettings(partial);
    setSettings(result.settings);
    return result;
  }

  if (!ready || !settings || !defaults) return null;

  return (
    <>
      {/* 言語を変えたら、文言は、メインからの通知（messages-changed）で入れ替わる */}
      <LanguageRow language={settings.language} t={t} onChange={(language: Language) => save({ language })} />
      <HotkeyRow
        hotkey={settings.hotkey}
        defaultHotkey={defaults.hotkey}
        isMac={isMac}
        recording={recording}
        t={t}
        onRecordingChange={setRecording}
        onChange={async (hotkey) => (await save({ hotkey })).error !== 'hotkey'}
      />
      <AutostartRow autoStart={settings.autoStart} t={t} onChange={(autoStart) => save({ autoStart })} />
      <CacheRow t={t} />
    </>
  );
}
