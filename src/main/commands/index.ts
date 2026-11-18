import { KIND } from '../../shared/kinds';
import { t } from '../../shared/messages';
import type { MessageKey } from '../../shared/messages';
import type { AppEntry } from '../../shared/types';
import { createMeet } from './meet';
import meetIcon from '../../../resources/command-meet.png?asset&asarUnpack';

// コマンド：一覧に出る項目のうち、アプリを起動するのではなく、実行すると何かをするもの。
// 一覧では AppEntry の一種（kind: 'command'）として扱い、検索・お気に入り・行の表示は、アプリと同じ仕組みを使う

const PREFIX = 'command:'; // path の頭。アプリの path と区別する

interface Command {
  id: string;
  nameKey: MessageKey; // 一覧に出す名前（言語で変わる）
  iconFile: string;
  run: () => Promise<void>;
}

const COMMANDS: Command[] = [
  { id: 'meet-create', nameKey: 'command.meetCreate', iconFile: meetIcon, run: createMeet },
];

function toEntry(command: Command): AppEntry {
  return { name: t(command.nameKey), path: PREFIX + command.id, kind: KIND.COMMAND, iconFile: command.iconFile };
}

// 一覧に足すコマンド。名前は言語で変わるので、呼ぶたびに作る
function getCommandEntries(): AppEntry[] {
  return COMMANDS.map(toEntry);
}

function findCommandEntry(path: string): AppEntry | undefined {
  const command = COMMANDS.find((c) => PREFIX + c.id === path);
  return command ? toEntry(command) : undefined;
}

function isCommandPath(path: string): boolean {
  return path.startsWith(PREFIX);
}

// コマンドを実行する。登録されているコマンドだけ（画面側から、任意の path を渡されても動かさない）
async function runCommand(path: string): Promise<void> {
  const command = COMMANDS.find((c) => PREFIX + c.id === path);
  if (!command) return;
  try {
    await command.run();
  } catch (error) {
    console.error(`コマンドを実行できませんでした: ${path}: ${String(error)}`);
  }
}

export { getCommandEntries, findCommandEntry, isCommandPath, runCommand };
