// アイコンの画像を作り直す。使い方：npm run icons
// 元の画像（design/anole-icon-original.webp）から、次のファイルを書き出す
//   build/icon.png、build/icons/<サイズ>.png ：Windows・Linux 用（端まで描いたアイコン）
//   build/icon.ico                          ：Windows 用
//   resources/icon.ico                      ：窓のアイコン（同じもの。アプリの中から読む）
//   build/icon-mac.png、build/icon.icns     ：Mac 用（周りに余白を足したアイコン）
//   src/renderer/assets/logo.png            ：入力欄の左端に出すロゴ
//   resources/tray.png、tray@2x.png         ：トレイ用（トカゲだけ、背景が透明）
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');
const { buildIco } = require('./icons/ico');
const { buildIcns } = require('./icons/icns');

const ROOT = path.join(__dirname, '..');
const SOURCE = path.join(ROOT, 'design', 'anole-icon-original.webp');

const PARAMS = {
  background: [37, 42, 46], // 背景の色（元の画像の、背景だけの部分を測った平均）
  flattenFrom: 9, // 背景の色からの距離がこれ以下の色は、背景の色にそろえる
  flattenTo: 15, // ここまでは、距離に応じて、なだらかに戻す
  macBodyRatio: 824 / 1024, // Mac のアイコンは、1024 の中に、824 の本体を置く
  fullSizes: [16, 24, 32, 48, 64, 96, 128, 256, 512, 1024],
  macSizes: [16, 32, 64, 128, 256, 512, 1024],
  traySizes: [16, 32],
};

const decode = (dataUrl) => Buffer.from(dataUrl.split(',')[1], 'base64');

function write(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, data);
  console.log(`書き出し: ${path.relative(ROOT, file)} (${Math.round(data.length / 1024)} KB)`);
}

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, webPreferences: { backgroundThrottling: false } });
  await win.loadFile(path.join(__dirname, 'icons', 'index.html'));
  const base64 = fs.readFileSync(SOURCE).toString('base64');
  const result = await win.webContents.executeJavaScript(`window.makeImages(${JSON.stringify(base64)}, ${JSON.stringify(PARAMS)})`);

  const full = Object.fromEntries(Object.entries(result.full).map(([size, url]) => [size, decode(url)]));
  const mac = Object.fromEntries(Object.entries(result.mac).map(([size, url]) => [size, decode(url)]));
  const tray = Object.fromEntries(Object.entries(result.tray).map(([size, url]) => [size, decode(url)]));

  for (const [size, png] of Object.entries(full)) write(path.join(ROOT, 'build', 'icons', `${size}.png`), png);
  write(path.join(ROOT, 'build', 'icon.png'), full[1024]);
  write(path.join(ROOT, 'build', 'icon-mac.png'), mac[1024]);
  const ico = buildIco(Object.fromEntries([16, 24, 32, 48, 64, 128, 256].map((s) => [s, full[s]])));
  write(path.join(ROOT, 'build', 'icon.ico'), ico);
  // 窓のアイコン（タイトルバー・タスクバー）。アプリの中から読むので、resources にも置く
  write(path.join(ROOT, 'resources', 'icon.ico'), ico);
  // 入力欄の左端に出すロゴ（32px で表示するので、2 倍の 64px）
  write(path.join(ROOT, 'src', 'renderer', 'assets', 'logo.png'), full[64]);
  write(path.join(ROOT, 'build', 'icon.icns'), buildIcns(mac));
  // トレイ：16px（標準）と 32px（高解像度の画面用。@2x）
  write(path.join(ROOT, 'resources', 'tray.png'), tray[16]);
  write(path.join(ROOT, 'resources', 'tray@2x.png'), tray[32]);
  app.exit(0);
});
