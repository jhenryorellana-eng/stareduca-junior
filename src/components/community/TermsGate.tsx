'use client';

import { useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { Icon } from '@/components/ui/Icon';

interface TermsGateProps {
  onAccepted: () => void;
}

const communityRules = [
  {
    icon: 'favorite',
    title: 'Se respetuoso',
    description: 'Trata a todos los miembros con respeto y empatia.',
  },
  {
    icon: 'shield',
    title: 'Sin contenido ofensivo',
    description: 'No se tolera lenguaje ofensivo, discriminatorio o contenido inapropiado.',
  },
  {
    icon: 'group',
    title: 'Protege la privacidad',
    description: 'No compartas informacion personal de otros miembros sin su consentimiento.',
  },
  {
    icon: 'flag',
    title: 'Reporta contenido',
    description: 'Si ves algo inapropiado, reportalo. Actuaremos dentro de 24 horas.',
  },
];

export function TermsGate({ onAccepted }: TermsGateProps) {
  const { token } = useAuthStore();
  const [isAccepting, setIsAccepting] = useState(false);

  async function handleAccept() {
    if (!token) return;

    setIsAccepting(true);
    try {
      const response = await fetch('/api/terms', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        onAccepted();
      }
    } catch (error) {
      console.error('Error accepting terms:', error);
    } finally {
      setIsAccepting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background-dark flex items-center justify-center p-4">
      <div className="glass-card rounded-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-purple-600 p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
            <Icon name="shield" size={32} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white">Normas de la Comunidad</h2>
          <p className="text-white/80 text-sm mt-2">
            Antes de participar, acepta nuestras normas
          </p>
        </div>

        {/* Rules */}
        <div className="p-6 space-y-4">
          {communityRules.map((rule) => (
            <div key={rule.title} className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Icon name={rule.icon} size={20} className="text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm">{rule.title}</h3>
                <p className="text-gray-400 text-xs mt-0.5">{rule.description}</p>
              </div>
            </div>
          ))}

          <div className="bg-white/5 rounded-xl p-4 mt-4 border border-white/10">
            <p className="text-xs text-gray-400 leading-relaxed">
              Al aceptar, te comprometes a seguir estas normas. El incumplimiento puede resultar
              en la eliminacion de tu contenido o la suspension de tu cuenta. Los usuarios que
              publiquen contenido objetable seran expulsados de la comunidad.
            </p>
          </div>
        </div>

        {/* Accept button */}
        <div className="px-6 pb-6">
          <button
            onClick={handleAccept}
            disabled={isAccepting}
            className="w-full py-3.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {isAccepting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Icon name="check_circle" size={20} />
            )}
            {isAccepting ? 'Aceptando...' : 'Acepto las normas de la comunidad'}
          </button>
        </div>
      </div>
    </div>
  );
}
