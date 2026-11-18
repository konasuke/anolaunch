// 画面に出す文言（英語）。キーは ja.ts と同じにする（ja に無いキー・足りないキーは、型のエラーになる）
import type ja from './ja';

const en: Record<keyof typeof ja, string> = {
  'search.placeholder': 'Type an app name',
  'search.settings': 'Settings',
  'favorite.add': 'Add to favorites',
  'favorite.remove': 'Remove from favorites',
  'tray.tooltip': 'Anolaunch',
  'tray.show': 'Show',
  'tray.settings': 'Settings…',
  'tray.quit': 'Quit',
  'kind.app': 'Application',
  'kind.game': 'Game',
  'kind.store': 'Store App',
  'kind.command': 'Command',
  'command.meetCreate': 'Create Google Meet meeting',
  'meet.copied': 'Meeting link copied',
  'meet.failed': 'Could not get the meeting link',
  'meet.failed.hint': 'Copy it by hand from the browser window that opened',
  'settings.title': 'Settings',
  'settings.language': 'Language',
  'settings.language.ja': '日本語',
  'settings.language.en': 'English',
  'settings.hotkey': 'Hotkey',
  'settings.hotkey.idle': 'Click, then press the keys',
  'settings.hotkey.recording': 'Press the keys (Esc to cancel)',
  'settings.hotkey.needModifier': 'Combine with Ctrl, Alt, Shift, etc.',
  'settings.hotkey.failed': 'Could not register this hotkey. Another app may be using it.',
  'settings.hotkey.reset': 'Reset to default',
  'settings.autostart': 'Launch at login',
  'settings.cache': 'Cache',
  'settings.cache.clear': 'Clear cache',
  'settings.cache.clearing': 'Clearing…',
  'settings.cache.cleared': 'Cleared',
  'settings.cache.note': 'Reloads the app list and icons',
};

export default en;
