const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

// ゲームではないもの（Steam が一緒に入れる部品）
const IGNORE = /^(Steamworks Common Redistributables|Steam Linux Runtime.*|Proton.*)$/;

// Steam がインストールされているフォルダの候補
function steamDirs() {
  if (process.platform === 'win32') {
    const dirs = [];
    try {
      // レジストリに、インストール先が書かれている（C 以外に入れていても分かる）
      const out = execFileSync('reg', ['query', 'HKCU\\Software\\Valve\\Steam', '/v', 'SteamPath'], { encoding: 'utf8' });
      const match = out.match(/SteamPath\s+REG_SZ\s+(.+)/);
      if (match) dirs.push(path.normalize(match[1].trim()));
    } catch {
      // 取れなければ、よくある場所だけ見る
    }
    for (const env of ['ProgramFiles(x86)', 'ProgramFiles']) {
      if (process.env[env]) dirs.push(path.join(process.env[env], 'Steam'));
    }
    return dirs;
  }
  return [path.join(os.homedir(), 'Library', 'Application Support', 'Steam')];
}

// .vdf / .acf の `"キー"    "値"` の行から、値を全部取り出す
function readValues(text, key) {
  const re = new RegExp(`"${key}"\\s+"((?:[^"\\\\]|\\\\.)*)"`, 'g');
  return [...text.matchAll(re)].map((m) => m[1].replace(/\\\\/g, '\\'));
}

// ゲームを置くフォルダ（Steam のフォルダ自身と、libraryfolders.vdf に書かれた別のライブラリ）
function libraryDirs(steamDir) {
  const dirs = new Set([steamDir]);
  try {
    const vdf = fs.readFileSync(path.join(steamDir, 'steamapps', 'libraryfolders.vdf'), 'utf8');
    for (const dir of readValues(vdf, 'path')) dirs.add(path.normalize(dir));
  } catch {
    // 読めなければ、Steam のフォルダだけ
  }
  return [...dirs];
}

// ゲームの小さなアイコン。librarycache の中の、40文字の英数字の名前の .jpg
function findIcon(steamDir, appId) {
  const dir = path.join(steamDir, 'appcache', 'librarycache', appId);
  try {
    const file = fs.readdirSync(dir).find((f) => /^[0-9a-f]{40}\.jpg$/.test(f));
    return file ? path.join(dir, file) : null;
  } catch {
    return null;
  }
}

// Steam のゲームを、appmanifest_*.acf から集める。起動は steam://rungameid/番号 を開く
function scanSteam() {
  const steamDir = steamDirs().find((dir) => fs.existsSync(path.join(dir, 'steamapps')));
  if (!steamDir) return [];

  const found = new Map();
  for (const lib of libraryDirs(steamDir)) {
    let files;
    try {
      files = fs.readdirSync(path.join(lib, 'steamapps')).filter((f) => /^appmanifest_\d+\.acf$/.test(f));
    } catch {
      continue; // 外付けドライブが外れているときなど
    }
    for (const file of files) {
      try {
        const acf = fs.readFileSync(path.join(lib, 'steamapps', file), 'utf8');
        const [appId] = readValues(acf, 'appid');
        const [name] = readValues(acf, 'name');
        if (!appId || !name || IGNORE.test(name) || found.has(appId)) continue;
        found.set(appId, {
          name,
          path: `steam://rungameid/${appId}`,
          kind: 'Game',
          steamId: appId,
          iconFile: findIcon(steamDir, appId),
        });
      } catch {
        // 読めないものは飛ばす
      }
    }
  }
  return [...found.values()];
}

module.exports = { scanSteam };
