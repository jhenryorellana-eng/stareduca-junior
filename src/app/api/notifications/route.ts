import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthFromRequest, unauthorizedResponse } from '@/lib/auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface NotificationData {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  data: unknown;
  created_at: string;
}

// GET /api/notifications - Get student's notifications
export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '20');
  const unreadOnly = searchParams.get('unread') === 'true';

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let query = (supabase.from('notifications') as ReturnType<typeof supabase.from>)
    .select('*')
    .eq('student_id', auth.sub)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (unreadOnly) {
    query = query.eq('is_read', false);
  }

  const { data: notificationsData, error } = await query;
  const notifications = notificationsData as NotificationData[] | null;

  if (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Error al obtener notificaciones' }, { status: 500 });
  }

  // Get unread count
  const { count: unreadCount } = await (supabase
    .from('notifications') as ReturnType<typeof supabase.from>)
    .select('id', { count: 'exact', head: true })
    .eq('student_id', auth.sub)
    .eq('is_read', false);

  const formattedNotifications = (notifications || []).map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    isRead: n.is_read,
    data: n.data,
    createdAt: n.created_at,
  }));

  return NextResponse.json({
    notifications: formattedNotifications,
    unreadCount: unreadCount || 0,
  });
}

// PATCH /api/notifications - Mark notifications as read
export async function PATCH(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return unauthorizedResponse();
  }

  const body = await request.json();
  const { notificationIds, markAll } = body;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  if (markAll) {
    // Mark all as read
    const { error } = await (supabase
      .from('notifications') as ReturnType<typeof supabase.from>)
      .update({ is_read: true })
      .eq('student_id', auth.sub)
      .eq('is_read', false);

    if (error) {
      console.error('Error marking notifications as read:', error);
      return NextResponse.json({ error: 'Error al marcar notificaciones' }, { status: 500 });
    }
  } else if (notificationIds?.length > 0) {
    // Mark specific notifications as read
    const { error } = await (supabase
      .from('notifications') as ReturnType<typeof supabase.from>)
      .update({ is_read: true })
      .eq('student_id', auth.sub)
      .in('id', notificationIds);

    if (error) {
      console.error('Error marking notifications as read:', error);
      return NextResponse.json({ error: 'Error al marcar notificaciones' }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
