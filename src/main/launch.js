const { shell } = require('electron');
const { spawn } = require('child_process');
const { PREFIX } = require('./apps/uwp');

// アプリを起動する。失敗したときは、エラーの文字列を返す（成功なら空）
// - steam:// のような URL は、OS が対応するアプリ（Steam）に渡す
// - ストアアプリ（shell:AppsFolder\…）は、explorer.exe に開いてもらう
// - ほかは、ファイルとして開く
async function launch(target) {
  if (target.startsWith('steam://')) {
    try {
      await shell.openExternal(target);
      return '';
    } catch (error) {
      return String(error);
    }
  }
  if (target.startsWith(PREFIX)) {
    // explorer.exe は、起動に成功しても 0 以外で終わるので、終了コードは見ない
    spawn('explorer.exe', [target], { detached: true, stdio: 'ignore' }).unref();
    return '';
  }
  return shell.openPath(target);
}

module.exports = { launch };
