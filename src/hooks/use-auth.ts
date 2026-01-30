'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';

export function useAuth() {
  const router = useRouter();
  const { token, student, isAuthenticated, isLoading, loadFromStorage, clearAuth } =
    useAuthStore();

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  const logout = () => {
    clearAuth();
    // Notify super app about logout
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'LOGOUT' }));
    }
    router.replace('/auth/callback');
  };

  return {
    token,
    student,
    isAuthenticated,
    isLoading,
    logout,
  };
}

export function useRequireAuth() {
  const router = useRouter();
  const { isAuthenticated, isLoading, loadFromStorage } = useAuthStore();

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/auth/callback?error=session_expired');
    }
  }, [isLoading, isAuthenticated, router]);

  return { isLoading, isAuthenticated };
}
