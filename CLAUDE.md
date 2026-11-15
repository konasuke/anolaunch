# Anolaunch

Raycast のような、ホットキーで窓が出るランチャー（Electron）。真似て作って学ぶのが目的。

## 名前

- 名前は **Anolaunch**（アノランチ。アノール＋launch）。`package.json` の `name` は `anolaunch`、`productName` は `Anolaunch`
- 以前の名前は `launcher`。名前を変えると設定の保存先のフォルダ名も変わるので、`src/main/store/settings.ts` が前の名前のフォルダ（`OLD_FOLDER_NAMES`）から設定を引き継ぐ
- GitHub のリポジトリは `konasuke/anolaunch`（古い URL は自動的に転送される）。PC のフォルダ名も `anolaunch` にそろえる

## 作業を始めるとき

- 最初に `_doc/TODO.md` を読む。やることが Windows・Mac・共通に分かれていて、作業する OS の PC では、その OS の項目をすぐ始められる
- 終わった項目は項目ごと消す。済んだことの記録は TODO に残さない（Git の履歴にある）。新しく分かったことや増えたやることは足す
- 手順は、どの PC でも次のとおり
  ```bash
  git pull
  npm install
  npm start
  ```
- 起動は `npm start`（`electron-vite dev`。画面を直すと、窓を開いたまま反映される）。`npx electron .` は使わない（ビルドが済んでいないと動かず、`node_modules` が無いと、毎回 Electron 本体を取りに行って止まる）
- `npm install` のあと `node_modules/electron/dist` が無ければ（Electron 本体の取得が途中で失敗したとき）、`node node_modules/electron/install.js` で本体を取得する
- 起動できたら、`Ctrl/Cmd+Shift+Space` で窓が出るか確かめる。すでに動いているランチャーがあるとホットキーが登録できないので、先に終了する（トレイのアイコン → 終了）
- 環境変数 `ELECTRON_RUN_AS_NODE` が設定されていると、Electron が Node として動き、起動に失敗する（`app` が undefined になる）。Claude Code のシェルでは設定されていることがあるので、`env -u ELECTRON_RUN_AS_NODE npm start` で起動する
- コミットの前に `npm run typecheck`（型のエラーが 0 であること）

## 方針

- 言語は TypeScript（`src/` の中。メイン・preload・画面・共有）。画面は React。`tools/` の道具だけ JavaScript（Electron で一度動かすだけのため）
- ビルドは **electron-vite**（メイン・preload・画面を、それぞれまとめて `out/` に出す）。設定は `electron.vite.config.ts`
- 役割ごとにファイルを分け、増えてきたら適切にフォルダも分ける。ファイルの数を減らすことを目的にしない。1つのファイルに別々の役割を詰め込まない
- 余計なライブラリは入れない（画面の状態は React の hooks で足りる間は、状態管理のライブラリを入れない）
- コミットメッセージは日本語で、何をしたかを書く。1行目に要点、必要なら空行のあとに理由や補足を足してよい。`Co-Authored-By: Claude` などの共作者の行は付けない（PR の説明にも「Generated with Claude Code」を付けない）
- ブランチは機能ごとに切る。名前は `feat/<内容>`（例：`feat/favorites`）。確認してから `main` に入れる
- 画面（`src/renderer/src/launcher/`・`settings/`）同士は import しない。画面をまたいで使うものが出たら、`hooks/` か、新しく作る `components/`（UI 部品）・`lib/`（画面から使う純粋な関数）に移す。1つの画面でしか使わない部品は、その画面のフォルダに置く
- 画面を `pages/` の下にまとめるのは、画面が3つ以上になるか、`components/` が必要になってから。今は急がない（上の決まりを守っていれば、移すのは機械的にできる）
- `shared/types.ts` が大きくなったら `types/` に分ける。`shared/` にはロジックを入れない（メインと画面の依存が絡むため）
- 機能が増えて、1つの機能がメイン・画面の両方にまたがって育ったら、`features/<名前>/`（メインは `src/main/features/`、画面は `src/renderer/src/features/`）にまとめる。最初から全部を `features/` にはしない
- ファイルを動かすときは `git mv` を使い、履歴を追えるようにする
- ゲームの画面に重ねる、ゲームのメモリを読む、といった、ゲームの中に触れる機能は入れない

## フォルダの構成

```
anolaunch/
├── src/
│   ├── main/                  # メインプロセス
│   │   ├── index.ts           # 起動と、各モジュールの組み立てだけ
│   │   ├── ipc/               # 画面とのやり取り（IPC）の登録。機能ごと
│   │   │   ├── index.ts       # registerIpc() で全部まとめる
│   │   │   ├── apps.ts        # アプリ一覧・アイコン・起動・キャッシュ
│   │   │   ├── favorites.ts
│   │   │   ├── settings.ts    # 設定と文言
│   │   │   └── window.ts      # ランチャーの窓の大きさ
│   │   ├── windows/           # 窓
│   │   │   ├── launcher.ts    # ランチャーの窓（作る・出す・隠す・大きさ）
│   │   │   ├── settings.ts    # 設定画面の窓
│   │   │   └── load-page.ts   # 画面（HTML）と preload の読み込み
│   │   ├── system/            # OS とのやり取り
│   │   │   ├── hotkey.ts
│   │   │   ├── tray.ts
│   │   │   └── autostart.ts
│   │   ├── store/             # 保存するデータ
│   │   │   ├── settings.ts    # settings.json
│   │   │   └── favorites.ts   # favorites.json
│   │   ├── apps/              # アプリ一覧を集める（mac / windows / uwp / steam）
│   │   ├── icons/             # アイコンの取り出し（mac / windows）とキャッシュ（cache.ts）
│   │   ├── app-list.ts        # アプリ一覧の取得と保持
│   │   └── launch.ts          # アプリの起動
│   ├── preload/
│   │   └── index.ts           # 画面に window.api を渡す（唯一の入り口）
│   ├── renderer/              # 画面（React）
│   │   ├── env.d.ts           # 画面側の型の宣言
│   │   ├── launcher/index.html   # 入口の HTML
│   │   ├── settings/index.html
│   │   ├── assets/            # 画面から読む画像（logo.png）
│   │   └── src/
│   │       ├── launcher/      # ランチャー（Launcher.tsx、ResultRow.tsx、search.ts など）
│   │       ├── settings/      # 設定画面（Settings.tsx、項目ごとの *Row.tsx、hotkey.ts）
│   │       └── hooks/         # 2つの画面で使う hooks（文言、アプリ一覧、アイコン、OS）
│   └── shared/                # メイン・preload・画面の全部が使うもの
│       ├── messages/          # 文言（ja.ts / en.ts）
│       ├── ipc-channels.ts    # IPC のチャンネル名
│       ├── kinds.ts           # アプリの種類
│       └── types.ts
├── resources/                 # メインが実際のファイルとして読む画像・スクリプト（トレイ、窓のアイコン、icon.jxa）
├── design/                    # アイコンの元の画像
├── build/                     # インストーラー用のアイコン
├── tools/                     # アイコンを作るスクリプト
├── _doc/                      # TODO.md
├── .github/workflows/         # release.yml（タグの push でインストーラーを作る）
├── electron.vite.config.ts    # ビルドの設定（画面の入口の HTML もここ）
├── out/                       # ビルドの出力（Git には入れない）
└── dist/                      # インストーラー（同じく入れない）
```

- `store/favorites.ts` は、設定とは別のファイルに保存する（設定の「初期値に戻す」で消えないように）
- `windows/load-page.ts` の読み込み先は、開発中は Vite のサーバー、ビルド後は `out/renderer`
- `shared/` にはロジックを入れない（上の「方針」）

## 構成と決まりごと

### メインと画面のやり取り（IPC）

- 画面からメインに頼む・メインから画面に知らせるものは、次の3か所を**そろえて**書く
  1. `src/main/ipc/`（機能ごとのファイル）：`ipcMain.handle`（返事あり）/ `ipcMain.on`（返事なし）、通知は `webContents.send`。チャンネル名は `src/shared/ipc-channels.ts` の `INVOKE` / `SEND` / `EVENT` に足して使う（文字列を直接書かない）
  2. `src/preload/index.ts`：`window.api` に公開する関数
  3. `src/shared/types.ts` の `Api`：その関数の型。画面側は `window.api.○○` の型でチェックされる
- 「〜のとき呼ばれる関数を登録する」`onXxx` は、登録を外す関数を返す。React では `useEffect` の戻り値に渡す
- 画面から来る要求は、メイン側で確かめる（例：`launch-app` は、一覧にあるアプリの path だけ受け付ける）

### OS ごとの処理

- 対象は Mac と Windows。どちらも実装済み
- OS ごとに違う処理（アプリ一覧、アイコンの取得）は、`src/main/apps/`・`src/main/icons/` の中で `mac.ts` / `windows.ts` に分け、`index.ts` が `process.platform` で選ぶ
- アプリ一覧は、種類ごとに集めて合わせる
  - Windows：スタートメニューの `.lnk` と `.url`（`windows.ts`）、ストアアプリ（`uwp.ts`。PowerShell の `Get-StartApps` / `Get-AppxPackage`）
  - Mac：`/Applications` などのアプリ（`mac.ts`）
  - Steam のゲーム：`steam.ts`（Mac・Windows 共通。Steam の `.acf` を読む）
- Windows の動作確認は、WSL ではなく Windows 側（PowerShell）で行う。WSL で動かすと Linux 版になり、Windows 用の処理を試せない
- Windows の処理は Mac では動かせない。Mac では型の確認（`npm run typecheck`）までしかできないので、変えたら TODO の Windows の項目に、確認することを足す

### 画面に出す文言

- 入力欄の案内、トレイのメニュー、種類の名前などは、`src/shared/messages/` の `ja.ts` と `en.ts` に、キーで書く。コードに文字列を直接書かない
- キーは `ja.ts` が元になり、`en.ts` は同じキーを全部持つ必要がある（足りない・余分なキーは、型のエラーになる）。`t()` に渡せるのも、このキーだけ
- メインでは `t('キー')` を使う。画面側（renderer）はメインから受け取った文言を使う（`useMessages()` の `t`）。言語が変わると、自動で入れ替わる
- コードが比較に使うアプリの種類は、`src/shared/kinds.ts` の `KIND`（`app` / `game` / `store`）。画面に出す名前は、messages の `kind.<ID>`

### 設定

- 設定（言語・ホットキー・自動起動）は `src/main/store/settings.ts` が、OS のアプリ用データフォルダの `settings.json` に保存する。型は `src/shared/types.ts` の `Settings`
- 項目を足すときは、次の5か所に足す（`Settings` に足して `VALIDATORS` に足し忘れると、型のエラーになる）
  1. `shared/types.ts` の `Settings`
  2. `store/settings.ts` の `VALIDATORS` と `defaults`
  3. `ipc/settings.ts` の `set-settings`（反映する処理）
  4. 設定画面（`src/renderer/src/settings/` に `○○Row.tsx` を作り、`Settings.tsx` に並べる）
  5. 設定画面に出す文言（`ja.ts` と `en.ts`）
- 設定画面はトレイの「設定…」と、ランチャーの歯車ボタンから開く。画面側からは `window.api.getSettings()` / `setSettings()` で読み書きする（変えた時点で保存する）

### アイコン

- アプリのアイコン（アノール）の元の画像は `design/`
- `npm run icons`（`tools/make-icons.js`）で、次を作り直す
  - `build/`：`.ico`・`.icns`・各サイズの PNG
  - `resources/`：`tray.png`・`tray@2x.png`（トレイ用）、`icon.ico`（窓のアイコン用）
  - `src/renderer/assets/`：`logo.png`（入力欄の左端のロゴ）
- アイコンを変えるときは、`design/anole-icon-original.webp` を差し替えて、このコマンドを実行する

### 実際のファイル（resources）

- メインが、画像や `icon.jxa` のように、OS や別のプログラムに渡す実際のファイルは、`resources/` に置く
- 読むときは `import trayIcon from '../../../resources/tray.png?asset&asarUnpack'` の形で、パスを受け取る（electron-vite の機能。`../` の数は、読むファイルの深さで変わる）。インストール版でも、書庫の外の正しい場所になる
- 画面から読む画像（`logo.png`）は、`src/renderer/assets/` に置いて、普通に `import` する

### インストーラー

- `electron-builder` を使う。設定は `package.json` の `build`。それぞれの OS で作る。`dist` 系のコマンドは、先に `npm run build`（`out/` を作る）を行う
  - Windows：`npm run dist` → `dist/Anolaunch-Setup-<版>.exe`（ユーザー単位の NSIS）
  - Mac：Mac で `npm run dist:mac` → `dist/Anolaunch-<版>-<arch>.dmg`（Apple Silicon なら `arm64`。Intel の Mac では動かない）
- 中身だけ確かめるときは `npm run pack`（`dist/win-unpacked/`、Mac は `dist/mac-arm64/` など）
- 署名・公証はしていない。Mac は、ダウンロードしたものだと「壊れている」と出て開けないので、入れたあとに `xattr -cr /Applications/Anolaunch.app` で印を消してから、右クリックから「開く」で起動する（自分でビルドしたものは不要）
- インストール版には、`out/`・`resources/`・`package.json` が入る（`build.files`）。ソースは `app.asar` にまとまり、`resources/` は `asarUnpack` で書庫の外に出る

### リリース

- `v*` のタグを push すると、GitHub Actions（`.github/workflows/release.yml`）が、型の確認（`npm run typecheck`）とビルドをしてから、Mac と Windows のインストーラーを作り、Releases に**下書き**として置く。公開は手で押す
- 手順は `npm version <版>`（`package.json` の版を上げて、コミットと `v<版>` のタグを作る）→ `git push --follow-tags`。くわしくは README の「リリース」
- 手元でインストーラーを作る `npm run dist` / `dist:mac` とは別。公開用は Actions で作る
