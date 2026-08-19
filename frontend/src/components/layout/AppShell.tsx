import React, { useEffect } from 'react';
import { Header } from './Header';
import { useThemeStore } from '../../store/useThemeStore';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { initTheme } = useThemeStore();

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  return (
    <div className="relative w-screen h-dvh flex flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors duration-300">
      {/* Subtle minimalist background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(24,24,27,0.03),transparent_50%)] dark:bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.03),transparent_50%)] pointer-events-none" />

      {/* Fixed Top Header */}
      <Header />

      {/* Main Content Scroll Area */}
      <main className="flex-1 overflow-y-auto relative z-10 p-4 sm:p-6 md:p-8 scroll-smooth">
        <div className="max-w-7xl mx-auto w-full min-h-full pb-12">
          {children}
        </div>
      </main>
    </div>
  );
};
