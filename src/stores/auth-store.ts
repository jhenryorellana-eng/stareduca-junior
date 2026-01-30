import { create } from 'zustand';
import type { StudentProfile } from '@/types';

interface AuthState {
  token: string | null;
  student: StudentProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setAuth: (token: string, student: StudentProfile) => void;
  clearAuth: () => void;
  loadFromStorage: () => void;
  updateStudent: (updates: Partial<StudentProfile>) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  student: null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: (token, student) => {
    // Store in sessionStorage (NOT localStorage per CLAUDE.md)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('auth_token', token);
      sessionStorage.setItem('student', JSON.stringify(student));
    }
    set({ token, student, isAuthenticated: true, isLoading: false });
  },

  clearAuth: () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('auth_token');
      sessionStorage.removeItem('student');
    }
    set({ token: null, student: null, isAuthenticated: false, isLoading: false });
  },

  loadFromStorage: () => {
    if (typeof window === 'undefined') {
      set({ isLoading: false });
      return;
    }

    const token = sessionStorage.getItem('auth_token');
    const studentStr = sessionStorage.getItem('student');

    if (token && studentStr) {
      try {
        const student = JSON.parse(studentStr) as StudentProfile;
        set({ token, student, isAuthenticated: true, isLoading: false });
      } catch {
        // Invalid stored data, clear it
        sessionStorage.removeItem('auth_token');
        sessionStorage.removeItem('student');
        set({ isLoading: false });
      }
    } else {
      set({ isLoading: false });
    }
  },

  updateStudent: (updates) => {
    const current = get().student;
    if (current) {
      const updated = { ...current, ...updates };
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('student', JSON.stringify(updated));
      }
      set({ student: updated });
    }
  },
}));
