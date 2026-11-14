// インストールされているアプリの一覧（メインプロセスが集めて渡す）
let apps = [];
// 絞り込んだ結果と、その中で選んでいる位置
let results = [];
let selected = 0;

const input = document.getElementById('query');
const list = document.getElementById('results');

// 名前に入力が含まれるものを残す（大文字小文字は区別しない）
function filterApps(query) {
  const q = query.trim().toLowerCase();
  return apps.filter((app) => app.name.toLowerCase().includes(q));
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
      kind.textContent = app.kind || '';
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

window.api.getApps().then((result) => {
  apps = result;
  update();
});
