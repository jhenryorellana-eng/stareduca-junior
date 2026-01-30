'use client';

import { cn, getLevelColor, REACTION_ICONS } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import type { ReactionDetail, ReactionSummary, ReactionType } from '@/types';

interface ReactionDetailsProps {
  isOpen: boolean;
  reactions: ReactionDetail[];
  summary: ReactionSummary | null;
  filter: ReactionType | 'all';
  isLoading: boolean;
  onFilterChange: (filter: ReactionType | 'all') => void;
  onClose: () => void;
}

const FILTER_OPTIONS: (ReactionType | 'all')[] = ['all', 'like', 'heart', 'idea', 'party'];

export function ReactionDetails({
  isOpen,
  reactions,
  summary,
  filter,
  isLoading,
  onFilterChange,
  onClose,
}: ReactionDetailsProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl animate-scale-in max-h-[70vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="text-base font-bold text-slate-900">Reacciones</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 text-slate-500 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-100 overflow-x-auto">
          {FILTER_OPTIONS.map((option) => {
            const isActive = filter === option;
            const count = option === 'all' ? summary?.total : summary?.[option];

            return (
              <button
                key={option}
                onClick={() => onFilterChange(option)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap',
                  isActive
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-slate-600 hover:bg-gray-200'
                )}
              >
                {option === 'all' ? (
                  'Todos'
                ) : (
                  <span
                    className={cn(
                      'material-symbols-outlined text-[16px]',
                      !isActive && REACTION_ICONS[option].color
                    )}
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {REACTION_ICONS[option].icon}
                  </span>
                )}
                {count !== undefined && count > 0 && (
                  <span className={cn('text-xs', isActive ? 'text-white/80' : 'text-slate-400')}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <span className="material-symbols-outlined animate-spin text-primary text-[32px]">
                progress_activity
              </span>
            </div>
          ) : reactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <span className="material-symbols-outlined text-[48px] mb-2">sentiment_neutral</span>
              <p className="text-sm">No hay reacciones</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {reactions.map((reaction, index) => (
                <li
                  key={`${reaction.studentId}-${index}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="relative">
                    <Avatar
                      src={reaction.avatarUrl}
                      fallback={`${reaction.firstName} ${reaction.lastName}`}
                      size="sm"
                    />
                    <span
                      className={cn(
                        'absolute -bottom-1 -right-1 material-symbols-outlined text-[14px]',
                        REACTION_ICONS[reaction.type].color
                      )}
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      {REACTION_ICONS[reaction.type].icon}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {reaction.firstName} {reaction.lastName}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide',
                      getLevelColor(reaction.level)
                    )}
                  >
                    Nivel {reaction.level}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
