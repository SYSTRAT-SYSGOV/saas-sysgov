import React, { useEffect, useState } from 'react';
import { Card, Button, Badge } from '@sysgov/ui';
import { Clock, Bell, AlertTriangle, CheckCircle2 } from 'lucide-react';

export interface Milestone {
  id: string;
  label: string;
  targetDate: string; // ISO ou YYYY-MM-DD HH:mm:ss
  regimentalDeadlineDesc: string;
  critical?: boolean;
}

export interface CountdownWidgetProps {
  milestones?: Milestone[];
  onSendReminders?: (milestoneId: string) => void;
  sendingReminder?: boolean;
  className?: string;
}

const DEFAULT_MILESTONES: Milestone[] = [
  {
    id: 'cit',
    label: 'Fechamento do Diário de Bordo (CIT)',
    targetDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString(),
    regimentalDeadlineDesc: 'Art. 24: Prazo fatal para inserção de fatos observáveis prévios às notas extremas',
    critical: true,
  },
  {
    id: 'avaliacoes',
    label: 'Encerramento do Período de Avaliações 90°',
    targetDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 12).toISOString(),
    regimentalDeadlineDesc: 'Prazo limite regimental para chefias imediatas submeterem notas',
    critical: true,
  },
  {
    id: 'devolutivas',
    label: 'Conclusão de Devolutivas & Ciência',
    targetDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 20).toISOString(),
    regimentalDeadlineDesc: 'Art. 27: Entrevista presencial mandatória e assinatura eletrônica do servidor',
  },
  {
    id: 'recursos',
    label: 'Prazo Final para Recursos Administrativos',
    targetDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
    regimentalDeadlineDesc: 'Arts. 30 e 31: 10 dias úteis para servidor e 5 dias para manifestação da chefia',
  },
  {
    id: 'homologacao',
    label: 'Homologação e Publicação do Triênio',
    targetDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 45).toISOString(),
    regimentalDeadlineDesc: 'Encerramento colegiado da CAD e geração do decreto de progressão',
  },
];

export const CountdownWidget: React.FC<CountdownWidgetProps> = ({
  milestones = DEFAULT_MILESTONES,
  onSendReminders,
  sendingReminder = false,
  className = '',
}) => {
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string>(milestones[0]?.id || 'cit');
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    expired: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: false });

  const activeMilestone = milestones.find((m) => m.id === selectedMilestoneId) || milestones[0];

  useEffect(() => {
    if (!activeMilestone) return;

    const calculate = () => {
      const now = new Date().getTime();
      const target = new Date(activeMilestone.targetDate).getTime();
      const difference = target - now;

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, expired: false });
    };

    calculate();
    const timer = setInterval(calculate, 1000);
    return () => clearInterval(timer);
  }, [activeMilestone]);

  return (
    <Card className={`p-4 border-border bg-gradient-to-r from-card to-muted/20 ${className}`}>
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Cabeçalho do Cronômetro */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary animate-pulse" />
            <span className="text-sm font-bold tracking-tight text-foreground">
              Contagem Regressiva para Etapas Críticas do Ciclo
            </span>
            {activeMilestone?.critical && (
              <Badge variant="outline" className="bg-status-warning-bg text-status-warning border-status-warning-border text-[10px]">
                Prazo Decadencial
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {activeMilestone?.regimentalDeadlineDesc}
          </p>

          {/* Seletores rápidos de marcos */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {milestones.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedMilestoneId(m.id)}
                className={`text-[11px] px-2.5 py-1 rounded transition-colors font-medium ${
                  selectedMilestoneId === m.id
                    ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                    : 'bg-muted/50 hover:bg-muted text-muted-foreground'
                }`}
              >
                {m.label.split(' ')[0]} {m.label.split(' ')[1] || ''}
              </button>
            ))}
          </div>
        </div>

        {/* Blocos de Tempo (Dias, Horas, Minutos, Segundos) */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex flex-col items-center justify-center bg-card border border-border rounded-lg px-3 py-2 min-w-[58px] shadow-xs">
              <span className="font-mono text-2xl font-black text-foreground tabular-nums">
                {String(timeLeft.days).padStart(2, '0')}
              </span>
              <span className="text-[10px] uppercase font-semibold text-muted-foreground">Dias</span>
            </div>

            <span className="font-mono font-bold text-muted-foreground">:</span>

            <div className="flex flex-col items-center justify-center bg-card border border-border rounded-lg px-3 py-2 min-w-[58px] shadow-xs">
              <span className="font-mono text-2xl font-black text-foreground tabular-nums">
                {String(timeLeft.hours).padStart(2, '0')}
              </span>
              <span className="text-[10px] uppercase font-semibold text-muted-foreground">Horas</span>
            </div>

            <span className="font-mono font-bold text-muted-foreground">:</span>

            <div className="flex flex-col items-center justify-center bg-card border border-border rounded-lg px-3 py-2 min-w-[58px] shadow-xs">
              <span className="font-mono text-2xl font-black text-foreground tabular-nums">
                {String(timeLeft.minutes).padStart(2, '0')}
              </span>
              <span className="text-[10px] uppercase font-semibold text-muted-foreground">Min</span>
            </div>

            <span className="font-mono font-bold text-muted-foreground">:</span>

            <div className="flex flex-col items-center justify-center bg-card border border-border rounded-lg px-3 py-2 min-w-[58px] shadow-xs">
              <span className="font-mono text-2xl font-black text-primary tabular-nums">
                {String(timeLeft.seconds).padStart(2, '0')}
              </span>
              <span className="text-[10px] uppercase font-semibold text-muted-foreground">Seg</span>
            </div>
          </div>

          {/* Botão de Notificação e Lembretes às Chefias Inadimplentes */}
          {onSendReminders && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSendReminders(activeMilestone.id)}
              disabled={sendingReminder || timeLeft.expired}
              className="text-xs shrink-0"
              title="Disparar lembrete eletrônico para as chefias imediatas com pendências"
            >
              <Bell className="h-3.5 w-3.5 mr-1.5 text-amber-600" />
              {sendingReminder ? 'Disparando...' : 'Lembrar Chefias'}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};
