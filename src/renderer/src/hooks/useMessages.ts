import { useCallback, useEffect, useState } from 'react';
import type { MessageKey, Messages } from '../../../shared/messages';

// 画面に出す文言（メインから受け取る。言語はメイン側で決まる）。言語が変わったら、受け取り直す
// ready は、最初の文言を受け取ったか（受け取る前に、キーそのものが見えないようにするため）
export function useMessages() {
  const [messages, setMessages] = useState<Messages | null>(null);

  useEffect(() => {
    const load = () => {
      window.api.getMessages().then(setMessages);
    };
    load();
    return window.api.onMessagesChanged(load);
  }, []);

  const t = useCallback((key: MessageKey) => messages?.[key] ?? key, [messages]);
  return { t, ready: messages !== null };
}
