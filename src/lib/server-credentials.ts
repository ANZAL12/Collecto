import fs from "fs";
import path from "path";

export interface ServerCredentialEntry {
  username: string;
  password: string;
  name: string;
  role: "admin" | "executive";
}

const CREDENTIALS_FILE_PATH = path.join(process.cwd(), "src", "data", "credentials.json");

const DEFAULT_CREDENTIALS: Record<string, ServerCredentialEntry> = {
  admin: {
    username: "admin",
    password: "123",
    name: "Administrator",
    role: "admin",
  },
  anzal: {
    username: "anzal",
    password: "123",
    name: "anzal",
    role: "executive",
  },
  rajesh: {
    username: "rajesh",
    password: "123",
    name: "Rajesh Kumar",
    role: "executive",
  },
  faisal: {
    username: "faisal",
    password: "123",
    name: "Faisal Khan",
    role: "executive",
  },
  naveen: {
    username: "naveen",
    password: "123",
    name: "Naveen Reddy",
    role: "executive",
  },
};

/**
 * Read all credentials from the server file
 */
export function getAllServerCredentials(): Record<string, ServerCredentialEntry> {
  try {
    if (!fs.existsSync(CREDENTIALS_FILE_PATH)) {
      saveAllServerCredentials(DEFAULT_CREDENTIALS);
      return DEFAULT_CREDENTIALS;
    }
    const raw = fs.readFileSync(CREDENTIALS_FILE_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_CREDENTIALS, ...parsed };
  } catch (e) {
    console.error("Failed to read server credentials:", e);
    return DEFAULT_CREDENTIALS;
  }
}

/**
 * Write all credentials to the server file
 */
export function saveAllServerCredentials(data: Record<string, ServerCredentialEntry>): void {
  try {
    const dir = path.dirname(CREDENTIALS_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CREDENTIALS_FILE_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to save server credentials:", e);
  }
}

/**
 * Set or update credentials for a user
 */
export function setServerUserCredentials(
  username: string,
  password: string,
  name: string,
  role: "admin" | "executive" = "executive"
): void {
  const all = getAllServerCredentials();
  const cleanUser = username.trim().toLowerCase();
  
  all[cleanUser] = {
    username: cleanUser,
    password: password.trim(),
    name: name.trim(),
    role,
  };
  
  // Also index by lowercase name for easy lookup
  const cleanNameKey = `name_${name.trim().toLowerCase()}`;
  all[cleanNameKey] = all[cleanUser];

  saveAllServerCredentials(all);
}
