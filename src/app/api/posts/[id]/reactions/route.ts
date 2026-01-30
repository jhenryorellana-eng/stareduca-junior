import { NextRequest, NextResponse } from 'next/server';
import { createUntypedServerClient } from '@/lib/supabase/server';
import { getAuthFromRequest, unauthorizedResponse } from '@/lib/auth';
import { getLevelTitle } from '@/lib/utils';
import type { ReactionDetail, ReactionSummary, ReactionType } from '@/types';

const VALID_REACTION_TYPES: ReactionType[] = ['like', 'heart', 'idea', 'party'];

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
  const typeFilter = searchParams.get('type') as ReactionType | null;

  const supabase = createUntypedServerClient();

  // Verify post exists
  const { data: post } = await supabase.from('posts').select('id').eq('id', postId).single();

  if (!post) {
    return NextResponse.json({ error: 'Publicación no encontrada' }, { status: 404 });
  }

  // Build query (explicit FK)
  let query = supabase
    .from('reactions')
    .select(`
      student_id,
      type,
      students!reactions_student_id_fkey (
        id,
        first_name,
        last_name,
        avatar_url,
        current_level
      )
    `)
    .eq('post_id', postId);

  if (typeFilter && VALID_REACTION_TYPES.includes(typeFilter)) {
    query = query.eq('type', typeFilter);
  }

  const { data: reactionsData, error: reactionsError } = await query;

  if (reactionsError) {
    console.error('Error fetching reactions:', reactionsError);
    return NextResponse.json({ error: 'Error al obtener reacciones' }, { status: 500 });
  }

  // Calculate summary
  const summary: ReactionSummary = { like: 0, heart: 0, idea: 0, party: 0, total: 0 };

  const reactions: ReactionDetail[] = (reactionsData || []).map((reaction: any) => {
    const student = reaction.students;
    const type = reaction.type as ReactionType;

    // Update summary
    if (type in summary) {
      summary[type]++;
      summary.total++;
    }

    return {
      studentId: student.id,
      firstName: student.first_name,
      lastName: student.last_name,
      avatarUrl: student.avatar_url,
      level: student.current_level,
      levelName: getLevelTitle(student.current_level),
      type,
    };
  });

  return NextResponse.json({ reactions, summary });
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

  const { type } = body;

  // Validate reaction type
  if (!type || !VALID_REACTION_TYPES.includes(type)) {
    return NextResponse.json(
      { error: `Tipo de reacción inválido. Use: ${VALID_REACTION_TYPES.join(', ')}` },
      { status: 400 }
    );
  }

  const supabase = createUntypedServerClient();

  // Verify post exists and get owner
  const { data: post } = await supabase
    .from('posts')
    .select('id, student_id')
    .eq('id', postId)
    .single();

  if (!post) {
    return NextResponse.json({ error: 'Publicación no encontrada' }, { status: 404 });
  }

  // Check existing reaction
  const { data: existingReaction } = await supabase
    .from('reactions')
    .select('type')
    .eq('post_id', postId)
    .eq('student_id', auth.sub)
    .single();

  if (existingReaction) {
    // Update existing reaction (UPSERT behavior)
    const { error: updateError } = await supabase
      .from('reactions')
      .update({ type })
      .eq('post_id', postId)
      .eq('student_id', auth.sub);

    if (updateError) {
      console.error('Error updating reaction:', updateError);
      return NextResponse.json({ error: 'Error al actualizar reacción' }, { status: 500 });
    }
  } else {
    // Insert new reaction
    const { error: insertError } = await supabase.from('reactions').insert({
      post_id: postId,
      student_id: auth.sub,
      type,
    });

    if (insertError) {
      console.error('Error creating reaction:', insertError);
      return NextResponse.json({ error: 'Error al crear reacción' }, { status: 500 });
    }

    // Update reaction count on post
    await supabase.rpc('increment_reaction_count', { post_id: postId });

    // Create notification for post owner (only for new reactions, not updates)
    if (post.student_id !== auth.sub) {
      // Get reactor info
      const { data: student } = await supabase
        .from('students')
        .select('first_name, last_name')
        .eq('id', auth.sub)
        .single();

      const firstName = student?.first_name || auth.first_name;
      const lastName = student?.last_name || '';

      await supabase.from('notifications').insert({
        student_id: post.student_id,
        type: 'reaction',
        title: 'Nueva reacción',
        message: `${firstName} ${lastName} reaccionó a tu publicación`,
        data: { postId, reactionType: type },
      });
    }
  }

  return NextResponse.json({ type }, { status: existingReaction ? 200 : 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return unauthorizedResponse();
  }

  const { id: postId } = await params;

  const supabase = createUntypedServerClient();

  // Check existing reaction
  const { data: existingReaction } = await supabase
    .from('reactions')
    .select('type')
    .eq('post_id', postId)
    .eq('student_id', auth.sub)
    .single();

  if (!existingReaction) {
    return NextResponse.json({ error: 'No has reaccionado a esta publicación' }, { status: 404 });
  }

  // Delete reaction
  const { error: deleteError } = await supabase
    .from('reactions')
    .delete()
    .eq('post_id', postId)
    .eq('student_id', auth.sub);

  if (deleteError) {
    console.error('Error deleting reaction:', deleteError);
    return NextResponse.json({ error: 'Error al eliminar reacción' }, { status: 500 });
  }

  // Decrement reaction count on post
  await supabase.rpc('decrement_reaction_count', { post_id: postId });

  return NextResponse.json({ success: true });
}
