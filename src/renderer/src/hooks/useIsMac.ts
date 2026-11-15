import { useEffect, useState } from 'react';

// Mac かどうか（ショートカットの表示と判定が、Mac は Cmd、Windows は Ctrl）
export function useIsMac(): boolean {
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    window.api.getAppInfo().then((info) => setIsMac(info.platform === 'darwin'));
  }, []);

  return isMac;
}
