// .ico ファイル（Windows のアイコン）を作る。中身は、サイズごとの PNG をそのまま並べたもの（256px まで）
// pngs：{ サイズ: PNG の Buffer }
function buildIco(pngs) {
  const sizes = Object.keys(pngs).map(Number).sort((a, b) => a - b);
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // 予約
  header.writeUInt16LE(1, 2); // 種類：アイコン
  header.writeUInt16LE(sizes.length, 4);

  const entries = [];
  let offset = 6 + 16 * sizes.length;
  for (const size of sizes) {
    const data = pngs[size];
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // 幅（256 は 0 で表す）
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // 高さ
    entry.writeUInt8(0, 2); // 色数（使わない）
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4); // プレーン数
    entry.writeUInt16LE(32, 6); // 1画素のビット数
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += data.length;
  }
  return Buffer.concat([header, ...entries, ...sizes.map((s) => pngs[s])]);
}

module.exports = { buildIco };
