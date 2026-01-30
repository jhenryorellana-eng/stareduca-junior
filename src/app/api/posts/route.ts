import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getAuthFromRequest, unauthorizedResponse } from '@/lib/auth';
import { getLevelTitle } from '@/lib/utils';
import type { CommunityPost, ReactionSummary, ReactionType } from '@/types';

const POSTS_PER_PAGE = 10;
const MAX_CONTENT_LENGTH = 500;
const XP_PER_POST = 10;
const MAX_POSTS_PER_DAY = 3;

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const offset = parseInt(searchParams.get('offset') || '0', 10);
  const limit = Math.min(parseInt(searchParams.get('limit') || String(POSTS_PER_PAGE), 10), 50);

  const supabase = createServerClient();

  // 1. Fetch posts with author info (explicit FK to avoid ambiguity with reactions)
  const { data: postsData, error: postsError } = await supabase
    .from('posts')
    .select(`
      id,
      student_id,
      content,
      image_url,
      comment_count,
      created_at,
      students!posts_student_id_fkey (
        id,
        first_name,
        last_name,
        avatar_url,
        current_level
      )
    `)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit);

  if (postsError) {
    console.error('Error fetching posts:', postsError);
    return NextResponse.json({ error: 'Error al obtener publicaciones' }, { status: 500 });
  }

  if (!postsData || postsData.length === 0) {
    return NextResponse.json({ posts: [], hasMore: false });
  }

  const postIds = postsData.map((p: any) => p.id);

  // 2. Fetch all reactions for these posts in one query
  const { data: reactionsData } = await supabase
    .from('reactions')
    .select('post_id, student_id, type')
    .in('post_id', postIds);

  // 3. Build reaction summaries and user reactions
  const reactionsByPost = new Map<string, { summary: ReactionSummary; userReaction: ReactionType | null }>();

  for (const postId of postIds) {
    reactionsByPost.set(postId, {
      summary: { like: 0, heart: 0, idea: 0, party: 0, total: 0 },
      userReaction: null,
    });
  }

  for (const reaction of reactionsData || []) {
    const postReactions = reactionsByPost.get(reaction.post_id);
    if (postReactions) {
      const type = reaction.type as ReactionType;
      if (type in postReactions.summary) {
        postReactions.summary[type]++;
        postReactions.summary.total++;
      }
      if (reaction.student_id === auth.sub) {
        postReactions.userReaction = type;
      }
    }
  }

  // 4. Transform to CommunityPost format
  const posts: CommunityPost[] = postsData.map((post: any) => {
    const student = post.students;
    const postReactions = reactionsByPost.get(post.id)!;

    return {
      id: post.id,
      studentId: post.student_id,
      content: post.content,
      imageUrl: post.image_url,
      createdAt: post.created_at,
      author: {
        id: student.id,
        firstName: student.first_name,
        lastName: student.last_name,
        avatarUrl: student.avatar_url,
        level: student.current_level,
        levelName: getLevelTitle(student.current_level),
      },
      userReaction: postReactions.userReaction,
      reactionSummary: postReactions.summary,
      commentCount: post.comment_count,
      isOwnPost: post.student_id === auth.sub,
    };
  });

  // 5. Check if there are more posts
  const hasMore = postsData.length > limit;
  if (hasMore) {
    posts.pop();
  }

  return NextResponse.json({ posts, hasMore });
}

export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return unauthorizedResponse();
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo de solicitud inválido' }, { status: 400 });
  }

  const { content, imageUrl } = body;

  // Validate content
  if (!content || typeof content !== 'string') {
    return NextResponse.json({ error: 'El contenido es requerido' }, { status: 400 });
  }

  const trimmedContent = content.trim();
  if (trimmedContent.length === 0) {
    return NextResponse.json({ error: 'El contenido no puede estar vacío' }, { status: 400 });
  }

  if (trimmedContent.length > MAX_CONTENT_LENGTH) {
    return NextResponse.json(
      { error: `El contenido no puede exceder ${MAX_CONTENT_LENGTH} caracteres` },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  // Check daily post limit
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count: postsToday } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('student_id', auth.sub)
    .gte('created_at', today.toISOString());

  if (postsToday !== null && postsToday >= MAX_POSTS_PER_DAY) {
    return NextResponse.json(
      { error: `Has alcanzado el límite de ${MAX_POSTS_PER_DAY} publicaciones por día` },
      { status: 429 }
    );
  }

  // Create post
  const { data: newPost, error: postError } = await supabase
    .from('posts')
    .insert({
      student_id: auth.sub,
      content: trimmedContent,
      image_url: imageUrl || null,
    })
    .select()
    .single();

  if (postError) {
    console.error('Error creating post:', postError);
    return NextResponse.json({ error: 'Error al crear publicación' }, { status: 500 });
  }

  // Award XP for creating post
  const { error: xpError } = await supabase.from('xp_transactions').insert({
    student_id: auth.sub,
    amount: XP_PER_POST,
    reason: 'post_created',
  });

  if (!xpError) {
    // Update student's total XP
    await supabase.rpc('increment_xp', { student_id: auth.sub, xp_amount: XP_PER_POST });
  }

  // Fetch author info for response
  const { data: student } = await supabase
    .from('students')
    .select('id, first_name, last_name, avatar_url, current_level')
    .eq('id', auth.sub)
    .single();

  const post: CommunityPost = {
    id: newPost.id,
    studentId: newPost.student_id,
    content: newPost.content,
    imageUrl: newPost.image_url,
    createdAt: newPost.created_at,
    author: {
      id: student?.id || auth.sub,
      firstName: student?.first_name || auth.first_name,
      lastName: student?.last_name || '',
      avatarUrl: student?.avatar_url,
      level: student?.current_level || 1,
      levelName: getLevelTitle(student?.current_level || 1),
    },
    userReaction: null,
    reactionSummary: { like: 0, heart: 0, idea: 0, party: 0, total: 0 },
    commentCount: 0,
    isOwnPost: true,
  };

  return NextResponse.json({ post, xpAwarded: XP_PER_POST }, { status: 201 });
}
