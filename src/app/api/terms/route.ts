import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getAuthFromRequest, unauthorizedResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Check if user has accepted terms
export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return unauthorizedResponse();
  }

  try {
    const supabase = createServerClient();

    // Note: parent_id column is used for both parents and students (generic user_id)
    // The table was created for stareduca-senior and reused here with student IDs
    const { data } = await supabase
      .from('terms_acceptance')
      .select('accepted_at, version')
      .eq('parent_id', auth.sub)
      .maybeSingle();

    return NextResponse.json({
      accepted: !!data,
      acceptedAt: data?.accepted_at || null,
      version: data?.version || null,
    });
  } catch (error) {
    console.error('Terms status error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// Accept terms
export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return unauthorizedResponse();
  }

  try {
    const supabase = createServerClient();

    // Note: parent_id stores student ID here (generic user_id column)
    const { error } = await supabase
      .from('terms_acceptance')
      .upsert({
        parent_id: auth.sub,
        version: '1.0',
        accepted_at: new Date().toISOString(),
      }, { onConflict: 'parent_id' });

    if (error) {
      console.error('Error accepting terms:', error);
      return NextResponse.json({ error: 'Error al aceptar terminos' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Accept terms error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
