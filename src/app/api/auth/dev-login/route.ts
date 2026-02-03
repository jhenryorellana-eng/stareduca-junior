import { NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { createServerClient } from '@/lib/supabase/server';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

// Estudiante de prueba para desarrollo (valores iniciales para nuevo estudiante)
const DEV_STUDENT = {
  external_id: 'dev-student-001',
  first_name: 'Estudiante',
  last_name: 'Demo',
  email: 'demo@stareduca.dev',
  code: 'E-DEV00001',
  family_id: 'dev-family-001',
};

export async function POST(request: Request) {
  // Solo permitir en localhost (desarrollo local)
  const host = request.headers.get('host') || '';
  const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');

  if (!isLocalhost) {
    return NextResponse.json(
      { error: 'Dev login solo disponible en localhost' },
      { status: 403 }
    );
  }

  try {
    const supabase = createServerClient();

    // Primero intentar obtener estudiante existente
    const { data: existingStudent } = await (supabase
      .from('students') as ReturnType<typeof supabase.from>)
      .select('*')
      .eq('external_id', DEV_STUDENT.external_id)
      .single();

    let student = existingStudent;

    // Si no existe, crear nuevo estudiante con valores iniciales
    if (!existingStudent) {
      const { data: newStudent, error: createError } = await (supabase
        .from('students') as ReturnType<typeof supabase.from>)
        .insert({
          external_id: DEV_STUDENT.external_id,
          first_name: DEV_STUDENT.first_name,
          last_name: DEV_STUDENT.last_name,
          email: DEV_STUDENT.email,
          code: DEV_STUDENT.code,
          family_id: DEV_STUDENT.family_id,
          xp_total: 0,
          current_level: 1,
          current_streak: 0,
          max_streak: 0,
          last_activity_date: new Date().toISOString().split('T')[0],
        })
        .select()
        .single();

      if (createError) {
        console.error('Database error:', createError);
        return NextResponse.json(
          { error: 'Error al crear sesión de desarrollo' },
          { status: 500 }
        );
      }
      student = newStudent;
    } else {
      // Actualizar fecha de última actividad
      await (supabase
        .from('students') as ReturnType<typeof supabase.from>)
        .update({
          last_activity_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingStudent.id);
    }

    if (!student) {
      return NextResponse.json(
        { error: 'Error al obtener estudiante' },
        { status: 500 }
      );
    }

    // Generar JWT de sesión (7 días para desarrollo)
    const token = await new SignJWT({
      sub: student.id,
      external_id: student.external_id,
      first_name: student.first_name,
      family_id: student.family_id,
      dev: true, // Marcar como sesión de desarrollo
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(JWT_SECRET);

    return NextResponse.json({
      token,
      student: {
        id: student.id,
        firstName: student.first_name,
        lastName: student.last_name,
        code: student.code,
        avatarUrl: student.avatar_url,
        xpTotal: student.xp_total,
        currentLevel: student.current_level,
        currentStreak: student.current_streak,
        maxStreak: student.max_streak,
      },
    });
  } catch (error) {
    console.error('Dev login error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
