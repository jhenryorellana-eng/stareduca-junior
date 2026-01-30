'use client';

import { useEffect, useCallback } from 'react';
import type { SuperAppMessage } from '@/types';

interface UseSuperAppBridgeOptions {
  onMessage?: (message: SuperAppMessage) => void;
}

export function useSuperAppBridge(options: UseSuperAppBridgeOptions = {}) {
  const { onMessage } = options;

  // Listen for messages from super app
  useEffect(() => {
    if (!onMessage) return;

    const handleAppMessage = (event: CustomEvent) => {
      try {
        const message = event.detail as SuperAppMessage;
        onMessage(message);
      } catch (error) {
        console.error('Error handling app message:', error);
      }
    };

    window.addEventListener('appMessage', handleAppMessage as EventListener);
    return () => {
      window.removeEventListener('appMessage', handleAppMessage as EventListener);
    };
  }, [onMessage]);

  // Send message to super app (CEO Junior)
  const sendToSuperApp = useCallback((message: SuperAppMessage) => {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(message));
    }
  }, []);

  // Send push notification request to super app
  const sendNotification = useCallback(
    (title: string, message: string, data?: Record<string, unknown>) => {
      sendToSuperApp({
        type: 'NOTIFICATION',
        payload: {
          title,
          message,
          miniAppId: 'stareduca-junior',
          ...data,
        },
      });
    },
    [sendToSuperApp]
  );

  // Request to close the mini app
  const requestClose = useCallback(() => {
    sendToSuperApp({ type: 'CLOSE' });
  }, [sendToSuperApp]);

  // Notify super app about logout
  const notifyLogout = useCallback(() => {
    sendToSuperApp({ type: 'LOGOUT' });
  }, [sendToSuperApp]);

  // Request navigation in super app
  const navigateInSuperApp = useCallback(
    (route: string) => {
      sendToSuperApp({
        type: 'NAVIGATE',
        payload: { route },
      });
    },
    [sendToSuperApp]
  );

  // Request data refresh
  const requestRefresh = useCallback(() => {
    sendToSuperApp({ type: 'REFRESH' });
  }, [sendToSuperApp]);

  // Check if running inside WebView
  const isInWebView = typeof window !== 'undefined' && !!window.ReactNativeWebView;

  return {
    isInWebView,
    sendToSuperApp,
    sendNotification,
    requestClose,
    notifyLogout,
    navigateInSuperApp,
    requestRefresh,
  };
}
