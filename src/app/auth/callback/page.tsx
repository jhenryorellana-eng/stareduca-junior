'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { Icon } from '@/components/ui/Icon';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDevLogin, setShowDevLogin] = useState(false);
  const [devLoading, setDevLoading] = useState(false);
  const [isDev, setIsDev] = useState(false);

  // Detectar si estamos en localhost
  useEffect(() => {
    const hostname = window.location.hostname;
    setIsDev(hostname === 'localhost' || hostname === '127.0.0.1');
  }, []);

  // Dev login function
  const handleDevLogin = async () => {
    setDevLoading(true);
    try {
      const response = await fetch('/api/auth/dev-login', {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Error en login de desarrollo');
        setDevLoading(false);
        return;
      }

      const { token, student } = await response.json();
      setAuth(token, student);
      router.replace('/');
    } catch (err) {
      console.error('Dev login error:', err);
      setError('Error de conexión');
      setDevLoading(false);
    }
  };

  useEffect(() => {
    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError(
        errorParam === 'session_expired'
          ? 'Tu sesión ha expirado. Vuelve a abrir la app desde CEO Junior.'
          : 'Ha ocurrido un error de autenticación.'
      );
      setIsLoading(false);
      setShowDevLogin(isDev);
      return;
    }

    if (!code) {
      // En desarrollo, mostrar opción de dev login
      if (isDev) {
        setShowDevLogin(true);
        setIsLoading(false);
        return;
      }
      setError('No se proporcionó un código de acceso. Abre la app desde CEO Junior.');
      setIsLoading(false);
      return;
    }

    async function authenticate() {
      try {
        const response = await fetch('/api/auth/exchange', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });

        if (!response.ok) {
          const data = await response.json();
          setError(data.error || 'Código inválido o expirado. Intenta de nuevo.');
          setIsLoading(false);
          return;
        }

        const { token, student } = await response.json();

        // Store auth in Zustand (which uses sessionStorage)
        setAuth(token, student);

        // Redirect to home
        router.replace('/');
      } catch (err) {
        console.error('Auth error:', err);
        setError('Error de conexión. Verifica tu internet e intenta de nuevo.');
        setIsLoading(false);
      }
    }

    authenticate();
  }, [searchParams, router, setAuth]);

  // Dev login screen
  if (showDevLogin && !error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center animate-fade-in-up">
          <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary-dark rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/30">
            <Icon name="developer_mode" size={40} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Modo Desarrollo
          </h1>
          <p className="text-slate-500 mb-8">
            Entra como estudiante de prueba para explorar la app.
          </p>
          <button
            onClick={handleDevLogin}
            disabled={devLoading}
            className="w-full bg-gradient-to-r from-primary to-primary-dark text-white font-semibold py-4 px-6 rounded-xl shadow-lg shadow-primary/30 transition-all duration-200 hover:opacity-90 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {devLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Entrando...
              </>
            ) : (
              <>
                <Icon name="login" size={20} />
                Entrar como Estudiante Demo
              </>
            )}
          </button>
          <p className="text-xs text-slate-400 mt-6">
            Solo disponible en entorno de desarrollo
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center animate-fade-in-up">
          <div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Icon name="error" size={40} className="text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Error de autenticación
          </h1>
          <p className="text-slate-500 mb-8">{error}</p>
          {showDevLogin && (
            <button
              onClick={handleDevLogin}
              disabled={devLoading}
              className="w-full bg-white text-primary border-2 border-primary font-semibold py-4 px-6 rounded-xl mb-3 transition-all duration-200 hover:bg-primary/5 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {devLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  Entrando...
                </>
              ) : (
                <>
                  <Icon name="developer_mode" size={20} />
                  Entrar en Modo Dev
                </>
              )}
            </button>
          )}
          <button
            onClick={() => {
              // Try to close WebView if in CEO Junior
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(
                  JSON.stringify({ type: 'CLOSE' })
                );
              }
            }}
            className="w-full bg-gradient-to-r from-primary to-primary-dark text-white font-semibold py-4 px-6 rounded-xl shadow-lg shadow-primary/30 transition-all duration-200 hover:opacity-90 active:scale-95"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center animate-fade-in-up">
          <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary-dark rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/30">
            <Icon name="school" size={40} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">StarEduca Junior</h1>
          <p className="text-slate-500">Iniciando sesión...</p>
          <div className="mt-6 flex justify-center">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary-dark rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/30">
              <Icon name="school" size={40} className="text-white" />
            </div>
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
