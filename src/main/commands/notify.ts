import { Notification } from 'electron';

// OS の通知を出す。コマンドを実行するとランチャーの窓は隠れるので、結果は通知で知らせる
function notify(title: string, body?: string): void {
  if (!Notification.isSupported()) return;
  new Notification({ title, body, silent: true }).show();
}

export { notify };
