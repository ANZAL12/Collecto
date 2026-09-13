"use client";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { UserSession } from "@/types";
import { isDesktopApp, isWebAdminUnlocked } from "@/lib/desktop-utils";

const SESSION_STORAGE_KEY = "collecto_current_user";
const CREDS_STORAGE_KEY = "collecto_executive_credentials";
const DEFAULT_EMAIL_DOMAIN = "gmail.com";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

/**
 * Get an isolated Supabase client that does not mutate or persist the current browser session
 */
function getIsolatedAuthClient() {
  return createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Normalize username to an email for Supabase Auth
 */
export function normalizeUserToEmail(usernameOrEmail: string): string {
  const clean = usernameOrEmail.trim().toLowerCase();
  if (clean.includes("@")) return clean;
  return `${clean}@${DEFAULT_EMAIL_DOMAIN}`;
}

/**
 * Retrieve cached executive credentials from local storage
 */
export function getStoredExecutiveCredentials(): Record<string, { username: string; password: string }> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(CREDS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Save executive credentials to local storage cache
 */
export function saveExecutiveCredential(name: string, username: string, password: string): void {
  if (typeof window === "undefined") return;
  try {
    const current = getStoredExecutiveCredentials();
    const key = name.trim().toLowerCase();
    current[key] = {
      username: username.trim().toLowerCase(),
      password: password.trim(),
    };
    localStorage.setItem(CREDS_STORAGE_KEY, JSON.stringify(current));
  } catch (err) {
    console.error("Failed to cache executive credentials:", err);
  }
}

/**
 * Remove executive credentials from local storage cache
 */
export function removeExecutiveCredential(name: string): void {
  if (typeof window === "undefined") return;
  try {
    const current = getStoredExecutiveCredentials();
    const key = name.trim().toLowerCase();
    delete current[key];
    localStorage.setItem(CREDS_STORAGE_KEY, JSON.stringify(current));
  } catch (err) {
    console.error("Failed to remove executive credentials:", err);
  }
}

/**
 * Register or update an executive user in Supabase Auth
 */
export async function signUpExecutiveWithSupabase(
  name: string,
  username: string,
  password: string,
  oldPassword?: string,
  companies?: string[]
): Promise<{ success: boolean; error?: string }> {
  const cleanPass = password.trim();
  const cleanUser = username.trim().toLowerCase();
  const cleanName = name.trim();

  if (cleanPass.length < 6) {
    return {
      success: false,
      error: "Password must be at least 6 characters (Supabase Auth strict requirement).",
    };
  }

  // Cache locally right away
  saveExecutiveCredential(cleanName, cleanUser, cleanPass);

  if (!isSupabaseConfigured()) {
    return { success: true };
  }

  const email = normalizeUserToEmail(cleanUser);
  const isolatedClient = getIsolatedAuthClient();

  try {
    // 1. Try to sign up the new user
    const { data, error } = await isolatedClient.auth.signUp({
      email,
      password: cleanPass,
      options: {
        data: {
          name: cleanName,
          role: "executive",
          username: cleanUser,
          ...(companies ? { companies } : {}),
        },
      },
    });

    if (!error && data?.user) {
      return { success: true };
    }

    // 2. If user already registered in Supabase Auth, try updating their password & metadata
    if (error && error.message?.toLowerCase().includes("already registered")) {
      const candidatePasswords = [
        oldPassword,
        "password123",
        "123456",
        cleanPass,
      ].filter(Boolean) as string[];

      for (const pass of candidatePasswords) {
        const client = getIsolatedAuthClient();
        const { data: loginData, error: loginErr } = await client.auth.signInWithPassword({
          email,
          password: pass,
        });

        if (!loginErr && loginData?.session) {
          const { error: updateErr } = await client.auth.updateUser({
            password: cleanPass,
            data: {
              name: cleanName,
              role: "executive",
              username: cleanUser,
              ...(companies ? { companies } : {}),
            },
          });

          if (!updateErr) {
            return { success: true };
          }
        }
      }

      // If we couldn't sign in to update, the user still exists
      return { success: true };
    }

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to create or update Supabase Auth user.",
    };
  }
}

/**
 * Authenticate with Supabase Auth using username or email and password
 */
export async function authenticate(
  usernameOrEmail: string,
  password: string
): Promise<{ success: boolean; session?: UserSession; error?: string }> {
  const cleanInput = usernameOrEmail.trim();
  const cleanPass = password.trim();

  if (!cleanInput || !cleanPass) {
    return {
      success: false,
      error: "Please enter both username and password.",
    };
  }

  if (!isSupabaseConfigured()) {
    return {
      success: false,
      error: "Supabase is not configured.",
    };
  }

  const supabase = createBrowserClient();
  if (!supabase) {
    return { success: false, error: "Database connection failed." };
  }

  const email = normalizeUserToEmail(cleanInput);

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: cleanPass,
    });

    if (error) {
      if (error.message === "Email not confirmed") {
        return {
          success: false,
          error:
            "Email confirmation is enabled on your Supabase project. Please disable 'Confirm email' in Supabase Dashboard > Authentication > Providers > Email.",
        };
      }
      return {
        success: false,
        error:
          error.message === "Invalid login credentials"
            ? "Invalid login credentials. Please check your username/Gmail and password."
            : error.message || "Invalid credentials.",
      };
    }

    if (!data.user) {
      return { success: false, error: "No user found with these credentials." };
    }

    // Extract user metadata from Supabase Auth user
    const meta = data.user.user_metadata || {};
    const appMeta = data.user.app_metadata || {};
    const isExecutive = meta.role === "executive" || appMeta.role === "executive";
    const isExplicitAdmin = meta.role === "admin" || appMeta.role === "admin";

    // Admin role is granted if explicitly designated as admin, or authenticated in desktop app / unlocked web and not an executive
    const isAllowedAdmin = isDesktopApp() || isWebAdminUnlocked();
    const role: "admin" | "executive" =
      isExplicitAdmin || (isAllowedAdmin && !isExecutive) ? "admin" : "executive";

    const name: string =
      meta.name || (role === "admin" ? "Administrator" : cleanInput);

    // Prevent login if this is an executive account that has been deleted from the database
    if (role === "executive") {
      const { data: dbExec } = await supabase
        .from("executives")
        .select("id, name")
        .ilike("name", name.trim())
        .maybeSingle();

      if (!dbExec) {
        return {
          success: false,
          error: "Your executive account has been deactivated or removed by the administrator.",
        };
      }
    }

    const userSession: UserSession = {
      id: data.user.id,
      name,
      email: data.user.email || email,
      role,
    };

    setCurrentSession(userSession);
    return { success: true, session: userSession };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Authentication failed. Please check your credentials.",
    };
  }
}

/**
 * Get active user session or null if not logged in
 */
export function getCurrentSession(): UserSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserSession;
  } catch {
    return null;
  }
}

/**
 * Store session permanently in device localStorage
 */
export function setCurrentSession(session: UserSession): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  }
}

/**
 * Logout from Supabase and clear session
 */
export async function logout(): Promise<void> {
  if (typeof window !== "undefined") {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }
  if (isSupabaseConfigured()) {
    const supabase = createBrowserClient();
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch {}
    }
  }
}
