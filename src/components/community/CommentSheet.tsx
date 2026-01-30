'use client';

import { useState, useRef, useEffect } from 'react';
import { cn, formatRelativeTime, getLevelColor } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import type { CommunityComment } from '@/types';

interface CommentSheetProps {
  isOpen: boolean;
  comments: CommunityComment[];
  isLoading: boolean;
  hasMore: boolean;
  onClose: () => void;
  onLoadMore: () => void;
  onAddComment: (content: string) => Promise<boolean>;
}

const MAX_COMMENT_LENGTH = 300;

export function CommentSheet({
  isOpen,
  comments,
  isLoading,
  hasMore,
  onClose,
  onLoadMore,
  onAddComment,
}: CommentSheetProps) {
  const [newComment, setNewComment] = useState('');
  const [isSending, setIsSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNewComment('');
      // Auto-scroll to bottom when new comments load
      if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight;
      }
    }
  }, [isOpen, comments.length]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (listRef.current?.scrollTop === 0) {
      setStartY(e.touches[0].clientY);
      setIsDragging(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const diff = e.touches[0].clientY - startY;
    if (diff > 0) {
      setCurrentY(diff);
    }
  };

  const handleTouchEnd = () => {
    if (currentY > 100) {
      onClose();
    }
    setCurrentY(0);
    setIsDragging(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newComment.trim();

    if (!trimmed || isSending) return;

    setIsSending(true);
    const success = await onAddComment(trimmed);

    if (success) {
      setNewComment('');
      // Scroll to bottom to see new comment
      setTimeout(() => {
        if (listRef.current) {
          listRef.current.scrollTop = listRef.current.scrollHeight;
        }
      }, 100);
    }
    setIsSending(false);
  };

  const handleScroll = () => {
    if (!listRef.current || isLoading || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    // Load more when scrolled near the top (for older comments)
    if (scrollTop < 100) {
      onLoadMore();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 animate-fade-in"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="relative bg-white rounded-t-2xl shadow-xl animate-slide-up max-h-[80vh] flex flex-col"
        style={{
          transform: `translateY(${currentY}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Handle */}
        <div className="flex justify-center py-2">
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-2 border-b border-gray-100">
          <h2 className="text-base font-bold text-slate-900">Comentarios</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 text-slate-500 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Comments List */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto px-4 py-3 min-h-[200px]"
          onScroll={handleScroll}
        >
          {isLoading && comments.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <span className="material-symbols-outlined animate-spin text-primary text-[32px]">
                progress_activity
              </span>
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <span className="material-symbols-outlined text-[48px] mb-2">chat_bubble</span>
              <p className="text-sm">Sé el primero en comentar</p>
            </div>
          ) : (
            <div className="space-y-4">
              {isLoading && hasMore && (
                <div className="flex justify-center py-2">
                  <span className="material-symbols-outlined animate-spin text-primary text-[20px]">
                    progress_activity
                  </span>
                </div>
              )}

              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <Avatar
                    src={comment.author.avatarUrl}
                    fallback={`${comment.author.firstName} ${comment.author.lastName}`}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-900">
                        {comment.author.firstName} {comment.author.lastName}
                      </span>
                      <span
                        className={cn(
                          'text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide',
                          getLevelColor(comment.author.level)
                        )}
                      >
                        {comment.author.level}
                      </span>
                      <span className="text-xs text-slate-400">
                        {formatRelativeTime(comment.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 mt-0.5 whitespace-pre-wrap">
                      {comment.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 px-4 py-3 border-t border-gray-100 bg-white"
        >
          <input
            ref={inputRef}
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value.slice(0, MAX_COMMENT_LENGTH))}
            placeholder="Escribe un comentario..."
            className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30"
            disabled={isSending}
          />
          <button
            type="submit"
            disabled={!newComment.trim() || isSending}
            className={cn(
              'p-2 rounded-full transition-all',
              newComment.trim() && !isSending
                ? 'bg-primary text-white hover:bg-primary/90 active:scale-95'
                : 'bg-gray-200 text-gray-400'
            )}
          >
            {isSending ? (
              <span className="material-symbols-outlined animate-spin text-[20px]">
                progress_activity
              </span>
            ) : (
              <span className="material-symbols-outlined text-[20px]">send</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
