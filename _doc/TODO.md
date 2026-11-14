# TODO

これから先にやること。OS ごとの確認は、その OS の PC で行う。

## Windows でやること
- [ ] ストアアプリ（UWP）を、ランチャーの窓から Enter で起動できるか確かめる（`src/main/apps/uwp.js`。一覧とアイコン、起動の処理は、動かして確認済み。Copilot だけアイコンが出ない。インストールしたばかりのアプリは、ランチャーを起動し直すまで出ない）

## Mac でやること
- [x] `npm start` で起動し、一覧とアイコンが出るか確かめる（Windows 対応で `src/main/apps/`・`src/main/icons/` を Mac 用と Windows 用に分けたあと、Mac では動かしていない）
- [x] メニューバーにトレイのアイコンが出るか確かめる（青い虫眼鏡。色付きのままで見えるか）
- [x] 窓の位置（画面の上から 1/4）が合っているか確かめる（高さが入力に合わせて変わることは確認済み。位置はだいたい合っているが、使いながら調整する）
- [x] Dock にアイコンが出ないようにする（`app.dock.hide()`）
- [ ] 各行の右端の種類が、Mac の一覧でも出るか確かめる（`.app` は Application、Steam のゲームは Game になるはず。Mac では動かしていない）
- [ ] ホットキー `Cmd+Shift+Space` が、他のアプリと重ならないか確かめる
- [x] **Steam のゲームを、Enter で起動できるか確かめる**（一覧とアイコンは確認済み。Steam の場所は `~/Library/Application Support/Steam` で合っていて、アイコンは `appcache/librarycache/<番号>/` の `.jpg` で出る。Mac は、Steam が `~/Applications` に作るショートカットアプリ（アイコンは Steam のロゴ）と同じゲームを、1行にまとめて出す。ショートカットのない Mac のゲームは、まだ見ていない）

## どちらでも
- [ ] PC 起動時に自動で立ち上げる（`app.setLoginItemSettings({ openAtLogin: true })`）
- [ ] インストーラー／`.app` にして、`npm start` なしで使えるようにする（`electron-builder` など。Windows 用は Windows で、Mac 用は Mac で作る）
