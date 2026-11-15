import { ipcMain } from 'electron';
import { resizeLauncher } from '../windows/launcher';
import { SEND } from '../../shared/ipc-channels';

// ランチャーの窓の操作
function registerWindowIpc(): void {
  ipcMain.on(SEND.resizeWindow, (event, height) => resizeLauncher(height));
}

export { registerWindowIpc };
