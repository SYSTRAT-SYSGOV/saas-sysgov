import React, { useEffect, useState } from 'react';
import { Card, Button } from '@sysgov/ui';
import { StatusChip, PageHeader, ScreenState, ConfirmDialog } from '@/components/ui';
import { ArrowLeft, Gavel, CheckCircle2, XCircle, Send } from 'lucide-react';
import { useAuth } from '@/core/auth/useAuth';
import { useCan } from '@/core/rbac/useCan';
import { cn } from '@/lib/utils';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { sysgovApi, type AprovacaoFinal, type Processo, type StatusAprovacaoFinal, type StatusEtp } from '@sysgov/sdk';

interface Toast {
  type: 'success' | 'error';
  title: string;
  message: string;
}

const STATUS_LABEL: Record<StatusAprovacaoFinal, string> = {
  pendente: 'Pendente',
  aprovada: 'Aprovada',
  rejeitada: 'Rejeitada',
};

const STATUS_VARIANT: Record<StatusAprovacaoFinal, 'warning' | 'success' | 'danger'> = {
  pendente: 'warning',
  aprovada: 'success',
  rejeitada: 'danger',
};

const DOC_STATUS_LABEL: Record<StatusEtp, string> = {
  rascunho: 'Rascunho',
  aprovado: 'Aprovado',
};

interface ArtefatoResumo {
  label: string;
  status: StatusEtp | null;
}

interface AprovacaoOrdenadorPageProps {
  processoId: number;
  onBack: () => void;
  onChanged: (processo: Processo) => void;
}

/**
 * Última etapa do ciclo pré-editalício: depois do DFD aprovado, a equipe de
 * planejamento edita ETP/Mapa de Riscos/Pesquisa de Preços livremente, sem
 * aprovação individual por fase — só existe esta aprovação final, do
 * Ordenador de Despesas, sobre o pacote inteiro de artefatos de uma vez
 * (ver AprovacaoFinalService no backend). Quem solicita não pode ser quem
 * aprova/rejeita (RN-005) — mesma segregação de funções que antes existia
 * em cada fase, agora concentrada só aqui.
 */
export const AprovacaoOrdenadorPage: React.FC<AprovacaoOrdenadorPageProps> = ({ processoId, onBack, onChanged }) => {
  const { user } = useAuth();
  const { can } = useCan();
  const [processo, setProcesso] = useState<Processo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmAprovar, setConfirmAprovar] = useState(false);
  const [confirmRejeitar, setConfirmRejeitar] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = (t: Toast) => {
    setToasts((prev) => [...prev, t]);
    window.setTimeout(() => setToasts((prev) => prev.filter((x) => x !== t)), 5000);
  };

  const aprovacao: AprovacaoFinal | null = processo?.aprovacao_final ?? null;
  const pendente = aprovacao?.status === 'pendente';
  const podeAprovar = can('licita.aprovar_final') && aprovacao?.solicitado_por !== user?.id;
  const artefatosCompletos = processo?.etp != null && processo?.mapa_risco != null && processo?.pesquisa_preco != null;

  const artefatos: ArtefatoResumo[] = processo
    ? [
        { label: 'ETP', status: processo.etp?.status ?? null },
        { label: 'Mapa de Riscos', status: processo.mapa_risco?.status ?? null },
        { label: 'Pesquisa de Preços', status: processo.pesquisa_preco?.status ?? null },
      ]
    : [];

  useEffect(() => {
    let cancelado = false;

    const carregar = async () => {
      setLoading(true);
      setError(null);
      try {
        const processoCompleto = await sysgovApi.licita.getProcesso(processoId);
        if (cancelado) return;
        setProcesso(processoCompleto);
      } catch (err: any) {
        if (!cancelado) setError(err?.response?.data?.error || err?.message || 'Erro ao carregar o processo.');
      } finally {
        if (!cancelado) setLoading(false);
      }
    };

    carregar();
    return () => {
      cancelado = true;
    };
  }, [processoId]);

  const refresh = async () => {
    const atualizado = await sysgovApi.licita.getProcesso(processoId);
    setProcesso(atualizado);
    onChanged(atualizado);
  };

  const runAction = async (action: () => Promise<unknown>, sucesso: { title: string; message: string }) => {
    setActionError(null);
    setActionLoading(true);
    try {
      await action();
      await refresh();
      notify({ type: 'success', ...sucesso });
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Erro ao executar ação.'));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <ScreenState type="loading" title="Carregando processo..." />;
  }

  if (error || !processo) {
    return (
      <ScreenState
        type="error"
        title="Erro ao carregar"
        description={error ?? 'Processo não encontrado.'}
        actionLabel="Voltar"
        onAction={onBack}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Gavel className="h-6 w-6" />}
        title={`Processo ${processo.numero}/${processo.ano} — Aprovação do Ordenador`}
        subtitle={processo.objeto || undefined}
        actions={
          <Button variant="outline" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={onBack}>
            Voltar
          </Button>
        }
      />

      <Card className="p-6 space-y-5">
        {aprovacao && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex items-center gap-3">
              <StatusChip label={STATUS_LABEL[aprovacao.status]} variant={STATUS_VARIANT[aprovacao.status]} />
              <span className="text-xs text-muted-foreground">
                Solicitada por <span className="font-medium text-foreground">{aprovacao.solicitante?.name ?? '—'}</span>
              </span>
              {aprovacao.aprovador && (
                <span className="text-xs text-muted-foreground">
                  {aprovacao.status === 'rejeitada' ? 'Rejeitada' : 'Aprovada'} por{' '}
                  <span className="font-medium text-foreground">{aprovacao.aprovador.name}</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {pendente && podeAprovar && (
                <>
                  <Button
                    size="sm"
                    variant="primary"
                    leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                    isLoading={actionLoading}
                    onClick={() => setConfirmAprovar(true)}
                  >
                    Aprovar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    leftIcon={<XCircle className="h-3.5 w-3.5" />}
                    onClick={() => setConfirmRejeitar(true)}
                  >
                    Rejeitar
                  </Button>
                </>
              )}
              {pendente && !podeAprovar && (
                <span className="text-xs text-muted-foreground italic">
                  Aguardando aprovação do Ordenador de Despesas (segregação de funções).
                </span>
              )}
            </div>
          </div>
        )}

        {aprovacao?.status === 'rejeitada' && aprovacao.motivo_rejeicao && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <strong className="block text-xs font-bold uppercase mb-1">Motivo da rejeição</strong>
            {aprovacao.motivo_rejeicao}
          </div>
        )}

        <ConfirmDialog
          open={confirmAprovar}
          onClose={() => setConfirmAprovar(false)}
          destructive={false}
          requireReason={false}
          confirmLabel="Aprovar"
          title="Aprovar processo"
          description="Confirma a aprovação final deste processo? ETP, Mapa de Riscos e Pesquisa de Preços ficam imutáveis a partir de agora e o processo é concluído."
          onConfirm={() => {
            setConfirmAprovar(false);
            runAction(() => sysgovApi.licita.aprovarFinal(processo.id), {
              title: 'Processo aprovado',
              message: 'A aprovação final foi registrada com sucesso.',
            });
          }}
        />

        <ConfirmDialog
          open={confirmRejeitar}
          onClose={() => setConfirmRejeitar(false)}
          destructive
          requireReason
          reasonPlaceholder="Motivo da rejeição..."
          confirmLabel="Rejeitar"
          title="Rejeitar processo"
          description="Confirma a rejeição deste pacote de artefatos? O processo volta para elaboração e a equipe de planejamento poderá ajustar e solicitar de novo."
          onConfirm={(motivo) => {
            setConfirmRejeitar(false);
            runAction(() => sysgovApi.licita.rejeitarFinal(processo.id, motivo), {
              title: 'Processo rejeitado',
              message: 'A rejeição foi registrada com sucesso.',
            });
          }}
        />

        {actionError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {actionError}
          </div>
        )}

        <div>
          <h3 className="text-sm font-semibold text-foreground mb-2">Artefatos do processo</h3>
          <div className="space-y-1.5">
            {artefatos.map((a) => (
              <div key={a.label} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                <span className="text-foreground">{a.label}</span>
                {a.status ? (
                  <StatusChip
                    label={DOC_STATUS_LABEL[a.status]}
                    variant={a.status === 'aprovado' ? 'success' : 'neutral'}
                  />
                ) : (
                  <span className="text-xs text-muted-foreground italic">Não iniciado</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {!pendente && can('licita.update') && (
          <div className="flex justify-end">
            <Button
              variant="primary"
              leftIcon={<Send className="h-4 w-4" />}
              isLoading={actionLoading}
              disabled={!artefatosCompletos}
              title={!artefatosCompletos ? 'Cadastre ETP, Mapa de Riscos e Pesquisa de Preços antes de solicitar.' : undefined}
              onClick={() =>
                runAction(() => sysgovApi.licita.solicitarAprovacaoFinal(processo.id), {
                  title: 'Aprovação final solicitada',
                  message: 'O pacote foi enviado para o Ordenador de Despesas.',
                })
              }
            >
              Solicitar Aprovação do Ordenador
            </Button>
          </div>
        )}
      </Card>

      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map((t, i) => (
          <div
            key={i}
            className={cn(
              'rounded-lg px-4 py-3 text-sm shadow-lg max-w-sm',
              t.type === 'success' && 'bg-success text-success-foreground',
              t.type === 'error' && 'bg-destructive text-destructive-foreground',
            )}
          >
            <strong className="block text-xs font-bold uppercase">{t.title}</strong>
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AprovacaoOrdenadorPage;
