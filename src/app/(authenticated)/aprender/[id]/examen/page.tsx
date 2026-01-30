'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { useUserStore } from '@/stores/user-store';
import { Icon } from '@/components/ui/Icon';

interface Question {
  id: string;
  question: string;
  options: string[];
  correct_option: number;
  order_index: number;
}

interface Exam {
  id: string;
  title: string;
  passing_score: number;
  course_id: string;
}


export default function ExamenPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;
  const { student, token } = useAuthStore();
  const { showXpGain, showBadgeGain } = useUserStore();

  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get user's timezone for streak calculation
  const userTimezone = typeof window !== 'undefined'
    ? Intl.DateTimeFormat().resolvedOptions().timeZone
    : 'America/Lima';

  const fetchExamData = useCallback(async () => {
    try {
      // Fetch exam
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .select('*')
        .eq('course_id', courseId)
        .eq('is_active', true)
        .single();

      if (examError) throw examError;
      if (!examData) throw new Error('Exam not found');

      const typedExamData = examData as Exam;
      setExam(typedExamData);

      // Fetch questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('exam_questions')
        .select('*')
        .eq('exam_id', typedExamData.id)
        .order('order_index');

      if (questionsError) throw questionsError;
      setQuestions((questionsData as Question[]) || []);

      if (!questionsData || questionsData.length === 0) {
        setError('Este examen no tiene preguntas configuradas');
      }
    } catch (err: any) {
      console.error('Error fetching exam:', err);
      setError(err.message || 'No se pudo cargar el examen');
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchExamData();
  }, [fetchExamData]);

  const currentQuestion = questions[currentQuestionIndex];

  const selectAnswer = (optionIndex: number) => {
    if (!currentQuestion) return;
    setAnswers({
      ...answers,
      [currentQuestion.id]: optionIndex,
    });
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const submitExam = async () => {
    if (!exam || !student?.id) return;

    setIsSubmitting(true);

    try {
      // Calculate score
      let correctCount = 0;
      questions.forEach((q) => {
        if (answers[q.id] === q.correct_option) {
          correctCount++;
        }
      });

      const totalQuestions = questions.length;
      const percentage = Math.round((correctCount / totalQuestions) * 100);
      const passed = percentage >= exam.passing_score;

      // Save exam result to database (using any to bypass Supabase type generation issues)
      const { error: resultError } = await (supabase as unknown as { from: (table: string) => { insert: (data: Record<string, unknown>) => Promise<{ error: unknown }> } })
        .from('exam_results')
        .insert({
          student_id: student.id,
          exam_id: exam.id,
          score: correctCount,
          passed,
          answers: answers,
          completed_at: new Date().toISOString(),
        });

      if (resultError) {
        console.error('Error saving exam result:', resultError);
      }

      // If passed, update enrollment as completed and award XP
      if (passed) {
        // Use API to update enrollment (bypasses RLS)
        try {
          await fetch('/api/progress', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              markCourseCompleted: true,
              courseId: courseId,
            }),
          });
        } catch (enrollmentError) {
          console.error('Error updating enrollment:', enrollmentError);
        }

        // Determine XP based on score
        let xpReason = 'exam_passed';
        let xpAmount = 100;

        if (percentage === 100) {
          xpReason = 'exam_perfect';
          xpAmount = 200;
        } else if (percentage >= 90) {
          xpReason = 'exam_great';
          xpAmount = 150;
        } else if (percentage >= 80) {
          xpReason = 'exam_good';
          xpAmount = 125;
        }

        // Award XP for passing the exam
        let badgeEarned = null;
        try {
          const xpResponse = await fetch('/api/gamification', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'x-timezone': userTimezone,
            },
            body: JSON.stringify({
              amount: xpAmount,
              reason: xpReason,
              referenceId: exam.id,
            }),
          });

          if (xpResponse.ok) {
            const xpData = await xpResponse.json();
            if (xpData.xpAwarded) {
              showXpGain(xpData.xpAwarded, xpReason);
            }
            // Check if badge was earned (only for perfect score)
            if (xpData.badgeEarned) {
              badgeEarned = xpData.badgeEarned;
              // Show badge toast after XP toast (3.5s delay)
              setTimeout(() => {
                showBadgeGain(xpData.badgeEarned);
              }, 3500);
            }
          }
        } catch (xpError) {
          console.error('Error awarding XP:', xpError);
        }

        // Delay to show XP toast (and badge toast if earned) before navigating
        const redirectDelay = badgeEarned ? 8000 : 3500;
        setTimeout(() => {
          router.push(
            `/aprender/${courseId}/examen/resultados?score=${correctCount}&total=${totalQuestions}&passed=${passed}`
          );
        }, redirectDelay);
      } else {
        // Not passed - navigate immediately
        router.push(
          `/aprender/${courseId}/examen/resultados?score=${correctCount}&total=${totalQuestions}&passed=${passed}`
        );
      }
    } catch (err: any) {
      console.error('Error submitting exam:', err);
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Cargando examen...</p>
        </div>
      </div>
    );
  }

  if (error || !exam || questions.length === 0) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <Icon name="error" size={30} className="text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Error</h2>
        <p className="text-slate-500 text-center mb-6">{error || 'Examen no disponible'}</p>
        <button
          onClick={() => router.push(`/aprender/${courseId}`)}
          className="px-6 py-3 bg-primary text-white font-bold rounded-xl"
        >
          Volver al curso
        </button>
      </div>
    );
  }

  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === questions.length;

  return (
    <div className="bg-white min-h-screen flex flex-col max-w-md mx-auto">
      {/* Top Bar */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100">
        <button
          onClick={() => router.push(`/aprender/${courseId}`)}
          className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors"
        >
          <Icon name="close" size={24} className="text-slate-500" />
        </button>
        <h2 className="text-lg font-bold text-slate-900">Examen Final</h2>
        <div className="w-10" />
      </div>

      {/* Progress Dots */}
      <div className="flex items-center justify-center gap-2 p-4">
        {questions.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentQuestionIndex(i)}
            className={cn(
              'h-2 rounded-full transition-all',
              i === currentQuestionIndex
                ? 'w-6 bg-primary'
                : answers[questions[i]?.id] !== undefined
                  ? 'w-2 bg-primary'
                  : 'w-2 bg-slate-200'
            )}
          />
        ))}
      </div>

      {/* Question */}
      <div className="flex-1 px-6 py-4">
        <div className="mb-8">
          <span className="text-sm text-slate-400 font-medium">
            Pregunta {currentQuestionIndex + 1} de {questions.length}
          </span>
          <h2 className="text-2xl font-bold mt-2 text-slate-900 relative inline-block">
            {currentQuestion?.question}
            <span className="absolute -bottom-2 left-0 h-1 w-1/3 bg-gradient-to-r from-primary to-purple-400 rounded-full" />
          </h2>
        </div>

        {/* Options */}
        <div className="space-y-3">
          {currentQuestion?.options.map((option, i) => (
            <button
              key={i}
              onClick={() => selectAnswer(i)}
              className={cn(
                'w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-3',
                answers[currentQuestion.id] === i
                  ? 'border-primary bg-primary/10'
                  : 'border-slate-200 hover:border-slate-300'
              )}
            >
              <div
                className={cn(
                  'w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                  answers[currentQuestion.id] === i
                    ? 'border-primary bg-primary text-white'
                    : 'border-slate-300'
                )}
              >
                {answers[currentQuestion.id] === i && (
                  <Icon name="check" size={16} />
                )}
              </div>
              <span className="font-medium text-slate-900">{option}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Action */}
      <div className="p-6 border-t border-slate-100 bg-white">
        <div className="flex gap-3">
          {currentQuestionIndex > 0 && (
            <button
              onClick={prevQuestion}
              className="h-14 px-6 rounded-xl border-2 border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
            >
              <Icon name="arrow_back" size={24} />
            </button>
          )}

          {currentQuestionIndex < questions.length - 1 ? (
            <button
              onClick={nextQuestion}
              disabled={answers[currentQuestion?.id] === undefined}
              className="flex-1 h-14 rounded-xl bg-gradient-to-r from-primary to-purple-500 text-white font-bold disabled:opacity-50 transition-all active:scale-95"
            >
              Siguiente
            </button>
          ) : (
            <button
              onClick={submitExam}
              disabled={!allAnswered || isSubmitting}
              className="flex-1 h-14 rounded-xl bg-gradient-to-r from-primary to-purple-500 text-white font-bold disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar Respuestas'
              )}
            </button>
          )}
        </div>

        {/* Progress indicator */}
        <p className="text-center text-xs text-slate-400 mt-3">
          {answeredCount} de {questions.length} preguntas respondidas
        </p>
      </div>
    </div>
  );
}
