// インストールされているアプリの一覧（メインプロセスが集めて渡す）
let apps = [];
// 絞り込んだ結果と、その中で選んでいる位置
let results = [];
let selected = 0;

// 画面に出す文言（メインプロセスから受け取る。言語はメイン側で決まる）
let messages = {};
const t = (key) => messages[key] ?? key;

const input = document.getElementById('query');
const list = document.getElementById('results');

// アプリの種類の、画面に出す名前（Application、Game、Store App など）
const kindLabel = (app) => (app.kind ? t(`kind.${app.kind}`) : '');

// 名前か種類の名前に入力が含まれるものを残す（大文字小文字は区別しない）
function filterApps(query) {
  const q = query.trim().toLowerCase();
  return apps.filter((app) => app.name.toLowerCase().includes(q) || kindLabel(app).toLowerCase().includes(q));
}

function render() {
  list.replaceChildren(
    ...results.map((app, i) => {
      const li = document.createElement('li');
      const icon = document.createElement('img');
      if (app.icon) icon.src = app.icon;
      const name = document.createElement('span');
      name.textContent = app.name;
      // 行の右端に、種類（Application、Game など）を出す
      const kind = document.createElement('span');
      kind.className = 'kind';
      kind.textContent = kindLabel(app);
      li.append(icon, name, kind);
      if (i === selected) li.classList.add('selected');
      // マウス：動かすと、その行を選び、クリックすると起動する（クリックしても、入力欄からフォーカスを外さない）
      li.addEventListener('mousemove', () => selectRow(i));
      li.addEventListener('mousedown', (event) => event.preventDefault());
      li.addEventListener('click', () => launchApp(app));
      return li;
    })
  );
  list.children[selected]?.scrollIntoView({ block: 'nearest' });
  // 中身の高さに窓を合わせる（入力欄だけのときは小さく、結果があれば大きく）
  window.api.resizeWindow(document.body.offsetHeight);
}

// 入力が変わったら絞り直して、先頭を選ぶ。入力が空のときは何も出さない
function update() {
  results = input.value.trim() === '' ? [] : filterApps(input.value);
  selected = 0;
  render();
}

// マウスで指した行を選ぶ。一覧は作り直さず、選択の見た目だけ変える
// （mouseenter ではなく mousemove にして、キーで一覧がスクロールしたとき、動いていないマウスの下の行に、選択が移らないようにする）
function selectRow(index) {
  if (index === selected) return;
  list.children[selected]?.classList.remove('selected');
  selected = index;
  list.children[selected]?.classList.add('selected');
}

function launchApp(app) {
  window.api.launchApp(app.path);
  input.value = '';
  update();
}

function launchSelected() {
  const app = results[selected];
  if (app) launchApp(app);
}

input.addEventListener('input', update);

// 窓が出たら、入力欄に残っている文字を全選択する（そのまま打てば置き換わり、残したければ、そのまま使える）
window.api.onShown(() => {
  input.focus();
  input.select();
});

input.addEventListener('keydown', (event) => {
  // 日本語入力の変換中の Enter や矢印は、変換のために使うので無視する
  if (event.isComposing) return;

  if (event.key === 'ArrowDown') {
    event.preventDefault();
    if (results.length > 0) selected = (selected + 1) % results.length;
    render();
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    if (results.length > 0) selected = (selected - 1 + results.length) % results.length;
    render();
  } else if (event.key === 'Enter') {
    event.preventDefault();
    launchSelected();
  }
});

// 歯車ボタン（設定画面を開く）。ショートカットは Windows が Ctrl+,、Mac が Cmd+,
const settingsButton = document.getElementById('settings');
let shortcutHint = 'Ctrl+,';

function updateSettingsTooltip() {
  const label = `${t('search.settings')} (${shortcutHint})`;
  settingsButton.dataset.tooltip = label; // 見た目の吹き出し（CSS）に使う
  settingsButton.setAttribute('aria-label', label);
}

window.api.getAppInfo().then((info) => {
  shortcutHint = info.platform === 'darwin' ? '⌘,' : 'Ctrl+,';
  updateSettingsTooltip();
});

// クリックしても、入力欄からフォーカスを外さない
settingsButton.addEventListener('mousedown', (event) => event.preventDefault());
settingsButton.addEventListener('click', () => window.api.openSettings());

// Ctrl+,（Mac は Cmd+,）で、設定画面を開く
window.addEventListener('keydown', (event) => {
  if (event.isComposing || !(event.ctrlKey || event.metaKey)) return;
  if (event.code === 'Comma' || event.key === ',') {
    event.preventDefault();
    window.api.openSettings();
  }
});

// 文言を受け取って、文言を使う部分を作り直す
function applyMessages(loadedMessages) {
  messages = loadedMessages;
  input.placeholder = t('search.placeholder');
  updateSettingsTooltip();
  render();
}

// 言語が変わったら、文言を受け取り直す
window.api.onMessagesChanged(() => window.api.getMessages().then(applyMessages));

// 文言はすぐ受け取る（アプリの一覧は読み込みに数秒かかるので、待たない）
window.api.getMessages().then(applyMessages);

window.api.getApps().then((loadedApps) => {
  apps = loadedApps;
  update();
});
