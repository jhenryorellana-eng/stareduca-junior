import { create } from 'zustand';
import type { Badge, Notification, Enrollment } from '@/types';

interface UserState {
  // Gamification data
  xpTotal: number;
  currentLevel: number;
  currentStreak: number;
  maxStreak: number;
  xpToNextLevel: number;
  levelProgress: number;

  // Badges
  badges: Badge[];
  recentBadge: Badge | null;

  // Notifications
  notifications: Notification[];
  unreadCount: number;

  // Current enrollments
  enrollments: Enrollment[];

  // XP animation
  showXpToast: boolean;
  xpToastAmount: number;
  xpToastReason: string;

  // Badge animation
  showBadgeToast: boolean;
  badgeToastData: { icon: string; name: string; color: string } | null;

  // Actions
  setGamificationData: (data: {
    xpTotal: number;
    currentLevel: number;
    currentStreak: number;
    maxStreak?: number;
  }) => void;
  setBadges: (badges: Badge[]) => void;
  setNotifications: (notifications: Notification[]) => void;
  markNotificationRead: (notificationId: string) => void;
  setEnrollments: (enrollments: Enrollment[]) => void;
  showXpGain: (amount: number, reason: string) => void;
  hideXpToast: () => void;
  addXp: (amount: number) => void;
  showBadgeGain: (data: { icon: string; name: string; color: string }) => void;
  hideBadgeToast: () => void;
}

// Level thresholds - XP acumulado requerido para cada nivel
const LEVEL_THRESHOLDS = [
  { level: 1, name: 'Novato', minXp: 0 },
  { level: 2, name: 'Aprendiz', minXp: 100 },
  { level: 3, name: 'Curioso', minXp: 250 },
  { level: 4, name: 'Estudiante', minXp: 450 },
  { level: 5, name: 'Explorador', minXp: 750 },
  { level: 6, name: 'Explorador II', minXp: 1150 },
  { level: 7, name: 'Explorador III', minXp: 1650 },
  { level: 8, name: 'Aventurero', minXp: 2250 },
  { level: 9, name: 'Aventurero II', minXp: 3000 },
  { level: 10, name: 'Constructor', minXp: 4000 },
  { level: 11, name: 'Constructor II', minXp: 5250 },
  { level: 12, name: 'Constructor III', minXp: 6750 },
  { level: 13, name: 'Arquitecto', minXp: 8500 },
  { level: 14, name: 'Arquitecto II', minXp: 10500 },
  { level: 15, name: 'Innovador', minXp: 13000 },
  { level: 16, name: 'Innovador II', minXp: 16000 },
  { level: 17, name: 'Innovador III', minXp: 19500 },
  { level: 18, name: 'Visionario', minXp: 23500 },
  { level: 19, name: 'Visionario II', minXp: 28000 },
  { level: 20, name: 'Líder', minXp: 33000 },
  { level: 21, name: 'Líder II', minXp: 39000 },
  { level: 22, name: 'Líder III', minXp: 46000 },
  { level: 23, name: 'Estratega', minXp: 54000 },
  { level: 24, name: 'Estratega II', minXp: 63000 },
  { level: 25, name: 'CEO Junior', minXp: 75000 },
  { level: 26, name: 'CEO Junior Elite', minXp: 90000 },
  { level: 27, name: 'CEO Junior Master', minXp: 110000 },
  { level: 28, name: 'CEO Junior Legend', minXp: 140000 },
  { level: 29, name: 'CEO Junior Champion', minXp: 180000 },
  { level: 30, name: 'Fundador', minXp: 230000 },
];

function calculateLevelData(xpTotal: number) {
  let currentLevel = 1;
  let xpToNextLevel = 100;
  let levelProgress = 0;

  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xpTotal >= LEVEL_THRESHOLDS[i].minXp) {
      currentLevel = LEVEL_THRESHOLDS[i].level;
      const nextLevel = LEVEL_THRESHOLDS[i + 1];
      if (nextLevel) {
        const xpInCurrentLevel = xpTotal - LEVEL_THRESHOLDS[i].minXp;
        const xpNeededForLevel = nextLevel.minXp - LEVEL_THRESHOLDS[i].minXp;
        xpToNextLevel = nextLevel.minXp - xpTotal;
        levelProgress = (xpInCurrentLevel / xpNeededForLevel) * 100;
      } else {
        // Max level reached
        xpToNextLevel = 0;
        levelProgress = 100;
      }
      break;
    }
  }

  return { currentLevel, xpToNextLevel, levelProgress };
}

export const useUserStore = create<UserState>((set, get) => ({
  xpTotal: 0,
  currentLevel: 1,
  currentStreak: 0,
  maxStreak: 0,
  xpToNextLevel: 100,
  levelProgress: 0,
  badges: [],
  recentBadge: null,
  notifications: [],
  unreadCount: 0,
  enrollments: [],
  showXpToast: false,
  xpToastAmount: 0,
  xpToastReason: '',
  showBadgeToast: false,
  badgeToastData: null,

  setGamificationData: (data) => {
    const levelData = calculateLevelData(data.xpTotal);
    set({
      xpTotal: data.xpTotal,
      currentLevel: levelData.currentLevel,
      currentStreak: data.currentStreak,
      maxStreak: data.maxStreak ?? data.currentStreak,
      xpToNextLevel: levelData.xpToNextLevel,
      levelProgress: levelData.levelProgress,
    });
  },

  setBadges: (badges) => {
    const sortedBadges = [...badges].sort(
      (a, b) => new Date(b.earnedAt || '').getTime() - new Date(a.earnedAt || '').getTime()
    );
    set({
      badges: sortedBadges,
      recentBadge: sortedBadges[0] || null,
    });
  },

  setNotifications: (notifications) => {
    const unreadCount = notifications.filter((n) => !n.isRead).length;
    set({ notifications, unreadCount });
  },

  markNotificationRead: (notificationId) => {
    const notifications = get().notifications.map((n) =>
      n.id === notificationId ? { ...n, isRead: true } : n
    );
    const unreadCount = notifications.filter((n) => !n.isRead).length;
    set({ notifications, unreadCount });
  },

  setEnrollments: (enrollments) => set({ enrollments }),

  showXpGain: (amount, reason) => {
    // Update local XP total and show toast
    const newTotal = get().xpTotal + amount;
    const levelData = calculateLevelData(newTotal);
    set({
      xpTotal: newTotal,
      currentLevel: levelData.currentLevel,
      xpToNextLevel: levelData.xpToNextLevel,
      levelProgress: levelData.levelProgress,
      showXpToast: true,
      xpToastAmount: amount,
      xpToastReason: reason,
    });
  },

  hideXpToast: () => set({ showXpToast: false }),

  addXp: (amount) => {
    const newTotal = get().xpTotal + amount;
    const levelData = calculateLevelData(newTotal);
    set({
      xpTotal: newTotal,
      currentLevel: levelData.currentLevel,
      xpToNextLevel: levelData.xpToNextLevel,
      levelProgress: levelData.levelProgress,
    });
  },

  showBadgeGain: (data) => set({
    showBadgeToast: true,
    badgeToastData: data,
  }),

  hideBadgeToast: () => set({ showBadgeToast: false }),
}));

export { LEVEL_THRESHOLDS };

export function getLevelName(level: number): string {
  const levelData = LEVEL_THRESHOLDS.find(l => l.level === level);
  return levelData?.name || 'Novato';
}
