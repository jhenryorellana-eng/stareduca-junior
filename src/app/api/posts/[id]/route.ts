import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getAuthFromRequest, unauthorizedResponse } from '@/lib/auth';

const MAX_CONTENT_LENGTH = 500;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return unauthorizedResponse();
  }

  const { id } = await params;

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
    return NextResponse.json({ error: 'El contenido no puede estar vacío' }, { status: 400 });
  }

  if (trimmedContent.length > MAX_CONTENT_LENGTH) {
    return NextResponse.json(
      { error: `El contenido no puede exceder ${MAX_CONTENT_LENGTH} caracteres` },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  // Check post exists and belongs to user
  const { data: existingPost, error: fetchError } = await supabase
    .from('posts')
    .select('id, student_id')
    .eq('id', id)
    .single();

  if (fetchError || !existingPost) {
    return NextResponse.json({ error: 'Publicación no encontrada' }, { status: 404 });
  }

  if (existingPost.student_id !== auth.sub) {
    return NextResponse.json({ error: 'No tienes permiso para editar esta publicación' }, { status: 403 });
  }

  // Update post
  const { data: updatedPost, error: updateError } = await supabase
    .from('posts')
    .update({ content: trimmedContent })
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    console.error('Error updating post:', updateError);
    return NextResponse.json({ error: 'Error al actualizar publicación' }, { status: 500 });
  }

  return NextResponse.json({
    post: {
      id: updatedPost.id,
      content: updatedPost.content,
    },
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return unauthorizedResponse();
  }

  const { id } = await params;

  const supabase = createServerClient();

  // Check post exists and belongs to user
  const { data: existingPost, error: fetchError } = await supabase
    .from('posts')
    .select('id, student_id')
    .eq('id', id)
    .single();

  if (fetchError || !existingPost) {
    return NextResponse.json({ error: 'Publicación no encontrada' }, { status: 404 });
  }

  if (existingPost.student_id !== auth.sub) {
    return NextResponse.json({ error: 'No tienes permiso para eliminar esta publicación' }, { status: 403 });
  }

  // Delete reactions first (cascade)
  await supabase.from('reactions').delete().eq('post_id', id);

  // Delete comments (cascade)
  await supabase.from('comments').delete().eq('post_id', id);

  // Delete post
  const { error: deleteError } = await supabase.from('posts').delete().eq('id', id);

  if (deleteError) {
    console.error('Error deleting post:', deleteError);
    return NextResponse.json({ error: 'Error al eliminar publicación' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
