// アプリの種類。コードが比較に使う値（ID）。画面に出す名前は、messages の `kind.<ID>` で決まる
const KIND = {
  APP: 'app',
  GAME: 'game',
  STORE: 'store',
  COMMAND: 'command', // アプリではなく、実行すると何かをする項目（Google Meet の会議を作成、など）
  SEARCH: 'search', // 「g 文字列」と打ったときだけ、一覧の先頭に出る、Web 検索の項目
} as const;

export type Kind = (typeof KIND)[keyof typeof KIND];

export { KIND };
