'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useSuperAppBridge } from '@/hooks/use-super-app-bridge';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/Icon';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  data?: {
    level?: number;
    previousLevel?: number;
    levelName?: string;
  };
}

function getNotificationIcon(type: string): string {
  const icons: Record<string, string> = {
    level_up: 'trending_up',
    xp: 'grade',
    streak: 'local_fire_department',
    badge: 'emoji_events',
    comment: 'chat_bubble',
    reaction: 'favorite',
    mention: 'alternate_email',
    course: 'auto_stories',
  };
  return icons[type] || 'notifications';
}

function getNotificationIconColor(type: string): string {
  const colors: Record<string, string> = {
    level_up: 'text-primary',
    xp: 'text-amber-400',
    streak: 'text-orange-400',
    badge: 'text-indigo-400',
    comment: 'text-blue-400',
    reaction: 'text-pink-400',
    mention: 'text-primary/60',
    course: 'text-purple-400',
  };
  return colors[type] || 'text-slate-400';
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / (1000 * 60));
  const diffHour = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDay = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMin < 1) return 'ahora';
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHour < 24) return `${diffHour}h`;
  if (diffDay === 1) return 'ayer';
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function isToday(dateString: string): boolean {
  const date = new Date(dateString);
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

function isYesterday(dateString: string): boolean {
  const date = new Date(dateString);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return date.toDateString() === yesterday.toDateString();
}

export default function AvisosPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const { sendNotification, isInWebView } = useSuperAppBridge();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const sentNotificationsRef = useRef<Set<string>>(new Set());

  // Fetch notifications from API
  useEffect(() => {
    async function fetchNotifications() {
      if (!token) return;

      try {
        const response = await fetch('/api/notifications', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          const fetchedNotifications = data.notifications || [];
          setNotifications(fetchedNotifications);

          // Send unread notifications to super app for push notifications
          if (isInWebView) {
            const unreadNotifications = fetchedNotifications.filter(
              (n: NotificationItem) => !n.isRead && !sentNotificationsRef.current.has(n.id)
            );

            unreadNotifications.forEach((n: NotificationItem) => {
              sendNotification(n.title, n.message, {
                notificationId: n.id,
                type: n.type,
              });
              sentNotificationsRef.current.add(n.id);
            });
          }
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchNotifications();
  }, [token, isInWebView, sendNotification]);

  const markAsRead = async (notificationId: string) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
    );

    // Update in backend
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationIds: [notificationId] }),
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));

    // Update in backend
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ markAll: true }),
      });
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // Group notifications by day
  const todayNotifications = notifications.filter((n) => isToday(n.createdAt));
  const yesterdayNotifications = notifications.filter((n) => isYesterday(n.createdAt));
  const olderNotifications = notifications.filter(
    (n) => !isToday(n.createdAt) && !isYesterday(n.createdAt)
  );

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="min-h-screen flex flex-col pb-24 text-slate-800 bg-white">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md">
        <div className="flex items-center p-6 justify-between max-w-md mx-auto">
          <button
            onClick={() => router.back()}
            className="flex w-10 h-10 items-center justify-start cursor-pointer group"
          >
            <Icon name="arrow_back" size={22} className="text-slate-400 group-hover:text-primary transition-colors" />
          </button>
          <h1 className="text-slate-900 text-xl font-semibold tracking-tight flex-1 text-center">
            Notificaciones
          </h1>
          {unreadCount > 0 ? (
            <button
              onClick={markAllAsRead}
              className="text-primary text-sm font-semibold whitespace-nowrap"
            >
              Marcar todo
            </button>
          ) : (
            <div className="w-10" />
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-md mx-auto px-6 space-y-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-500 text-sm mt-3">Cargando notificaciones...</p>
          </div>
        ) : (
          <>
            {/* Today Section */}
            {todayNotifications.length > 0 && (
              <section className="space-y-4 animate-fade-in-up">
                <div className="flex items-center justify-between">
                  <h3 className="text-slate-400 text-sm font-semibold uppercase tracking-widest">
                    Hoy
                  </h3>
                  <span className="h-[1px] bg-slate-100 flex-1 ml-4" />
                </div>
                <div className="space-y-4">
                  {todayNotifications.map((notification, index) => (
                    <div
                      key={notification.id}
                      onClick={() => markAsRead(notification.id)}
                      className={cn(
                        'notification-card relative rounded-[28px] p-5 flex items-start gap-4 z-10 cursor-pointer animate-fade-in-up',
                        notification.isRead
                          ? 'bg-white border border-slate-50'
                          : 'bg-lavender-soft'
                      )}
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      {!notification.isRead && <div className="card-gradient-bg" />}

                      {/* Icon */}
                      <div className="relative z-10 glass-icon w-12 h-12 rounded-2xl flex items-center justify-center shrink-0">
                        <Icon name={getNotificationIcon(notification.type)} size={24} className={getNotificationIconColor(notification.type)} />
                      </div>

                      {/* Content */}
                      <div className="relative z-10 flex flex-col flex-1">
                        <div className="flex justify-between items-start">
                          <p className="font-bold text-[15px] text-slate-900">{notification.title}</p>
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              'text-[10px] font-bold',
                              notification.isRead ? 'text-slate-300 uppercase' : 'text-primary/60'
                            )}>
                              {formatRelativeTime(notification.createdAt)}
                            </span>
                            {!notification.isRead && (
                              <div className="glowing-dot" />
                            )}
                          </div>
                        </div>
                        <p className="text-slate-500 text-[13.5px] leading-relaxed mt-1 font-medium">
                          {notification.message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Yesterday Section */}
            {yesterdayNotifications.length > 0 && (
              <section className="space-y-4 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
                <div className="flex items-center justify-between">
                  <h3 className="text-slate-400 text-sm font-semibold uppercase tracking-widest">
                    Ayer
                  </h3>
                  <span className="h-[1px] bg-slate-100 flex-1 ml-4" />
                </div>
                <div className="space-y-4">
                  {yesterdayNotifications.map((notification, index) => (
                    <div
                      key={notification.id}
                      onClick={() => markAsRead(notification.id)}
                      className={cn(
                        'notification-card relative rounded-[28px] p-5 flex items-start gap-4 z-10 cursor-pointer animate-fade-in-up',
                        notification.isRead
                          ? 'bg-white border border-slate-50'
                          : 'bg-lavender-soft'
                      )}
                      style={{ animationDelay: `${(index + 3) * 0.05}s` }}
                    >
                      {/* Icon */}
                      <div className="relative z-10 glass-icon w-12 h-12 rounded-2xl flex items-center justify-center shrink-0">
                        <Icon name={getNotificationIcon(notification.type)} size={24} className={getNotificationIconColor(notification.type)} />
                      </div>

                      {/* Content */}
                      <div className="relative z-10 flex flex-col flex-1">
                        <div className="flex justify-between items-start">
                          <p className="font-bold text-[15px] text-slate-900">{notification.title}</p>
                          <span className="text-[10px] font-bold text-slate-300 uppercase">
                            {formatRelativeTime(notification.createdAt)}
                          </span>
                        </div>
                        <p className="text-slate-500 text-[13.5px] leading-relaxed mt-1 font-medium">
                          {notification.message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Older Section */}
            {olderNotifications.length > 0 && (
              <section className="space-y-4 animate-fade-in-up" style={{ animationDelay: '0.25s' }}>
                <div className="flex items-center justify-between">
                  <h3 className="text-slate-400 text-sm font-semibold uppercase tracking-widest">
                    Anteriores
                  </h3>
                  <span className="h-[1px] bg-slate-100 flex-1 ml-4" />
                </div>
                <div className="space-y-4">
                  {olderNotifications.map((notification, index) => (
                    <div
                      key={notification.id}
                      onClick={() => markAsRead(notification.id)}
                      className={cn(
                        'notification-card relative rounded-[28px] p-5 flex items-start gap-4 z-10 cursor-pointer animate-fade-in-up',
                        notification.isRead
                          ? 'bg-white border border-slate-50'
                          : 'bg-lavender-soft'
                      )}
                      style={{ animationDelay: `${(index + 6) * 0.05}s` }}
                    >
                      {/* Icon */}
                      <div className="relative z-10 glass-icon w-12 h-12 rounded-2xl flex items-center justify-center shrink-0">
                        <Icon name={getNotificationIcon(notification.type)} size={24} className={getNotificationIconColor(notification.type)} />
                      </div>

                      {/* Content */}
                      <div className="relative z-10 flex flex-col flex-1">
                        <div className="flex justify-between items-start">
                          <p className="font-bold text-[15px] text-slate-900">{notification.title}</p>
                          <span className="text-[10px] font-bold text-slate-300 uppercase">
                            {formatRelativeTime(notification.createdAt)}
                          </span>
                        </div>
                        <p className="text-slate-500 text-[13.5px] leading-relaxed mt-1 font-medium">
                          {notification.message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Empty State */}
            {notifications.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon name="notifications" size={30} className="text-slate-400" />
                </div>
                <p className="text-slate-500 mb-2 font-medium">No tienes notificaciones</p>
                <p className="text-sm text-slate-400">
                  Aquí aparecerán tus avisos y actualizaciones
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
