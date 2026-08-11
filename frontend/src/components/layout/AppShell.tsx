import React, { useEffect } from 'react';
import { Header } from './Header';
import { useThemeStore } from '../../store/useThemeStore';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { initTheme } = useThemeStore();

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  return (
    <div className="relative w-screen h-dvh flex flex-col overflow-hidden bg-[#050508] text-slate-100 transition-colors duration-300">
      {/* Ambient Glass Glow Blobs */}
      <div className="ambient-blob w-[500px] h-[500px] -top-32 -left-32 bg-cyan-500/20 pointer-events-none" />
      <div className="ambient-blob w-[600px] h-[600px] top-1/3 -right-48 bg-purple-500/15 pointer-events-none" />
      <div className="ambient-blob w-[450px] h-[450px] -bottom-32 left-1/3 bg-blue-500/15 pointer-events-none" />

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
