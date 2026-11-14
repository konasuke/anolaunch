# TODO

これから先にやること。OS ごとの確認は、その OS の PC で行う。

## Windows でやること
- [ ] トレイのアイコンが出るか、右クリックの「表示」「終了」が動くか確かめる（実装済み、動作は未確認）
- [ ] 一覧から Enter で、アプリが起動するか確かめる（`.lnk` を `shell.openPath` で開く。一覧とアイコンは確認済み）
- [ ] アイコンが出ない 2 件を調べる（Riotクライアント、Visual Studio Installer）
- [ ] ストアアプリ（UWP）を一覧に出す（スタートメニューに `.lnk` がないので、別の方法が要る）

## Mac でやること
- [ ] `npm start` で起動し、一覧とアイコンが出るか確かめる（Windows 対応で `src/main/apps/`・`src/main/icons/` を Mac 用と Windows 用に分けたあと、Mac では動かしていない）
- [ ] メニューバーにトレイのアイコンが出るか確かめる（青い虫眼鏡。色付きのままで見えるか）
- [ ] 窓の高さが入力に合わせて変わるか、位置（画面の上から 1/4）が合っているか確かめる
- [ ] Dock にアイコンが出ないようにする（`app.dock.hide()`）
- [ ] ホットキー `Cmd+Shift+Space` が、他のアプリと重ならないか確かめる

## どちらでも
- [ ] PC 起動時に自動で立ち上げる（`app.setLoginItemSettings({ openAtLogin: true })`）
- [ ] インストーラー／`.app` にして、`npm start` なしで使えるようにする（`electron-builder` など。Windows 用は Windows で、Mac 用は Mac で作る）
- [ ] Steam のゲームを一覧に出す（Steam のファイルを読む。くわしくは Vault の `tech/programming/ランチャーの仕組み.md`）
