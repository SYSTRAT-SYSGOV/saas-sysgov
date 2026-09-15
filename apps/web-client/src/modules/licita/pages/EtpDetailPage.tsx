import React, { useEffect, useState } from 'react';
import { Card, Button } from '@sysgov/ui';
import { StatusChip, PageHeader, ScreenState, ValidationErrorModal } from '@/components/ui';
import { ArrowLeft, ClipboardList } from 'lucide-react';
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
  aprovado: 'Aprovado',
};

const STATUS_VARIANT: Record<StatusEtp, 'neutral' | 'success'> = {
  rascunho: 'neutral',
  aprovado: 'success',
};

const ACAO_LABEL: Record<AcaoVersaoEtp, string> = {
  criado: 'Criado',
  revisado: 'Revisado',
  aprovado: 'Aprovado',
};

interface EtpDetailPageProps {
  processoId: number;
  onBack: () => void;
  onChanged: (processo: Processo) => void;
}

/**
 * Tela do ETP — sem aprovação individual: fica em rascunho, sempre editável
 * pela equipe de planejamento, até a aprovação final do Ordenador travar
 * tudo de uma vez (ver AprovacaoOrdenadorPage). Só existe a partir do
 * momento em que há um DFD no processo (RN aplicada no backend,
 * EtpService::criar) — antes disso mostra um aviso em vez do formulário.
 */
export const EtpDetailPage: React.FC<EtpDetailPageProps> = ({ processoId, onBack, onChanged }) => {
  const [processo, setProcesso] = useState<Processo | null>(null);
  const [etp, setEtp] = useState<Etp | null>(null);
  const [camposExtras, setCamposExtras] = useState<CampoConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ApiFieldError[] | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = (t: Toast) => {
    setToasts((prev) => [...prev, t]);
    window.setTimeout(() => setToasts((prev) => prev.filter((x) => x !== t)), 5000);
  };

  const editavel = etp ? etp.status !== 'aprovado' : true;
  const dfdCadastrado = processo?.dfd != null;

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
    try {
      const novoEtp = await sysgovApi.licita.createEtp(processo.id, data);
      setEtp(novoEtp);
      await refreshProcesso();
      notify({ type: 'success', title: 'ETP criado', message: 'O rascunho do ETP foi salvo com sucesso.' });
    } catch (err) {
      const fieldErrors = getApiValidationErrors(err);
      if (fieldErrors) {
        setValidationErrors(fieldErrors);
      } else {
        notify({ type: 'error', title: 'Erro ao criar ETP', message: getApiErrorMessage(err, 'Erro ao criar o ETP.') });
      }
    }
  };

  const handleUpdate = async (data: CreateEtpInput) => {
    if (!etp) return;
    try {
      const atualizado = await sysgovApi.licita.updateEtp(etp.id, data);
      setEtp(atualizado);
      await refreshProcesso();
      notify({ type: 'success', title: 'ETP salvo', message: 'As alterações foram salvas com sucesso.' });
    } catch (err) {
      const fieldErrors = getApiValidationErrors(err);
      if (fieldErrors) {
        setValidationErrors(fieldErrors);
      } else {
        notify({ type: 'error', title: 'Erro ao salvar', message: getApiErrorMessage(err, 'Erro ao salvar o ETP.') });
      }
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

      {!dfdCadastrado && !etp ? (
        <Card className="p-6">
          <ScreenState
            type="empty"
            title="DFD ainda não cadastrado"
            description="O Estudo Técnico Preliminar (ETP) só pode ser iniciado depois que o DFD deste processo for cadastrado."
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
