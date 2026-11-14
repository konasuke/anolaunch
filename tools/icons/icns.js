// .icns ファイル（Mac のアイコン）を作る。中身は、種類の名前（4文字）をつけた PNG を、並べたもの
// 種類の名前と大きさ：icp4=16、icp5=32、icp6=64、ic07=128、ic08=256、ic09=512、ic10=1024
// ic11=16@2x(32)、ic12=32@2x(64)、ic13=128@2x(256)、ic14=256@2x(512)
const TYPES = [
  ['icp4', 16], ['icp5', 32], ['icp6', 64],
  ['ic07', 128], ['ic08', 256], ['ic09', 512], ['ic10', 1024],
  ['ic11', 32], ['ic12', 64], ['ic13', 256], ['ic14', 512],
];

// pngs：{ サイズ: PNG の Buffer }
function buildIcns(pngs) {
  const chunks = [];
  for (const [type, size] of TYPES) {
    const data = pngs[size];
    if (!data) continue;
    const head = Buffer.alloc(8);
    head.write(type, 0, 'ascii');
    head.writeUInt32BE(8 + data.length, 4);
    chunks.push(head, data);
  }
  const body = Buffer.concat(chunks);
  const header = Buffer.alloc(8);
  header.write('icns', 0, 'ascii');
  header.writeUInt32BE(8 + body.length, 4);
  return Buffer.concat([header, body]);
}

module.exports = { buildIcns };
