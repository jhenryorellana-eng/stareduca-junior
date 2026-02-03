import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getAuthFromRequest, unauthorizedResponse } from '@/lib/auth';

// Forzar que esta ruta sea dinámica y sin cache
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const enrolled = searchParams.get('enrolled') === 'true';

  const supabase = createServerClient();

  try {
    // 1. Obtener cursos
    let query = supabase
      .from('courses')
      .select('id, title, slug, description, thumbnail_url, category, xp_reward, is_published, created_at')
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }

    const { data: coursesData, error: coursesError } = await query;

    if (coursesError) {
      console.error('Error fetching courses:', coursesError);
      return NextResponse.json({ error: 'Error al obtener cursos', details: coursesError.message }, { status: 500 });
    }

    if (!coursesData || coursesData.length === 0) {
      console.log('No courses found');
      return NextResponse.json({ courses: [] });
    }

    console.log(`Found ${coursesData.length} courses`);

    // 2. Obtener módulos
    const { data: modulesData, error: modulesError } = await supabase
      .from('modules')
      .select('id, course_id');

    if (modulesError) {
      console.error('Error fetching modules:', modulesError);
    } else {
      console.log(`Found ${modulesData?.length || 0} modules`);
    }

    // 3. Obtener lecciones
    const { data: lessonsData, error: lessonsError } = await supabase
      .from('lessons')
      .select('id, module_id, duration_minutes');

    if (lessonsError) {
      console.error('Error fetching lessons:', lessonsError);
    } else {
      console.log(`Found ${lessonsData?.length || 0} lessons`);
    }

    // 4. Crear mapa de lecciones por curso (con IDs para calcular progreso)
    const lessonsByCourse = new Map<string, { count: number; totalDuration: number; lessonIds: string[] }>();

    if (modulesData && lessonsData) {
      for (const mod of modulesData) {
        const moduleLessons = lessonsData.filter((l: any) => l.module_id === mod.id);
        const current = lessonsByCourse.get(mod.course_id) || { count: 0, totalDuration: 0, lessonIds: [] };
        current.count += moduleLessons.length;
        current.totalDuration += moduleLessons.reduce((sum: number, l: any) => sum + (l.duration_minutes || 0), 0);
        current.lessonIds.push(...moduleLessons.map((l: any) => l.id));
        lessonsByCourse.set(mod.course_id, current);
      }
    }

    // 4b. Obtener progreso real de lecciones del estudiante
    const { data: lessonProgressData } = await supabase
      .from('lesson_progress')
      .select('lesson_id')
      .eq('student_id', auth.sub)
      .eq('is_completed', true);

    console.log(`[COURSES API] student_id: ${auth.sub}`);
    console.log(`[COURSES API] Completed lessons: ${lessonProgressData?.length || 0}`,
      (lessonProgressData || []).map((p: any) => p.lesson_id));

    const completedLessonIds = new Set(
      (lessonProgressData || []).map((p: any) => p.lesson_id)
    );

    // 5. Obtener enrollments
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('enrollments')
      .select('course_id, progress_percent, status')
      .eq('student_id', auth.sub);

    if (enrollmentsError) {
      console.error('Error fetching enrollments:', enrollmentsError);
    }

    // Filtrar enrollments solo para cursos que existen (evitar mostrar cursos eliminados)
    const validCourseIds = new Set(coursesData.map((c: any) => c.id));
    const validEnrollments = (enrollments || []).filter((e: any) => validCourseIds.has(e.course_id));

    console.log(`Total enrollments: ${enrollments?.length || 0}, Valid enrollments (courses exist): ${validEnrollments.length}`);

    const enrollmentMap = new Map(
      validEnrollments.map((e: any) => [e.course_id, e])
    );

    // Mapa de duración por lección (para calcular completedDuration)
    const lessonDurationMap = new Map(
      (lessonsData || []).map((l: any) => [l.id, l.duration_minutes || 0])
    );

    // 6. Combinar datos
    const result = coursesData.map((course: any) => {
      const enrollment = enrollmentMap.get(course.id);
      const lessonInfo = lessonsByCourse.get(course.id) || { count: 0, totalDuration: 0, lessonIds: [] };

      // Calcular progreso real desde lesson_progress (no usar valor cacheado de enrollments)
      const completedInCourse = lessonInfo.lessonIds.filter(id => completedLessonIds.has(id)).length;
      const progressPercent = lessonInfo.count > 0
        ? Math.round((completedInCourse / lessonInfo.count) * 100)
        : 0;
      const isCompleted = progressPercent >= 100 || enrollment?.status === 'completed';

      // Duración de lecciones completadas en este curso
      const completedDuration = lessonInfo.lessonIds
        .filter(id => completedLessonIds.has(id))
        .reduce((sum, id) => sum + (lessonDurationMap.get(id) || 0), 0);

      console.log(`[COURSES API] Course "${course.title}": ${completedInCourse}/${lessonInfo.count} = ${progressPercent}%`);

      return {
        id: course.id,
        title: course.title,
        slug: course.slug,
        description: course.description,
        thumbnailUrl: course.thumbnail_url,
        category: course.category,
        xpReward: course.xp_reward,
        totalDuration: lessonInfo.totalDuration,
        completedDuration,
        lessonsCount: lessonInfo.count,
        isEnrolled: !!enrollment || completedInCourse > 0,
        progressPercent,
        enrollmentStatus: enrollment?.status || null,
        isCompleted,
      };
    });

    // Log detallado para debugging
    console.log('Courses result:', result.map((c: any) => ({
      id: c.id,
      title: c.title,
      isEnrolled: c.isEnrolled,
      isCompleted: c.isCompleted,
      progressPercent: c.progressPercent
    })));

    // Filtrar por enrolled si se solicita
    const filteredResult = enrolled ? result.filter((c: any) => c.isEnrolled) : result;

    console.log(`Returning ${filteredResult.length} courses (enrolled filter: ${enrolled})`);

    const response = NextResponse.json({ courses: filteredResult });
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return response;

  } catch (error: any) {
    console.error('Unexpected error in courses API:', error);
    return NextResponse.json({ error: 'Error interno del servidor', details: error.message }, { status: 500 });
  }
}
