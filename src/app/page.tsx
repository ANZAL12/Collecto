"use client";

import * as React from "react";
import { getCurrentSession } from "@/lib/auth-service";
import { ExecutiveLandingView } from "@/components/executives/executive-landing-view";
import LoginPage from "./(auth)/login/page";
import { UserSession } from "@/types";

export default function RootPage() {
  const [session, setSession] = React.useState<UserSession | null | undefined>(undefined);

  React.useEffect(() => {
    // Read persistent session from localStorage
    const active = getCurrentSession();
    setSession(active);
  }, []);

  // Initial client hydration check
  if (session === undefined) {
    return (
      <div className="flex h-screen items-center justify-center text-xs font-mono text-muted-foreground">
        Loading Collecto...
      </div>
    );
  }

  // Not logged in -> Show Login Page directly
  if (!session) {
    return (
      <React.Suspense fallback={<div className="flex h-screen items-center justify-center text-xs font-mono text-muted-foreground">Loading sign in...</div>}>
        <LoginPage onLoginSuccess={(user) => setSession(user)} />
      </React.Suspense>
    );
  }

  // Logged in -> Show Executive Landing Page with assigned shops and persistent session
  return (
    <React.Suspense fallback={<div className="flex h-screen items-center justify-center text-xs font-mono text-muted-foreground">Loading your shops...</div>}>
      <ExecutiveLandingView
        session={session}
        onLogout={() => setSession(null)}
      />
    </React.Suspense>
  );
}
