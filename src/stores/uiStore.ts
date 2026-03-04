import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIState {
  isDarkMode: boolean;
  searchOpen: boolean;
  presentationMode: boolean;
  toggleTheme: () => void;
  setDarkMode: (dark: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  setPresentationMode: (on: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      isDarkMode: true,
      searchOpen: false,
      presentationMode: false,
      toggleTheme: () => set((s) => ({ isDarkMode: !s.isDarkMode })),
      setDarkMode: (dark) => set({ isDarkMode: dark }),
      setSearchOpen: (open) => set({ searchOpen: open }),
      setPresentationMode: (on) => set({ presentationMode: on }),
    }),
    { name: "infiniteMDBoard_ui" },
  ),
);
