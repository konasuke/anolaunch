# Launcher

Raycast のような、ホットキーで窓が出るランチャー（Electron）。真似て作って学ぶのが目的。設計のメモは Vault の `idea/ランチャー.md`。

- 言語は JavaScript。TypeScript は使わない（変換の設定が増えるため）
- 役割ごとにファイルを分け、増えてきたら適切にフォルダも分ける。ファイルの数を減らすことを目的にしない。1つのファイルに別々の役割を詰め込まない
- 対象は Mac と Windows。OS ごとに違う処理（アプリ一覧、アイコンの取得）は、`src/main/apps/`・`src/main/icons/` の中で `mac.js` / `windows.js` に分け、`index.js` が `process.platform` で選ぶ。Mac・Windows とも実装済み（Windows はスタートメニューの `.lnk` を読む）
- Windows の動作確認は、WSL ではなく Windows 側（PowerShell）で行う。WSL で動かすと Linux 版になり、Windows 用の処理を試せない
- 画面に出す文言（入力欄の案内、トレイのメニュー、種類の名前など）は、`src/shared/messages/` の `ja.js` と `en.js` に、キーで書く。コードに文字列を直接書かない。メインでは `t('キー')`、画面側（renderer）はメインから受け取った文言を使う。キーは両方のファイルでそろえる。コードが比較に使うアプリの種類は、`src/shared/kinds.js` の `KIND`
- 設定（言語・ホットキー・自動起動）は `src/main/settings.js` が、OS のアプリ用データフォルダの `settings.json` に保存する。項目を足すときは、`VALIDATORS` と `defaults` に足し、反映する処理は `index.js` の `set-settings` に足す。設定画面は `src/renderer/settings/`（トレイの「設定…」から開く）。画面側からは `window.api.getSettings()` / `setSettings()` で読み書きする
- アプリのアイコン（アノール）の元の画像は `design/`。`npm run icons` で、`build/`（`.ico`・`.icns`・各サイズの PNG）と、`src/assets/tray*.png`（トレイ用）を作り直す（`tools/make-icons.js`）。アイコンを変えるときは、`design/anole-icon-original.webp` を差し替えて、このコマンドを実行する
- コミットメッセージは日本語で、何をしたかを1行で
- ゲームの画面に重ねる、ゲームのメモリを読む、といった、ゲームの中に触れる機能は入れない

## 作業を始めるとき
- 最初に `_doc/TODO.md` を読む。やることが Windows・Mac・共通に分かれていて、作業する OS の PC では、その OS の項目をすぐ始められる。終わったらチェックを付け、新しく分かったことや増えたやることは足す
- 済んだことの記録は TODO に残さない（Git の履歴と、Vault の `idea/ランチャー.md` の「やること」にある）
- 手順は、どの PC でも次のとおり。起動は `npm start`（`npx electron .` は使わない。`node_modules` が無いと、毎回 Electron 本体を取りに行って止まる）
  ```bash
  git pull
  npm install
  npm start
  ```
- `npm install` のあと `node_modules/electron/dist` が無ければ、`node node_modules/electron/install.js` を実行して本体を取得する
- 起動できたら、`Ctrl/Cmd+Shift+Space` で窓が出るか確かめる。すでに動いているランチャーがあるとホットキーが登録できないので、先に終了する（トレイのアイコン → 終了）
