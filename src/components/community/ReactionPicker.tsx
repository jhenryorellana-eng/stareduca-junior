'use client';

import { useEffect, useRef } from 'react';
import { cn, REACTION_ICONS } from '@/lib/utils';
import type { ReactionType } from '@/types';

interface ReactionPickerProps {
  isOpen: boolean;
  position: { x: number; y: number } | null;
  currentReaction?: ReactionType | null;
  onSelect: (type: ReactionType) => void;
  onClose: () => void;
}

const REACTION_TYPES: ReactionType[] = ['like', 'heart', 'idea', 'party'];

export function ReactionPicker({
  isOpen,
  position,
  currentReaction,
  onSelect,
  onClose,
}: ReactionPickerProps) {
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !position) return null;

  // Calculate position to keep picker in viewport
  const pickerWidth = 200;
  const left = Math.min(Math.max(position.x - pickerWidth / 2, 8), window.innerWidth - pickerWidth - 8);
  const top = Math.max(position.y - 60, 8);

  return (
    <div
      ref={pickerRef}
      className="fixed z-[60] bg-white rounded-2xl shadow-xl border border-gray-100 p-2 animate-scale-in"
      style={{ top, left }}
    >
      <div className="flex items-center gap-1">
        {REACTION_TYPES.map((type) => {
          const reaction = REACTION_ICONS[type];
          const isSelected = currentReaction === type;

          return (
            <button
              key={type}
              onClick={() => onSelect(type)}
              className={cn(
                'relative flex flex-col items-center justify-center p-2 rounded-xl transition-all',
                'hover:bg-gray-100 active:scale-90',
                isSelected && 'bg-primary/10 ring-2 ring-primary/30'
              )}
              title={reaction.label}
            >
              <span
                className={cn(
                  'material-symbols-outlined text-[28px] transition-transform hover:scale-110',
                  reaction.color
                )}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {reaction.icon}
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5 font-medium">
                {reaction.label.split(' ')[0]}
              </span>
              {isSelected && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-[12px]">check</span>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
