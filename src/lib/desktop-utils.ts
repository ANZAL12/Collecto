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
