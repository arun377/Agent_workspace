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
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useToast } from '../ui/Toast';

export const Header: React.FC = () => {
  const { user, logout } = useAuthStore();
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
    <header className="h-16 shrink-0 z-40 relative px-4 sm:px-6 flex items-center justify-between glass-panel border-b border-slate-300 dark:border-white/10">
      {/* Brand Logo & Title */}
      <div className="flex items-center gap-6">
        <Link to="/agents" className="flex items-center gap-3 group">
          <div className="w-8 h-8 bg-cyan-600 dark:bg-[#00F0FF] hex-logo flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
            <Bot className="w-4.5 h-4.5 text-white dark:text-black" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-tight text-lg text-slate-900 dark:text-white uppercase">
                AGENT STUDIO
              </span>
              <span className="mono bg-cyan-100 dark:bg-cyan-500/10 text-cyan-950 dark:text-[#00F0FF] px-1.5 py-0.5 rounded border border-cyan-300 dark:border-cyan-500/30 font-extrabold">
                PRO V2.4
              </span>
            </div>
          </div>
        </Link>

        {/* System Active Status Pill */}
        <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/30 text-emerald-950 dark:text-[#00FF85] mono font-extrabold">
          <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-[#00FF85] animate-pulse" />
          <span>● SYSTEM ACTIVE</span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Navigation Action if on Dashboard */}
        {!isBuilderRoute && (
          <Link
            to="/agents/new"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded text-xs font-bold bg-cyan-600 dark:bg-[#00F0FF] text-white dark:text-black hover:opacity-90 transition-all border border-cyan-600 dark:border-[#00F0FF] shadow-sm uppercase tracking-wider"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline">CREATE_AGENT</span>
          </Link>
        )}

        {isBuilderRoute && (
          <Link
            to="/agents"
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors border border-slate-300 dark:border-white/10 uppercase tracking-wider"
          >
            <LayoutGrid className="w-4 h-4 text-cyan-700 dark:text-[#00F0FF]" />
            <span className="hidden sm:inline">REGISTRY</span>
          </Link>
        )}

        {/* User Profile Dropdown */}
        <div className="relative z-[60]">
          <button
            type="button"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2.5 p-1 pl-2 rounded border border-slate-300 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/5 transition-colors"
          >
            <img
              src={user?.avatarUrl}
              alt={user?.name || 'User'}
              className="w-7 h-7 rounded object-cover border border-cyan-500/40"
            />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 hidden md:block mono">
              {user?.username}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
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
                  className="absolute right-0 mt-2 w-56 z-[80] rounded popup-solid p-2 shadow-2xl text-xs"
                >
                  <div className="p-2.5 border-b border-slate-200 dark:border-white/10 mb-1">
                    <p className="font-bold text-slate-900 dark:text-white">{user?.name}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
                    <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-700 dark:text-[#00F0FF] font-medium text-[10px] mono">
                      <Sparkles className="w-3 h-3" /> {user?.role}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors font-semibold text-left mono"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>SIGN_OUT</span>
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
