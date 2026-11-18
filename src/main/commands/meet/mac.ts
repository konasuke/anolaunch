import { execFile } from 'child_process';
import { promisify } from 'util';
import { findMeetingUrl } from './url';

const execFileAsync = promisify(execFile);

// タブの URL を AppleScript で読めるブラウザ（Bundle ID → タブの呼び方）。Firefox は、読む方法がないので対象外
const BROWSERS: Record<string, 'chromium' | 'safari'> = {
  'com.google.Chrome': 'chromium',
  'com.microsoft.edgemac': 'chromium',
  'com.brave.Browser': 'chromium',
  'com.vivaldi.Vivaldi': 'chromium',
  'com.operasoftware.Opera': 'chromium',
  'company.thebrowser.Browser': 'chromium', // Arc
  'com.apple.Safari': 'safari',
};

const osascript = async (script: string) => (await execFileAsync('osascript', ['-e', script])).stdout.trim();

// 手前のブラウザの、手前の窓の、今のタブの URL。ブラウザでなければ（読めなければ）null
// 初めて読むときは、OS が「オートメーション」の許可を聞く。許可されないと読めない
async function readFrontBrowserUrl(): Promise<string | null> {
  try {
    const id = await osascript(
      'tell application "System Events" to get bundle identifier of first application process whose frontmost is true',
    );
    const kind = BROWSERS[id];
    if (!kind) return null;
    const tab = kind === 'safari' ? 'current tab' : 'active tab';
    return await osascript(`tell application id "${id}" to get URL of ${tab} of front window`);
  } catch {
    return null;
  }
}

const INTERVAL_MS = 500;

// 作成ページを開いて（open）、手前のブラウザのタブに、会議の URL が出るのを待つ。timeoutMs たっても出なければ null
async function createMeetingUrl(open: () => Promise<void>, timeoutMs: number): Promise<string | null> {
  try {
    await open();
  } catch {
    return null;
  }
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const url = await readFrontBrowserUrl();
    const found = url && findMeetingUrl(url);
    if (found) return found;
    await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS));
  }
  return null;
}

export { createMeetingUrl };
