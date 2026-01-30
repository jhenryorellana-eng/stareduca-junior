'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface PostOptionsMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function PostOptionsMenu({
  isOpen,
  position,
  onClose,
  onEdit,
  onDelete,
}: PostOptionsMenuProps) {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setShowConfirmDelete(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
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

  if (!isOpen) return null;

  const handleDeleteClick = () => {
    if (showConfirmDelete) {
      onDelete();
      onClose();
    } else {
      setShowConfirmDelete(true);
    }
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-[60] bg-white rounded-xl shadow-xl border border-gray-100 py-1 min-w-[160px] animate-scale-in"
      style={{
        top: position.y,
        left: Math.min(position.x, window.innerWidth - 180),
      }}
    >
      <button
        onClick={() => {
          onEdit();
          onClose();
        }}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-gray-50 transition-colors"
      >
        <span className="material-symbols-outlined text-[18px]">edit</span>
        Editar
      </button>

      <div className="border-t border-gray-100 my-1" />

      <button
        onClick={handleDeleteClick}
        className={cn(
          'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
          showConfirmDelete
            ? 'bg-red-50 text-red-600 hover:bg-red-100'
            : 'text-red-500 hover:bg-red-50'
        )}
      >
        <span className="material-symbols-outlined text-[18px]">delete</span>
        {showConfirmDelete ? '¿Confirmar eliminar?' : 'Eliminar'}
      </button>
    </div>
  );
}
