import { spawn } from 'child_process';
import { findMeetingUrl } from './url';

// 全部のブラウザの窓のアドレスバー（その窓の、今のタブ）を、0.4 秒おきに読んで、1 行ずつ出し続ける PowerShell（UI Automation を使う）。
// 手前の窓だけでなく、全部の窓を読む：作成ページを開いても、ブラウザが手前に来るとは限らない（Windows は、ほかのアプリが手前に出るのを止めることがある）
// 出力の形：1 回目に見つけたものは「B:」（開く前からあった URL）、そのあとは「U:」。1 回目が終わったら「READY」
// 起動が重いので、1回だけ起動して、中で繰り返す。止めるのは、呼ぶ側（見つかったとき・時間切れ）。念のため、50 回（約 25 秒）で自分でも終わる
const SCRIPT = `
$ErrorActionPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type @"
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
public class Win {
  delegate bool EnumProc(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc p, IntPtr l);
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  public static List<IntPtr> All() {
    var list = new List<IntPtr>();
    EnumWindows((h, l) => { if (IsWindowVisible(h)) list.Add(h); return true; }, IntPtr.Zero);
    return list;
  }
}
"@
$names = 'chrome', 'msedge', 'firefox', 'brave', 'opera', 'vivaldi'
$cond = New-Object Windows.Automation.PropertyCondition([Windows.Automation.AutomationElement]::ControlTypeProperty, [Windows.Automation.ControlType]::Edit)
for ($i = 0; $i -lt 50; $i++) {
  $prefix = if ($i -eq 0) { 'B:' } else { 'U:' }
  $pids = @(Get-Process -Name $names | ForEach-Object { $_.Id })
  foreach ($h in [Win]::All()) {
    [uint32]$owner = 0
    [void][Win]::GetWindowThreadProcessId($h, [ref]$owner)
    if ($pids -notcontains [int]$owner) { continue }
    $root = [Windows.Automation.AutomationElement]::FromHandle($h)
    foreach ($e in $root.FindAll('Descendants', $cond)) {
      # Chrome 系のアドレスバーは OmniboxViewViews、Firefox は urlbar-input
      if ($e.Current.ClassName -eq 'OmniboxViewViews' -or $e.Current.AutomationId -eq 'urlbar-input') {
        $v = $e.GetCurrentPattern([Windows.Automation.ValuePattern]::Pattern).Current.Value
        if ($v) { Write-Output ($prefix + $v) }
      }
    }
  }
  if ($i -eq 0) { Write-Output 'READY' }
  Start-Sleep -Milliseconds 400
}
`;

// 作成ページを開いて（open）、ブラウザのアドレスバーに、新しい会議の URL が出るのを待つ。timeoutMs たっても出なければ null。
// 開く前から、どこかのタブに出ていた会議の URL は、新しい会議ではないので、無視する
function createMeetingUrl(open: () => Promise<void>, timeoutMs: number): Promise<string | null> {
  return new Promise((resolve) => {
    // スクリプトは、引用符の扱いを避けるため、UTF-16 の base64 にして渡す
    const encoded = Buffer.from(SCRIPT, 'utf16le').toString('base64');
    const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded], {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'ignore'],
    });

    let done = false;
    let timer: NodeJS.Timeout | undefined;
    const finish = (url: string | null) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      child.kill();
      resolve(url);
    };

    const before = new Set<string>(); // 開く前からあった会議の URL
    let opened = false;
    let buffer = '';
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      buffer += chunk;
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (line === 'READY') {
          // 開く前の様子を読み終えたので、作成ページを開く。待つ時間は、ここから数える
          opened = true;
          timer = setTimeout(() => finish(null), timeoutMs);
          open().catch(() => finish(null));
          continue;
        }
        const url = findMeetingUrl(line.slice(2));
        if (!url) continue;
        if (line.startsWith('B:')) before.add(url);
        else if (opened && !before.has(url)) return finish(url);
      }
    });
    child.on('error', () => finish(null));
    child.on('close', () => finish(null));
  });
}

export { createMeetingUrl };
