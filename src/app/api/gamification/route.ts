import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthFromRequest, unauthorizedResponse } from '@/lib/auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface StudentData {
  xp_total: number;
  current_level: number;
  current_streak: number;
  max_streak: number;
}

interface BadgeData {
  earned_at: string;
  badges: {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: string;
    rarity: string;
  };
}

// Level thresholds - must match user-store.ts
const LEVEL_THRESHOLDS = [
  { level: 1, name: 'Novato', minXp: 0 },
  { level: 2, name: 'Aprendiz', minXp: 100 },
  { level: 3, name: 'Curioso', minXp: 250 },
  { level: 4, name: 'Estudiante', minXp: 450 },
  { level: 5, name: 'Explorador', minXp: 750 },
  { level: 6, name: 'Explorador II', minXp: 1150 },
  { level: 7, name: 'Explorador III', minXp: 1650 },
  { level: 8, name: 'Aventurero', minXp: 2250 },
  { level: 9, name: 'Aventurero II', minXp: 3000 },
  { level: 10, name: 'Constructor', minXp: 4000 },
  { level: 11, name: 'Constructor II', minXp: 5250 },
  { level: 12, name: 'Constructor III', minXp: 6750 },
  { level: 13, name: 'Arquitecto', minXp: 8500 },
  { level: 14, name: 'Arquitecto II', minXp: 10500 },
  { level: 15, name: 'Innovador', minXp: 13000 },
  { level: 16, name: 'Innovador II', minXp: 16000 },
  { level: 17, name: 'Innovador III', minXp: 19500 },
  { level: 18, name: 'Visionario', minXp: 23500 },
  { level: 19, name: 'Visionario II', minXp: 28000 },
  { level: 20, name: 'Líder', minXp: 33000 },
  { level: 21, name: 'Líder II', minXp: 39000 },
  { level: 22, name: 'Líder III', minXp: 46000 },
  { level: 23, name: 'Estratega', minXp: 54000 },
  { level: 24, name: 'Estratega II', minXp: 63000 },
  { level: 25, name: 'CEO Junior', minXp: 75000 },
  { level: 26, name: 'CEO Junior Elite', minXp: 90000 },
  { level: 27, name: 'CEO Junior Master', minXp: 110000 },
  { level: 28, name: 'CEO Junior Legend', minXp: 140000 },
  { level: 29, name: 'CEO Junior Champion', minXp: 180000 },
  { level: 30, name: 'Fundador', minXp: 230000 },
];

function calculateLevel(xpTotal: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xpTotal >= LEVEL_THRESHOLDS[i].minXp) {
      return LEVEL_THRESHOLDS[i].level;
    }
  }
  return 1;
}

function getLevelName(level: number): string {
  const levelData = LEVEL_THRESHOLDS.find(l => l.level === level);
  return levelData?.name || 'Novato';
}

// GET /api/gamification - Get student's gamification data
export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return unauthorizedResponse();
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Get student data
  const { data: studentData, error: studentError } = await (supabase
    .from('students') as ReturnType<typeof supabase.from>)
    .select('xp_total, current_level, current_streak, max_streak')
    .eq('id', auth.sub)
    .single();

  const student = studentData as StudentData | null;

  if (studentError || !student) {
    console.error('Error fetching student:', studentError);
    return NextResponse.json({ error: 'Error al obtener datos' }, { status: 500 });
  }

  // Get recent XP transactions
  const { data: recentXp } = await (supabase
    .from('xp_transactions') as ReturnType<typeof supabase.from>)
    .select('amount, reason, created_at')
    .eq('student_id', auth.sub)
    .order('created_at', { ascending: false })
    .limit(10);

  // Get student exam badges (earned by passing exams at 100%)
  const { data: examBadgesData } = await (supabase
    .from('student_exam_badges') as ReturnType<typeof supabase.from>)
    .select('id, badge_icon, badge_name, badge_color, earned_at')
    .eq('student_id', auth.sub)
    .order('earned_at', { ascending: false });

  const formattedBadges = (examBadgesData || []).map((b: any) => ({
    id: b.id,
    icon: b.badge_icon,
    name: b.badge_name,
    color: b.badge_color,
    earnedAt: b.earned_at,
  }));

  return NextResponse.json({
    xpTotal: student.xp_total,
    currentLevel: student.current_level,
    currentStreak: student.current_streak,
    maxStreak: student.max_streak,
    recentXp: recentXp || [],
    badges: formattedBadges,
  });
}

// POST /api/gamification - Award XP
export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return unauthorizedResponse();
  }

  const body = await request.json();
  const { amount, reason, referenceId } = body;

  if (!amount || !reason) {
    return NextResponse.json(
      { error: 'Se requiere amount y reason' },
      { status: 400 }
    );
  }

  // Validate XP amounts based on reason
  const validReasons: Record<string, number | boolean> = {
    lesson_complete: true, // Variable amount based on lesson.xp_reward
    course_complete: true, // Variable amount based on course.xp_reward
    course_start: 10,
    material_view: 5,
    exam_passed: 100,
    exam_good: 125,
    exam_great: 150,
    exam_perfect: 200,
    daily_login: 5,
    post_created: 10,
    streak_bonus: 50,
  };

  if (!validReasons[reason]) {
    return NextResponse.json({ error: 'Razón inválida' }, { status: 400 });
  }

  // Limit post XP to 3 per day
  if (reason === 'post_created') {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const today = new Date().toISOString().split('T')[0];

    const { count } = await (supabase
      .from('xp_transactions') as ReturnType<typeof supabase.from>)
      .select('id', { count: 'exact', head: true })
      .eq('student_id', auth.sub)
      .eq('reason', 'post_created')
      .gte('created_at', `${today}T00:00:00Z`);

    if ((count || 0) >= 3) {
      return NextResponse.json(
        { error: 'Límite diario de XP por posts alcanzado', limited: true },
        { status: 429 }
      );
    }
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Create XP transaction
  const { error: xpError } = await (supabase
    .from('xp_transactions') as ReturnType<typeof supabase.from>)
    .insert({
      student_id: auth.sub,
      amount,
      reason,
      reference_id: referenceId || null,
    });

  if (xpError) {
    console.error('Error creating XP transaction:', xpError);
    return NextResponse.json({ error: 'Error al registrar XP' }, { status: 500 });
  }

  // Get current student data including streak info
  const { data: currentStudentData } = await (supabase
    .from('students') as ReturnType<typeof supabase.from>)
    .select('xp_total, current_streak, max_streak, last_activity_date')
    .eq('id', auth.sub)
    .single();

  const currentStudent = currentStudentData as {
    xp_total: number;
    current_streak: number;
    max_streak: number;
    last_activity_date: string | null;
  } | null;

  let leveledUp = false;
  let newLevel = 0;
  let oldLevel = 0;
  let newStreak = 0;
  let newMaxStreak = 0;

  if (currentStudent) {
    const oldXp = currentStudent.xp_total;
    const newXp = oldXp + amount;
    oldLevel = calculateLevel(oldXp);
    newLevel = calculateLevel(newXp);

    // === STREAK LOGIC ===
    // Get timezone from request header or use default
    const timezone = request.headers.get('x-timezone') || 'America/Lima';

    // Calculate today's date in user's timezone
    const now = new Date();
    let todayStr: string;
    try {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      todayStr = formatter.format(now); // Returns YYYY-MM-DD format
    } catch {
      // Fallback if timezone is invalid
      todayStr = now.toISOString().split('T')[0];
    }

    const lastActivityDate = currentStudent.last_activity_date;

    if (!lastActivityDate) {
      // First activity ever - start streak at 1
      newStreak = 1;
    } else {
      // Calculate difference in days
      const lastDate = new Date(lastActivityDate + 'T12:00:00Z');
      const today = new Date(todayStr + 'T12:00:00Z');
      const diffMs = today.getTime() - lastDate.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        // Same day - maintain streak (don't increment)
        newStreak = currentStudent.current_streak;
      } else if (diffDays === 1) {
        // Consecutive day - increment streak
        newStreak = currentStudent.current_streak + 1;
      } else {
        // Gap > 1 day - reset streak to 1
        newStreak = 1;
      }
    }

    // Update max_streak if current streak exceeds it
    newMaxStreak = Math.max(newStreak, currentStudent.max_streak || 0);

    // Update XP, level, and streak in students table
    await (supabase
      .from('students') as ReturnType<typeof supabase.from>)
      .update({
        xp_total: newXp,
        current_level: newLevel,
        current_streak: newStreak,
        max_streak: newMaxStreak,
        last_activity_date: todayStr,
      })
      .eq('id', auth.sub);

    // Check if leveled up
    if (newLevel > oldLevel) {
      leveledUp = true;

      // Create notification for level up
      await (supabase
        .from('notifications') as ReturnType<typeof supabase.from>)
        .insert({
          student_id: auth.sub,
          type: 'level_up',
          title: '¡Subiste de nivel!',
          message: `¡Felicidades! Ahora eres ${getLevelName(newLevel)} (Nivel ${newLevel})`,
          data: { level: newLevel, previousLevel: oldLevel, levelName: getLevelName(newLevel) },
          is_read: false,
        });
    }
  }

  // === BADGE LOGIC - Award badge for perfect exam score ===
  let badgeEarned: { icon: string; name: string; color: string } | null = null;

  if (reason === 'exam_perfect' && referenceId) {
    // Get exam badge data
    const { data: examData } = await (supabase
      .from('exams') as ReturnType<typeof supabase.from>)
      .select('id, badge_icon, badge_name, badge_color')
      .eq('id', referenceId)
      .single();

    if (examData?.badge_icon && examData?.badge_name) {
      // Check if student already has this badge
      const { data: existingBadge } = await (supabase
        .from('student_exam_badges') as ReturnType<typeof supabase.from>)
        .select('id')
        .eq('student_id', auth.sub)
        .eq('exam_id', examData.id)
        .single();

      if (!existingBadge) {
        // Award the badge
        await (supabase
          .from('student_exam_badges') as ReturnType<typeof supabase.from>)
          .insert({
            student_id: auth.sub,
            exam_id: examData.id,
            badge_icon: examData.badge_icon,
            badge_name: examData.badge_name,
            badge_color: examData.badge_color || 'from-yellow-300 to-yellow-500',
          });

        badgeEarned = {
          icon: examData.badge_icon,
          name: examData.badge_name,
          color: examData.badge_color || 'from-yellow-300 to-yellow-500',
        };

        // Create notification for badge earned
        await (supabase
          .from('notifications') as ReturnType<typeof supabase.from>)
          .insert({
            student_id: auth.sub,
            type: 'badge_earned',
            title: '¡Nueva Insignia!',
            message: `Has ganado la insignia "${examData.badge_name}"`,
            data: { badge_icon: examData.badge_icon, badge_name: examData.badge_name },
            is_read: false,
          });
      }
    }
  }

  return NextResponse.json({
    success: true,
    xpAwarded: amount,
    reason,
    newTotal: currentStudent ? currentStudent.xp_total + amount : null,
    leveledUp,
    newLevel: leveledUp ? newLevel : undefined,
    newLevelName: leveledUp ? getLevelName(newLevel) : undefined,
    currentStreak: newStreak,
    maxStreak: newMaxStreak,
    badgeEarned,
  });
}
