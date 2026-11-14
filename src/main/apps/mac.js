const fs = require('fs');
const os = require('os');
const path = require('path');
const { KIND } = require('../../shared/kinds');

// Mac：.app が置かれるフォルダ
const DIRS = [
  '/Applications',
  '/Applications/Utilities',
  '/System/Applications',
  '/System/Applications/Utilities',
  path.join(os.homedir(), 'Applications'),
];

// Steam がゲームを入れたときに作るショートカットアプリは、Contents/MacOS/run.sh で
// `open steam://run/番号` を呼ぶ。その番号を返す（Steam のショートカットでなければ、なし）
function steamIdOf(appPath) {
  try {
    const script = fs.readFileSync(path.join(appPath, 'Contents', 'MacOS', 'run.sh'), 'utf8');
    return script.match(/steam:\/\/(?:run|rungameid)\/(\d+)/i)?.[1];
  } catch {
    return undefined;
  }
}

function scanMac() {
  const found = new Map();
  for (const dir of DIRS) {
    let entries;
    try {
      entries = fs.readdirSync(dir);
    } catch {
      continue; // フォルダがなければ飛ばす
    }
    for (const entry of entries) {
      if (!entry.endsWith('.app')) continue;
      const name = entry.slice(0, -'.app'.length);
      if (found.has(name)) continue;
      const app = { name, path: path.join(dir, entry), kind: KIND.APP };
      // Steam のショートカットは、Steam から集めたゲームとの重なりを直すために、番号を持たせる
      const steamId = steamIdOf(app.path);
      if (steamId) app.steamId = steamId;
      found.set(name, app);
    }
  }
  return [...found.values()];
}

module.exports = { scanMac };
