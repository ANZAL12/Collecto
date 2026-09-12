const { app, BrowserWindow, Menu, shell } = require("electron");
const path = require("path");
const fs = require("fs");

// Performance optimization flags for Windows 10 & integrated graphics
app.commandLine.appendSwitch("disable-features", "CalculateNativeWinOcclusion");
app.commandLine.appendSwitch("disable-renderer-backgrounding");
app.commandLine.appendSwitch("disable-background-timer-throttling");
app.commandLine.appendSwitch("enable-gpu-rasterization");
app.commandLine.appendSwitch("enable-zero-copy");
app.commandLine.appendSwitch("enable-fast-unload");

// Prevent multiple instances of the app
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

let mainWindow = null;

function getCollectoWebUrl() {
  if (process.env.COLLECTO_WEB_URL) {
    let u = process.env.COLLECTO_WEB_URL.trim().replace(/\/+$/, "");
    if (u && !u.startsWith("http://") && !u.startsWith("https://")) u = `https://${u}`;
    return u;
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
            if (val) {
              let u = val.replace(/\/+$/, "");
              if (!u.startsWith("http://") && !u.startsWith("https://")) u = `https://${u}`;
              return u;
            }
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
    icon: fs.existsSync(path.join(__dirname, "favicon.ico"))
      ? path.join(__dirname, "favicon.ico")
      : path.join(__dirname, "../public/favicon.ico"),
    backgroundColor: "#09090b",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: true,
      backgroundThrottling: false, // Prevents Windows 10 background throttling
    },
  });

  // Attach identification header on all requests made by this desktop app
  mainWindow.webContents.session.webRequest.onBeforeSendHeaders(
    (details, callback) => {
      details.requestHeaders["X-Collecto-Desktop"] = "true";
      details.requestHeaders["User-Agent"] = `${details.requestHeaders["User-Agent"]} CollectoDesktop/1.0`;
      callback({ cancel: false, requestHeaders: details.requestHeaders });
    }
  );

  // Fallback timer: Show window after 1.5s so user never waits in the dark
  const showTimer = setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      mainWindow.show();
    }
  }, 1500);

  mainWindow.once("ready-to-show", () => {
    clearTimeout(showTimer);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
    }
  });

  // Graceful offline/error retry screen
  mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription, validatedURL) => {
    if (
      validatedURL === targetUrl ||
      errorCode === -105 ||
      errorCode === -106 ||
      errorCode === -102
    ) {
      mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Collecto Admin — Connection Issue</title>
            <style>
              body {
                background: #09090b;
                color: #f4f4f5;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
              }
              .card {
                background: #18181b;
                border: 1px solid #27272a;
                border-radius: 12px;
                padding: 28px;
                max-width: 440px;
                text-align: center;
              }
              h2 { margin: 0 0 10px; font-size: 18px; color: #fff; }
              p { font-size: 13px; color: #a1a1aa; line-height: 1.5; margin-bottom: 20px; }
              button {
                background: #2563eb;
                color: #fff;
                border: none;
                padding: 9px 18px;
                font-size: 13px;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 500;
              }
              button:hover { background: #1d4ed8; }
            </style>
          </head>
          <body>
            <div class="card">
              <h2>Unable to Reach Cloud Server</h2>
              <p>Could not connect to <strong>${targetUrl}</strong>.<br>Please check your internet connection or verify the server is active.</p>
              <button onclick="window.location.href='${targetUrl}'">Retry Connection</button>
            </div>
          </body>
        </html>
      `)}`);
    }
  });

  mainWindow.loadURL(targetUrl);

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
