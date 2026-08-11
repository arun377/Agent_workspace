import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Bot, Lock, User, Sparkles, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useToast } from '../../components/ui/Toast';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [errorMsg, setErrorMsg] = useState('');
  const { login } = useAuthStore();
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

  const handleDemoFill = () => {
    setUsername('admin');
    setPassword('admin');
    setErrorMsg('');
  };

  return (
    <div className="relative w-screen h-dvh flex items-center justify-center p-4 overflow-hidden bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Background Ambient Glowing Orbs (Dark mode only) */}
      <div className="hidden dark:block ambient-blob w-[600px] h-[600px] -top-32 -left-32 bg-cyan-600/30" />
      <div className="hidden dark:block ambient-blob w-[500px] h-[500px] bottom-0 -right-20 bg-blue-600/30" />
      <div className="hidden dark:block ambient-blob w-[400px] h-[400px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-purple-600/20" />

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative w-full max-w-md z-10 glass-card rounded-3xl p-8 border border-slate-200 dark:border-white/10 bg-white dark:bg-[#050508]/80 shadow-2xl backdrop-blur-2xl"
      >
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-500 to-purple-500 p-0.5 shadow-lg shadow-cyan-500/30 mb-4">
            <div className="w-full h-full bg-slate-900 dark:bg-[#050508] rounded-[14px] flex items-center justify-center">
              <Bot className="w-8 h-8 text-cyan-400 animate-pulse" />
            </div>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-cyan-700 via-blue-700 to-indigo-800 dark:from-white dark:via-cyan-200 dark:to-blue-200 bg-clip-text text-transparent">
            Agent Studio
          </h1>
          <p className="text-xs text-slate-700 dark:text-slate-400 mt-1 font-semibold">
            Next-Gen AI Agent Orchestration Platform
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-300 mb-1.5">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-500 dark:text-slate-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username (admin)"
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs glass-input text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500 dark:text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password (admin)"
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs glass-input text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400"
              />
            </div>
          </div>

          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium text-center"
            >
              {errorMsg}
            </motion.div>
          )}

          <button
            type="submit"
            className="w-full mt-2 py-3 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-700 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/30 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
          >
            <span>Sign In to Agent Studio</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Features footer chips */}
        <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-around text-[10px] text-slate-400 font-medium">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Multi-Model AI
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-cyan-400" /> Custom API Tools
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-purple-400" /> Mock Traces
          </span>
        </div>
      </motion.div>
    </div>
  );
};
