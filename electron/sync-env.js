const fs = require("fs");
const path = require("path");

function syncEnv() {
  const envFiles = [
    path.join(__dirname, "..", ".env.local"),
    path.join(__dirname, "..", ".env"),
  ];

  let webUrl = process.env.COLLECTO_WEB_URL || "";

  if (!webUrl) {
    for (const envPath of envFiles) {
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, "utf-8");
        for (const line of content.split("\n")) {
          const trimmed = line.trim();
          if (trimmed.startsWith("COLLECTO_WEB_URL=")) {
            webUrl = trimmed
              .replace("COLLECTO_WEB_URL=", "")
              .trim()
              .replace(/^["']|["']$/g, "");
            break;
          }
        }
      }
      if (webUrl) break;
    }
  }

  const configPath = path.join(__dirname, "config.json");
  const configData = {
    COLLECTO_WEB_URL: webUrl.replace(/\/+$/, ""),
  };

  fs.writeFileSync(configPath, JSON.stringify(configData, null, 2), "utf-8");
  if (webUrl) {
    console.log(`[Collecto Desktop] Configured Cloud URL: ${webUrl}`);
  } else {
    console.log("[Collecto Desktop] No COLLECTO_WEB_URL found. Using local server fallback (http://127.0.0.1:3000).");
  }
}

syncEnv();
