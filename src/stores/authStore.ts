"use client";

import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";
import { createLogger } from "@/lib/logger";
import type { User, Session } from "@supabase/supabase-js";

const log = createLogger("authStore");

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;

  initialize: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithMagicLink: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  session: null,
  loading: false,
  initialized: false,

  initialize: async () => {
    if (get().initialized) return;
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    set({
      user: user ?? null,
      session,
      initialized: true,
    });
    log.info("Auth initialized", user ? "signed in" : "anonymous");

    supabase.auth.onAuthStateChange((_event, session) => {
      set({ user: session?.user ?? null, session });
      log.info("Auth state changed", session ? "signed in" : "signed out");
    });
  },

  signInWithGoogle: async () => {
    set({ loading: true });
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        log.error("Google sign-in failed", error.message);
      }
    } finally {
      set({ loading: false });
    }
  },

  signInWithMagicLink: async (email: string) => {
    set({ loading: true });
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        log.error("Magic link failed", error.message);
        return { error: error.message };
      }
      return { error: null };
    } finally {
      set({ loading: false });
    }
  },

  signOut: async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    set({ user: null, session: null });
    log.info("Signed out");
  },
}));
