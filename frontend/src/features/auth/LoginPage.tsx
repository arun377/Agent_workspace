import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Bot, Lock, User, ArrowRight, CheckCircle2, Sun, Moon } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useThemeStore } from '../../store/useThemeStore';
import { useToast } from '../../components/ui/Toast';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const { login } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const res = login(username, password);
    if (res.success) {
      showToast('Welcome back!', 'Authenticated as Admin Architect.', 'success');
      navigate('/agents');
    } else {
      setErrorMsg(res.error || 'Authentication failed');
      showToast('Login Failed', 'Please check your credentials.', 'error');
    }
  };

  return (
    <div className="relative w-screen h-dvh flex items-center justify-center p-4 overflow-hidden bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors duration-300">
      {/* Theme Toggle Top Right */}
      <div className="absolute top-6 right-6 z-50">
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-full glass-card hover:scale-110 transition-transform flex items-center justify-center text-zinc-600 dark:text-zinc-400"
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
        >
          {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </button>
      </div>

      {/* Subtle minimalist background (no heavy colors) */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(24,24,27,0.03),transparent_50%)] dark:bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.03),transparent_50%)] pointer-events-none" />

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-[380px] z-10 glass-card rounded-3xl p-8 shadow-2xl dark:shadow-black/50"
      >
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-zinc-900 dark:bg-zinc-100 p-[1px] shadow-sm mb-4">
            <div className="w-full h-full bg-white dark:bg-zinc-950 rounded-[15px] flex items-center justify-center">
              <Bot className="w-6 h-6 text-zinc-900 dark:text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white mb-1.5">
            Agent Studio
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
            Enterprise AI Orchestration Platform
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5 ml-1">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-2.5 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm glass-input font-medium placeholder:text-zinc-400/70"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5 ml-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-2.5 w-4 h-4 text-zinc-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm glass-input font-medium placeholder:text-zinc-400/70"
              />
            </div>
          </div>

          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium text-center"
            >
              {errorMsg}
            </motion.div>
          )}

          <button
            type="submit"
            className="w-full mt-2 py-3 px-4 rounded-xl text-sm font-bold bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 shadow-md"
          >
            <span>Sign In</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Features footer chips */}
        <div className="mt-8 flex items-center justify-center gap-5 text-[10px] font-bold text-zinc-400 dark:text-zinc-500">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100" /> Multi-Model
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100" /> API Tools
          </span>
        </div>
      </motion.div>
    </div>
  );
};
