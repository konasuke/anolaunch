const { shell } = require('electron');

// アプリを起動する。失敗したときは、エラーの文字列を返す（成功なら空）
// steam:// のような URL は、OS が対応するアプリ（Steam）に渡す。ほかは、ファイルとして開く
async function launch(target) {
  if (target.startsWith('steam://')) {
    try {
      await shell.openExternal(target);
      return '';
    } catch (error) {
      return String(error);
    }
  }
  return shell.openPath(target);
}

module.exports = { launch };
