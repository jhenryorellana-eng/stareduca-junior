import { create } from 'zustand';
import type { CommunityPost, CommunityComment, ReactionType, ReactionDetail, ReactionSummary } from '@/types';

interface CommunityState {
  // Posts
  posts: CommunityPost[];
  isLoading: boolean;
  hasMore: boolean;
  offset: number;

  // Modals
  showCreateModal: boolean;
  editingPost: CommunityPost | null;
  showCommentSheet: boolean;
  selectedPostId: string | null;
  showReactionPicker: boolean;
  reactionPickerPostId: string | null;
  reactionPickerPosition: { x: number; y: number } | null;
  showReactionDetails: boolean;
  reactionDetailsPostId: string | null;

  // Comments
  comments: CommunityComment[];
  commentsLoading: boolean;
  commentsHasMore: boolean;
  commentsOffset: number;

  // Reactions details
  reactionDetails: ReactionDetail[];
  reactionDetailsSummary: ReactionSummary | null;
  reactionDetailsLoading: boolean;
  reactionDetailsFilter: ReactionType | 'all';

  // Actions
  fetchPosts: (token: string, reset?: boolean) => Promise<void>;
  createPost: (token: string, content: string, imageUrl?: string) => Promise<{ success: boolean; xpAwarded?: number }>;
  updatePost: (token: string, id: string, content: string) => Promise<boolean>;
  deletePost: (token: string, id: string) => Promise<boolean>;
  toggleReaction: (token: string, postId: string, type: ReactionType) => Promise<void>;
  removeReaction: (token: string, postId: string) => Promise<void>;
  fetchComments: (token: string, postId: string, reset?: boolean) => Promise<void>;
  addComment: (token: string, postId: string, content: string) => Promise<boolean>;
  fetchReactionDetails: (token: string, postId: string, filter?: ReactionType | 'all') => Promise<void>;

  // Modal actions
  openCreateModal: () => void;
  openEditModal: (post: CommunityPost) => void;
  closeCreateModal: () => void;
  openCommentSheet: (postId: string) => void;
  closeCommentSheet: () => void;
  openReactionPicker: (postId: string, position: { x: number; y: number }) => void;
  closeReactionPicker: () => void;
  openReactionDetails: (postId: string) => void;
  closeReactionDetails: () => void;
  setReactionDetailsFilter: (filter: ReactionType | 'all') => void;

  // Reset
  reset: () => void;
}

const initialState = {
  posts: [],
  isLoading: false,
  hasMore: true,
  offset: 0,
  showCreateModal: false,
  editingPost: null,
  showCommentSheet: false,
  selectedPostId: null,
  showReactionPicker: false,
  reactionPickerPostId: null,
  reactionPickerPosition: null,
  showReactionDetails: false,
  reactionDetailsPostId: null,
  comments: [],
  commentsLoading: false,
  commentsHasMore: true,
  commentsOffset: 0,
  reactionDetails: [],
  reactionDetailsSummary: null,
  reactionDetailsLoading: false,
  reactionDetailsFilter: 'all' as const,
};

export const useCommunityStore = create<CommunityState>((set, get) => ({
  ...initialState,

  fetchPosts: async (token: string, reset = false) => {
    const currentOffset = reset ? 0 : get().offset;

    if (get().isLoading) return;
    set({ isLoading: true });

    try {
      const response = await fetch(`/api/posts?offset=${currentOffset}&limit=10`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch posts');

      const data = await response.json();
      const newPosts = data.posts || [];

      set((state) => ({
        posts: reset ? newPosts : [...state.posts, ...newPosts],
        hasMore: data.hasMore,
        offset: currentOffset + newPosts.length,
        isLoading: false,
      }));
    } catch (error) {
      console.error('Error fetching posts:', error);
      set({ isLoading: false });
    }
  },

  createPost: async (token: string, content: string, imageUrl?: string) => {
    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content, imageUrl }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Error creating post:', error);
        return { success: false };
      }

      const data = await response.json();

      // Add new post to the beginning of the list
      set((state) => ({
        posts: [data.post, ...state.posts],
        showCreateModal: false,
        editingPost: null,
      }));

      return { success: true, xpAwarded: data.xpAwarded };
    } catch (error) {
      console.error('Error creating post:', error);
      return { success: false };
    }
  },

  updatePost: async (token: string, id: string, content: string) => {
    try {
      const response = await fetch(`/api/posts/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) return false;

      const data = await response.json();

      // Update post in list
      set((state) => ({
        posts: state.posts.map((p) =>
          p.id === id ? { ...p, content: data.post.content } : p
        ),
        showCreateModal: false,
        editingPost: null,
      }));

      return true;
    } catch (error) {
      console.error('Error updating post:', error);
      return false;
    }
  },

  deletePost: async (token: string, id: string) => {
    try {
      const response = await fetch(`/api/posts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) return false;

      // Remove post from list
      set((state) => ({
        posts: state.posts.filter((p) => p.id !== id),
      }));

      return true;
    } catch (error) {
      console.error('Error deleting post:', error);
      return false;
    }
  },

  toggleReaction: async (token: string, postId: string, type: ReactionType) => {
    const post = get().posts.find((p) => p.id === postId);
    if (!post) return;

    // Optimistic update
    const previousReaction = post.userReaction;
    const newSummary = { ...post.reactionSummary };

    // Remove previous reaction from summary
    if (previousReaction && previousReaction in newSummary) {
      newSummary[previousReaction]--;
      newSummary.total--;
    }

    // If clicking the same reaction, remove it
    if (previousReaction === type) {
      set((state) => ({
        posts: state.posts.map((p) =>
          p.id === postId
            ? { ...p, userReaction: null, reactionSummary: newSummary }
            : p
        ),
        showReactionPicker: false,
        reactionPickerPostId: null,
      }));

      // API call to remove
      try {
        await fetch(`/api/posts/${postId}/reactions`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (error) {
        // Rollback on error
        set((state) => ({
          posts: state.posts.map((p) =>
            p.id === postId
              ? { ...p, userReaction: previousReaction, reactionSummary: post.reactionSummary }
              : p
          ),
        }));
      }
      return;
    }

    // Add new reaction to summary
    newSummary[type]++;
    newSummary.total++;

    set((state) => ({
      posts: state.posts.map((p) =>
        p.id === postId
          ? { ...p, userReaction: type, reactionSummary: newSummary }
          : p
      ),
      showReactionPicker: false,
      reactionPickerPostId: null,
    }));

    // API call
    try {
      await fetch(`/api/posts/${postId}/reactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type }),
      });
    } catch (error) {
      // Rollback on error
      set((state) => ({
        posts: state.posts.map((p) =>
          p.id === postId
            ? { ...p, userReaction: previousReaction, reactionSummary: post.reactionSummary }
            : p
        ),
      }));
    }
  },

  removeReaction: async (token: string, postId: string) => {
    const post = get().posts.find((p) => p.id === postId);
    if (!post || !post.userReaction) return;

    const previousReaction = post.userReaction;
    const newSummary = { ...post.reactionSummary };
    newSummary[previousReaction]--;
    newSummary.total--;

    // Optimistic update
    set((state) => ({
      posts: state.posts.map((p) =>
        p.id === postId
          ? { ...p, userReaction: null, reactionSummary: newSummary }
          : p
      ),
    }));

    try {
      await fetch(`/api/posts/${postId}/reactions`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      // Rollback on error
      set((state) => ({
        posts: state.posts.map((p) =>
          p.id === postId
            ? { ...p, userReaction: previousReaction, reactionSummary: post.reactionSummary }
            : p
        ),
      }));
    }
  },

  fetchComments: async (token: string, postId: string, reset = false) => {
    const currentOffset = reset ? 0 : get().commentsOffset;

    if (get().commentsLoading) return;
    set({ commentsLoading: true });

    try {
      const response = await fetch(
        `/api/posts/${postId}/comments?offset=${currentOffset}&limit=20`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.ok) throw new Error('Failed to fetch comments');

      const data = await response.json();
      const newComments = data.comments || [];

      set((state) => ({
        comments: reset ? newComments : [...state.comments, ...newComments],
        commentsHasMore: data.hasMore,
        commentsOffset: currentOffset + newComments.length,
        commentsLoading: false,
      }));
    } catch (error) {
      console.error('Error fetching comments:', error);
      set({ commentsLoading: false });
    }
  },

  addComment: async (token: string, postId: string, content: string) => {
    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) return false;

      const data = await response.json();

      // Add comment to list and update post comment count
      set((state) => ({
        comments: [...state.comments, data.comment],
        posts: state.posts.map((p) =>
          p.id === postId ? { ...p, commentCount: p.commentCount + 1 } : p
        ),
      }));

      return true;
    } catch (error) {
      console.error('Error adding comment:', error);
      return false;
    }
  },

  fetchReactionDetails: async (token: string, postId: string, filter: ReactionType | 'all' = 'all') => {
    set({ reactionDetailsLoading: true, reactionDetailsFilter: filter });

    try {
      const url = filter === 'all'
        ? `/api/posts/${postId}/reactions`
        : `/api/posts/${postId}/reactions?type=${filter}`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch reaction details');

      const data = await response.json();

      set({
        reactionDetails: data.reactions || [],
        reactionDetailsSummary: data.summary,
        reactionDetailsLoading: false,
      });
    } catch (error) {
      console.error('Error fetching reaction details:', error);
      set({ reactionDetailsLoading: false });
    }
  },

  // Modal actions
  openCreateModal: () => set({ showCreateModal: true, editingPost: null }),
  openEditModal: (post) => set({ showCreateModal: true, editingPost: post }),
  closeCreateModal: () => set({ showCreateModal: false, editingPost: null }),

  openCommentSheet: (postId) => set({
    showCommentSheet: true,
    selectedPostId: postId,
    comments: [],
    commentsOffset: 0,
    commentsHasMore: true,
  }),
  closeCommentSheet: () => set({
    showCommentSheet: false,
    selectedPostId: null,
    comments: [],
  }),

  openReactionPicker: (postId, position) => set({
    showReactionPicker: true,
    reactionPickerPostId: postId,
    reactionPickerPosition: position,
  }),
  closeReactionPicker: () => set({
    showReactionPicker: false,
    reactionPickerPostId: null,
    reactionPickerPosition: null,
  }),

  openReactionDetails: (postId) => set({
    showReactionDetails: true,
    reactionDetailsPostId: postId,
    reactionDetails: [],
    reactionDetailsSummary: null,
    reactionDetailsFilter: 'all',
  }),
  closeReactionDetails: () => set({
    showReactionDetails: false,
    reactionDetailsPostId: null,
    reactionDetails: [],
    reactionDetailsSummary: null,
  }),

  setReactionDetailsFilter: (filter) => set({ reactionDetailsFilter: filter }),

  reset: () => set(initialState),
}));
