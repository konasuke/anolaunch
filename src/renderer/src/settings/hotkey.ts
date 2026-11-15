import type { HotkeyKeyEvent } from '../../../shared/types';

// ホットキーの表示と、キー入力 → Electron の書き方（Accelerator）への変換。画面には依存しない

// キーの種類（物理的なキー。code）から、Electron のキー名にする
const KEY_NAMES: Record<string, string> = {
  Space: 'Space', Enter: 'Return', Tab: 'Tab', Backspace: 'Backspace', Delete: 'Delete', Insert: 'Insert',
  Home: 'Home', End: 'End', PageUp: 'PageUp', PageDown: 'PageDown',
  ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right',
  Minus: '-', Equal: '=', Comma: ',', Period: '.', Slash: '/', Backquote: '`',
  BracketLeft: '[', BracketRight: ']', Backslash: '\\', Semicolon: ';', Quote: "'",
};

// 押したキーの文字（key）から、Electron のキー名にする。code が届かないとき（画面上のキーボードなど）の代わり
const KEY_NAMES_BY_KEY: Record<string, string> = {
  ' ': 'Space', Enter: 'Return', Tab: 'Tab', Backspace: 'Backspace', Delete: 'Delete', Insert: 'Insert',
  Home: 'Home', End: 'End', PageUp: 'PageUp', PageDown: 'PageDown',
  ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right',
};

// キーの種類（物理的なキー。code）から、Electron のキー名にする。code が無ければ、key（押した文字）から。変換できなければ null
export function keyName({ code, key }: Pick<HotkeyKeyEvent, 'code' | 'key'>): string | null {
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit[0-9]$/.test(code)) return code.slice(5);
  if (/^F([1-9]|1\d|2[0-4])$/.test(code)) return code;
  if (KEY_NAMES[code]) return KEY_NAMES[code];
  if (/^[a-z]$/i.test(key)) return key.toUpperCase();
  if (/^[0-9]$/.test(key)) return key;
  if (/^F([1-9]|1\d|2[0-4])$/.test(key)) return key;
  return KEY_NAMES_BY_KEY[key] ?? null;
}

// キー入力を、Electron の Accelerator（例：CommandOrControl+Shift+Space）にする。変換できないキーのときは null
export function toAccelerator(event: HotkeyKeyEvent, isMac: boolean): string | null {
  const key = keyName(event);
  if (!key) return null;
  const parts: string[] = [];
  // Ctrl（Windows）と Command（Mac）は、OS をまたいで同じ意味の CommandOrControl にする
  if (isMac ? event.metaKey : event.ctrlKey) parts.push('CommandOrControl');
  if (isMac && event.ctrlKey) parts.push('Control');
  if (event.altKey) parts.push('Alt');
  if (event.shiftKey) parts.push('Shift');
  if (!isMac && event.metaKey) parts.push('Super');
  parts.push(key);
  return parts.join('+');
}

// 画面に出す形（CommandOrControl を、Windows は Ctrl、Mac は Cmd に）
export function displayHotkey(accelerator: string, isMac: boolean): string {
  const ctrl = isMac ? 'Cmd' : 'Ctrl';
  return accelerator.replace('CommandOrControl', ctrl).split('+').join(' + ');
}

// 修飾キーが無いキーは、F1〜F24 だけ使える
export function needsModifier(accelerator: string): boolean {
  return !accelerator.includes('+') && !/^F\d+$/.test(accelerator);
}

// 修飾キーだけが押されたとき（次のキーを待つ）
export function isModifierKey(key: string): boolean {
  return ['Control', 'Shift', 'Alt', 'Meta', 'AltGraph'].includes(key);
}
