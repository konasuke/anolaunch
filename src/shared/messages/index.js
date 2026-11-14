const ja = require('./ja');
const en = require('./en');

const dictionaries = { ja, en };
let language = 'ja';

// 言語を切り替える。知らない言語は無視する
function setLanguage(next) {
  if (dictionaries[next]) language = next;
}

// キーに対応する文言を返す。今の言語に無ければ日本語、それも無ければキーそのもの
function t(key) {
  return dictionaries[language][key] ?? dictionaries.ja[key] ?? key;
}

// 今の言語の文言を全部返す（画面側に渡す用）
function allMessages() {
  return { ...dictionaries.ja, ...dictionaries[language] };
}

module.exports = { setLanguage, t, allMessages };
