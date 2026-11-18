// Google Meet の会議の URL は、meet.google.com/ のあとに、英小文字の「3-4-3」の形のコードが付く（例：abc-defg-hij）。
// 作成ページ（meet.google.com/new）のあいだは、この形ではない。ブラウザのアドレスバーは、https:// を省くことがある
const MEETING_URL = /meet\.google\.com\/([a-z]{3}-[a-z]{4}-[a-z]{3})(?![a-z-])/;

// 文字列に会議の URL が入っていれば、https:// 付きの URL を返す（無ければ null）
function findMeetingUrl(text: string): string | null {
  const match = MEETING_URL.exec(text);
  return match ? `https://meet.google.com/${match[1]}` : null;
}

export { findMeetingUrl };
