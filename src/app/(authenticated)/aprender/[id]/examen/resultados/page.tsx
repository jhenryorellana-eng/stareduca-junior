'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';

// Confetti particle component
function ConfettiParticle({ delay, left }: { delay: number; left: number }) {
  const colors = ['#895af6', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#ec4899'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const size = 8 + Math.random() * 8;
  const duration = 3 + Math.random() * 2;

  return (
    <div
      className="absolute animate-confetti-fall"
      style={{
        left: `${left}%`,
        top: '-20px',
        width: size,
        height: size,
        backgroundColor: color,
        borderRadius: Math.random() > 0.5 ? '50%' : '2px',
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
      }}
    />
  );
}

function Confetti() {
  const [particles, setParticles] = useState<{ id: number; delay: number; left: number }[]>([]);

  useEffect(() => {
    // Create particles
    const newParticles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      delay: Math.random() * 2,
      left: Math.random() * 100,
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {particles.map((p) => (
        <ConfettiParticle key={p.id} delay={p.delay} left={p.left} />
      ))}
    </div>
  );
}

function ResultadosContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const courseId = params.id as string;

  // Get results from query params
  const score = parseInt(searchParams.get('score') || '0');
  const total = parseInt(searchParams.get('total') || '0');
  const passed = searchParams.get('passed') === 'true';

  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;

  // Calculate XP based on score (only if passed)
  let xpEarned = 0;
  if (passed) {
    if (percentage === 100) {
      xpEarned = 200; // Perfect score
    } else if (percentage >= 90) {
      xpEarned = 150; // Great score
    } else if (percentage >= 80) {
      xpEarned = 125; // Good score
    } else {
      xpEarned = 100; // Passed
    }
  }

  // SVG circle calculations
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const showConfetti = percentage === 100;

  return (
    <div className="bg-white min-h-screen flex flex-col max-w-md mx-auto">
      {/* Confetti for 100% score */}
      {showConfetti && <Confetti />}

      {/* CSS for confetti animation */}
      <style jsx global>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti-fall {
          animation: confetti-fall linear forwards;
        }
      `}</style>

      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none z-0">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `radial-gradient(#895af6 0.5px, transparent 0.5px), radial-gradient(#895af6 0.5px, #f6f5f8 0.5px)`,
            backgroundSize: '20px 20px',
            backgroundPosition: '0 0, 10px 10px',
          }}
        />
      </div>

      {/* Top Bar */}
      <div className="relative z-10 flex items-center justify-between p-4">
        <button
          onClick={() => router.push(`/aprender/${courseId}`)}
          className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors"
        >
          <span className="material-symbols-outlined text-slate-500">close</span>
        </button>
        <h2 className="text-lg font-bold text-slate-900">Resultados</h2>
        <div className="w-10" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center px-6 py-4">
        {/* Headline */}
        <div className="text-center mb-8 animate-fade-in-up">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {passed ? '¡Felicitaciones!' : 'Sigue intentando'}
            <span className="inline-block animate-bounce ml-2">
              {passed ? '🎉' : '💪'}
            </span>
          </h1>
          <p className="text-slate-500 mt-2 font-medium">
            {passed ? '¡Gran trabajo liderando!' : 'Puedes volver a intentarlo'}
          </p>
        </div>

        {/* Circular Progress */}
        <div className="relative w-56 h-56 mb-6">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            {/* Background Circle */}
            <circle
              className="text-slate-200"
              cx="50"
              cy="50"
              r={radius}
              fill="transparent"
              stroke="currentColor"
              strokeWidth="8"
            />
            {/* Progress Circle */}
            <circle
              className="text-primary drop-shadow-lg"
              cx="50"
              cy="50"
              r={radius}
              fill="transparent"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{
                transition: 'stroke-dashoffset 1s ease-in-out',
              }}
            />
          </svg>
          {/* Inner Content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-black text-slate-900 tracking-tight">{percentage}%</span>
          </div>
        </div>

        {/* Score Bubble */}
        <div className="-mt-2 bg-white border border-slate-100 shadow-sm px-5 py-2 rounded-full z-10">
          <p className="text-primary font-bold text-sm">{score}/{total} correctas</p>
        </div>

        {/* Rewards Card - only show if passed */}
        {passed && (
          <div className="w-full bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mt-8">
            <h3 className="text-slate-900 font-bold text-lg mb-4">Recompensas</h3>
            <div className="flex flex-col gap-3">
              {/* XP Reward */}
              <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 border border-transparent hover:border-primary/20 transition-colors">
                <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                  <span
                    className="material-symbols-outlined text-yellow-600 text-[20px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    star
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-slate-900 font-bold text-sm">+{xpEarned} XP ganados</p>
                  <p className="text-slate-500 text-xs">Puntos de experiencia</p>
                </div>
              </div>

              {/* Badge Reward */}
              <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 border border-transparent hover:border-primary/20 transition-colors">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <span
                    className="material-symbols-outlined text-primary text-[20px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    emoji_events
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-slate-900 font-bold text-sm">Badge: Examen aprobado</p>
                  <p className="text-slate-500 text-xs">Desbloqueado</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="relative z-10 p-6 border-t border-slate-100 bg-white">
        <div className="flex flex-col gap-3">
          <Link
            href={`/aprender/${courseId}`}
            className="w-full h-12 flex items-center justify-center rounded-xl border-2 border-primary text-primary hover:bg-primary hover:text-white font-bold text-base transition-all active:scale-95"
          >
            Volver al curso
          </Link>
          {!passed && (
            <Link
              href={`/aprender/${courseId}/examen`}
              className="w-full h-12 flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-50 font-semibold text-base transition-all"
            >
              Volver a intentar
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResultadosPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-500 text-sm">Cargando resultados...</p>
          </div>
        </div>
      }
    >
      <ResultadosContent />
    </Suspense>
  );
}
