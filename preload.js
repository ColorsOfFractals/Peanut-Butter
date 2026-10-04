const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("peanut", {
  getScreenSource: () =>
    ipcRenderer.invoke("pb:get-screen-source"),

  getCursor: () =>
    ipcRenderer.invoke("pb:get-cursor"),

  saveGif: (bytes) =>
    ipcRenderer.invoke("pb:save-gif", bytes)
});
