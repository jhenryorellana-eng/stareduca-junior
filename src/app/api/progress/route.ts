import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthFromRequest, unauthorizedResponse } from '@/lib/auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    const studentId = auth.sub;

    const body = await request.json();
    const { lessonId, courseId, watchTimeSeconds, isCompleted, markCourseCompleted } = body;

    // Use service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle marking course as completed (from exam pass)
    if (markCourseCompleted && courseId) {
      const { error: updateError } = await supabase
        .from('enrollments')
        .update({
          status: 'completed',
          progress_percent: 100,
          completed_at: new Date().toISOString(),
        })
        .eq('student_id', studentId)
        .eq('course_id', courseId);

      if (updateError) {
        console.error('Error marking course as completed:', updateError);
        return NextResponse.json(
          { error: 'Failed to mark course as completed' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        courseCompleted: true,
      });
    }

    if (!lessonId || !courseId) {
      return NextResponse.json(
        { error: 'lessonId and courseId are required' },
        { status: 400 }
      );
    }

    // Upsert lesson_progress
    const progressData: {
      student_id: string;
      lesson_id: string;
      watch_time_seconds: number;
      is_completed?: boolean;
      completed_at?: string;
    } = {
      student_id: studentId,
      lesson_id: lessonId,
      watch_time_seconds: watchTimeSeconds || 0,
    };

    if (isCompleted) {
      progressData.is_completed = true;
      progressData.completed_at = new Date().toISOString();
    }

    const { data: lessonProgress, error: progressError } = await supabase
      .from('lesson_progress')
      .upsert(progressData, {
        onConflict: 'student_id,lesson_id',
      })
      .select()
      .single();

    if (progressError) {
      console.error('Error saving lesson progress:', progressError);
      return NextResponse.json(
        { error: 'Failed to save progress' },
        { status: 500 }
      );
    }

    // If lesson is completed, handle XP and course progress
    if (isCompleted) {
      // Check if this is the first time completing (avoid duplicate XP)
      const { data: existingProgress } = await supabase
        .from('lesson_progress')
        .select('is_completed')
        .eq('student_id', studentId)
        .eq('lesson_id', lessonId)
        .single();

      // Award XP for lesson completion (only if not already completed)
      // The XP will be awarded via the gamification API
      // We'll handle this on the client side with the XpToast

      // Update enrollment progress_percent
      // First, get total lessons in this course
      const { data: lessons } = await supabase
        .from('lessons')
        .select('id')
        .eq('course_id', courseId);

      const totalLessons = lessons?.length || 0;

      // Get completed lessons for this student in this course
      const lessonIds = lessons?.map((l) => l.id) || [];
      const { data: completedLessons } = await supabase
        .from('lesson_progress')
        .select('id')
        .eq('student_id', studentId)
        .eq('is_completed', true)
        .in('lesson_id', lessonIds);

      const completedCount = completedLessons?.length || 0;
      const progressPercent = totalLessons > 0
        ? Math.round((completedCount / totalLessons) * 100)
        : 0;

      // Update or create enrollment
      const { data: enrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('student_id', studentId)
        .eq('course_id', courseId)
        .single();

      let isNewEnrollment = false;
      if (enrollment) {
        await supabase
          .from('enrollments')
          .update({ progress_percent: progressPercent })
          .eq('id', enrollment.id);
      } else {
        await supabase.from('enrollments').insert({
          student_id: studentId,
          course_id: courseId,
          progress_percent: progressPercent,
          status: 'active',
        });
        isNewEnrollment = true;
      }

      return NextResponse.json({
        success: true,
        lessonProgress,
        courseProgress: progressPercent,
        isNewCompletion: true,
        isNewEnrollment,
        completedCount,
        totalLessons,
      });
    }

    return NextResponse.json({
      success: true,
      lessonProgress,
    });
  } catch (error) {
    console.error('Progress API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    const studentId = auth.sub;

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');

    if (!courseId) {
      return NextResponse.json(
        { error: 'courseId is required' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get lessons for this course
    const { data: lessons } = await supabase
      .from('lessons')
      .select('id')
      .eq('course_id', courseId);

    const lessonIds = lessons?.map((l) => l.id) || [];

    // Get progress for all lessons in this course
    const { data: progressData } = await supabase
      .from('lesson_progress')
      .select('lesson_id, is_completed, watch_time_seconds')
      .eq('student_id', studentId)
      .in('lesson_id', lessonIds);

    // Get enrollment
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('progress_percent, status')
      .eq('student_id', studentId)
      .eq('course_id', courseId)
      .single();

    // Get exam for this course
    const { data: exam } = await supabase
      .from('exams')
      .select('id')
      .eq('course_id', courseId)
      .eq('is_active', true)
      .single();

    let examResult = null;
    if (exam) {
      const { data: result } = await supabase
        .from('exam_results')
        .select('id, score, passed, completed_at')
        .eq('student_id', studentId)
        .eq('exam_id', exam.id)
        .order('completed_at', { ascending: false })
        .limit(1)
        .single();

      examResult = result;
    }

    return NextResponse.json({
      lessonProgress: progressData || [],
      enrollment: enrollment || null,
      examResult: examResult || null,
    });
  } catch (error) {
    console.error('Progress GET API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
