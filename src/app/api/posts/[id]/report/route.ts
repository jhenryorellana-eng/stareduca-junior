import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getAuthFromRequest, unauthorizedResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return unauthorizedResponse();
  }

  const { id: postId } = await params;
  const { reason, description, commentId } = await request.json();

  const validReasons = ['spam', 'harassment', 'inappropriate', 'misinformation', 'other'];
  if (!reason || !validReasons.includes(reason)) {
    return NextResponse.json({ error: 'Razon de reporte invalida' }, { status: 400 });
  }

  try {
    const supabase = createServerClient();

    // Check if user already reported this content
    let existingQuery = supabase
      .from('reports')
      .select('id')
      .eq('reporter_id', auth.sub);

    if (commentId) {
      existingQuery = existingQuery.eq('comment_id', commentId);
    } else {
      existingQuery = existingQuery.eq('post_id', postId);
    }

    const { data: existing } = await existingQuery.maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'Ya reportaste este contenido' }, { status: 409 });
    }

    const { error } = await supabase
      .from('reports')
      .insert({
        reporter_id: auth.sub,
        post_id: postId,
        comment_id: commentId || null,
        reason,
        description: description?.trim() || null,
      });

    if (error) {
      console.error('Error creating report:', error);
      return NextResponse.json({ error: 'Error al reportar' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Reporte enviado. Revisaremos el contenido.' });
  } catch (error) {
    console.error('Report API error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
