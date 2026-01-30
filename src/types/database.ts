export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      students: {
        Row: {
          id: string
          external_id: string
          first_name: string
          last_name: string
          email: string | null
          date_of_birth: string | null
          code: string
          family_id: string
          avatar_url: string | null
          xp_total: number
          current_level: number
          current_streak: number
          max_streak: number
          last_activity_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          external_id: string
          first_name: string
          last_name: string
          email?: string | null
          date_of_birth?: string | null
          code: string
          family_id: string
          avatar_url?: string | null
          xp_total?: number
          current_level?: number
          current_streak?: number
          max_streak?: number
          last_activity_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          external_id?: string
          first_name?: string
          last_name?: string
          email?: string | null
          date_of_birth?: string | null
          code?: string
          family_id?: string
          avatar_url?: string | null
          xp_total?: number
          current_level?: number
          current_streak?: number
          max_streak?: number
          last_activity_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      courses: {
        Row: {
          id: string
          title: string
          slug: string
          description: string | null
          thumbnail_url: string | null
          category: string
          xp_reward: number
          is_published: boolean
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          slug: string
          description?: string | null
          thumbnail_url?: string | null
          category: string
          xp_reward?: number
          is_published?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          slug?: string
          description?: string | null
          thumbnail_url?: string | null
          category?: string
          xp_reward?: number
          is_published?: boolean
          created_at?: string
        }
      }
      modules: {
        Row: {
          id: string
          course_id: string
          title: string
          order_index: number
        }
        Insert: {
          id?: string
          course_id: string
          title: string
          order_index: number
        }
        Update: {
          id?: string
          course_id?: string
          title?: string
          order_index?: number
        }
      }
      lessons: {
        Row: {
          id: string
          module_id: string
          title: string
          video_url: string | null
          duration_minutes: number | null
          xp_reward: number
          order_index: number
        }
        Insert: {
          id?: string
          module_id: string
          title: string
          video_url?: string | null
          duration_minutes?: number | null
          xp_reward?: number
          order_index: number
        }
        Update: {
          id?: string
          module_id?: string
          title?: string
          video_url?: string | null
          duration_minutes?: number | null
          xp_reward?: number
          order_index?: number
        }
      }
      enrollments: {
        Row: {
          id: string
          student_id: string
          course_id: string
          progress_percent: number
          status: string
        }
        Insert: {
          id?: string
          student_id: string
          course_id: string
          progress_percent?: number
          status?: string
        }
        Update: {
          id?: string
          student_id?: string
          course_id?: string
          progress_percent?: number
          status?: string
        }
      }
      lesson_progress: {
        Row: {
          id: string
          student_id: string
          lesson_id: string
          is_completed: boolean
          completed_at: string | null
          watch_time_seconds: number
        }
        Insert: {
          id?: string
          student_id: string
          lesson_id: string
          is_completed?: boolean
          completed_at?: string | null
          watch_time_seconds?: number
        }
        Update: {
          id?: string
          student_id?: string
          lesson_id?: string
          is_completed?: boolean
          completed_at?: string | null
          watch_time_seconds?: number
        }
      }
      xp_transactions: {
        Row: {
          id: string
          student_id: string
          amount: number
          reason: string
          created_at: string
        }
        Insert: {
          id?: string
          student_id: string
          amount: number
          reason: string
          created_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          amount?: number
          reason?: string
          created_at?: string
        }
      }
      badges: {
        Row: {
          id: string
          name: string
          description: string | null
          icon: string
          category: string
          rarity: string
          criteria: Json
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          icon: string
          category: string
          rarity: string
          criteria: Json
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          icon?: string
          category?: string
          rarity?: string
          criteria?: Json
        }
      }
      student_badges: {
        Row: {
          student_id: string
          badge_id: string
          earned_at: string
        }
        Insert: {
          student_id: string
          badge_id: string
          earned_at?: string
        }
        Update: {
          student_id?: string
          badge_id?: string
          earned_at?: string
        }
      }
      posts: {
        Row: {
          id: string
          student_id: string
          content: string
          image_url: string | null
          reaction_count: number
          comment_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          student_id: string
          content: string
          image_url?: string | null
          reaction_count?: number
          comment_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          content?: string
          image_url?: string | null
          reaction_count?: number
          updated_at?: string
          comment_count?: number
          created_at?: string
        }
      }
      comments: {
        Row: {
          id: string
          post_id: string
          student_id: string
          content: string
          parent_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          student_id: string
          content: string
          parent_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          student_id?: string
          content?: string
          parent_id?: string | null
          created_at?: string
        }
      }
      reactions: {
        Row: {
          student_id: string
          post_id: string
          type: string
          created_at: string
        }
        Insert: {
          student_id: string
          post_id: string
          type?: string
          created_at?: string
        }
        Update: {
          student_id?: string
          post_id?: string
          type?: string
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          student_id: string
          type: string
          title: string
          message: string
          is_read: boolean
          data: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          student_id: string
          type: string
          title: string
          message: string
          is_read?: boolean
          data?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          type?: string
          title?: string
          message?: string
          is_read?: boolean
          data?: Json | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
