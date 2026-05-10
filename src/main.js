const { app, BrowserWindow, ipcMain, shell } = require("electron");
const crypto = require("node:crypto");
const path = require("node:path");

const ACCESS_CODE_HASH = "906924d751e18247eb3bdd0f64d24f95b09994be4866e2e01ab1a0b7e68d412a";

function verifyAccessCode(code) {
  const submitted = crypto.createHash("sha256").update(String(code ?? "")).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(submitted), Buffer.from(ACCESS_CODE_HASH));
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 860,
    minHeight: 560,
    backgroundColor: "#101214",
    title: "Ehoser Browser",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true
    }
  });

  win.loadFile(path.join(__dirname, "index.html"));

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return { action: "allow" };
    }

    shell.openExternal(url);
    return { action: "deny" };
  });
}

app.whenReady().then(() => {
  ipcMain.handle("access:verify", (_event, code) => verifyAccessCode(code));

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
