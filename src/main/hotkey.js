const { globalShortcut } = require('electron');

// 今登録しているホットキー
let current = null;

// ホットキーを登録する。成功したら true。失敗したら（ほかのアプリが使っているなど）false で、今のホットキーはそのまま
function registerHotkey(accelerator, callback) {
  if (accelerator === current && globalShortcut.isRegistered(accelerator)) return true;
  let ok = false;
  try {
    ok = globalShortcut.register(accelerator, callback);
  } catch {
    ok = false; // 書き方が OS で使えないときなど
  }
  if (!ok) return false;
  // 新しいほうが登録できてから、古いほうを外す（失敗しても、古いほうが残る）
  if (current && current !== accelerator) globalShortcut.unregister(current);
  current = accelerator;
  return true;
}

module.exports = { registerHotkey };
