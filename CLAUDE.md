# Launcher

Raycast のような、ホットキーで窓が出るランチャー（Electron）。真似て作って学ぶのが目的。設計のメモは Vault の `idea/ランチャー.md`。

- 言語は JavaScript。TypeScript は使わない（変換の設定が増えるため）
- 役割ごとにファイルを分け、増えてきたら適切にフォルダも分ける。ファイルの数を減らすことを目的にしない。1つのファイルに別々の役割を詰め込まない
- 起動は `npm start`
- 対象は Mac と Windows。OS ごとに違う処理（アプリ一覧、アイコンの取得）は `process.platform` で分ける。Mac・Windows とも実装済み（Windows はスタートメニューの `.lnk` を読む。`src/main/apps.js` の `scanWindows`、`src/main/icons.js` の `iconFromOS`）
- Windows の動作確認は、WSL ではなく Windows 側（PowerShell）で行う。WSL で動かすと Linux 版になり、Windows 用の処理を試せない
- コミットメッセージは日本語で、何をしたかを1行で
- ゲームの画面に重ねる、ゲームのメモリを読む、といった、ゲームの中に触れる機能は入れない
