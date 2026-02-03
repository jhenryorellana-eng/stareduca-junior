import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getAuthFromRequest, unauthorizedResponse } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const enrolled = searchParams.get('enrolled') === 'true';

  const supabase = createServerClient();

  // 1. Obtener cursos CON módulos y lecciones (courses → modules → lessons)
  let query = supabase
    .from('courses')
    .select(`
      id,
      title,
      slug,
      description,
      thumbnail_url,
      category,
      xp_reward,
      is_published,
      created_at,
      modules(
        lessons(id, duration_minutes)
      )
    `)
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  if (category) {
    query = query.eq('category', category);
  }

  const { data: coursesData, error: coursesError } = await query;

  if (coursesError || !coursesData) {
    console.error('Error fetching courses:', coursesError);
    return NextResponse.json({ error: 'Error al obtener cursos' }, { status: 500 });
  }

  // 2. Obtener TODOS los enrollments del estudiante en UNA query
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('course_id, progress_percent, status')
    .eq('student_id', auth.sub);

  const enrollmentMap = new Map(
    enrollments?.map((e: any) => [e.course_id, e]) || []
  );

  // 3. Combinar datos con duración calculada y isCompleted
  let result = coursesData.map((course: any) => {
    const enrollment = enrollmentMap.get(course.id);
    // Extraer lecciones de todos los módulos (courses → modules → lessons)
    const modules = course.modules || [];
    const lessons = modules.flatMap((m: any) => m.lessons || []);
    const totalDuration = lessons.reduce((sum: number, l: any) => sum + (l.duration_minutes || 0), 0);
    const lessonsCount = lessons.length;

    // FIX: Considerar completed si progress >= 100 O status === 'completed'
    const progressPercent = enrollment?.progress_percent || 0;
    const isCompleted = progressPercent >= 100 || enrollment?.status === 'completed';

    return {
      id: course.id,
      title: course.title,
      slug: course.slug,
      description: course.description,
      thumbnailUrl: course.thumbnail_url,
      category: course.category,
      xpReward: course.xp_reward,
      totalDuration,
      lessonsCount,
      isEnrolled: !!enrollment,
      progressPercent,
      enrollmentStatus: enrollment?.status || null,
      isCompleted,
    };
  });

  // Filter by enrolled if requested
  if (enrolled) {
    result = result.filter((c: any) => c.isEnrolled);
  }

  return NextResponse.json({ courses: result });
}
