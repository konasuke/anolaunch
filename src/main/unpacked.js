// インストールしたアプリでは、ソースが、1つの書庫（app.asar）にまとめられる。
// アイコンの画像や、osascript に渡すスクリプトのように、OS や別のプログラムが「実際のファイル」として読むものは、
// 書庫の中からは読めない。package.json の asarUnpack で、書庫の外（app.asar.unpacked）に出しておき、ここで、その場所に直す。
// 開発中（npm start）は、書庫がないので、パスは、そのまま返る
function unpacked(filePath) {
  return filePath.replace(/app\.asar([\\/])/, 'app.asar.unpacked$1');
}

module.exports = { unpacked };
