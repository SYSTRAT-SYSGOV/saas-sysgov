import React from 'react';
import { cn } from '@/lib/utils';
import { Clock, CheckCircle2, Send, AlertTriangle } from 'lucide-react';

export interface TimelineEvent {
  id: number;
  tipo: 'tramitacao_poderes' | 'etapa_interna' | 'status_change';
  titulo: string;
  descricao: string;
  data: string;
  status: 'concluido' | 'em_andamento' | 'pendente' | 'atrasado';
}

interface TimelineTramitacaoProps {
  eventos: TimelineEvent[];
  className?: string;
}

const statusDot = {
  concluido:    'bg-emerald-500',
  em_andamento: 'bg-cyan-500 animate-pulse',
  pendente:     'bg-muted-foreground/30',
  atrasado:     'bg-rose-500',
};

const statusIcon = {
  concluido:    CheckCircle2,
  em_andamento: Clock,
  pendente:     Clock,
  atrasado:     AlertTriangle,
};

export const TimelineTramitacao: React.FC<TimelineTramitacaoProps> = ({ eventos, className }) => {
  if (!eventos.length) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        Nenhum evento de tramitação registrado.
      </p>
    );
  }

  return (
    <div className={cn('relative space-y-0', className)}>
      {eventos.map((evento, idx) => {
        const Icon = statusIcon[evento.status];
        const isLast = idx === eventos.length - 1;

        return (
          <div key={evento.id} className="relative flex gap-4 pb-4">
            {/* Linha vertical */}
            {!isLast && (
              <div className="absolute left-[15px] top-8 h-full w-px bg-border" />
            )}

            {/* Dot */}
            <div className={cn(
              'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border',
              'border-border bg-card',
            )}>
              <div className={cn('h-3 w-3 rounded-full', statusDot[evento.status])} />
            </div>

            {/* Conteúdo */}
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-foreground">{evento.titulo}</span>
                <Icon className={cn(
                  'h-3.5 w-3.5',
                  evento.status === 'concluido' ? 'text-emerald-500' :
                  evento.status === 'atrasado' ? 'text-rose-500' :
                  'text-muted-foreground',
                )} />
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{evento.descricao}</p>
              <p className="text-xs text-muted-foreground/70 font-mono mt-1">
                {evento.data}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};