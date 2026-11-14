const { app } = require('electron');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { ICON_SIZE } = require('./constants');

// アイコンを、画像ファイルとして、ユーザーのデータフォルダに残す（再起動しても、取り直さないため）
// ファイル名は、「どのアプリの、どの状態のファイルか」を表す鍵から決める。アプリが更新されて、
// ファイルの更新日時が変わると、鍵が変わり、別のファイルになる（古いほうは、使われなくなる）

const FORMAT_VERSION = 'v1'; // 保存の形を変えたときに上げる（古いキャッシュを、使わなくする）
const MAX_AGE_DAYS = 90; // これより長く使われていないファイルは、掃除で消す
const TOUCH_AFTER_DAYS = 7; // 使ったとき、これより古ければ、更新日時を今にする（使っているものを、掃除で消さないため）
const DAY = 24 * 60 * 60 * 1000;

function cacheDir() {
  return path.join(app.getPath('userData'), 'icon-cache');
}

function fileFor(key) {
  const hash = crypto.createHash('sha1').update(`${FORMAT_VERSION}:${ICON_SIZE}:${key}`).digest('hex');
  return path.join(cacheDir(), `${hash}.png`);
}

// 鍵に使う、ファイルの「大きさと更新日時」。ファイルが無ければ null
function statKey(file) {
  try {
    const stat = fs.statSync(file);
    return `${file}:${stat.size}:${stat.mtimeMs}`;
  } catch {
    return null;
  }
}

// 保存してあるアイコン（data URL）を返す。無ければ null
function readCachedIcon(key) {
  const file = fileFor(key);
  try {
    const png = fs.readFileSync(file);
    const age = Date.now() - fs.statSync(file).mtimeMs;
    if (age > TOUCH_AFTER_DAYS * DAY) fs.utimesSync(file, new Date(), new Date());
    return `data:image/png;base64,${png.toString('base64')}`;
  } catch {
    return null;
  }
}

// アイコン（data URL）を保存する。保存できなくても、困らない（次に取り直すだけ）
function writeCachedIcon(key, dataUrl) {
  try {
    fs.mkdirSync(cacheDir(), { recursive: true });
    fs.writeFileSync(fileFor(key), Buffer.from(dataUrl.split(',')[1], 'base64'));
  } catch {
    // 保存できなかったときは、何もしない
  }
}

// 保存してあるアイコンを全部消す（設定画面の「キャッシュを削除」）
function clearDiskCache() {
  fs.rmSync(cacheDir(), { recursive: true, force: true });
}

// 長く使われていないファイル（アンインストールしたアプリ、更新で鍵が変わった古いもの）を消す
function pruneDiskCache() {
  try {
    const dir = cacheDir();
    for (const name of fs.readdirSync(dir)) {
      const file = path.join(dir, name);
      if (Date.now() - fs.statSync(file).mtimeMs > MAX_AGE_DAYS * DAY) fs.rmSync(file, { force: true });
    }
  } catch {
    // フォルダが無いときなどは、何もしない
  }
}

module.exports = { statKey, readCachedIcon, writeCachedIcon, clearDiskCache, pruneDiskCache };
