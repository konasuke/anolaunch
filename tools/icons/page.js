// アイコンの画像を加工する（ブラウザの Canvas で行う。make-icons.js が、隠した窓の中で呼ぶ）
// 元の画像（背景がまだら、四角に余白なし）から、次の 3 種類の画像を作って、PNG（data URL）で返す
//   full ：背景を均一にした、端まで描いたアイコン（Windows・Linux 用、各サイズ）
//   mac  ：full の周りに余白を足したアイコン（Mac 用、各サイズ）
//   tray ：トカゲだけを切り抜いた、背景が透明の画像（トレイ用）

const N = 1024; // 元の画像の大きさ

function makeCanvas(width, height = width) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

// 画像を、小さくする。半分ずつ縮めてから、最後に目的の大きさにする（一気に縮めるより、ぎざぎざが出ない）
function scaleTo(canvas, size) {
  let current = canvas;
  while (current.width / 2 >= size) {
    const next = makeCanvas(current.width / 2);
    const ctx = next.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(current, 0, 0, next.width, next.height);
    current = next;
  }
  const out = makeCanvas(size);
  const ctx = out.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(current, 0, 0, size, size);
  return out;
}

const toDataUrl = (canvas) => canvas.toDataURL('image/png');

// 1) 背景の、まだら模様（画像生成のノイズ）を、均一な色にそろえる
// 背景の色（bg）に近い色は、bg にそろえる。t1 以下は完全にそろえ、t1〜t2 は、距離に応じて、なだらかに戻す
// （トカゲの縁取りは、背景と同じ色なので、そろえても、見た目は変わらない）
function flattenBackground(ctx, bg, t1, t2) {
  const image = ctx.getImageData(0, 0, N, N);
  const d = image.data;
  for (let k = 0; k < d.length; k += 4) {
    if (d[k + 3] === 0) continue; // 透明な部分（四隅）は、そのまま
    const dist = Math.hypot(d[k] - bg[0], d[k + 1] - bg[1], d[k + 2] - bg[2]);
    const w = Math.min(1, Math.max(0, (t2 - dist) / (t2 - t1)));
    if (w > 0) {
      d[k] += (bg[0] - d[k]) * w;
      d[k + 1] += (bg[1] - d[k + 1]) * w;
      d[k + 2] += (bg[2] - d[k + 2]) * w;
    }
  }
  ctx.putImageData(image, 0, 0);
}

// 2) トカゲだけを切り抜く
// 緑（体）と橙（喉の袋）の色の画素を「中身」として、その周り OUTLINE 画素ぶんを、縁取り（暗い色）として残す。
// 検索バー（明るい灰色）は、含めない
const OUTLINE = 9;

function cutOutLizard(ctx) {
  const data = ctx.getImageData(0, 0, N, N).data;
  const core = new Uint8Array(N * N);
  let minX = N, minY = N, maxX = 0, maxY = 0;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const k = (y * N + x) * 4;
      const [r, g, b, a] = [data[k], data[k + 1], data[k + 2], data[k + 3]];
      const green = g > r + 25 && g > b + 25 && g > 90;
      const orange = r > 180 && g > 90 && g < 190 && b < 90;
      if (a > 200 && (green || orange)) {
        core[y * N + x] = 1;
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      }
    }
  }
  const x0 = Math.max(0, minX - OUTLINE - 2), x1 = Math.min(N - 1, maxX + OUTLINE + 2);
  const y0 = Math.max(0, minY - OUTLINE - 2), y1 = Math.min(N - 1, maxY + OUTLINE + 2);
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  const out = new ImageData(w, h);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      // 中身の画素までの、いちばん近い距離
      let nearest = Infinity;
      if (core[y * N + x]) nearest = 0;
      else {
        for (let dy = -OUTLINE; dy <= OUTLINE && nearest > 0; dy++) {
          const yy = y + dy;
          if (yy < 0 || yy >= N) continue;
          for (let dx = -OUTLINE; dx <= OUTLINE; dx++) {
            const xx = x + dx;
            if (xx < 0 || xx >= N || !core[yy * N + xx]) continue;
            nearest = Math.min(nearest, Math.hypot(dx, dy));
          }
        }
      }
      if (nearest > OUTLINE) continue;
      const k = (y * N + x) * 4;
      const [r, g, b] = [data[k], data[k + 1], data[k + 2]];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const grayish = Math.max(r, g, b) - Math.min(r, g, b) < 30;
      if (nearest > 0 && lum >= 120 && grayish) continue; // 検索バーの明るい灰色は、含めない
      const o = ((y - y0) * w + (x - x0)) * 4;
      out.data[o] = r; out.data[o + 1] = g; out.data[o + 2] = b;
      out.data[o + 3] = Math.round(255 * Math.min(1, Math.max(0, OUTLINE + 0.5 - nearest))); // 外側の縁は、なだらかに
    }
  }
  const cut = makeCanvas(w, h);
  cut.getContext('2d').putImageData(out, 0, 0);
  return cut;
}

// 切り抜いた画像を、正方形の中央に置く（周りに、少し余白を足す）
function toSquare(cut, margin = 0.06) {
  const side = Math.round(Math.max(cut.width, cut.height) * (1 + margin * 2));
  const square = makeCanvas(side);
  square.getContext('2d').drawImage(cut, Math.round((side - cut.width) / 2), Math.round((side - cut.height) / 2));
  return square;
}

// 元の画像（base64）から、すべての画像を作る。sizes は、作る大きさの一覧
window.makeImages = async (base64, params) => {
  const image = await new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = `data:image/webp;base64,${base64}`;
  });

  // 背景をそろえた、端まで描いたアイコン
  const full = makeCanvas(N);
  const fullCtx = full.getContext('2d', { willReadFrequently: true });
  fullCtx.drawImage(image, 0, 0);
  flattenBackground(fullCtx, params.background, params.flattenFrom, params.flattenTo);

  // Mac 用：周りに余白を足す（1024 の中に、824 の本体を置く）
  const mac = makeCanvas(N);
  const macCtx = mac.getContext('2d');
  macCtx.imageSmoothingQuality = 'high';
  const body = Math.round(N * params.macBodyRatio);
  const offset = Math.round((N - body) / 2);
  macCtx.drawImage(full, offset, offset, body, body);

  // トレイ用：トカゲだけ
  const tray = toSquare(cutOutLizard(fullCtx));

  const result = { full: {}, mac: {}, tray: {} };
  for (const size of params.fullSizes) result.full[size] = toDataUrl(size === N ? full : scaleTo(full, size));
  for (const size of params.macSizes) result.mac[size] = toDataUrl(size === N ? mac : scaleTo(mac, size));
  for (const size of params.traySizes) result.tray[size] = toDataUrl(scaleTo(tray, size));
  return result;
};
