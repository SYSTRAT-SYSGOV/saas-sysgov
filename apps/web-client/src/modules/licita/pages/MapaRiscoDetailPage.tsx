import React, { useEffect, useState } from 'react';
import { Card, Button } from '@sysgov/ui';
import { StatusChip, PageHeader, ScreenState, ValidationErrorModal, ConfirmDialog } from '@/components/ui';
import { ArrowLeft, ShieldAlert, CheckCircle2, XCircle, Send, RotateCcw } from 'lucide-react';
import { useAuth } from '@/core/auth/useAuth';
import { useCan } from '@/core/rbac/useCan';
import { cn } from '@/lib/utils';
import { getApiErrorMessage, getApiValidationErrors, type ApiFieldError } from '@/lib/apiErrors';
import {
  sysgovApi,
  type AcaoVersaoMapaRisco,
  type CampoConfig,
  type CreateMapaRiscoInput,
  type MapaRisco,
  type Processo,
  type StatusMapaRisco,
} from '@sysgov/sdk';
import { MapaRiscoForm } from '../components/MapaRiscoForm';

interface Toast {
  type: 'success' | 'error';
  title: string;
  message: string;
}

const STATUS_LABEL: Record<StatusMapaRisco, string> = {
  rascunho: 'Rascunho',
  em_revisao: 'Em Revisão',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
};

const STATUS_VARIANT: Record<StatusMapaRisco, 'neutral' | 'warning' | 'success' | 'danger'> = {
  rascunho: 'neutral',
  em_revisao: 'warning',
  aprovado: 'success',
  rejeitado: 'danger',
};

const ACAO_LABEL: Record<AcaoVersaoMapaRisco, string> = {
  criado: 'Criado',
  revisado: 'Revisado',
  enviado_revisao: 'Enviado para revisão',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
  reaberto: 'Reaberto para edição',
};

interface MapaRiscoDetailPageProps {
  processoId: number;
  onBack: () => void;
  onChanged: (processo: Processo) => void;
}

/**
 * Tela do Mapa de Riscos — mesma estrutura de ações das telas do DFD/ETP:
 * criar/editar, enviar para revisão, aprovar/rejeitar com motivo, reabrir.
 * Só existe a partir do momento em que o ETP do processo está aprovado
 * (RN aplicada no backend, MapaRiscoService::criar) — antes disso mostra um
 * aviso em vez do formulário.
 */
export const MapaRiscoDetailPage: React.FC<MapaRiscoDetailPageProps> = ({ processoId, onBack, onChanged }) => {
  const { user } = useAuth();
  const { can } = useCan();
  const [processo, setProcesso] = useState<Processo | null>(null);
  const [mapaRisco, setMapaRisco] = useState<MapaRisco | null>(null);
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

  const podeAprovar = can('licita.aprovar') && mapaRisco?.elaborado_por !== user?.id;
  const editavel = mapaRisco ? ['rascunho', 'em_revisao', 'rejeitado'].includes(mapaRisco.status) : true;
  const etpAprovado = processo?.etp?.status === 'aprovado';

  useEffect(() => {
    let cancelado = false;

    const carregar = async () => {
      setLoading(true);
      setError(null);
      try {
        const [processoCompleto, config] = await Promise.all([
          sysgovApi.licita.getProcesso(processoId),
          sysgovApi.licita.getCamposConfiguracao('mapa_riscos').catch(() => null),
        ]);
        if (cancelado) return;
        setProcesso(processoCompleto);
        setMapaRisco(processoCompleto.mapa_risco);
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

  const handleCreate = async (data: CreateMapaRiscoInput) => {
    if (!processo) return;
    const novo = await sysgovApi.licita.createMapaRisco(processo.id, data);
    setMapaRisco(novo);
    await refreshProcesso();
    notify({ type: 'success', title: 'Mapa de Riscos criado', message: 'O rascunho do Mapa de Riscos foi salvo com sucesso.' });
  };

  const handleUpdate = async (data: CreateMapaRiscoInput) => {
    if (!mapaRisco) return;
    const atualizado = await sysgovApi.licita.updateMapaRisco(mapaRisco.id, data);
    setMapaRisco(atualizado);
    await refreshProcesso();
    notify({ type: 'success', title: 'Mapa de Riscos salvo', message: 'As alterações foram salvas com sucesso.' });
  };

  const runAction = async (action: () => Promise<MapaRisco>, sucesso: { title: string; message: string }) => {
    setActionError(null);
    setValidationErrors(null);
    setActionLoading(true);
    try {
      const atualizado = await action();
      setMapaRisco(atualizado);
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
        icon={<ShieldAlert className="h-6 w-6" />}
        title={`Processo ${processo.numero}/${processo.ano} — Mapa de Riscos`}
        subtitle={processo.objeto || undefined}
        actions={
          <Button variant="outline" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={onBack}>
            Voltar
          </Button>
        }
      />

      {!etpAprovado && !mapaRisco ? (
        <Card className="p-6">
          <ScreenState
            type="empty"
            title="ETP ainda não aprovado"
            description="O Mapa de Riscos só pode ser iniciado depois que o ETP deste processo for aprovado."
            actionLabel="Voltar"
            onAction={onBack}
          />
        </Card>
      ) : (
        <Card className="p-6 space-y-5">
          {mapaRisco && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex items-center gap-3">
                <StatusChip label={STATUS_LABEL[mapaRisco.status]} variant={STATUS_VARIANT[mapaRisco.status]} />
                <span className="text-xs text-muted-foreground">
                  Elaborado por <span className="font-medium text-foreground">{mapaRisco.elaborador?.name ?? '—'}</span>
                </span>
                {mapaRisco.aprovador && (
                  <span className="text-xs text-muted-foreground">
                    Aprovado por <span className="font-medium text-foreground">{mapaRisco.aprovador.name}</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {mapaRisco.status === 'rascunho' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    leftIcon={<Send className="h-3.5 w-3.5" />}
                    isLoading={actionLoading}
                    onClick={() =>
                      runAction(() => sysgovApi.licita.enviarMapaRiscoParaRevisao(mapaRisco.id), {
                        title: 'Enviado para revisão',
                        message: 'O Mapa de Riscos foi enviado para revisão com sucesso.',
                      })
                    }
                  >
                    Enviar para Revisão
                  </Button>
                )}
                {mapaRisco.status === 'em_revisao' && podeAprovar && (
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
                {mapaRisco.status === 'em_revisao' && !podeAprovar && (
                  <span className="text-xs text-muted-foreground italic">
                    Aguardando aprovação de outro responsável (segregação de funções).
                  </span>
                )}
                {mapaRisco.status === 'rejeitado' && can('licita.update') && (
                  <Button
                    size="sm"
                    variant="secondary"
                    leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                    isLoading={actionLoading}
                    onClick={() =>
                      runAction(() => sysgovApi.licita.reabrirMapaRisco(mapaRisco.id), {
                        title: 'Mapa de Riscos reaberto',
                        message: 'O Mapa de Riscos voltou para rascunho e já pode ser editado.',
                      })
                    }
                  >
                    Reabrir para Edição
                  </Button>
                )}
              </div>
            </div>
          )}

          {mapaRisco && (
            <>
              <ConfirmDialog
                open={confirmAprovar}
                onClose={() => setConfirmAprovar(false)}
                destructive={false}
                requireReason={false}
                confirmLabel="Aprovar"
                title="Aprovar Mapa de Riscos"
                description="Confirma a aprovação deste Mapa de Riscos? Depois de aprovado, o documento fica imutável e o processo avança para a próxima fase (Pesquisa de Preços)."
                onConfirm={() => {
                  setConfirmAprovar(false);
                  runAction(() => sysgovApi.licita.aprovarMapaRisco(mapaRisco.id), {
                    title: 'Mapa de Riscos aprovado',
                    message: 'O Mapa de Riscos foi aprovado com sucesso.',
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
                title="Rejeitar Mapa de Riscos"
                description="Confirma a rejeição deste Mapa de Riscos? Ele voltará para rascunho, o elaborador poderá editá-lo e reenviar para revisão."
                onConfirm={(motivo) => {
                  setConfirmRejeitar(false);
                  runAction(() => sysgovApi.licita.rejeitarMapaRisco(mapaRisco.id, motivo), {
                    title: 'Mapa de Riscos rejeitado',
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

          <MapaRiscoForm
            key={mapaRisco ? `${mapaRisco.id}-${mapaRisco.updated_at}` : 'novo'}
            initialValue={
              mapaRisco
                ? {
                    ...mapaRisco,
                    riscos: mapaRisco.riscos ?? undefined,
                    equipe_planejamento: mapaRisco.equipe_planejamento ?? undefined,
                    campos_extras: mapaRisco.campos_extras ?? undefined,
                  }
                : // Ainda não existe Mapa de Riscos: pré-preenche com a equipe
                  // já cadastrada no ETP do processo (mesmo raciocínio do
                  // ETP em relação ao DFD — ver EtpDetailPage).
                  { equipe_planejamento: processo.etp?.equipe_planejamento ?? undefined }
            }
            disabled={!editavel}
            submitLabel={mapaRisco ? 'Salvar Alterações' : 'Criar Mapa de Riscos'}
            onSubmit={mapaRisco ? handleUpdate : handleCreate}
            camposExtras={camposExtras}
          />

          {mapaRisco && (mapaRisco.versoes?.length ?? 0) > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">Histórico de Versões</h3>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {[...mapaRisco.versoes].reverse().map((v) => (
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

export default MapaRiscoDetailPage;
