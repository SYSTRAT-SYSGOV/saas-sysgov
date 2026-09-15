import React, { useEffect, useState } from 'react';
import { Card, Button } from '@sysgov/ui';
import { StatusChip, PageHeader, ScreenState, ValidationErrorModal, ConfirmDialog } from '@/components/ui';
import { ArrowLeft, Search, CheckCircle2, XCircle, Send, RotateCcw } from 'lucide-react';
import { useAuth } from '@/core/auth/useAuth';
import { useCan } from '@/core/rbac/useCan';
import { cn } from '@/lib/utils';
import { getApiErrorMessage, getApiValidationErrors, type ApiFieldError } from '@/lib/apiErrors';
import {
  sysgovApi,
  type AcaoVersaoPesquisaPreco,
  type CampoConfig,
  type CreatePesquisaPrecoInput,
  type PesquisaPreco,
  type Processo,
  type StatusPesquisaPreco,
} from '@sysgov/sdk';
import { PesquisaPrecoForm } from '../components/PesquisaPrecoForm';

interface Toast {
  type: 'success' | 'error';
  title: string;
  message: string;
}

const STATUS_LABEL: Record<StatusPesquisaPreco, string> = {
  rascunho: 'Rascunho',
  em_revisao: 'Em Revisão',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
};

const STATUS_VARIANT: Record<StatusPesquisaPreco, 'neutral' | 'warning' | 'success' | 'danger'> = {
  rascunho: 'neutral',
  em_revisao: 'warning',
  aprovado: 'success',
  rejeitado: 'danger',
};

const ACAO_LABEL: Record<AcaoVersaoPesquisaPreco, string> = {
  criado: 'Criado',
  revisado: 'Revisado',
  enviado_revisao: 'Enviado para revisão',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
  reaberto: 'Reaberto para edição',
};

interface PesquisaPrecoDetailPageProps {
  processoId: number;
  onBack: () => void;
  onChanged: (processo: Processo) => void;
}

/**
 * Tela da Pesquisa de Preços — mesma estrutura de ações das telas do
 * DFD/ETP/Mapa de Riscos: criar/editar, enviar para revisão, aprovar/
 * rejeitar com motivo, reabrir. Só existe a partir do momento em que o
 * Mapa de Riscos do processo está aprovado (RN aplicada no backend,
 * PesquisaPrecoService::criar) — antes disso mostra um aviso em vez do
 * formulário.
 */
export const PesquisaPrecoDetailPage: React.FC<PesquisaPrecoDetailPageProps> = ({ processoId, onBack, onChanged }) => {
  const { user } = useAuth();
  const { can } = useCan();
  const [processo, setProcesso] = useState<Processo | null>(null);
  const [pesquisaPreco, setPesquisaPreco] = useState<PesquisaPreco | null>(null);
  const [camposExtras, setCamposExtras] = useState<CampoConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ApiFieldError[] | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmAprovar, setConfirmAprovar] = useState(false);
  const [confirmRejeitar, setConfirmRejeitar] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = (t: Toast) => {
    setToasts((prev) => [...prev, t]);
    window.setTimeout(() => setToasts((prev) => prev.filter((x) => x !== t)), 5000);
  };

  const podeAprovar = can('licita.aprovar') && pesquisaPreco?.elaborado_por !== user?.id;
  const editavel = pesquisaPreco ? ['rascunho', 'em_revisao', 'rejeitado'].includes(pesquisaPreco.status) : true;
  const mapaRiscoAprovado = processo?.mapa_risco?.status === 'aprovado';

  useEffect(() => {
    let cancelado = false;

    const carregar = async () => {
      setLoading(true);
      setError(null);
      try {
        const [processoCompleto, config] = await Promise.all([
          sysgovApi.licita.getProcesso(processoId),
          sysgovApi.licita.getCamposConfiguracao('pesquisa_precos').catch(() => null),
        ]);
        if (cancelado) return;
        setProcesso(processoCompleto);
        setPesquisaPreco(processoCompleto.pesquisa_preco);
        setCamposExtras(config?.campos ?? []);
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

  const refreshProcesso = async () => {
    const atualizado = await sysgovApi.licita.getProcesso(processoId);
    setProcesso(atualizado);
    onChanged(atualizado);
  };

  const handleCreate = async (data: CreatePesquisaPrecoInput) => {
    if (!processo) return;
    const novo = await sysgovApi.licita.createPesquisaPreco(processo.id, data);
    setPesquisaPreco(novo);
    await refreshProcesso();
    notify({ type: 'success', title: 'Pesquisa de Preços criada', message: 'O rascunho da Pesquisa de Preços foi salvo com sucesso.' });
  };

  const handleUpdate = async (data: CreatePesquisaPrecoInput) => {
    if (!pesquisaPreco) return;
    const atualizado = await sysgovApi.licita.updatePesquisaPreco(pesquisaPreco.id, data);
    setPesquisaPreco(atualizado);
    await refreshProcesso();
    notify({ type: 'success', title: 'Pesquisa de Preços salva', message: 'As alterações foram salvas com sucesso.' });
  };

  const runAction = async (action: () => Promise<PesquisaPreco>, sucesso: { title: string; message: string }) => {
    setActionError(null);
    setValidationErrors(null);
    setActionLoading(true);
    try {
      const atualizado = await action();
      setPesquisaPreco(atualizado);
      await refreshProcesso();
      notify({ type: 'success', ...sucesso });
    } catch (err) {
      const fieldErrors = getApiValidationErrors(err);
      if (fieldErrors) {
        setValidationErrors(fieldErrors);
      } else {
        setActionError(getApiErrorMessage(err, 'Erro ao executar ação.'));
      }
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
        icon={<Search className="h-6 w-6" />}
        title={`Processo ${processo.numero}/${processo.ano} — Pesquisa de Preços`}
        subtitle={processo.objeto || undefined}
        actions={
          <Button variant="outline" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={onBack}>
            Voltar
          </Button>
        }
      />

      {!mapaRiscoAprovado && !pesquisaPreco ? (
        <Card className="p-6">
          <ScreenState
            type="empty"
            title="Mapa de Riscos ainda não aprovado"
            description="A Pesquisa de Preços só pode ser iniciada depois que o Mapa de Riscos deste processo for aprovado."
            actionLabel="Voltar"
            onAction={onBack}
          />
        </Card>
      ) : (
        <Card className="p-6 space-y-5">
          {pesquisaPreco && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex items-center gap-3">
                <StatusChip label={STATUS_LABEL[pesquisaPreco.status]} variant={STATUS_VARIANT[pesquisaPreco.status]} />
                <span className="text-xs text-muted-foreground">
                  Elaborado por <span className="font-medium text-foreground">{pesquisaPreco.elaborador?.name ?? '—'}</span>
                </span>
                {pesquisaPreco.aprovador && (
                  <span className="text-xs text-muted-foreground">
                    Aprovado por <span className="font-medium text-foreground">{pesquisaPreco.aprovador.name}</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {pesquisaPreco.status === 'rascunho' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    leftIcon={<Send className="h-3.5 w-3.5" />}
                    isLoading={actionLoading}
                    onClick={() =>
                      runAction(() => sysgovApi.licita.enviarPesquisaPrecoParaRevisao(pesquisaPreco.id), {
                        title: 'Enviada para revisão',
                        message: 'A Pesquisa de Preços foi enviada para revisão com sucesso.',
                      })
                    }
                  >
                    Enviar para Revisão
                  </Button>
                )}
                {pesquisaPreco.status === 'em_revisao' && podeAprovar && (
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
                {pesquisaPreco.status === 'em_revisao' && !podeAprovar && (
                  <span className="text-xs text-muted-foreground italic">
                    Aguardando aprovação de outro responsável (segregação de funções).
                  </span>
                )}
                {pesquisaPreco.status === 'rejeitado' && can('licita.update') && (
                  <Button
                    size="sm"
                    variant="secondary"
                    leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                    isLoading={actionLoading}
                    onClick={() =>
                      runAction(() => sysgovApi.licita.reabrirPesquisaPreco(pesquisaPreco.id), {
                        title: 'Pesquisa de Preços reaberta',
                        message: 'A Pesquisa de Preços voltou para rascunho e já pode ser editada.',
                      })
                    }
                  >
                    Reabrir para Edição
                  </Button>
                )}
              </div>
            </div>
          )}

          {pesquisaPreco && (
            <>
              <ConfirmDialog
                open={confirmAprovar}
                onClose={() => setConfirmAprovar(false)}
                destructive={false}
                requireReason={false}
                confirmLabel="Aprovar"
                title="Aprovar Pesquisa de Preços"
                description="Confirma a aprovação desta Pesquisa de Preços? Depois de aprovada, o documento fica imutável e o processo avança para a próxima fase (Termo de Referência)."
                onConfirm={() => {
                  setConfirmAprovar(false);
                  runAction(() => sysgovApi.licita.aprovarPesquisaPreco(pesquisaPreco.id), {
                    title: 'Pesquisa de Preços aprovada',
                    message: 'A Pesquisa de Preços foi aprovada com sucesso.',
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
                title="Rejeitar Pesquisa de Preços"
                description="Confirma a rejeição desta Pesquisa de Preços? Ela voltará para rascunho, o elaborador poderá editá-la e reenviar para revisão."
                onConfirm={(motivo) => {
                  setConfirmRejeitar(false);
                  runAction(() => sysgovApi.licita.rejeitarPesquisaPreco(pesquisaPreco.id, motivo), {
                    title: 'Pesquisa de Preços rejeitada',
                    message: 'A rejeição foi registrada com sucesso.',
                  });
                }}
              />
            </>
          )}

          {actionError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {actionError}
            </div>
          )}

          <ValidationErrorModal
            open={validationErrors !== null}
            onClose={() => setValidationErrors(null)}
            errors={validationErrors ?? []}
          />

          <PesquisaPrecoForm
            key={pesquisaPreco ? `${pesquisaPreco.id}-${pesquisaPreco.updated_at}` : 'novo'}
            initialValue={
              pesquisaPreco
                ? {
                    ...pesquisaPreco,
                    itens: pesquisaPreco.itens ?? undefined,
                    equipe_planejamento: pesquisaPreco.equipe_planejamento ?? undefined,
                    campos_extras: pesquisaPreco.campos_extras ?? undefined,
                  }
                : {
                    // Ainda não existe Pesquisa de Preços: pré-preenche com a
                    // equipe já cadastrada no Mapa de Riscos e os itens do
                    // DFD do processo (mesmo raciocínio do Mapa de Riscos em
                    // relação ao ETP — ver MapaRiscoDetailPage).
                    equipe_planejamento: processo.mapa_risco?.equipe_planejamento ?? undefined,
                    itens: (processo.dfd?.itens ?? []).map((item) => ({
                      codigo: item.codigo,
                      descricao: item.descricao,
                      unidade_medida: item.unidade_medida,
                      quantidade: item.quantidade,
                      cotacoes: [],
                    })),
                  }
            }
            disabled={!editavel}
            submitLabel={pesquisaPreco ? 'Salvar Alterações' : 'Criar Pesquisa de Preços'}
            onSubmit={pesquisaPreco ? handleUpdate : handleCreate}
            camposExtras={camposExtras}
          />

          {pesquisaPreco && (pesquisaPreco.versoes?.length ?? 0) > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">Histórico de Versões</h3>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {[...pesquisaPreco.versoes].reverse().map((v) => (
                  <div key={v.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-1.5 text-xs">
                    <span className="font-mono tabular-nums text-muted-foreground">v{v.versao}</span>
                    <span className="text-foreground">{ACAO_LABEL[v.acao] ?? v.acao}</span>
                    <span className="text-muted-foreground">{v.usuario?.name ?? '—'}</span>
                    <span className="font-mono tabular-nums text-muted-foreground">
                      {new Date(v.created_at).toLocaleString('pt-BR')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

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

export default PesquisaPrecoDetailPage;
