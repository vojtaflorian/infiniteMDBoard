"use client";

import { useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { emailSchema } from "@/lib/validation";
import { X, Mail } from "lucide-react";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

export function AuthModal({ open, onClose }: AuthModalProps) {
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const signInWithMagicLink = useAuthStore((s) => s.signInWithMagicLink);
  const loading = useAuthStore((s) => s.loading);
  const isDarkMode = useUIStore((s) => s.isDarkMode);

  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleMagicLink = async () => {
    setError(null);
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setError("Please enter a valid email address.");
      return;
    }
    const result = await signInWithMagicLink(parsed.data);
    if (result.error) {
      setError(result.error);
    } else {
      setEmailSent(true);
    }
  };

  const handleClose = () => {
    setEmail("");
    setEmailSent(false);
    setError(null);
    onClose();
  };

  const bg = isDarkMode
    ? "bg-zinc-900 border-zinc-700 text-white"
    : "bg-white border-slate-200 text-slate-900";
  const inputBg = isDarkMode
    ? "border-zinc-600 bg-zinc-800"
    : "border-slate-300 bg-white";
  const divider = isDarkMode ? "bg-zinc-700/50" : "bg-slate-200";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleClose}
    >
      <div
        className={`${bg} border rounded-xl p-6 w-full max-w-sm shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Sign In</h2>
          <button
            onClick={handleClose}
            className="p-1 rounded hover:bg-zinc-500/20"
          >
            <X size={18} />
          </button>
        </div>

        {emailSent ? (
          <div className="text-center py-4">
            <Mail size={32} className="mx-auto mb-2 opacity-60" />
            <p className="font-medium">Check your email</p>
            <p className="text-sm opacity-70 mt-1">
              We sent a sign-in link to <strong>{email}</strong>
            </p>
          </div>
        ) : (
          <>
            {/* Google OAuth */}
            <button
              onClick={signInWithGoogle}
              disabled={loading}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border ${inputBg} hover:bg-zinc-500/10 transition-colors disabled:opacity-50`}
            >
              <svg viewBox="0 0 24 24" width="18" height="18">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </button>

            <div className="flex items-center gap-3 my-4">
              <div className={`flex-1 h-px ${divider}`} />
              <span className="text-xs opacity-50">or</span>
              <div className={`flex-1 h-px ${divider}`} />
            </div>

            {/* Magic Link */}
            <div className="space-y-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleMagicLink()}
                placeholder="your@email.com"
                className={`w-full px-3 py-2 rounded-lg border ${inputBg} text-sm focus:outline-none focus:border-blue-500`}
                disabled={loading}
              />
              <button
                onClick={handleMagicLink}
                disabled={loading || !email}
                className="w-full px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send magic link"}
              </button>
            </div>

            {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}
