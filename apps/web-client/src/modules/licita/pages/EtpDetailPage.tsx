import React, { useEffect, useState } from 'react';
import { Card, Button } from '@sysgov/ui';
import { StatusChip, PageHeader, ScreenState, ValidationErrorModal, ConfirmDialog } from '@/components/ui';
import { ArrowLeft, ClipboardList, CheckCircle2, XCircle, Send, RotateCcw } from 'lucide-react';
import { useAuth } from '@/core/auth/useAuth';
import { useCan } from '@/core/rbac/useCan';
import { cn } from '@/lib/utils';
import { getApiErrorMessage, getApiValidationErrors, type ApiFieldError } from '@/lib/apiErrors';
import { sysgovApi, type AcaoVersaoEtp, type CampoConfig, type CreateEtpInput, type Etp, type Processo, type StatusEtp } from '@sysgov/sdk';
import { EtpForm } from '../components/EtpForm';

interface Toast {
  type: 'success' | 'error';
  title: string;
  message: string;
}

const STATUS_LABEL: Record<StatusEtp, string> = {
  rascunho: 'Rascunho',
  em_revisao: 'Em Revisão',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
};

const STATUS_VARIANT: Record<StatusEtp, 'neutral' | 'warning' | 'success' | 'danger'> = {
  rascunho: 'neutral',
  em_revisao: 'warning',
  aprovado: 'success',
  rejeitado: 'danger',
};

const ACAO_LABEL: Record<AcaoVersaoEtp, string> = {
  criado: 'Criado',
  revisado: 'Revisado',
  enviado_revisao: 'Enviado para revisão',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
  reaberto: 'Reaberto para edição',
};

interface EtpDetailPageProps {
  processoId: number;
  onBack: () => void;
  onChanged: (processo: Processo) => void;
}

/**
 * Tela do ETP — mesma estrutura de ações da tela do DFD (DfdDetailPage):
 * criar/editar, enviar para revisão, aprovar/rejeitar com motivo, reabrir.
 * Só existe a partir do momento em que o DFD do processo está aprovado
 * (RN aplicada no backend, EtpService::criar) — antes disso mostra um aviso
 * em vez do formulário.
 */
export const EtpDetailPage: React.FC<EtpDetailPageProps> = ({ processoId, onBack, onChanged }) => {
  const { user } = useAuth();
  const { can } = useCan();
  const [processo, setProcesso] = useState<Processo | null>(null);
  const [etp, setEtp] = useState<Etp | null>(null);
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

  const podeAprovar = can('licita.aprovar') && etp?.elaborado_por !== user?.id;
  const editavel = etp ? ['rascunho', 'em_revisao', 'rejeitado'].includes(etp.status) : true;
  const dfdAprovado = processo?.dfd?.status === 'aprovado';

  useEffect(() => {
    let cancelado = false;

    const carregar = async () => {
      setLoading(true);
      setError(null);
      try {
        const [processoCompleto, config] = await Promise.all([
          sysgovApi.licita.getProcesso(processoId),
          sysgovApi.licita.getCamposConfiguracao('etp').catch(() => null),
        ]);
        if (cancelado) return;
        setProcesso(processoCompleto);
        setEtp(processoCompleto.etp);
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

  const handleCreate = async (data: CreateEtpInput) => {
    if (!processo) return;
    const novoEtp = await sysgovApi.licita.createEtp(processo.id, data);
    setEtp(novoEtp);
    await refreshProcesso();
    notify({ type: 'success', title: 'ETP criado', message: 'O rascunho do ETP foi salvo com sucesso.' });
  };

  const handleUpdate = async (data: CreateEtpInput) => {
    if (!etp) return;
    const atualizado = await sysgovApi.licita.updateEtp(etp.id, data);
    setEtp(atualizado);
    await refreshProcesso();
    notify({ type: 'success', title: 'ETP salvo', message: 'As alterações foram salvas com sucesso.' });
  };

  const runAction = async (action: () => Promise<Etp>, sucesso: { title: string; message: string }) => {
    setActionError(null);
    setValidationErrors(null);
    setActionLoading(true);
    try {
      const atualizado = await action();
      setEtp(atualizado);
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
        icon={<ClipboardList className="h-6 w-6" />}
        title={`Processo ${processo.numero}/${processo.ano} — ETP`}
        subtitle={processo.objeto || undefined}
        actions={
          <Button variant="outline" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={onBack}>
            Voltar
          </Button>
        }
      />

      {!dfdAprovado && !etp ? (
        <Card className="p-6">
          <ScreenState
            type="empty"
            title="DFD ainda não aprovado"
            description="O Estudo Técnico Preliminar (ETP) só pode ser iniciado depois que o DFD deste processo for aprovado."
            actionLabel="Voltar"
            onAction={onBack}
          />
        </Card>
      ) : (
        <Card className="p-6 space-y-5">
          {etp && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex items-center gap-3">
                <StatusChip label={STATUS_LABEL[etp.status]} variant={STATUS_VARIANT[etp.status]} />
                <span className="text-xs text-muted-foreground">
                  Elaborado por <span className="font-medium text-foreground">{etp.elaborador?.name ?? '—'}</span>
                </span>
                {etp.aprovador && (
                  <span className="text-xs text-muted-foreground">
                    Aprovado por <span className="font-medium text-foreground">{etp.aprovador.name}</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {etp.status === 'rascunho' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    leftIcon={<Send className="h-3.5 w-3.5" />}
                    isLoading={actionLoading}
                    onClick={() =>
                      runAction(() => sysgovApi.licita.enviarEtpParaRevisao(etp.id), {
                        title: 'Enviado para revisão',
                        message: 'O ETP foi enviado para revisão com sucesso.',
                      })
                    }
                  >
                    Enviar para Revisão
                  </Button>
                )}
                {etp.status === 'em_revisao' && podeAprovar && (
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
                {etp.status === 'em_revisao' && !podeAprovar && (
                  <span className="text-xs text-muted-foreground italic">
                    Aguardando aprovação de outro responsável (segregação de funções).
                  </span>
                )}
                {etp.status === 'rejeitado' && can('licita.update') && (
                  <Button
                    size="sm"
                    variant="secondary"
                    leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                    isLoading={actionLoading}
                    onClick={() =>
                      runAction(() => sysgovApi.licita.reabrirEtp(etp.id), {
                        title: 'ETP reaberto',
                        message: 'O ETP voltou para rascunho e já pode ser editado.',
                      })
                    }
                  >
                    Reabrir para Edição
                  </Button>
                )}
              </div>
            </div>
          )}

          {etp && (
            <>
              <ConfirmDialog
                open={confirmAprovar}
                onClose={() => setConfirmAprovar(false)}
                destructive={false}
                requireReason={false}
                confirmLabel="Aprovar"
                title="Aprovar ETP"
                description="Confirma a aprovação deste ETP? Depois de aprovado, o documento fica imutável e o processo avança para a próxima fase (Mapa de Riscos)."
                onConfirm={() => {
                  setConfirmAprovar(false);
                  runAction(() => sysgovApi.licita.aprovarEtp(etp.id), {
                    title: 'ETP aprovado',
                    message: 'O ETP foi aprovado com sucesso.',
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
                title="Rejeitar ETP"
                description="Confirma a rejeição deste ETP? Ele voltará para rascunho, o elaborador poderá editá-lo e reenviar para revisão."
                onConfirm={(motivo) => {
                  setConfirmRejeitar(false);
                  runAction(() => sysgovApi.licita.rejeitarEtp(etp.id, motivo), {
                    title: 'ETP rejeitado',
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

          <EtpForm
            key={etp ? `${etp.id}-${etp.updated_at}` : 'novo'}
            initialValue={
              etp
                ? {
                    ...etp,
                    equipe_planejamento: etp.equipe_planejamento ?? undefined,
                    campos_extras: etp.campos_extras ?? undefined,
                  }
                : // Ainda não existe ETP: pré-preenche com a equipe já
                  // cadastrada no DFD do processo (o backend faz a mesma
                  // cópia ao criar se o campo vier vazio — EtpService::criar
                  // — mas sem isso aqui o usuário só veria a equipe depois
                  // de salvar, e não teria chance de ajustá-la antes).
                  { equipe_planejamento: processo.dfd?.equipe_planejamento ?? undefined }
            }
            objetoProcesso={processo.objeto}
            disabled={!editavel}
            submitLabel={etp ? 'Salvar Alterações' : 'Criar ETP'}
            onSubmit={etp ? handleUpdate : handleCreate}
            camposExtras={camposExtras}
          />

          {etp && (etp.versoes?.length ?? 0) > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">Histórico de Versões</h3>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {[...etp.versoes].reverse().map((v) => (
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

export default EtpDetailPage;
