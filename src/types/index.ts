// Student types
export interface Student {
  id: string;
  externalId: string;
  firstName: string;
  lastName: string;
  email?: string;
  dateOfBirth?: string;
  code: string;
  familyId: string;
  avatarUrl?: string;
  xpTotal: number;
  currentLevel: number;
  currentStreak: number;
  maxStreak: number;
  lastActivityDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentProfile {
  id: string;
  firstName: string;
  lastName: string;
  code: string;
  avatarUrl?: string;
  xpTotal: number;
  currentLevel: number;
  currentStreak: number;
  maxStreak: number;
}

// Course types
export interface Course {
  id: string;
  title: string;
  slug: string;
  description?: string;
  thumbnailUrl?: string;
  category: CourseCategory;
  xpReward: number;
  isPublished: boolean;
  modules?: Module[];
  enrollmentStatus?: EnrollmentStatus;
  progressPercent?: number;
}

export type CourseCategory =
  | 'finanzas'
  | 'emprendimiento'
  | 'liderazgo'
  | 'tecnologia'
  | 'creatividad'
  | 'comunicacion';

export interface Module {
  id: string;
  courseId: string;
  title: string;
  orderIndex: number;
  lessons?: Lesson[];
}

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  videoUrl?: string;
  durationMinutes?: number;
  xpReward: number;
  orderIndex: number;
  isCompleted?: boolean;
}

// Enrollment types
export interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
  progressPercent: number;
  status: EnrollmentStatus;
  course?: Course;
}

export type EnrollmentStatus = 'active' | 'completed' | 'paused';

// Gamification types
export interface XpTransaction {
  id: string;
  studentId: string;
  amount: number;
  reason: XpReason;
  createdAt: string;
}

export type XpReason =
  | 'lesson_complete'
  | 'course_complete'
  | 'exam_passed'
  | 'exam_perfect'
  | 'daily_login'
  | 'post_created'
  | 'streak_bonus';

export interface Badge {
  id: string;
  name: string;
  description?: string;
  icon: string;
  color?: string;
  category?: BadgeCategory;
  rarity?: BadgeRarity;
  criteria?: Record<string, unknown>;
  earnedAt?: string;
}

export type BadgeCategory =
  | 'learning'
  | 'social'
  | 'streak'
  | 'achievement'
  | 'special';

export type BadgeRarity =
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'epic'
  | 'legendary';

// Level configuration
export interface LevelConfig {
  level: number;
  name: string;
  minXp: number;
  maxXp: number;
}

// Community types
export type ReactionType = 'like' | 'heart' | 'idea' | 'party';

export interface Post {
  id: string;
  studentId: string;
  content: string;
  imageUrl?: string;
  reactionCount: number;
  commentCount: number;
  createdAt: string;
  author?: StudentProfile;
  hasReacted?: boolean;
}

export interface Comment {
  id: string;
  postId: string;
  studentId: string;
  content: string;
  parentId?: string;
  createdAt: string;
  author?: StudentProfile;
  replies?: Comment[];
}

export interface PostAuthor {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  level: number;
  levelName: string;
}

export interface ReactionSummary {
  like: number;
  heart: number;
  idea: number;
  party: number;
  total: number;
}

export interface CommunityPost {
  id: string;
  studentId: string;
  content: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt?: string;
  author: PostAuthor;
  userReaction?: ReactionType | null;
  reactionSummary: ReactionSummary;
  commentCount: number;
  isOwnPost: boolean;
}

export interface CommunityComment {
  id: string;
  postId: string;
  content: string;
  createdAt: string;
  author: PostAuthor;
}

export interface ReactionDetail {
  studentId: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  level: number;
  type: ReactionType;
}

// Notification types
export interface Notification {
  id: string;
  studentId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  data?: Record<string, unknown>;
}

export type NotificationType =
  | 'achievement'
  | 'badge'
  | 'streak'
  | 'course'
  | 'community'
  | 'comment'
  | 'reaction'
  | 'system';

// Auth types
export interface AuthToken {
  token: string;
  expiresAt: string;
}

export interface AuthSession {
  student: StudentProfile;
  token: string;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// WebView Bridge types
export interface SuperAppMessage {
  type: 'NOTIFICATION' | 'LOGOUT' | 'NAVIGATE' | 'CLOSE' | 'REFRESH';
  payload?: Record<string, unknown>;
}

declare global {
  interface Window {
    ReactNativeWebView?: {
      postMessage: (message: string) => void;
    };
  }
}
