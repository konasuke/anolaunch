// インストールされているアプリの一覧（メインプロセスが集めて渡す）
let apps = [];
// 絞り込んだ結果と、その中で選んでいる位置
let results = [];
let selected = 0;
// お気に入りのアプリの path（入れた順）。入力が空のときに、これを一覧に出す
let favorites = [];
// Mac かどうか（お気に入りのショートカットが、Mac は Cmd+D、Windows は Ctrl+D）
let isMac = false;

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

// 入力が空のときに出す、お気に入りのアプリ（入れた順。一覧にもう無いアプリは出さない）
function favoriteApps() {
  const byPath = new Map(apps.map((app) => [app.path, app]));
  return favorites.map((appPath) => byPath.get(appPath)).filter(Boolean);
}

// 今の入力に合わせた一覧。入力が空のときは、お気に入りだけ
const computeResults = () => (input.value.trim() === '' ? favoriteApps() : filterApps(input.value));

// --- アイコン（見えている行の分だけ、メインから取る） ---

// 今表示している行の、アプリ → 画像の要素（取れたアイコンを、すぐ入れるため）
let iconImages = new Map();

// 一覧の中で、見える位置に来た行のアイコンを取る（まだ取っていないものだけ）
const iconObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      iconObserver.unobserve(entry.target);
      loadIcon(entry.target.app);
    }
  },
  { root: list, rootMargin: '40px' } // 見える範囲の少し先まで、先に取る
);

function loadIcon(app) {
  if (app.icon !== undefined || app.loadingIcon) return; // 取れた（アイコンなしも含む）、または取っている最中
  app.loadingIcon = true;
  window.api.getIcon(app.path).then((icon) => {
    app.icon = icon;
    app.loadingIcon = false;
    const img = iconImages.get(app);
    if (img && icon) img.src = icon;
  });
}

// 行の右端の星ボタン（星の形は Feather Icons、MIT）。お気に入りのときは塗りつぶす（CSS）。クリックで入れる・外す
function createStarButton(app) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'star';
  const label = `${t(favorites.includes(app.path) ? 'favorite.remove' : 'favorite.add')} (${isMac ? '⌘D' : 'Ctrl+D'})`;
  button.dataset.tooltip = label; // 見た目の吹き出し（CSS）に使う
  button.setAttribute('aria-label', label);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const star = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  star.setAttribute('points', '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2');
  svg.append(star);
  button.append(svg);
  // クリックしても、入力欄からフォーカスを外さない。行のクリック（起動）にもしない
  button.addEventListener('mousedown', (event) => event.preventDefault());
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleFavorite(app);
  });
  return button;
}

function render() {
  iconObserver.disconnect();
  iconImages = new Map();
  list.replaceChildren(
    ...results.map((app, i) => {
      const li = document.createElement('li');
      li.app = app;
      const icon = document.createElement('img');
      if (app.icon) icon.src = app.icon;
      iconImages.set(app, icon);
      const name = document.createElement('span');
      name.textContent = app.name;
      // 行の右端に、種類（Application、Game など）を出す
      const kind = document.createElement('span');
      kind.className = 'kind';
      kind.textContent = kindLabel(app);
      li.append(icon, name, kind, createStarButton(app));
      if (favorites.includes(app.path)) li.classList.add('favorite');
      if (i === selected) li.classList.add('selected');
      // マウス：動かすと、その行を選び、クリックすると起動する（クリックしても、入力欄からフォーカスを外さない）
      li.addEventListener('mousemove', () => selectRow(i));
      li.addEventListener('mousedown', (event) => event.preventDefault());
      li.addEventListener('click', () => launchApp(app));
      return li;
    })
  );
  for (const li of list.children) {
    if (li.app.icon === undefined) iconObserver.observe(li);
  }
  list.children[selected]?.scrollIntoView({ block: 'nearest' });
  // 中身の高さに窓を合わせる（入力欄だけのときは小さく、結果があれば大きく）
  window.api.resizeWindow(document.body.offsetHeight);
}

// 入力が変わったら絞り直して、先頭を選ぶ。入力が空のときは何も出さない
function update() {
  results = computeResults();
  selected = 0;
  render();
}

// お気に入りに入れる・外す。選んでいる位置は動かさない（外して一覧が縮んだときだけ、範囲内に収める）
function toggleFavorite(app) {
  window.api.toggleFavorite(app.path).then((list) => {
    favorites = list;
    results = computeResults();
    selected = Math.min(selected, Math.max(results.length - 1, 0));
    render();
  });
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
  } else if (event.code === 'KeyD' && (isMac ? event.metaKey : event.ctrlKey) && !event.altKey && !event.shiftKey) {
    // Cmd+D（Windows は Ctrl+D）：選んでいるアプリを、お気に入りに入れる・外す
    event.preventDefault();
    if (results[selected]) toggleFavorite(results[selected]);
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
  isMac = info.platform === 'darwin';
  shortcutHint = isMac ? '⌘,' : 'Ctrl+,';
  updateSettingsTooltip();
  render(); // 星ボタンの吹き出しのショートカットを、OS に合わせて作り直す
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

// アプリの一覧を取る（アイコンは、表示する行の分だけ、あとから取る）
function loadApps() {
  // お気に入りも一緒に取る（入力が空のときの一覧に、アプリの一覧とお気に入りの両方が要るため）
  return Promise.all([window.api.getApps(), window.api.getFavorites()]).then(([loadedApps, loadedFavorites]) => {
    apps = loadedApps;
    favorites = loadedFavorites;
    update();
  });
}

loadApps();

// キャッシュが削除されたとき、アプリの追加・削除が見つかったときは、一覧を取り直す（アイコンも、表示のときに取り直される）
window.api.onCacheCleared(loadApps);
window.api.onAppsChanged(loadApps);
