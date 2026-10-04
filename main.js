const {
  app,
  BrowserWindow,
  ipcMain,
  desktopCapturer,
  screen,
  dialog
} = require("electron");

const path = require("path");
const fs = require("fs");

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 980,
    height: 720,
    minWidth: 820,
    minHeight: 680,
    backgroundColor: "#fff2c7",
    title: "Peanut Butter",
    autoHideMenuBar: true,
    icon: path.join(__dirname, "Peanut_Butter.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile("index.html");
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("pb:get-screen-source", async () => {
  const displays = screen.getAllDisplays();
  const primary = screen.getPrimaryDisplay();

  const sources = await desktopCapturer.getSources({
    types: ["screen"],
    thumbnailSize: { width: 0, height: 0 },
    fetchWindowIcons: false
  });

  let source = sources.find(s =>
    s.display_id && String(s.display_id) === String(primary.id)
  );

  if (!source) source = sources[0];

  if (!source) {
    throw new Error("No screen capture source was found.");
  }

  return {
    id: source.id,
    name: source.name,
    width: primary.size.width,
    height: primary.size.height,
    scaleFactor: primary.scaleFactor,
    displayCount: displays.length
  };
});

ipcMain.handle("pb:get-cursor", async () => {
  const p = screen.getCursorScreenPoint();
  return { x: p.x, y: p.y };
});

ipcMain.handle("pb:save-gif", async (_event, bytes) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: "Save your Peanut Butter GIF",
    defaultPath: path.join(
      app.getPath("pictures"),
      `PeanutButter-${Date.now()}.gif`
    ),
    filters: [
      { name: "Animated GIF", extensions: ["gif"] }
    ]
  });

  if (result.canceled || !result.filePath) {
    return { saved: false };
  }

  fs.writeFileSync(result.filePath, Buffer.from(bytes));

  return {
    saved: true,
    path: result.filePath
  };
});


