import React from 'react';
import { Clock, User, FileText } from 'lucide-react';
import type { SucessaoHistorico, EstadoSucessao } from '../api';
import { formatarData } from '../api';
import { Mono } from '../views/comum';

interface HistoricoTimelineProps {
  historico: SucessaoHistorico[];
}

const EVENT_LABELS: Record<string, string> = {
  '': 'Processo Aberto',
  solicitada: 'Processo Solicitado',
  em_analise: 'Em Análise',
  aguardando_documentos: 'Aguardando Documentos',
  validada: 'Validada',
  sucedida: 'Sucedida',
  indeferida: 'Indeferida',
  arquivada: 'Arquivada',
};

export const HistoricoTimeline: React.FC<HistoricoTimelineProps> = ({ historico }) => {
  if (!historico || historico.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Nenhum registro histórico disponível.
      </div>
    );
  }

  const eventos = historico.slice().sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return (
    <div className="space-y-4">
      {eventos.map((evento) => {
        const motivoTexto = typeof evento.motivo?.parecer === 'string' ? evento.motivo.parecer : '';
        const labelEstado =
          EVENT_LABELS[evento.para_estado as keyof typeof EVENT_LABELS] ??
          evento.para_estado.replace('_', ' ');

        return (
          <div key={evento.id} className="relative flex gap-4 pl-6">
            <div className="absolute left-0 top-0 bottom-0 w-px bg-border" />
            <div className="absolute left-[-6px] top-1 w-3 h-3 rounded-full bg-primary border-2 border-background" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <Mono className="text-xs tabular-nums text-muted-foreground">
                  {formatarData(evento.created_at)}
                </Mono>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">
                  {evento.para_estado === '' ? 'Processo Aberto' : labelEstado}
                </span>
                {evento.de_estado && (
                  <span className="text-xs text-muted-foreground">
                    (de: {EVENT_LABELS[evento.de_estado as keyof typeof EVENT_LABELS] ?? evento.de_estado})
                  </span>
                )}
              </div>
              {motivoTexto && (
                <div className="mt-1.5 text-sm text-foreground bg-muted/20 rounded-lg p-2.5 border border-border">
                  {motivoTexto}
                </div>
              )}
              {evento.usuario && (
                <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span>Por: {evento.usuario.name}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default HistoricoTimeline;
