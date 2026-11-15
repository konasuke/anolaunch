import { useCallback, useRef, useState } from 'react';

// アイコン（data URL）。アプリの path → アイコン。取れなかったアプリは null。まだ取っていないアプリは、キーが無い
export type Icons = Record<string, string | null>;

// 見えている行の分だけ、メインから取る。取れたアイコンは、使い回す（取っている最中のものは、もう一度頼まない）
export function useIcons() {
  const [icons, setIcons] = useState<Icons>({});
  const requested = useRef(new Set<string>());
  // reset するたびに増やす。reset の前に頼んだアイコンが、あとから届いても、捨てるため
  const generation = useRef(0);

  const request = useCallback((appPath: string) => {
    if (requested.current.has(appPath)) return;
    requested.current.add(appPath);
    const started = generation.current;
    window.api.getIcon(appPath).then((icon) => {
      if (started !== generation.current) return;
      setIcons((prev) => ({ ...prev, [appPath]: icon }));
    });
  }, []);

  // 取ったアイコンを全部捨てる（キャッシュが削除されたとき。表示している行は、また取り直す）
  const reset = useCallback(() => {
    generation.current += 1;
    requested.current.clear();
    setIcons({});
  }, []);

  return { icons, request, reset };
}
