'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth, useInfiniteScroll } from '@/hooks';
import { useCommunityStore } from '@/stores/community-store';
import { useUserStore } from '@/stores/user-store';
import {
  PostCard,
  CreatePostModal,
  PostOptionsMenu,
  ReactionPicker,
  ReactionDetails,
  CommentSheet,
} from '@/components/community';
import type { CommunityPost, ReactionType } from '@/types';

export default function ComunidadPage() {
  const { token, isLoading: authLoading } = useAuth();

  // Community store
  const {
    posts,
    isLoading,
    hasMore,
    showCreateModal,
    editingPost,
    showCommentSheet,
    selectedPostId,
    showReactionPicker,
    reactionPickerPostId,
    reactionPickerPosition,
    showReactionDetails,
    reactionDetailsPostId,
    comments,
    commentsLoading,
    commentsHasMore,
    reactionDetails,
    reactionDetailsSummary,
    reactionDetailsLoading,
    reactionDetailsFilter,
    fetchPosts,
    createPost,
    updatePost,
    deletePost,
    toggleReaction,
    fetchComments,
    addComment,
    fetchReactionDetails,
    openCreateModal,
    openEditModal,
    closeCreateModal,
    openCommentSheet,
    closeCommentSheet,
    openReactionPicker,
    closeReactionPicker,
    openReactionDetails,
    closeReactionDetails,
    setReactionDetailsFilter,
  } = useCommunityStore();

  // User store for XP toast
  const { showXpGain } = useUserStore();

  // Options menu state
  const [optionsMenu, setOptionsMenu] = useState<{
    postId: string;
    position: { x: number; y: number };
  } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initial fetch
  useEffect(() => {
    if (token && !authLoading) {
      fetchPosts(token, true);
    }
  }, [token, authLoading, fetchPosts]);

  // Infinite scroll
  const loadMore = useCallback(() => {
    if (token && hasMore && !isLoading) {
      fetchPosts(token);
    }
  }, [token, hasMore, isLoading, fetchPosts]);

  const sentinelRef = useInfiniteScroll({
    enabled: hasMore && !isLoading,
    onLoadMore: loadMore,
  });

  // Fetch comments when sheet opens
  useEffect(() => {
    if (showCommentSheet && selectedPostId && token) {
      fetchComments(token, selectedPostId, true);
    }
  }, [showCommentSheet, selectedPostId, token, fetchComments]);

  // Fetch reaction details when modal opens
  useEffect(() => {
    if (showReactionDetails && reactionDetailsPostId && token) {
      fetchReactionDetails(token, reactionDetailsPostId, reactionDetailsFilter);
    }
  }, [showReactionDetails, reactionDetailsPostId, reactionDetailsFilter, token, fetchReactionDetails]);

  // Handlers
  const handleReactionClick = (postId: string, event: React.MouseEvent) => {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    openReactionPicker(postId, { x: rect.left + rect.width / 2, y: rect.top });
  };

  const handleReactionLongPress = (postId: string) => {
    openReactionDetails(postId);
  };

  const handleSelectReaction = async (type: ReactionType) => {
    if (token && reactionPickerPostId) {
      await toggleReaction(token, reactionPickerPostId, type);
    }
  };

  const handleCommentClick = (postId: string) => {
    openCommentSheet(postId);
  };

  const handleOptionsClick = (postId: string, event: React.MouseEvent) => {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    setOptionsMenu({ postId, position: { x: rect.left, y: rect.bottom + 4 } });
  };

  const handleEditPost = () => {
    if (optionsMenu) {
      const post = posts.find((p) => p.id === optionsMenu.postId);
      if (post) {
        openEditModal(post);
      }
    }
  };

  const handleDeletePost = async () => {
    if (optionsMenu && token) {
      await deletePost(token, optionsMenu.postId);
    }
  };

  const handleSubmitPost = async (content: string, imageFile?: File): Promise<boolean> => {
    if (!token) return false;

    setIsSubmitting(true);

    if (editingPost) {
      const success = await updatePost(token, editingPost.id, content);
      setIsSubmitting(false);
      return success;
    }

    let imageUrl: string | undefined;

    // Upload image first if provided
    if (imageFile) {
      try {
        const formData = new FormData();
        formData.append('file', imageFile);

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        if (!uploadResponse.ok) {
          const error = await uploadResponse.json();
          console.error('Error uploading image:', error);
          setIsSubmitting(false);
          return false;
        }

        const uploadData = await uploadResponse.json();
        imageUrl = uploadData.url;
      } catch (error) {
        console.error('Error uploading image:', error);
        setIsSubmitting(false);
        return false;
      }
    }

    const result = await createPost(token, content, imageUrl);
    setIsSubmitting(false);

    if (result.success && result.xpAwarded) {
      showXpGain(result.xpAwarded, 'Publicación creada');
    }

    return result.success;
  };

  const handleAddComment = async (content: string): Promise<boolean> => {
    if (!token || !selectedPostId) return false;
    return addComment(token, selectedPostId, content);
  };

  const handleLoadMoreComments = () => {
    if (token && selectedPostId && commentsHasMore && !commentsLoading) {
      fetchComments(token, selectedPostId);
    }
  };

  const handleFilterChange = (filter: ReactionType | 'all') => {
    setReactionDetailsFilter(filter);
    if (token && reactionDetailsPostId) {
      fetchReactionDetails(token, reactionDetailsPostId, filter);
    }
  };

  // Get current post's reaction for picker
  const currentPickerPost = reactionPickerPostId
    ? posts.find((p) => p.id === reactionPickerPostId)
    : null;

  if (authLoading) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-primary text-[48px]">
          progress_activity
        </span>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen relative flex flex-col overflow-x-hidden pb-24">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center justify-between transition-colors duration-200">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Comunidad</h1>
        <button
          onClick={openCreateModal}
          aria-label="Crear publicación"
          className="bg-primary hover:bg-primary/90 text-white rounded-xl w-10 h-10 flex items-center justify-center shadow-md transition-all active:scale-95"
        >
          <span className="material-symbols-outlined">add</span>
        </button>
      </header>

      {/* Main Feed Content */}
      <main className="flex flex-col gap-4 p-4 w-full max-w-md mx-auto">
        {/* Initial loading */}
        {isLoading && posts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <span className="material-symbols-outlined animate-spin text-primary text-[48px]">
              progress_activity
            </span>
            <p className="mt-4 text-sm text-slate-500">Cargando publicaciones...</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && posts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <span className="material-symbols-outlined text-[64px] mb-4">forum</span>
            <h2 className="text-lg font-semibold text-slate-600 mb-2">No hay publicaciones</h2>
            <p className="text-sm text-center mb-4">
              Sé el primero en compartir algo con la comunidad
            </p>
            <button
              onClick={openCreateModal}
              className="bg-primary text-white px-6 py-2 rounded-full font-medium hover:bg-primary/90 transition-all active:scale-95"
            >
              Crear publicación
            </button>
          </div>
        )}

        {/* Posts list */}
        {posts.map((post, index) => (
          <PostCard
            key={post.id}
            post={post}
            onReactionClick={handleReactionClick}
            onReactionLongPress={handleReactionLongPress}
            onCommentClick={handleCommentClick}
            onOptionsClick={handleOptionsClick}
            animationDelay={index * 0.05}
          />
        ))}

        {/* Infinite scroll sentinel */}
        {hasMore && (
          <div ref={sentinelRef} className="py-8 flex flex-col items-center justify-center text-slate-400 gap-2">
            {isLoading ? (
              <span className="material-symbols-outlined animate-spin text-primary text-[24px]">
                progress_activity
              </span>
            ) : (
              <span className="material-symbols-outlined animate-bounce">expand_more</span>
            )}
            <p className="text-xs font-medium uppercase tracking-widest">
              {isLoading ? 'Cargando...' : 'Cargando más'}
            </p>
          </div>
        )}

        {/* End of feed */}
        {!hasMore && posts.length > 0 && (
          <div className="py-8 flex flex-col items-center justify-center text-slate-400 gap-2">
            <span className="material-symbols-outlined text-[32px]">check_circle</span>
            <p className="text-xs font-medium uppercase tracking-widest">
              Estás al día
            </p>
          </div>
        )}
      </main>

      {/* Modals and Overlays */}
      <CreatePostModal
        isOpen={showCreateModal}
        editingPost={editingPost}
        onClose={closeCreateModal}
        onSubmit={handleSubmitPost}
        isLoading={isSubmitting}
      />

      <PostOptionsMenu
        isOpen={!!optionsMenu}
        position={optionsMenu?.position || { x: 0, y: 0 }}
        onClose={() => setOptionsMenu(null)}
        onEdit={handleEditPost}
        onDelete={handleDeletePost}
      />

      <ReactionPicker
        isOpen={showReactionPicker}
        position={reactionPickerPosition}
        currentReaction={currentPickerPost?.userReaction}
        onSelect={handleSelectReaction}
        onClose={closeReactionPicker}
      />

      <ReactionDetails
        isOpen={showReactionDetails}
        reactions={reactionDetails}
        summary={reactionDetailsSummary}
        filter={reactionDetailsFilter}
        isLoading={reactionDetailsLoading}
        onFilterChange={handleFilterChange}
        onClose={closeReactionDetails}
      />

      <CommentSheet
        isOpen={showCommentSheet}
        comments={comments}
        isLoading={commentsLoading}
        hasMore={commentsHasMore}
        onClose={closeCommentSheet}
        onLoadMore={handleLoadMoreComments}
        onAddComment={handleAddComment}
      />
    </div>
  );
}
