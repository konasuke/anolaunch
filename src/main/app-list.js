const { getApps } = require('./apps');
const { preloadUwp, reloadUwp } = require('./apps/uwp');

// アプリの一覧を持っておき、アプリの追加・削除・変更があったら、取り直す（再スキャン）
// ランチャーは、PC の起動時から動かしたままにする使い方なので、再起動しなくても、新しいアプリが出るようにする

const MIN_INTERVAL_MS = 30 * 1000; // 再スキャンは、これより短い間隔では、やり直さない

let apps = [];
let known = new Map(); // パス → アプリ（画面からの要求が、一覧にあるアプリかを確かめるため）
let signature = ''; // 今の一覧の「中身の印」。変わったかを比べる
let ready = null;
let inflight = null; // 実行中の再スキャン
let lastRefresh = 0;
let onChange = () => {};

const signatureOf = (list) => JSON.stringify(list.map((a) => [a.name, a.path, a.kind]));

function setList(list) {
  apps = list;
  known = new Map(list.map((a) => [a.path, a]));
  signature = signatureOf(list);
}

// 起動時に呼ぶ。ストアアプリは、前に保存した一覧があれば、それをすぐ使う。
// onListChange は、再スキャンで一覧が変わったときに呼ばれる
function initAppList({ onListChange }) {
  onChange = onListChange;
  ready = preloadUwp().then(() => {
    setList(getApps());
    lastRefresh = Date.now();
  });
  return ready;
}

async function getAppList() {
  await ready;
  return apps;
}

// 一覧にあるアプリを、パスから探す
function findApp(appPath) {
  return known.get(appPath);
}

// 再スキャンする。実行中なら、それを待つ。force でなければ、前回から 30 秒たっていないときは、何もしない
// ストアアプリは PowerShell で読み直す（約2秒）ので、裏で行い、終わってから、一覧が変わったときだけ知らせる
function refreshApps({ force = false } = {}) {
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

module.exports = { initAppList, getAppList, findApp, refreshApps };
