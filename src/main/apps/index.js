const { scanMac } = require('./mac');
const { scanWindows } = require('./windows');
const { scanSteam } = require('./steam');
const { getUwpApps } = require('./uwp');

function getApps() {
  const isWindows = process.platform === 'win32';
  const apps = isWindows ? scanWindows() : scanMac();
  const games = new Map(scanSteam().map((g) => [g.steamId, g]));

  const result = [];
  const shown = new Set(); // すでに一覧にある Steam のゲームの番号
  for (const app of apps) {
    // Mac の Steam のショートカットは、アイコンが Steam のロゴ（共通の絵）になっている。
    // Steam から集めたゲーム（ゲーム自身のアイコンがある）に置き換えて、名前だけショートカットのものを使う
    const game = !isWindows && app.steamId ? games.get(app.steamId) : null;
    result.push(game ? { ...game, name: app.name } : app);
    if (app.steamId) shown.add(app.steamId);
  }

  // Steam のゲームのうち、まだ一覧にないもの。スタートメニューの .url（Windows）などで出ているものは、重ねて出さない
  for (const game of games.values()) {
    if (!shown.has(game.steamId)) result.push(game);
  }

  // Windows のストアアプリ。同じ名前がすでに一覧にあるものは、重ねて出さない
  if (isWindows) {
    const names = new Set(result.map((a) => a.name.toLowerCase()));
    for (const app of getUwpApps()) {
      if (!names.has(app.name.toLowerCase())) result.push(app);
    }
  }

  return result.sort((a, b) => a.name.localeCompare(b.name));
}

module.exports = { getApps };
