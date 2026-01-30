import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { createServerClient } from '@/lib/supabase/server';

const HUB_CENTRAL_API = process.env.HUB_CENTRAL_API_URL;
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
const MINI_APP_ID = 'stareduca-junior';

interface HubCentralResponse {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    dateOfBirth?: string;
    code: string;
    familyId: string;
    avatarUrl?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'Código requerido' },
        { status: 400 }
      );
    }

    // 1. Validate code against Hub Central API
    const hubResponse = await fetch(`${HUB_CENTRAL_API}/auth/mini-app-exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Mini-App-Id': MINI_APP_ID,
      },
      body: JSON.stringify({ code }),
    });

    if (!hubResponse.ok) {
      const errorData = await hubResponse.json().catch(() => ({}));
      console.error('Hub Central error:', errorData);
      return NextResponse.json(
        { error: 'Código inválido o expirado' },
        { status: 401 }
      );
    }

    const hubData: HubCentralResponse = await hubResponse.json();
    const studentData = hubData.user;

    // Verify the code is for a junior (E- prefix)
    if (!studentData.code.startsWith('E-') && !studentData.code.startsWith('STAR-JUN-')) {
      return NextResponse.json(
        { error: 'Esta app es solo para estudiantes Junior' },
        { status: 403 }
      );
    }

    // 2. Create/update student in local Supabase
    const supabase = createServerClient();

    const upsertData = {
      external_id: studentData.id,
      first_name: studentData.firstName,
      last_name: studentData.lastName,
      email: studentData.email || null,
      date_of_birth: studentData.dateOfBirth || null,
      code: studentData.code,
      family_id: studentData.familyId,
      avatar_url: studentData.avatarUrl || null,
      updated_at: new Date().toISOString(),
    };

    const { data: student, error: dbError } = await (supabase
      .from('students') as ReturnType<typeof supabase.from>)
      .upsert(upsertData, { onConflict: 'external_id' })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: 'Error al crear sesión' },
        { status: 500 }
      );
    }

    // 3. Update last activity date and potentially streak
    const today = new Date().toISOString().split('T')[0];
    const lastActivity = student.last_activity_date;

    let newStreak = student.current_streak;
    if (lastActivity !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (lastActivity === yesterdayStr) {
        // Continuing streak
        newStreak = student.current_streak + 1;
      } else if (lastActivity !== today) {
        // Streak broken
        newStreak = 1;
      }

      // Award daily login XP
      await (supabase.from('xp_transactions') as ReturnType<typeof supabase.from>)
        .insert({
          student_id: student.id,
          amount: 5,
          reason: 'daily_login',
        });

      await (supabase.from('students') as ReturnType<typeof supabase.from>)
        .update({
          last_activity_date: today,
          current_streak: newStreak,
          max_streak: Math.max(student.max_streak, newStreak),
          xp_total: student.xp_total + 5,
        })
        .eq('id', student.id);
    }

    // 4. Generate local JWT session token (1 hour)
    const token = await new SignJWT({
      sub: student.id,
      external_id: student.external_id,
      first_name: student.first_name,
      family_id: student.family_id,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(JWT_SECRET);

    // 5. Return session data
    return NextResponse.json({
      token,
      student: {
        id: student.id,
        firstName: student.first_name,
        lastName: student.last_name,
        code: student.code,
        avatarUrl: student.avatar_url,
        xpTotal: student.xp_total + (lastActivity !== today ? 5 : 0),
        currentLevel: student.current_level,
        currentStreak: newStreak,
        maxStreak: Math.max(student.max_streak, newStreak),
      },
    });
  } catch (error) {
    console.error('Auth exchange error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
