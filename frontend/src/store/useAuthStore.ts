import { create } from 'zustand';


interface User {
  username: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => { success: boolean; error?: string };
  logout: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
      user: null,
      isAuthenticated: false, // User must log in first

      login: (username, password) => {
        if (username.trim().toLowerCase() === 'admin' && password === 'admin') {
          const userObj: User = {
            username: 'admin',
            name: 'Senior Architect',
            email: 'admin@agentstudio.ai',
            role: 'Admin Developer',
            avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
          };
          set({ user: userObj, isAuthenticated: true });
          return { success: true };
        }
        return { success: false, error: 'Invalid credentials. Use admin / admin' };
      },

      logout: () => {
        set({ user: null, isAuthenticated: false });
      },
}));
