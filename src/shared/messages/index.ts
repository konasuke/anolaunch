import ja from './ja';
import en from './en';

// 選べる言語の一覧
const LANGUAGES = ['ja', 'en'] as const;
type Language = (typeof LANGUAGES)[number];

// 文言のキー。ja.ts に書いたキーが、そのまま型になる（en.ts にも同じキーが要る）
type MessageKey = keyof typeof ja;
type Messages = Record<MessageKey, string>;

const dictionaries: Record<Language, Messages> = { ja, en };
let language: Language = 'ja';

// 言語を切り替える。知らない言語は無視する
function setLanguage(next: Language): void {
  if (dictionaries[next]) language = next;
}

// キーに対応する文言を返す。今の言語に無ければ日本語、それも無ければキーそのもの
function t(key: MessageKey): string {
  return dictionaries[language][key] ?? dictionaries.ja[key] ?? key;
}

// 今の言語の文言を全部返す（画面側に渡す用）
function allMessages(): Messages {
  return { ...dictionaries.ja, ...dictionaries[language] };
}

export type { Language, MessageKey, Messages };
export { LANGUAGES, setLanguage, t, allMessages };
