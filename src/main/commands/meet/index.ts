import { clipboard, shell } from 'electron';
import { t } from '../../../shared/messages';
import { notify } from '../notify';
import { createMeetingUrl as createOnMac } from './mac';
import { createMeetingUrl as createOnWindows } from './windows';

const NEW_MEETING_URL = 'https://meet.google.com/new';
const TIMEOUT_MS = 8000; // 会議の URL が出るのを待つ時間

// Google Meet の会議を作り、URL をクリップボードにコピーする。
// API は使わず、ブラウザ（ログイン済みのアカウント）で作成ページを開き、ブラウザのアドレスバーに URL が出るのを読み取る
async function createMeet(): Promise<void> {
  const createMeetingUrl = process.platform === 'win32' ? createOnWindows : createOnMac;
  const url = await createMeetingUrl(() => shell.openExternal(NEW_MEETING_URL), TIMEOUT_MS);
  if (!url) {
    // 作成ページは開いたままなので、手でコピーできる
    notify(t('meet.failed'), t('meet.failed.hint'));
    return;
  }
  clipboard.writeText(url);
  notify(t('meet.copied'), url);
}

export { createMeet };
