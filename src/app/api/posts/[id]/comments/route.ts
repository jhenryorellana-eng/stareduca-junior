import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getAuthFromRequest, unauthorizedResponse } from '@/lib/auth';
import { getLevelTitle } from '@/lib/utils';
import type { CommunityComment } from '@/types';

const COMMENTS_PER_PAGE = 20;
const MAX_COMMENT_LENGTH = 300;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return unauthorizedResponse();
  }

  const { id: postId } = await params;
  const { searchParams } = new URL(request.url);
  const offset = parseInt(searchParams.get('offset') || '0', 10);
  const limit = Math.min(parseInt(searchParams.get('limit') || String(COMMENTS_PER_PAGE), 10), 50);

  const supabase = createServerClient();

  // Verify post exists
  const { data: post } = await supabase.from('posts').select('id').eq('id', postId).single();

  if (!post) {
    return NextResponse.json({ error: 'Publicación no encontrada' }, { status: 404 });
  }

  // Fetch comments with author info (explicit FK)
  const { data: commentsData, error: commentsError } = await supabase
    .from('comments')
    .select(`
      id,
      post_id,
      content,
      created_at,
      students!comments_student_id_fkey (
        id,
        first_name,
        last_name,
        avatar_url,
        current_level
      )
    `)
    .eq('post_id', postId)
    .is('parent_id', null)
    .order('created_at', { ascending: true })
    .range(offset, offset + limit);

  if (commentsError) {
    console.error('Error fetching comments:', commentsError);
    return NextResponse.json({ error: 'Error al obtener comentarios' }, { status: 500 });
  }

  const comments: CommunityComment[] = (commentsData || []).map((comment: any) => {
    const student = comment.students;
    return {
      id: comment.id,
      postId: comment.post_id,
      content: comment.content,
      createdAt: comment.created_at,
      author: {
        id: student.id,
        firstName: student.first_name,
        lastName: student.last_name,
        avatarUrl: student.avatar_url,
        level: student.current_level,
        levelName: getLevelTitle(student.current_level),
      },
    };
  });

  const hasMore = commentsData && commentsData.length > limit;
  if (hasMore) {
    comments.pop();
  }

  return NextResponse.json({ comments, hasMore });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return unauthorizedResponse();
  }

  const { id: postId } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo de solicitud inválido' }, { status: 400 });
  }

  const { content } = body;

  // Validate content
  if (!content || typeof content !== 'string') {
    return NextResponse.json({ error: 'El contenido es requerido' }, { status: 400 });
  }

  const trimmedContent = content.trim();
  if (trimmedContent.length === 0) {
    return NextResponse.json({ error: 'El comentario no puede estar vacío' }, { status: 400 });
  }

  if (trimmedContent.length > MAX_COMMENT_LENGTH) {
    return NextResponse.json(
      { error: `El comentario no puede exceder ${MAX_COMMENT_LENGTH} caracteres` },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  // Verify post exists and get owner
  const { data: post } = await supabase
    .from('posts')
    .select('id, student_id')
    .eq('id', postId)
    .single();

  if (!post) {
    return NextResponse.json({ error: 'Publicación no encontrada' }, { status: 404 });
  }

  // Create comment
  const { data: newComment, error: commentError } = await supabase
    .from('comments')
    .insert({
      post_id: postId,
      student_id: auth.sub,
      content: trimmedContent,
    })
    .select()
    .single();

  if (commentError) {
    console.error('Error creating comment:', commentError);
    return NextResponse.json({ error: 'Error al crear comentario' }, { status: 500 });
  }

  // Update comment count on post
  await supabase.rpc('increment_comment_count', { post_id: postId });

  // Fetch author info for response
  const { data: student } = await supabase
    .from('students')
    .select('id, first_name, last_name, avatar_url, current_level')
    .eq('id', auth.sub)
    .single();

  const comment: CommunityComment = {
    id: newComment.id,
    postId: newComment.post_id,
    content: newComment.content,
    createdAt: newComment.created_at,
    author: {
      id: student?.id || auth.sub,
      firstName: student?.first_name || auth.first_name,
      lastName: student?.last_name || '',
      avatarUrl: student?.avatar_url,
      level: student?.current_level || 1,
      levelName: getLevelTitle(student?.current_level || 1),
    },
  };

  // Create notification for post owner (if commenter is not the owner)
  if (post.student_id !== auth.sub) {
    const firstName = student?.first_name || auth.first_name;
    const lastName = student?.last_name || '';

    await supabase.from('notifications').insert({
      student_id: post.student_id,
      type: 'comment',
      title: 'Nuevo comentario',
      message: `${firstName} ${lastName} comentó en tu publicación`,
      data: { postId, commentId: newComment.id },
    });
  }

  return NextResponse.json({ comment }, { status: 201 });
}
