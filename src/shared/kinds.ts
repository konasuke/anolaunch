// アプリの種類。コードが比較に使う値（ID）。画面に出す名前は、messages の `kind.<ID>` で決まる
const KIND = {
  APP: 'app',
  GAME: 'game',
  STORE: 'store',
} as const;

export type Kind = (typeof KIND)[keyof typeof KIND];

export { KIND };
