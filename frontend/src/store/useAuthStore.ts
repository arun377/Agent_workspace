import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: {
        username: 'admin',
        name: 'Senior Architect',
        email: 'admin@agentstudio.ai',
        role: 'Admin Developer',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
      },
      isAuthenticated: true, // Default logged in for immediate seamless review, but fully toggleable via Login/Logout

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
    }),
    {
      name: 'agent-studio-auth-storage',
    }
  )
);
