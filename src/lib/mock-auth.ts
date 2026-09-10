"use client";

import { UserSession } from "@/types";

export const MOCK_ADMIN_USER: UserSession = {
  id: "user-admin",
  name: "Operations Admin",
  email: "admin@collecto.app",
  role: "admin",
};

export const MOCK_EXECUTIVE_USER: UserSession = {
  id: "exec-1",
  name: "Rajesh Kumar",
  email: "rajesh.k@collecto.app",
  role: "executive",
  employeeCode: "EX-101",
  phone: "+91 98451 23456",
};

const SESSION_STORAGE_KEY = "collecto_current_user";

/**
 * Get active session from browser storage, defaults to Admin.
 */
export function getCurrentUser(): UserSession {
  if (typeof window === "undefined") {
    return MOCK_ADMIN_USER;
  }
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return MOCK_ADMIN_USER;
    return JSON.parse(raw) as UserSession;
  } catch {
    return MOCK_ADMIN_USER;
  }
}

/**
 * Set active user session (Admin or Executive).
 */
export function setCurrentUser(user: UserSession): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
  }
}

/**
 * Clear session and log out.
 */
export function clearCurrentUser(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }
}
