import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "nanoid";

export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface UIState {
  isDarkMode: boolean;
  searchOpen: boolean;
  searchQuery: string;
  presentationMode: boolean;
  apiKeySettingsOpen: boolean;
  profileTab: "profile" | "apikeys";
  toasts: Toast[];
  toggleTheme: () => void;
  setDarkMode: (dark: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
  setPresentationMode: (on: boolean) => void;
  setApiKeySettingsOpen: (open: boolean) => void;
  setProfileTab: (tab: "profile" | "apikeys") => void;
  addToast: (message: string, type?: "success" | "error" | "info", duration?: number) => void;
  removeToast: (id: string) => void;
}

function getSystemDarkMode(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      isDarkMode: getSystemDarkMode(),
      searchOpen: false,
      searchQuery: "",
      presentationMode: false,
      apiKeySettingsOpen: false,
      profileTab: "profile" as const,
      toasts: [],
      toggleTheme: () => set((s) => ({ isDarkMode: !s.isDarkMode })),
      setDarkMode: (dark) => set({ isDarkMode: dark }),
      setSearchOpen: (open) => set({ searchOpen: open, ...(!open && { searchQuery: "" }) }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setPresentationMode: (on) => set({ presentationMode: on }),
      setApiKeySettingsOpen: (open) => set({ apiKeySettingsOpen: open, ...(open && { profileTab: "apikeys" as const }) }),
      setProfileTab: (tab) => set({ profileTab: tab }),
      addToast: (message, type = "success", duration = 3000) => {
        const id = nanoid(6);
        set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
        setTimeout(() => {
          set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
        }, duration);
      },
      removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
    }),
    {
      name: "infiniteMDBoard_ui",
      partialize: (state) => ({ isDarkMode: state.isDarkMode }),
    },
  ),
);
