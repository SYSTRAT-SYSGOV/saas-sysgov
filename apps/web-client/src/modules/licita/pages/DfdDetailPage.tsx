import React, { useEffect, useState } from 'react';
import { Card, Button } from '@sysgov/ui';
import { StatusChip, PageHeader, ScreenState, ValidationErrorModal } from '@/components/ui';
import { ArrowLeft, FileText, CheckCircle2, XCircle, Send, RotateCcw } from 'lucide-react';
import { useAuth } from '@/core/auth/useAuth';
import { useCan } from '@/core/rbac/useCan';
import { cn } from '@/lib/utils';
import { getApiErrorMessage, getApiValidationErrors, type ApiFieldError } from '@/lib/apiErrors';
import { sysgovApi, type CampoConfig, type CreateDfdInput, type Dfd, type Processo, type StatusDfd } from '@sysgov/sdk';
import { DfdForm } from '../components/DfdForm';

interface Toast {
  type: 'success' | 'error';
  title: string;
  message: string;
}

const STATUS_LABEL: Record<StatusDfd, string> = {
  rascunho: 'Rascunho',
  em_revisao: 'Em Revisão',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
};

const STATUS_VARIANT: Record<StatusDfd, 'neutral' | 'warning' | 'success' | 'danger'> = {
  rascunho: 'neutral',
  em_revisao: 'warning',
  aprovado: 'success',
  rejeitado: 'danger',
};

const ACAO_LABEL: Record<string, string> = {
  criado: 'Criado',
  revisado: 'Revisado',
  enviado_revisao: 'Enviado para revisão',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
  reaberto: 'Reaberto para edição',
};

interface DfdDetailPageProps {
  processoId: number;
  onBack: () => void;
  onChanged: (processo: Processo) => void;
}

/**
 * Tela cheia de instrução do DFD — substitui a antiga DfdWorkspaceModal
 * (@sysgov/ui Modal), inadequada quando o número de campos cresce com os
 * campos extras configuráveis por órgão.
 */
export const DfdDetailPage: React.FC<DfdDetailPageProps> = ({ processoId, onBack, onChanged }) => {
  const { user } = useAuth();
  const { can } = useCan();
  const [processo, setProcesso] = useState<Processo | null>(null);
  const [dfd, setDfd] = useState<Dfd | null>(null);
  const [camposExtras, setCamposExtras] = useState<CampoConfig[]>([]);
  const [camposExtrasItemMaterial, setCamposExtrasItemMaterial] = useState<CampoConfig[]>([]);
  const [camposExtrasItemServico, setCamposExtrasItemServico] = useState<CampoConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ApiFieldError[] | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [motivoRejeicao, setMotivoRejeicao] = useState('');
  const [showRejeitar, setShowRejeitar] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = (t: Toast) => {
    setToasts((prev) => [...prev, t]);
    window.setTimeout(() => setToasts((prev) => prev.filter((x) => x !== t)), 5000);
  };

  const podeAprovar = can('licita.aprovar') && dfd?.elaborado_por !== user?.id;
  const editavel = dfd ? ['rascunho', 'em_revisao', 'rejeitado'].includes(dfd.status) : true;

  useEffect(() => {
    let cancelado = false;

    const carregar = async () => {
      setLoading(true);
      setError(null);
      try {
        const [processoCompleto, config, configMaterial, configServico] = await Promise.all([
          sysgovApi.licita.getProcesso(processoId),
          sysgovApi.licita.getCamposConfiguracao('dfd').catch(() => null),
          sysgovApi.licita.getCamposConfiguracao('dfd_item_material').catch(() => null),
          sysgovApi.licita.getCamposConfiguracao('dfd_item_servico').catch(() => null),
        ]);
        if (cancelado) return;
        setProcesso(processoCompleto);
        setDfd(processoCompleto.dfd);
        setCamposExtras(config?.campos ?? []);
        setCamposExtrasItemMaterial(configMaterial?.campos ?? []);
        setCamposExtrasItemServico(configServico?.campos ?? []);
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

  const handleCreate = async (data: CreateDfdInput) => {
    if (!processo) return;
    const novoDfd = await sysgovApi.licita.createDfd(processo.id, data);
    setDfd(novoDfd);
    await refreshProcesso();
    notify({ type: 'success', title: 'DFD criado', message: 'O rascunho do DFD foi salvo com sucesso.' });
  };

  const handleUpdate = async (data: CreateDfdInput) => {
    if (!dfd) return;
    const atualizado = await sysgovApi.licita.updateDfd(dfd.id, data);
    setDfd(atualizado);
    await refreshProcesso();
    notify({ type: 'success', title: 'DFD salvo', message: 'As alterações foram salvas com sucesso.' });
  };

  const runAction = async (action: () => Promise<Dfd>, sucesso: { title: string; message: string }) => {
    setActionError(null);
    setValidationErrors(null);
    setActionLoading(true);
    try {
      const atualizado = await action();
      setDfd(atualizado);
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
        icon={<FileText className="h-6 w-6" />}
        title={`Processo ${processo.numero}/${processo.ano} — DFD`}
        subtitle={processo.objeto || undefined}
        actions={
          <Button variant="outline" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={onBack}>
            Voltar
          </Button>
        }
      />

      <Card className="p-6 space-y-5">
        {dfd && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex items-center gap-3">
              <StatusChip label={STATUS_LABEL[dfd.status]} variant={STATUS_VARIANT[dfd.status]} />
              <span className="text-xs text-muted-foreground">
                Elaborado por <span className="font-medium text-foreground">{dfd.elaborador?.name ?? '—'}</span>
              </span>
              {dfd.aprovador && (
                <span className="text-xs text-muted-foreground">
                  Aprovado por <span className="font-medium text-foreground">{dfd.aprovador.name}</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {dfd.status === 'rascunho' && (
                <Button
                  size="sm"
                  variant="secondary"
                  leftIcon={<Send className="h-3.5 w-3.5" />}
                  isLoading={actionLoading}
                  onClick={() =>
                    runAction(() => sysgovApi.licita.enviarDfdParaRevisao(dfd.id), {
                      title: 'Enviado para revisão',
                      message: 'O DFD foi enviado para revisão com sucesso.',
                    })
                  }
                >
                  Enviar para Revisão
                </Button>
              )}
              {dfd.status === 'em_revisao' && podeAprovar && (
                <>
                  <Button
                    size="sm"
                    variant="primary"
                    leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                    isLoading={actionLoading}
                    onClick={() =>
                      runAction(() => sysgovApi.licita.aprovarDfd(dfd.id), {
                        title: 'DFD aprovado',
                        message: 'O DFD foi aprovado com sucesso.',
                      })
                    }
                  >
                    Aprovar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    leftIcon={<XCircle className="h-3.5 w-3.5" />}
                    onClick={() => setShowRejeitar((v) => !v)}
                  >
                    Rejeitar
                  </Button>
                </>
              )}
              {dfd.status === 'em_revisao' && !podeAprovar && (
                <span className="text-xs text-muted-foreground italic">
                  Aguardando aprovação de outro responsável (segregação de funções).
                </span>
              )}
              {dfd.status === 'rejeitado' && can('licita.update') && (
                <Button
                  size="sm"
                  variant="secondary"
                  leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                  isLoading={actionLoading}
                  onClick={() =>
                    runAction(() => sysgovApi.licita.reabrirDfd(dfd.id), {
                      title: 'DFD reaberto',
                      message: 'O DFD voltou para rascunho e já pode ser editado.',
                    })
                  }
                >
                  Reabrir para Edição
                </Button>
              )}
            </div>
          </div>
        )}

        {showRejeitar && dfd && (
          <div className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <label className="block text-sm font-medium text-foreground">Motivo da rejeição *</label>
            <textarea
              value={motivoRejeicao}
              onChange={(e) => setMotivoRejeicao(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowRejeitar(false)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={!motivoRejeicao.trim()}
                isLoading={actionLoading}
                onClick={() =>
                  runAction(() => sysgovApi.licita.rejeitarDfd(dfd.id, motivoRejeicao), {
                    title: 'DFD rejeitado',
                    message: 'A rejeição foi registrada com sucesso.',
                  }).then(() => {
                    setShowRejeitar(false);
                    setMotivoRejeicao('');
                  })
                }
              >
                Confirmar Rejeição
              </Button>
            </div>
          </div>
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

        <DfdForm
          key={dfd?.id ?? 'novo'}
          initialValue={
            dfd
              ? {
                  ...dfd,
                  equipe_planejamento: dfd.equipe_planejamento ?? undefined,
                  campos_extras: dfd.campos_extras ?? undefined,
                  itens: dfd.itens ?? undefined,
                }
              : undefined
          }
          disabled={!editavel}
          submitLabel={dfd ? 'Salvar Alterações' : 'Criar DFD'}
          onSubmit={dfd ? handleUpdate : handleCreate}
          camposExtras={camposExtras}
          camposExtrasItemMaterial={camposExtrasItemMaterial}
          camposExtrasItemServico={camposExtrasItemServico}
        />

        {dfd && (dfd.versoes?.length ?? 0) > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Histórico de Versões</h3>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {[...dfd.versoes].reverse().map((v) => (
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

export default DfdDetailPage;
