import { getApps } from './apps';
import { preloadUwp, reloadUwp } from './apps/uwp';
import { getCommandEntries, findCommandEntry } from './commands';
import type { AppEntry } from '../shared/types';

// アプリの一覧を持っておき、アプリの追加・削除・変更があったら、取り直す（再スキャン）
// ランチャーは、PC の起動時から動かしたままにする使い方なので、再起動しなくても、新しいアプリが出るようにする

const MIN_INTERVAL_MS = 30 * 1000; // 再スキャンは、これより短い間隔では、やり直さない

let apps: AppEntry[] = [];
let known = new Map<string, AppEntry>(); // パス → アプリ（画面からの要求が、一覧にあるアプリかを確かめるため）
let signature = ''; // 今の一覧の「中身の印」。変わったかを比べる
let ready: Promise<void> | null = null;
let inflight: Promise<void> | null = null; // 実行中の再スキャン
let lastRefresh = 0;
let onChange = () => {};

const signatureOf = (list: AppEntry[]) => JSON.stringify(list.map((a) => [a.name, a.path, a.kind]));

function setList(list: AppEntry[]): void {
  apps = list;
  known = new Map(list.map((a) => [a.path, a]));
  signature = signatureOf(list);
}

// 起動時に呼ぶ。ストアアプリは、前に保存した一覧があれば、それをすぐ使う。
// onListChange は、再スキャンで一覧が変わったときに呼ばれる
function initAppList({ onListChange }: { onListChange: () => void }): Promise<void> {
  onChange = onListChange;
  ready = preloadUwp().then(() => {
    setList(getApps());
    lastRefresh = Date.now();
  });
  return ready;
}

// アプリの一覧に、コマンド（Google Meet の会議を作成、など）を足して返す
async function getAppList(): Promise<AppEntry[]> {
  await ready;
  return [...apps, ...getCommandEntries()];
}

// 一覧にあるアプリ・コマンドを、パスから探す
function findApp(appPath: string): AppEntry | undefined {
  return known.get(appPath) ?? findCommandEntry(appPath);
}

// 再スキャンする。実行中なら、それを待つ。force でなければ、前回から 30 秒たっていないときは、何もしない
// ストアアプリは PowerShell で読み直す（約2秒）ので、裏で行い、終わってから、一覧が変わったときだけ知らせる
function refreshApps({ force = false }: { force?: boolean } = {}): Promise<void> {
  if (!ready) return Promise.resolve();
  if (inflight) return inflight;
  if (!force && Date.now() - lastRefresh < MIN_INTERVAL_MS) return Promise.resolve();
  inflight = (async () => {
    try {
      await ready;
      await reloadUwp();
      const next = getApps();
      lastRefresh = Date.now();
      if (signatureOf(next) !== signature) {
        setList(next);
        onChange();
      }
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export { initAppList, getAppList, findApp, refreshApps };
