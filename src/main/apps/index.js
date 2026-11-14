const { scanMac } = require('./mac');
const { scanWindows } = require('./windows');
const { scanSteam } = require('./steam');

function getApps() {
  const apps = process.platform === 'win32' ? scanWindows() : scanMac();

  // Steam のゲーム。すでに一覧にあるもの（スタートメニューの .url）は、重ねて出さない
  const known = new Set(apps.map((a) => a.steamId).filter(Boolean));
  for (const game of scanSteam()) {
    if (!known.has(game.steamId)) apps.push(game);
  }

  return apps.sort((a, b) => a.name.localeCompare(b.name));
}

module.exports = { getApps };
