const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("ehoser", {
  homeUrl: "https://www.google.com/search?q=echter+browser",
  verifyAccessCode: (code) => ipcRenderer.invoke("access:verify", code)
});
