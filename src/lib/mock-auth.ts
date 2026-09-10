"use client";

import { UserSession } from "@/types";

export const MOCK_ADMIN_USER: UserSession = {
  id: "user-admin",
  name: "Administrator",
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
 * Check if a valid session exists in persistent storage
 */
export function hasActiveSession(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(localStorage.getItem(SESSION_STORAGE_KEY));
}

/**
 * Get active session from browser storage.
 */
export function getCurrentUser(): UserSession {
  if (typeof window === "undefined") {
    return { id: "", name: "", email: "", role: "executive" };
  }
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return { id: "", name: "", email: "", role: "executive" };
    return JSON.parse(raw) as UserSession;
  } catch {
    return { id: "", name: "", email: "", role: "executive" };
  }
}

/**
 * Set active user session (persisted indefinitely until explicit logout).
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
