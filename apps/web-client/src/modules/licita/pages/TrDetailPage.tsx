import React, { useEffect, useState } from 'react';
import { Card, Button } from '@sysgov/ui';
import { StatusChip, PageHeader, ScreenState, ValidationErrorModal } from '@/components/ui';
import { ArrowLeft, FileSignature } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getApiErrorMessage, getApiValidationErrors, type ApiFieldError } from '@/lib/apiErrors';
import {
  sysgovApi,
  type AcaoVersaoTr,
  type CampoConfig,
  type CreateTrInput,
  type Processo,
  type StatusTr,
  type Tr,
} from '@sysgov/sdk';
import { TrForm } from '../components/TrForm';

interface Toast {
  type: 'success' | 'error';
  title: string;
  message: string;
}

const STATUS_LABEL: Record<StatusTr, string> = {
  rascunho: 'Rascunho',
  aprovado: 'Aprovado',
};

const STATUS_VARIANT: Record<StatusTr, 'neutral' | 'success'> = {
  rascunho: 'neutral',
  aprovado: 'success',
};

const ACAO_LABEL: Record<AcaoVersaoTr, string> = {
  criado: 'Criado',
  revisado: 'Revisado',
  aprovado: 'Aprovado',
};

interface TrDetailPageProps {
  processoId: number;
  onBack: () => void;
  onChanged: (processo: Processo) => void;
}

/**
 * Tela do Termo de Referência — sem aprovação individual: fica em rascunho,
 * sempre editável pela equipe de planejamento, até a aprovação final do
 * Ordenador travar tudo de uma vez (ver AprovacaoOrdenadorPage). Só existe a
 * partir do momento em que há uma Pesquisa de Preços no processo (RN
 * aplicada no backend, TrService::criar) — antes disso mostra um aviso em
 * vez do formulário.
 */
export const TrDetailPage: React.FC<TrDetailPageProps> = ({ processoId, onBack, onChanged }) => {
  const [processo, setProcesso] = useState<Processo | null>(null);
  const [tr, setTr] = useState<Tr | null>(null);
  const [camposExtras, setCamposExtras] = useState<CampoConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ApiFieldError[] | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = (t: Toast) => {
    setToasts((prev) => [...prev, t]);
    window.setTimeout(() => setToasts((prev) => prev.filter((x) => x !== t)), 5000);
  };

  const editavel = tr ? tr.status !== 'aprovado' : true;
  const pesquisaPrecoCadastrada = processo?.pesquisa_preco != null;

  useEffect(() => {
    let cancelado = false;

    const carregar = async () => {
      setLoading(true);
      setError(null);
      try {
        const [processoCompleto, config] = await Promise.all([
          sysgovApi.licita.getProcesso(processoId),
          sysgovApi.licita.getCamposConfiguracao('tr').catch(() => null),
        ]);
        if (cancelado) return;
        setProcesso(processoCompleto);
        setTr(processoCompleto.tr);
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

  const handleCreate = async (data: CreateTrInput) => {
    if (!processo) return;
    try {
      const novo = await sysgovApi.licita.createTr(processo.id, data);
      setTr(novo);
      await refreshProcesso();
      notify({ type: 'success', title: 'Termo de Referência criado', message: 'O rascunho do Termo de Referência foi salvo com sucesso.' });
    } catch (err) {
      const fieldErrors = getApiValidationErrors(err);
      if (fieldErrors) {
        setValidationErrors(fieldErrors);
      } else {
        notify({ type: 'error', title: 'Erro ao criar', message: getApiErrorMessage(err, 'Erro ao criar o Termo de Referência.') });
      }
    }
  };

  const handleUpdate = async (data: CreateTrInput) => {
    if (!tr) return;
    try {
      const atualizado = await sysgovApi.licita.updateTr(tr.id, data);
      setTr(atualizado);
      await refreshProcesso();
      notify({ type: 'success', title: 'Termo de Referência salvo', message: 'As alterações foram salvas com sucesso.' });
    } catch (err) {
      const fieldErrors = getApiValidationErrors(err);
      if (fieldErrors) {
        setValidationErrors(fieldErrors);
      } else {
        notify({ type: 'error', title: 'Erro ao salvar', message: getApiErrorMessage(err, 'Erro ao salvar o Termo de Referência.') });
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
        icon={<FileSignature className="h-6 w-6" />}
        title={`Processo ${processo.numero}/${processo.ano} — Termo de Referência`}
        subtitle={processo.objeto || undefined}
        actions={
          <Button variant="outline" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={onBack}>
            Voltar
          </Button>
        }
      />

      {!pesquisaPrecoCadastrada && !tr ? (
        <Card className="p-6">
          <ScreenState
            type="empty"
            title="Pesquisa de Preços ainda não cadastrada"
            description="O Termo de Referência só pode ser iniciado depois que a Pesquisa de Preços deste processo for cadastrada."
            actionLabel="Voltar"
            onAction={onBack}
          />
        </Card>
      ) : (
        <Card className="p-6 space-y-5">
          {tr && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex items-center gap-3">
                <StatusChip label={STATUS_LABEL[tr.status]} variant={STATUS_VARIANT[tr.status]} />
                <span className="text-xs text-muted-foreground">
                  Elaborado por <span className="font-medium text-foreground">{tr.elaborador?.name ?? '—'}</span>
                </span>
                {tr.aprovador && (
                  <span className="text-xs text-muted-foreground">
                    Aprovado por <span className="font-medium text-foreground">{tr.aprovador.name}</span>
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

          <TrForm
            key={tr ? `${tr.id}-${tr.updated_at}` : 'novo'}
            initialValue={
              tr
                ? {
                    ...tr,
                    equipe_planejamento: tr.equipe_planejamento ?? undefined,
                    campos_extras: tr.campos_extras ?? undefined,
                  }
                : // Ainda não existe TR: pré-preenche com a equipe já
                  // cadastrada na Pesquisa de Preços do processo (mesmo
                  // raciocínio das fases anteriores — ver PesquisaPrecoDetailPage).
                  { equipe_planejamento: processo.pesquisa_preco?.equipe_planejamento ?? undefined }
            }
            disabled={!editavel}
            submitLabel={tr ? 'Salvar Alterações' : 'Criar Termo de Referência'}
            onSubmit={tr ? handleUpdate : handleCreate}
            camposExtras={camposExtras}
          />

          {tr && (tr.versoes?.length ?? 0) > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">Histórico de Versões</h3>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {[...tr.versoes].reverse().map((v) => (
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

export default TrDetailPage;
