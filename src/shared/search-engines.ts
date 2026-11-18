import type { MessageKey } from './messages';

// Web 検索の検索先。「<keyword> 検索語」と打つと、その検索先で検索する（例：「g こんにちは」）。
// ここは、データだけを置く（検索の URL を作って開くのは、メインの ipc/search.ts）
export interface SearchEngine {
  id: string;
  keyword: string; // 入力の先頭に打つ言葉（小文字）
  nameKey: MessageKey; // 一覧に出す文言。{query} が、入力した検索語に置き換わる
  hintKey: MessageKey; // 検索語がまだ空のとき（「g 」まで打ったとき）に出す、案内の文言
  url: string; // 検索語（URL 用に変換したもの）を、末尾につなげる
}

export const SEARCH_ENGINES: SearchEngine[] = [
  { id: 'google', keyword: 'g', nameKey: 'search.google', hintKey: 'search.google.hint', url: 'https://www.google.com/search?q=' },
  {
    id: 'youtube',
    keyword: 'y',
    nameKey: 'search.youtube',
    hintKey: 'search.youtube.hint',
    url: 'https://www.youtube.com/results?search_query=',
  },
];
