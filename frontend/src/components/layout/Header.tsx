import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bot,
  LogOut,
  Sparkles,
  Plus,
  ChevronDown,
  LayoutGrid,
  Sun,
  Moon
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useThemeStore } from '../../store/useThemeStore';
import { useToast } from '../ui/Toast';

export const Header: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    showToast('Logged out successfully', 'See you next time!', 'info');
    navigate('/login');
  };

  const isBuilderRoute = location.pathname.includes('/agents/new') || location.pathname.includes('/agents/edit');

  return (
    <header className="h-16 shrink-0 z-40 relative px-4 sm:px-6 flex items-center justify-between glass-panel border-b border-zinc-200 dark:border-white/10">
      {/* Brand Logo & Title */}
      <div className="flex items-center gap-6">
        <Link to="/agents" className="flex items-center gap-3 group">
          <div className="w-8 h-8 bg-zinc-900 dark:bg-zinc-100 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 shadow-sm">
            <Bot className="w-4.5 h-4.5 text-white dark:text-zinc-900" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-tight text-lg text-zinc-900 dark:text-white uppercase">
                AGENT STUDIO
              </span>
              <span className="mono bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 font-extrabold text-[10px]">
                PRO
              </span>
            </div>
          </div>
        </Link>

        {/* System Active Status Pill */}
        <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 mono font-bold text-[10px]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>SYSTEM ACTIVE</span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Navigation Action if on Dashboard */}
        {!isBuilderRoute && (
          <Link
            to="/agents/new"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:scale-105 transition-transform shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden sm:inline">New Agent</span>
          </Link>
        )}

        {isBuilderRoute && (
          <Link
            to="/agents"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors border border-zinc-200 dark:border-zinc-800"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Registry</span>
          </Link>
        )}

        <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800 mx-1 hidden sm:block" />

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-1.5 sm:p-2 rounded-lg text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>

        {/* User Profile Dropdown */}
        <div className="relative z-[60]">
          <button
            type="button"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 p-1 pr-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors bg-white/50 dark:bg-zinc-900/50"
          >
            <img
              src={user?.avatarUrl}
              alt={user?.name || 'User'}
              className="w-6 h-6 sm:w-7 sm:h-7 rounded-md object-cover border border-zinc-200 dark:border-zinc-700"
            />
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 hidden md:block">
              {user?.username}
            </span>
            <ChevronDown className="w-3 h-3 text-zinc-400" />
          </button>

          <AnimatePresence>
            {isProfileOpen && (
              <>
                <div className="fixed inset-0 z-[70]" onClick={() => setIsProfileOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-56 z-[80] rounded-xl popup-solid p-1.5 shadow-xl text-xs"
                >
                  <div className="p-3 border-b border-zinc-100 dark:border-zinc-800 mb-1">
                    <p className="font-bold text-zinc-900 dark:text-white">{user?.name}</p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">{user?.email}</p>
                    <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-medium text-[10px]">
                      <Sparkles className="w-3 h-3" /> {user?.role}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors font-semibold text-left"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign out</span>
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};
