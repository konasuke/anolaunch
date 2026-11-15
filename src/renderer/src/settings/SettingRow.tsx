import type { ReactNode } from 'react';

interface Props {
  label: ReactNode;
  children: ReactNode;
}

// 設定の1行：左に項目の名前、右に操作するもの
export function SettingRow({ label, children }: Props) {
  return (
    <div className="row">
      {label}
      <div className="control">{children}</div>
    </div>
  );
}
