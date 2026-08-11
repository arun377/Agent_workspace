import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'dark' | 'light';

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  initTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'dark', // Pure dark theme enforced

      toggleTheme: () => {
        document.documentElement.classList.add('dark');
        set({ theme: 'dark' });
      },

      setTheme: () => {
        document.documentElement.classList.add('dark');
        set({ theme: 'dark' });
      },

      initTheme: () => {
        document.documentElement.classList.add('dark');
        set({ theme: 'dark' });
      },
    }),
    {
      name: 'agent-studio-theme-storage',
    }
  )
);
