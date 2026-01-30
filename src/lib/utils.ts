import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatXp(xp: number): string {
  if (xp >= 1000000) {
    return `${(xp / 1000000).toFixed(1)}M`;
  }
  if (xp >= 1000) {
    return `${(xp / 1000).toFixed(1)}K`;
  }
  return xp.toString();
}

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'hace un momento';
  if (diffMin < 60) return `hace ${diffMin} min`;
  if (diffHour < 24) return `hace ${diffHour}h`;
  if (diffDay < 7) return `hace ${diffDay}d`;
  return formatDate(d);
}

export function getStreakEmoji(streak: number): string {
  if (streak >= 30) return '🔥';
  if (streak >= 14) return '⚡';
  if (streak >= 7) return '✨';
  if (streak >= 3) return '💪';
  return '🌱';
}

export function getLevelName(level: number): string {
  return getLevelTitle(level);
}

export function getLevelTitle(level: number): string {
  const titles: Record<number, string> = {
    1: 'Novato',
    2: 'Aprendiz',
    3: 'Curioso',
    4: 'Estudiante',
    5: 'Explorador',
    6: 'Explorador II',
    7: 'Explorador III',
    8: 'Aventurero',
    9: 'Aventurero II',
    10: 'Constructor',
    11: 'Constructor II',
    12: 'Constructor III',
    13: 'Arquitecto',
    14: 'Arquitecto II',
    15: 'Innovador',
    16: 'Innovador II',
    17: 'Innovador III',
    18: 'Visionario',
    19: 'Visionario II',
    20: 'Líder',
    21: 'Líder II',
    22: 'Líder III',
    23: 'Estratega',
    24: 'Estratega II',
    25: 'CEO Junior',
    26: 'CEO Junior Elite',
    27: 'CEO Junior Master',
    28: 'CEO Junior Legend',
    29: 'CEO Junior Champion',
    30: 'Fundador',
  };
  return titles[level] || 'Novato';
}

export function getBadgeRarityColor(rarity: string): string {
  const colors: Record<string, string> = {
    common: 'bg-gray-100 text-gray-700',
    uncommon: 'bg-green-100 text-green-700',
    rare: 'bg-blue-100 text-blue-700',
    epic: 'bg-purple-100 text-purple-700',
    legendary: 'bg-amber-100 text-amber-700',
  };
  return colors[rarity] || colors.common;
}

export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    finanzas: 'bg-green-100 text-green-700',
    emprendimiento: 'bg-purple-100 text-purple-700',
    liderazgo: 'bg-blue-100 text-blue-700',
    tecnologia: 'bg-cyan-100 text-cyan-700',
    creatividad: 'bg-pink-100 text-pink-700',
    comunicacion: 'bg-orange-100 text-orange-700',
  };
  return colors[category] || 'bg-gray-100 text-gray-700';
}

export function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    finanzas: 'savings',
    emprendimiento: 'rocket_launch',
    liderazgo: 'groups',
    tecnologia: 'code',
    creatividad: 'palette',
    comunicacion: 'campaign',
  };
  return icons[category] || 'school';
}

// Community reaction icons
export const REACTION_ICONS: Record<string, { icon: string; label: string; color: string }> = {
  like: { icon: 'thumb_up', label: 'Me gusta', color: 'text-blue-500' },
  heart: { icon: 'favorite', label: 'Me encanta', color: 'text-red-500' },
  idea: { icon: 'lightbulb', label: 'Buena idea', color: 'text-yellow-500' },
  party: { icon: 'celebration', label: 'Celebrar', color: 'text-purple-500' },
};

export function getLevelColor(level: number): string {
  if (level >= 25) return 'bg-gradient-to-r from-amber-400 to-yellow-500 text-white';
  if (level >= 20) return 'bg-purple-500 text-white';
  if (level >= 15) return 'bg-blue-500 text-white';
  if (level >= 10) return 'bg-green-500 text-white';
  if (level >= 5) return 'bg-cyan-500 text-white';
  return 'bg-slate-400 text-white';
}
