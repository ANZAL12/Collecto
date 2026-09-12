const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("collectoDesktop", {
  isDesktop: true,
  platform: process.platform,
  version: "1.0.0",
});
