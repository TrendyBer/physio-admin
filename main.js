const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

const TITLE = 'Theralivo Admin';
const URL = 'https://physio-admin-orcin.vercel.app';

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    title: TITLE,
    // Το εικονίδιο του παραθύρου και της γραμμής εργασιών. Χωρίς αυτό
    // εμφανίζεται το προεπιλεγμένο άτομο του Electron.
    icon: path.join(__dirname, 'build', 'app-icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // ── ΓΙΑΤΙ ΕΛΕΓΕ «CREATE NEXT APP» ──
  // Το `title` παραπάνω ισχύει μόνο μέχρι να φορτώσει η σελίδα. Μετά,
  // το Electron παίρνει αυτόματα το <title> του HTML — που είναι της
  // εφαρμογής Next, όχι δικό μας.
  //
  // Εδώ ακυρώνουμε αυτή τη συμπεριφορά και κρατάμε το δικό μας όνομα.
  win.on('page-title-updated', (e) => {
    e.preventDefault();
    win.setTitle(TITLE);
  });

  win.loadURL(URL);

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  // Στα Windows καθορίζει πώς ομαδοποιείται η εφαρμογή στη γραμμή
  // εργασιών και ποιο όνομα εμφανίζεται στις ειδοποιήσεις.
  if (process.platform === 'win32') {
    app.setAppUserModelId('gr.theralivo.admin');
  }

  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});