import { app, BrowserWindow } from 'electron';
import path from 'path';
import url from 'url';
require('./ipcmain');



function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            // preload: path.join(__dirname, 'ui.tsx'),
        },
    });

    win.loadFile('index.html');
    return win.webContents.on('did-finish-load', () => {
        win.show();
    });
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
