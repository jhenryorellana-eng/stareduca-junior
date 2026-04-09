'use client';

import { useState } from 'react';
import { cn, formatRelativeTime, getLevelColor, getLevelTitle, REACTION_ICONS } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import type { CommunityPost, ReactionType } from '@/types';

interface PostCardProps {
  post: CommunityPost;
  onReactionClick: (postId: string, event: React.MouseEvent) => void;
  onReactionLongPress: (postId: string) => void;
  onCommentClick: (postId: string) => void;
  onOptionsClick: (postId: string, event: React.MouseEvent) => void;
  onReportClick?: (postId: string) => void;
  onBlockClick?: (userId: string) => void;
  animationDelay?: number;
}

export function PostCard({
  post,
  onReactionClick,
  onReactionLongPress,
  onCommentClick,
  onOptionsClick,
  onReportClick,
  onBlockClick,
  animationDelay = 0,
}: PostCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const { author, content, imageUrl, reactionSummary, userReaction, commentCount, createdAt, isOwnPost } = post;

  // Get active reaction icons (those with count > 0)
  const activeReactions = (Object.keys(REACTION_ICONS) as ReactionType[]).filter(
    (type) => reactionSummary[type] > 0
  );

  return (
    <article
      className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-colors duration-200 animate-fade-in-up"
      style={{ animationDelay: `${animationDelay}s` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 tablet:p-5 pb-2 tablet:pb-3">
        <div className="flex items-center gap-3">
          <Avatar
            src={author.avatarUrl}
            fallback={`${author.firstName} ${author.lastName}`}
            size="md"
          />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 leading-tight">
                {author.firstName} {author.lastName}
              </h3>
              <span
                className={cn(
                  'text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide',
                  getLevelColor(author.level)
                )}
              >
                Nivel {author.level}
              </span>
            </div>
            <p className="text-xs text-slate-500">{formatRelativeTime(createdAt)}</p>
          </div>
        </div>
        <div className="relative">
          <button
            onClick={(e) => {
              if (isOwnPost) {
                onOptionsClick(post.id, e);
              } else {
                setShowMenu(!showMenu);
              }
            }}
            className="text-slate-400 hover:text-slate-600 rounded-full p-1 transition-colors"
            aria-label="Opciones del post"
          >
            <Icon name="more_horiz" size={20} />
          </button>
          {showMenu && !isOwnPost && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-20 min-w-[160px] animate-scale-in">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onReportClick?.(post.id);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-gray-50 transition-colors"
                >
                  <Icon name="flag" size={18} />
                  Reportar
                </button>
                <div className="border-t border-gray-100 my-1" />
                <button
                  onClick={() => {
                    setShowMenu(false);
                    if (author.id) onBlockClick?.(author.id);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Icon name="block" size={18} />
                  Bloquear usuario
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Body Text */}
      <div className="px-4 tablet:px-5 py-1">
        <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{content}</p>
      </div>

      {/* Media */}
      {imageUrl && (
        <div className="mt-3 w-full bg-gray-100 aspect-[4/3] relative">
          <div
            className="w-full h-full bg-cover bg-center"
            style={{ backgroundImage: `url('${imageUrl}')` }}
          />
        </div>
      )}

      {/* Reaction Bar */}
      <div className="px-4 tablet:px-5 py-3 border-t border-gray-50">
        <div className="flex items-center justify-between">
          {/* Reactions Cluster */}
          <button
            onClick={(e) => onReactionClick(post.id, e)}
            onContextMenu={(e) => {
              e.preventDefault();
              onReactionLongPress(post.id);
            }}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded-full border transition-all active:scale-95',
              userReaction
                ? 'bg-primary/10 border-primary/30'
                : 'bg-gray-50 border-white hover:bg-gray-100'
            )}
          >
            {activeReactions.length > 0 ? (
              <>
                {activeReactions.slice(0, 3).map((type) => (
                  <Icon
                    key={type}
                    name={REACTION_ICONS[type].icon}
                    size={16}
                    filled
                    className={REACTION_ICONS[type].color}
                  />
                ))}
                <span className="text-xs font-semibold text-slate-600 ml-1">
                  {reactionSummary.total}
                </span>
              </>
            ) : (
              <>
                <Icon name="add_reaction" size={16} className="text-slate-400" />
                <span className="text-xs font-semibold text-slate-500">Reaccionar</span>
              </>
            )}
          </button>

          {/* Comment Action */}
          <button
            onClick={() => onCommentClick(post.id)}
            className="flex items-center gap-1.5 text-slate-500 hover:text-primary transition-colors"
          >
            <Icon name="chat_bubble" size={20} />
            <span className="text-xs font-bold">
              {commentCount > 0 ? `${commentCount} Comentarios` : 'Comentar'}
            </span>
          </button>
        </div>
      </div>
    </article>
  );
}
