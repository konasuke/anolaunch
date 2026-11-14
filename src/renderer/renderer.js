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

function launchSelected() {
  const app = results[selected];
  if (!app) return;
  window.api.launchApp(app.path);
  input.value = '';
  update();
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

// 文言とアプリの一覧が揃ってから、画面を作る
Promise.all([window.api.getMessages(), window.api.getApps()]).then(([loadedMessages, loadedApps]) => {
  messages = loadedMessages;
  apps = loadedApps;
  input.placeholder = t('search.placeholder');
  update();
});
