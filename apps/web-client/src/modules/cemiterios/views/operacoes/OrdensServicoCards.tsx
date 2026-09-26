import React from 'react';
import { Eye, FileDown, Play, CheckCircle2, PauseCircle, XCircle } from 'lucide-react';
import { Button, Card, StatusChip } from '@/components/ui';
import { cemiteriosApi, formatarData, type OrdemServico } from '../../api';

interface OrdensServicoCardsProps {
  ordens: OrdemServico[];
  onSelecionarOrdem: (ordem: OrdemServico) => void;
  onTransicao: (ordem: OrdemServico, acao: 'iniciar' | 'concluir' | 'suspender' | 'cancelar') => void;
  canExecutar?: boolean;
  canGerenciar?: boolean;
}

const SITUACAO_OS: Record<string, 'info' | 'warning' | 'success' | 'danger' | 'neutral'> = {
  emitida: 'info',
  em_execucao: 'warning',
  concluida: 'success',
  suspensa: 'danger',
  cancelada: 'neutral',
};

export const OrdensServicoCards: React.FC<OrdensServicoCardsProps> = ({
  ordens,
  onSelecionarOrdem,
  onTransicao,
  canExecutar = false,
  canGerenciar = false,
}) => {
  if (ordens.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Nenhuma ordem de serviço encontrada.
      </div>
    );
  }

  return (
    <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
      {ordens.map((o) => (
        <Card
          key={o.id}
          className="space-y-3 p-4 hover:border-primary/40 transition-colors cursor-pointer flex flex-col justify-between"
          onClick={() => onSelecionarOrdem(o)}
        >
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="font-mono text-lg font-bold text-foreground">
                  OS {o.numero}/{o.ano}
                </span>
                <p className="text-xs capitalize text-muted-foreground">
                  {o.tipo} · jazigo <span className="font-mono font-semibold text-primary">{o.jazigo?.codigo ?? '—'}</span>
                </p>
              </div>
              <StatusChip
                label={o.situacao.replace('_', ' ')}
                variant={SITUACAO_OS[o.situacao] ?? 'neutral'}
              />
            </div>

            {o.falecido && (
              <div className="text-xs">
                <span className="text-muted-foreground text-[11px] block">Falecido:</span>
                <span className="font-medium text-foreground">{o.falecido}</span>
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              Agendada: <span className="font-mono text-foreground">{o.agendada_para ? formatarData(o.agendada_para) : 'a definir'}</span> · Equipe: {o.equipe ?? '—'}
            </div>
          </div>

          <div
            className="grid grid-cols-2 gap-2 pt-2 border-t border-border/70"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              size="sm"
              variant="outline"
              onClick={() => onSelecionarOrdem(o)}
              className="gap-1 h-8 text-xs"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Detalhes</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => void cemiteriosApi.pdfOrdem(o)}
              className="gap-1 h-8 text-xs"
            >
              <FileDown className="h-3.5 w-3.5" />
              <span>PDF</span>
            </Button>

            {canExecutar && o.situacao === 'emitida' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onTransicao(o, 'iniciar')}
                className="col-span-2 gap-1 h-8 text-xs text-primary border-primary/30"
              >
                <Play className="h-3.5 w-3.5" />
                <span>Iniciar Execução</span>
              </Button>
            )}

            {canExecutar && (o.situacao === 'emitida' || o.situacao === 'em_execucao') && (
              <>
                <Button
                  size="sm"
                  variant="success"
                  onClick={() => onTransicao(o, 'concluir')}
                  className="gap-1 h-8 text-xs"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Concluir</span>
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onTransicao(o, 'suspender')}
                  className="gap-1 h-8 text-xs"
                >
                  <PauseCircle className="h-3.5 w-3.5" />
                  <span>Suspender</span>
                </Button>
              </>
            )}

            {canGerenciar && ['emitida', 'em_execucao', 'suspensa'].includes(o.situacao) && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onTransicao(o, 'cancelar')}
                className="col-span-2 gap-1 h-8 text-xs text-destructive hover:bg-destructive/10"
              >
                <XCircle className="h-3.5 w-3.5" />
                <span>Cancelar Ordem</span>
              </Button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
};
