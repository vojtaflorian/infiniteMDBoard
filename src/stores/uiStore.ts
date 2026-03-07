import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIState {
  isDarkMode: boolean;
  searchOpen: boolean;
  searchQuery: string;
  presentationMode: boolean;
  apiKeySettingsOpen: boolean;
  toggleTheme: () => void;
  setDarkMode: (dark: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
  setPresentationMode: (on: boolean) => void;
  setApiKeySettingsOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      isDarkMode: true,
      searchOpen: false,
      searchQuery: "",
      presentationMode: false,
      apiKeySettingsOpen: false,
      toggleTheme: () => set((s) => ({ isDarkMode: !s.isDarkMode })),
      setDarkMode: (dark) => set({ isDarkMode: dark }),
      setSearchOpen: (open) => set({ searchOpen: open, ...(!open && { searchQuery: "" }) }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setPresentationMode: (on) => set({ presentationMode: on }),
      setApiKeySettingsOpen: (open) => set({ apiKeySettingsOpen: open }),
    }),
    {
      name: "infiniteMDBoard_ui",
      partialize: (state) => ({ isDarkMode: state.isDarkMode }),
    },
  ),
);
