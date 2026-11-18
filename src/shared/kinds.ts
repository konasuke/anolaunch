// アプリの種類。コードが比較に使う値（ID）。画面に出す名前は、messages の `kind.<ID>` で決まる
const KIND = {
  APP: 'app',
  GAME: 'game',
  STORE: 'store',
  COMMAND: 'command', // アプリではなく、実行すると何かをする項目（Google Meet の会議を作成、など）
} as const;

export type Kind = (typeof KIND)[keyof typeof KIND];

export { KIND };
