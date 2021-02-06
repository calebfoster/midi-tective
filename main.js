const { app, BrowserWindow } = require('electron');
var midi = require('midi');

require('electron-reload')(__dirname);

function createWindow() {
    let win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true
        }
    });
    win.loadFile('index.html');
    win.webContents.openDevTools()
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    // shutdown midi
    var midi = require('midi');
    var input = new midi.input();
    input.closePort();

    app.quit();
});