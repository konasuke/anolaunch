import { LANGUAGES } from '../../../shared/messages';
import type { Language, MessageKey } from '../../../shared/messages';
import { SettingRow } from './SettingRow';

interface Props {
  language: Language;
  t: (key: MessageKey) => string;
  onChange: (language: Language) => void;
}

// 言語。名前は、どの言語で表示していても、その言語自身の名前
export function LanguageRow({ language, t, onChange }: Props) {
  return (
    <SettingRow label={<div className="label">{t('settings.language')}</div>}>
      <select id="language" value={language} onChange={(event) => onChange(event.target.value as Language)}>
        {LANGUAGES.map((code) => (
          <option key={code} value={code}>
            {t(`settings.language.${code}`)}
          </option>
        ))}
      </select>
    </SettingRow>
  );
}
