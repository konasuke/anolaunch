// インストールされているアプリの一覧（メインプロセスが集めて渡す）
let apps = [];

const input = document.getElementById('query');
const list = document.getElementById('results');

// 名前に入力が含まれるものを残す（大文字小文字は区別しない）
function filterApps(query) {
  const q = query.trim().toLowerCase();
  return apps.filter((app) => app.name.toLowerCase().includes(q));
}

function render() {
  const results = filterApps(input.value);
  list.replaceChildren(
    ...results.map((app) => {
      const li = document.createElement('li');
      li.textContent = app.name;
      return li;
    })
  );
}

input.addEventListener('input', render);
window.api.getApps().then((result) => {
  apps = result;
  render();
});
