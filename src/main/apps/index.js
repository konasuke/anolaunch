const { scanMac } = require('./mac');
const { scanWindows } = require('./windows');

function getApps() {
  const apps = process.platform === 'win32' ? scanWindows() : scanMac();
  return apps.sort((a, b) => a.name.localeCompare(b.name));
}

module.exports = { getApps };
