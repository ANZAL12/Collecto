export const ADMIN_WEB_COOKIE_KEY = "collecto_admin_unlocked";
export const ADMIN_WEB_STORAGE_KEY = "collecto_admin_unlocked";

/**
 * Helper to detect if the current runtime is inside the Collecto Electron Desktop application.
 */
export function isDesktopApp(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(
    (window as any).collectoDesktop?.isDesktop ||
    navigator.userAgent.includes("CollectoDesktop")
  );
}

/**
 * Helper to detect if admin access has been unlocked on web via secret slash (/global)
 */
export function isWebAdminUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const hasStorage = localStorage.getItem(ADMIN_WEB_STORAGE_KEY) === "true";
    const hasCookie = document.cookie
      .split("; ")
      .some((c) => c.startsWith(`${ADMIN_WEB_COOKIE_KEY}=1`));
    const pathIsGlobal = window.location.pathname.startsWith("/global");
    const searchHasKey =
      window.location.search.includes("global") ||
      window.location.search.includes("key=global") ||
      window.location.search.includes("secret=global");
    return hasStorage || hasCookie || pathIsGlobal || searchHasKey;
  } catch {
    return false;
  }
}

/**
 * Permanently unlock web admin access in this browser
 */
export function unlockWebAdmin(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ADMIN_WEB_STORAGE_KEY, "true");
    document.cookie = `${ADMIN_WEB_COOKIE_KEY}=1; path=/; max-age=31536000; SameSite=Lax`;
  } catch (err) {
    console.error("Failed to unlock web admin:", err);
  }
}

/**
 * Lock web admin access in this browser
 */
export function lockWebAdmin(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(ADMIN_WEB_STORAGE_KEY);
    document.cookie = `${ADMIN_WEB_COOKIE_KEY}=; path=/; max-age=0; SameSite=Lax`;
  } catch (err) {
    console.error("Failed to lock web admin:", err);
  }
}
