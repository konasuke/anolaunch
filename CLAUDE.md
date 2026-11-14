# Anolaunch

Raycast のような、ホットキーで窓が出るランチャー（Electron）。真似て作って学ぶのが目的。設計のメモは Vault の `idea/ランチャー.md`。

## 名前

- 名前は **Anolaunch**（アノランチ。アノール＋launch）。`package.json` の `name` は `anolaunch`、`productName` は `Anolaunch`
- 以前の名前は `launcher`。名前を変えると設定の保存先のフォルダ名も変わるので、`src/main/settings.js` が前の名前のフォルダから設定を引き継ぐ
- GitHub のリポジトリは `konasuke/anolaunch`（古い URL は自動的に転送される）。PC のフォルダ名も `anolaunch` にそろえる

## 作業を始めるとき

- 最初に `_doc/TODO.md` を読む。やることが Windows・Mac・共通に分かれていて、作業する OS の PC では、その OS の項目をすぐ始められる
- 終わった項目は項目ごと消す。済んだことの記録は TODO に残さない（Git の履歴と、Vault の `idea/ランチャー.md` の「やること」にある）。新しく分かったことや増えたやることは足す
- 手順は、どの PC でも次のとおり
  ```bash
  git pull
  npm install
  npm start
  ```
- 起動は `npm start`。`npx electron .` は使わない（`node_modules` が無いと、毎回 Electron 本体を取りに行って止まる）
- `npm install` のあと `node_modules/electron/dist` が無ければ、`node node_modules/electron/install.js` で本体を取得する
- 起動できたら、`Ctrl/Cmd+Shift+Space` で窓が出るか確かめる。すでに動いているランチャーがあるとホットキーが登録できないので、先に終了する（トレイのアイコン → 終了）

## 方針

- 言語は JavaScript。TypeScript は使わない（変換の設定が増えるため）
- 役割ごとにファイルを分け、増えてきたら適切にフォルダも分ける。ファイルの数を減らすことを目的にしない。1つのファイルに別々の役割を詰め込まない
- コミットメッセージは日本語で、何をしたかを1行で
- ゲームの画面に重ねる、ゲームのメモリを読む、といった、ゲームの中に触れる機能は入れない

## 構成と決まりごと

### OS ごとの処理

- 対象は Mac と Windows。どちらも実装済み
- OS ごとに違う処理（アプリ一覧、アイコンの取得）は、`src/main/apps/`・`src/main/icons/` の中で `mac.js` / `windows.js` に分け、`index.js` が `process.platform` で選ぶ
- Windows はスタートメニューの `.lnk` を読む
- Windows の動作確認は、WSL ではなく Windows 側（PowerShell）で行う。WSL で動かすと Linux 版になり、Windows 用の処理を試せない

### 画面に出す文言

- 入力欄の案内、トレイのメニュー、種類の名前などは、`src/shared/messages/` の `ja.js` と `en.js` に、キーで書く。コードに文字列を直接書かない
- メインでは `t('キー')` を使う。画面側（renderer）はメインから受け取った文言を使う
- キーは両方のファイルでそろえる
- コードが比較に使うアプリの種類は、`src/shared/kinds.js` の `KIND`

### 設定

- 設定（言語・ホットキー・自動起動）は `src/main/settings.js` が、OS のアプリ用データフォルダの `settings.json` に保存する
- 項目を足すときは、`VALIDATORS` と `defaults` に足し、反映する処理は `index.js` の `set-settings` に足す
- 設定画面は `src/renderer/settings/`（トレイの「設定…」から開く）。画面側からは `window.api.getSettings()` / `setSettings()` で読み書きする

### アイコン

- アプリのアイコン（アノール）の元の画像は `design/`
- `npm run icons`（`tools/make-icons.js`）で、次を作り直す
  - `build/`：`.ico`・`.icns`・各サイズの PNG
  - `src/assets/`：`tray*.png`（トレイ用）、`icon.ico`（窓のアイコン用）
- アイコンを変えるときは、`design/anole-icon-original.webp` を差し替えて、このコマンドを実行する

### インストーラー

- `electron-builder` を使う。設定は `package.json` の `build`。それぞれの OS で作る
  - Windows：`npm run dist` → `dist/Anolaunch-Setup-<版>.exe`（ユーザー単位の NSIS）
  - Mac：Mac で `npm run dist:mac` → `dist/Anolaunch-<版>-<arch>.dmg`（Apple Silicon なら `arm64`。Intel の Mac では動かない）
- 中身だけ確かめるときは `npm run pack`（`dist/win-unpacked/` など）
- 署名・公証はしていない。Mac は、ダウンロードしたものだと「壊れている」と出て開けないので、入れたあとに `xattr -cr /Applications/Anolaunch.app` で印を消してから、右クリックから「開く」で起動する（自分でビルドしたものは不要）
- インストール版では、ソースが `app.asar` にまとまる。OS や別のプログラムが実際のファイルとして読むもの（窓・トレイのアイコン、`icon.jxa`）は、`asarUnpack` で書庫の外に出し、`src/main/unpacked.js` の `unpacked()` でパスを直す
