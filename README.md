# Anolaunch

ホットキーで窓が出る、Raycast のようなランチャーです（Electron 製、Mac / Windows 対応）。

`Ctrl/Cmd+Shift+Space` で窓を出し、アプリ名を打って Enter で起動します。

## 機能

- アプリを自動で集めて検索（Mac の `.app`、Windows のスタートメニューとストアアプリ、Steam のゲーム）
- Web 検索：`g 検索語` と打って Enter で、Google で検索（既定のブラウザで開く）
- Google Meet：`meet` と打って Enter で、会議を作ってURLをクリップボードにコピーする（ブラウザでGoogleにログインしておく）
- お気に入り：よく使うアプリを登録して、窓を開いた直後に一覧で出す
- トレイ（メニューバー）から、窓の表示・設定・終了
- 設定：言語（日本語 / English）、ホットキー、PC 起動時の自動起動

## 使い方

- ホットキーで窓を出す（初期値は `Ctrl+Shift+Space`、Mac は `Cmd+Shift+Space`）
- アプリ名を打つと絞り込まれる。`↑` `↓` で選び、`Enter` で起動
- `Ctrl+D`（Mac は `Cmd+D`）か、行の右端の星ボタンで、お気に入りに入れる・外す。入力が空のときは、お気に入りだけが並ぶ
- `Esc` か、窓の外をクリックすると閉じる
- 設定はトレイ（メニューバー）のアイコン → 「設定…」から開く

### 設定の初期値

| 項目 | 初期値 |
| --- | --- |
| 言語 | OS の言語が日本語なら日本語、それ以外は English |
| ホットキー | `Ctrl/Cmd+Shift+Space` |
| PC 起動時の自動起動 | オン（インストール版だけで効く） |

## インストール

[Releases](https://github.com/konasuke/anolaunch/releases) から、自分の OS 用のファイルをダウンロードします。署名はしていないため、初回だけ警告が出ます。

- **Windows**：`Anolaunch-Setup-<版>.exe` を実行
- **Mac**（Apple Silicon 向け）：`.dmg` を開いて Applications にドラッグし、ターミナルで次を 1 回実行してから、右クリック → 「開く」で起動する
  ```bash
  xattr -cr /Applications/Anolaunch.app
  ```
  ダウンロードしたものには「壊れている」と出て開けないため、その印を消すコマンドです（署名していないための対応）。入れ直すたびに必要です

## 開発

```bash
git pull
npm install
npm start
```

- `npm start`：開発用に起動（画面を直すと、窓を開いたまま反映される）
- `npm run typecheck`：型の確認
- `npm run build`：`out/` にビルド
- インストーラーは、それぞれの OS で `npm run dist`（Windows）/ `npm run dist:mac`（Mac）

TypeScript + React で、ビルドは [electron-vite](https://electron-vite.org/) です。

## リリース

タグを push すると、GitHub Actions（[release.yml](.github/workflows/release.yml)）が Mac と Windows のインストーラーを作って、Releases に下書きとして置きます。

```bash
npm version 1.1.0
git push --follow-tags
```

1. `npm version <版>` で、`package.json` の版を上げて、コミットと `v<版>` のタグを作る（タグの版と `package.json` の版は、そろえる）
2. `git push --follow-tags` で、コミットとタグを push する。ここでビルドが始まる
3. Actions が終わったら、[Releases](https://github.com/konasuke/anolaunch/releases) の下書きに 2 つのインストーラーが付いているか確かめて、「公開」を押す

版の上げ方は、修正だけなら `1.0.1`、機能を足したなら `1.1.0`。

くわしい決まりごとは [CLAUDE.md](CLAUDE.md)、これからやることは [_doc/TODO.md](_doc/TODO.md) を見てください。
