import React, { useEffect } from 'react';
import { Header } from './Header';
import { useThemeStore } from '../../store/useThemeStore';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { initTheme } = useThemeStore();

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  return (
    <div className="relative w-screen h-dvh flex flex-col overflow-hidden bg-slate-950 text-slate-100 transition-colors duration-300">
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
