import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getAuthFromRequest, unauthorizedResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Block a user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return unauthorizedResponse();
  }

  const { id: blockedId } = await params;

  if (auth.sub === blockedId) {
    return NextResponse.json({ error: 'No puedes bloquearte a ti mismo' }, { status: 400 });
  }

  try {
    const supabase = createServerClient();

    const { error } = await supabase
      .from('blocked_users')
      .upsert({
        blocker_id: auth.sub,
        blocked_id: blockedId,
      }, { onConflict: 'blocker_id,blocked_id' });

    if (error) {
      console.error('Error blocking user:', error);
      return NextResponse.json({ error: 'Error al bloquear usuario' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Block API error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// Unblock a user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return unauthorizedResponse();
  }

  const { id: blockedId } = await params;

  try {
    const supabase = createServerClient();

    const { error } = await supabase
      .from('blocked_users')
      .delete()
      .eq('blocker_id', auth.sub)
      .eq('blocked_id', blockedId);

    if (error) {
      console.error('Error unblocking user:', error);
      return NextResponse.json({ error: 'Error al desbloquear' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unblock API error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
