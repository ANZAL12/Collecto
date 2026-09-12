const { app, BrowserWindow, Menu, shell } = require("electron");
const path = require("path");

const fs = require("fs");

// Prevent multiple instances of the app
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

let mainWindow = null;

function getCollectoWebUrl() {
  if (process.env.COLLECTO_WEB_URL) {
    return process.env.COLLECTO_WEB_URL.trim().replace(/\/+$/, "");
  }

  const configPath = path.join(__dirname, "config.json");
  if (fs.existsSync(configPath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      if (cfg.COLLECTO_WEB_URL) {
        let u = cfg.COLLECTO_WEB_URL.trim().replace(/\/+$/, "");
        if (u && !u.startsWith("http://") && !u.startsWith("https://")) u = `https://${u}`;
        return u;
      }
    } catch {}
  }

  const envFiles = [
    path.join(__dirname, "..", ".env.local"),
    path.join(__dirname, "..", ".env"),
  ];
  for (const envPath of envFiles) {
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, "utf-8");
        for (const line of content.split("\n")) {
          const trimmed = line.trim();
          if (trimmed.startsWith("COLLECTO_WEB_URL=")) {
            const val = trimmed
              .replace("COLLECTO_WEB_URL=", "")
              .trim()
              .replace(/^["']|["']$/g, "");
            if (val) return val.replace(/\/+$/, "");
          }
        }
      } catch {}
    }
  }

  return "";
}

// Determine target URL
const configuredCloudUrl = getCollectoWebUrl();
const isDev = !app.isPackaged && process.env.NODE_ENV !== "production" && !configuredCloudUrl;
const DEV_PORT = process.env.PORT || 3000;
const targetUrl = configuredCloudUrl
  ? `${configuredCloudUrl}/admin/dashboard`
  : `http://127.0.0.1:${DEV_PORT}/admin/dashboard`;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1080,
    minHeight: 700,
    title: "Collecto — Admin Desktop",
    icon: path.join(__dirname, "../public/favicon.ico"),
    backgroundColor: "#09090b",
    show: false, // Show once ready-to-show to prevent visual flash
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: true,
    },
  });

  // Attach identification header on all requests made by this desktop app
  // This allows the Next.js middleware to authorize access to /admin/* routes
  mainWindow.webContents.session.webRequest.onBeforeSendHeaders(
    (details, callback) => {
      details.requestHeaders["X-Collecto-Desktop"] = "true";
      details.requestHeaders["User-Agent"] = `${details.requestHeaders["User-Agent"]} CollectoDesktop/1.0`;
      callback({ cancel: false, requestHeaders: details.requestHeaders });
    }
  );

  mainWindow.loadURL(targetUrl);

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  // Handle external links safely in system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http:") || url.startsWith("https:")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Build clean desktop application menu
  setupMenu();
}

function setupMenu() {
  const template = [
    {
      label: "File",
      submenu: [
        {
          label: "Admin Dashboard",
          accelerator: "CmdOrCtrl+D",
          click: () => {
            if (mainWindow) {
              mainWindow.loadURL(targetUrl);
            }
          },
        },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "About Collecto Admin",
          click: () => {
            const { dialog } = require("electron");
            dialog.showMessageBox(mainWindow, {
              type: "info",
              title: "About Collecto Admin",
              message: "Collecto Admin Operations Desktop",
              detail:
                "Dedicated Desktop Application for Collection Operations, Excel Parsing, Shop-to-Executive Mappings, and Enterprise Reconciliation.\n\nVersion: 1.0.0",
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
