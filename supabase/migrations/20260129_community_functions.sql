-- Migration: Community Functions for StarEduca Junior
-- Description: Add RPC functions for community features (reactions, comments, XP)

-- Add updated_at column to posts if not exists
ALTER TABLE posts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create index for posts ordering
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);

-- Create index for reactions lookup
CREATE INDEX IF NOT EXISTS idx_reactions_post_type ON reactions(post_id, type);

-- Create index for comments lookup
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id, created_at DESC);

-- Create composite primary key for reactions if not exists
-- (student_id, post_id) should be unique
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reactions_pkey'
  ) THEN
    ALTER TABLE reactions ADD CONSTRAINT reactions_pkey PRIMARY KEY (student_id, post_id);
  END IF;
END $$;

-- Function to increment XP for a student
CREATE OR REPLACE FUNCTION increment_xp(student_id UUID, xp_amount INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE students
  SET xp_total = xp_total + xp_amount,
      updated_at = NOW()
  WHERE id = student_id;
END;
$$ LANGUAGE plpgsql;

-- Function to increment comment count on a post
CREATE OR REPLACE FUNCTION increment_comment_count(post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE posts
  SET comment_count = comment_count + 1,
      updated_at = NOW()
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

-- Function to increment reaction count on a post
CREATE OR REPLACE FUNCTION increment_reaction_count(post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE posts
  SET reaction_count = reaction_count + 1,
      updated_at = NOW()
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

-- Function to decrement reaction count on a post
CREATE OR REPLACE FUNCTION decrement_reaction_count(post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE posts
  SET reaction_count = GREATEST(0, reaction_count - 1),
      updated_at = NOW()
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on posts
CREATE OR REPLACE FUNCTION update_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS posts_updated_at ON posts;
CREATE TRIGGER posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_posts_updated_at();
