import React from 'react';
import {
  FileText,
  Calendar,
  User,
  Users,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileDown,
  Play,
  PauseCircle,
  XCircle,
} from 'lucide-react';
import { Button, Modal, StatusChip } from '@/components/ui';
import { cemiteriosApi, formatarData, type OrdemServico } from '../../api';

interface ModalDetalheOrdemServicoProps {
  ordem: OrdemServico | null;
  onFechar: () => void;
  onTransicao?: (ordem: OrdemServico, acao: 'iniciar' | 'concluir' | 'suspender' | 'cancelar') => void;
  canExecutar?: boolean;
  canGerenciar?: boolean;
  onVerJazigo?: (codigoJazigo: string) => void;
}

const SITUACAO_OS: Record<string, 'info' | 'warning' | 'success' | 'danger' | 'neutral'> = {
  emitida: 'info',
  em_execucao: 'warning',
  concluida: 'success',
  suspensa: 'danger',
  cancelada: 'neutral',
};

export const ModalDetalheOrdemServico: React.FC<ModalDetalheOrdemServicoProps> = ({
  ordem,
  onFechar,
  onTransicao,
  canExecutar = false,
  canGerenciar = false,
  onVerJazigo,
}) => {
  if (!ordem) return null;

  return (
    <Modal
      open={ordem !== null}
      onOpenChange={(aberto) => !aberto && onFechar()}
      size="2xl"
      icon={<FileText className="h-5 w-5 text-primary" />}
      title={`Ordem de Serviço Nº ${ordem.numero}/${ordem.ano}`}
      description="Visualização dos detalhes cadastrais, sepultura vinculada e execução da ordem de serviço."
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void cemiteriosApi.pdfOrdem(ordem)}
            className="gap-1.5"
          >
            <FileDown className="h-3.5 w-3.5 text-primary" />
            <span>Emitir Guia em PDF</span>
          </Button>

          <div className="flex items-center gap-2 ml-auto">
            {canExecutar && ordem.situacao === 'emitida' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onTransicao?.(ordem, 'iniciar')}
                className="gap-1.5"
              >
                <Play className="h-3.5 w-3.5 text-primary" />
                <span>Iniciar Execução</span>
              </Button>
            )}

            {canExecutar && (ordem.situacao === 'emitida' || ordem.situacao === 'em_execucao') && (
              <>
                <Button
                  size="sm"
                  variant="success"
                  onClick={() => onTransicao?.(ordem, 'concluir')}
                  className="gap-1.5"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Concluir</span>
                </Button>

                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onTransicao?.(ordem, 'suspender')}
                  className="gap-1.5"
                >
                  <PauseCircle className="h-3.5 w-3.5" />
                  <span>Suspender</span>
                </Button>
              </>
            )}

            {canGerenciar && ['emitida', 'em_execucao', 'suspensa'].includes(ordem.situacao) && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onTransicao?.(ordem, 'cancelar')}
                className="gap-1.5 text-destructive hover:bg-destructive/10"
              >
                <XCircle className="h-3.5 w-3.5" />
                <span>Cancelar OS</span>
              </Button>
            )}

            <Button type="button" variant="outline" size="sm" onClick={onFechar}>
              Fechar
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Cabeçalho resumido */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/20 p-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xl font-bold tracking-tight text-foreground">
                OS #{ordem.numero}/{ordem.ano}
              </span>
              <StatusChip
                label={ordem.situacao.replace('_', ' ')}
                variant={SITUACAO_OS[ordem.situacao] ?? 'neutral'}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1 capitalize">
              Tipo de Operação: <strong className="text-foreground">{ordem.tipo}</strong>
            </p>
          </div>

          <div className="text-right text-xs">
            <span className="text-muted-foreground block">Agendamento:</span>
            <span className="font-mono font-semibold text-foreground">
              {ordem.agendada_para ? formatarData(ordem.agendada_para) : 'A definir'}
            </span>
          </div>
        </div>

        {/* Grade de 2 colunas com dados operacionais */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card: Falecido e Jazigo */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2 pb-1 border-b border-border/70 text-xs font-semibold text-foreground">
              <User className="h-4 w-4 text-primary" />
              <span>Dados do Falecido e Localização</span>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px]">Nome do Falecido:</span>
                <span className="font-semibold text-sm text-foreground">
                  {ordem.falecido || 'Não vinculado ou não informado'}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground block text-[11px]">Cemitério:</span>
                <span className="text-foreground">
                  {ordem.jazigo?.cemiterio?.nome ?? 'Necrópole Municipal'}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Código do Jazigo:</span>
                  <span className="font-mono font-bold text-sm text-primary">
                    {ordem.jazigo?.codigo ?? '—'}
                  </span>
                </div>

                {ordem.jazigo?.codigo && onVerJazigo && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onVerJazigo(ordem.jazigo!.codigo)}
                    className="h-7 text-[11px] gap-1"
                  >
                    <MapPin className="h-3 w-3" />
                    <span>Ver Prontuário</span>
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Card: Execução e Equipe */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2 pb-1 border-b border-border/70 text-xs font-semibold text-foreground">
              <Users className="h-4 w-4 text-primary" />
              <span>Equipe e Execução de Campo</span>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px]">Equipe Responsável:</span>
                <span className="font-medium text-foreground">
                  {ordem.equipe || 'Equipe de plantão geral'}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground block text-[11px]">Executada em:</span>
                <span className="font-mono text-foreground">
                  {ordem.executada_em ? formatarData(ordem.executada_em) : 'Aguardando conclusão'}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground block text-[11px]">Observações / Instruções:</span>
                <p className="text-xs text-muted-foreground bg-muted/30 p-2 rounded-md italic">
                  {ordem.observacao || 'Nenhuma observação registrada para esta ordem de serviço.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
