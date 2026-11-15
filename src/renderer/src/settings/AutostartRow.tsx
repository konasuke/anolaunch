import type { MessageKey } from '../../../shared/messages';
import { SettingRow } from './SettingRow';

interface Props {
  autoStart: boolean;
  t: (key: MessageKey) => string;
  onChange: (autoStart: boolean) => void;
}

// PC 起動時の自動起動（スイッチの見た目は CSS。操作は、チェックボックスのまま）
export function AutostartRow({ autoStart, t, onChange }: Props) {
  return (
    <SettingRow
      label={
        <label className="label" htmlFor="autostart">
          {t('settings.autostart')}
        </label>
      }
    >
      <input id="autostart" type="checkbox" role="switch" checked={autoStart} onChange={(event) => onChange(event.target.checked)} />
    </SettingRow>
  );
}
