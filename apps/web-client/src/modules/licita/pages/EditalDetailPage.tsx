import React, { useEffect, useState } from 'react';
import { Card, Button } from '@sysgov/ui';
import { StatusChip, PageHeader, ScreenState, ValidationErrorModal } from '@/components/ui';
import { ArrowLeft, ScrollText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getApiErrorMessage, getApiValidationErrors, type ApiFieldError } from '@/lib/apiErrors';
import {
  sysgovApi,
  type AcaoVersaoEdital,
  type CampoConfig,
  type CreateEditalInput,
  type Edital,
  type Processo,
  type StatusEdital,
} from '@sysgov/sdk';
import { EditalForm } from '../components/EditalForm';

interface Toast {
  type: 'success' | 'error';
  title: string;
  message: string;
}

const STATUS_LABEL: Record<StatusEdital, string> = {
  rascunho: 'Rascunho',
  aprovado: 'Aprovado',
};

const STATUS_VARIANT: Record<StatusEdital, 'neutral' | 'success'> = {
  rascunho: 'neutral',
  aprovado: 'success',
};

const ACAO_LABEL: Record<AcaoVersaoEdital, string> = {
  criado: 'Criado',
  revisado: 'Revisado',
  aprovado: 'Aprovado',
};

interface EditalDetailPageProps {
  processoId: number;
  onBack: () => void;
  onChanged: (processo: Processo) => void;
}

/**
 * Tela do Edital — sem aprovação individual: fica em rascunho, sempre
 * editável pela equipe de planejamento, até a aprovação final do Ordenador
 * travar tudo de uma vez (ver AprovacaoOrdenadorPage). Só existe a partir do
 * momento em que há um Termo de Referência no processo (RN aplicada no
 * backend, EditalService::criar) — antes disso mostra um aviso em vez do
 * formulário. Mesmo padrão do TrDetailPage.
 */
export const EditalDetailPage: React.FC<EditalDetailPageProps> = ({ processoId, onBack, onChanged }) => {
  const [processo, setProcesso] = useState<Processo | null>(null);
  const [edital, setEdital] = useState<Edital | null>(null);
  const [camposExtras, setCamposExtras] = useState<CampoConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ApiFieldError[] | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = (t: Toast) => {
    setToasts((prev) => [...prev, t]);
    window.setTimeout(() => setToasts((prev) => prev.filter((x) => x !== t)), 5000);
  };

  const editavel = edital ? edital.status !== 'aprovado' : true;
  const trCadastrado = processo?.tr != null;

  useEffect(() => {
    let cancelado = false;

    const carregar = async () => {
      setLoading(true);
      setError(null);
      try {
        const [processoCompleto, config] = await Promise.all([
          sysgovApi.licita.getProcesso(processoId),
          sysgovApi.licita.getCamposConfiguracao('edital').catch(() => null),
        ]);
        if (cancelado) return;
        setProcesso(processoCompleto);
        setEdital(processoCompleto.edital);
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

  const handleCreate = async (data: CreateEditalInput) => {
    if (!processo) return;
    try {
      const novo = await sysgovApi.licita.createEdital(processo.id, data);
      setEdital(novo);
      await refreshProcesso();
      notify({ type: 'success', title: 'Edital criado', message: 'O rascunho do Edital foi salvo com sucesso.' });
    } catch (err) {
      const fieldErrors = getApiValidationErrors(err);
      if (fieldErrors) {
        setValidationErrors(fieldErrors);
      } else {
        notify({ type: 'error', title: 'Erro ao criar', message: getApiErrorMessage(err, 'Erro ao criar o Edital.') });
      }
    }
  };

  const handleUpdate = async (data: CreateEditalInput) => {
    if (!edital) return;
    try {
      const atualizado = await sysgovApi.licita.updateEdital(edital.id, data);
      setEdital(atualizado);
      await refreshProcesso();
      notify({ type: 'success', title: 'Edital salvo', message: 'As alterações foram salvas com sucesso.' });
    } catch (err) {
      const fieldErrors = getApiValidationErrors(err);
      if (fieldErrors) {
        setValidationErrors(fieldErrors);
      } else {
        notify({ type: 'error', title: 'Erro ao salvar', message: getApiErrorMessage(err, 'Erro ao salvar o Edital.') });
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
        icon={<ScrollText className="h-6 w-6" />}
        title={`Processo ${processo.numero}/${processo.ano} — Edital`}
        subtitle={processo.objeto || undefined}
        actions={
          <Button variant="outline" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={onBack}>
            Voltar
          </Button>
        }
      />

      {!trCadastrado && !edital ? (
        <Card className="p-6">
          <ScreenState
            type="empty"
            title="Termo de Referência ainda não cadastrado"
            description="O Edital só pode ser iniciado depois que o Termo de Referência deste processo for cadastrado."
            actionLabel="Voltar"
            onAction={onBack}
          />
        </Card>
      ) : (
        <Card className="p-6 space-y-5">
          {edital && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex items-center gap-3">
                <StatusChip label={STATUS_LABEL[edital.status]} variant={STATUS_VARIANT[edital.status]} />
                <span className="text-xs text-muted-foreground">
                  Elaborado por <span className="font-medium text-foreground">{edital.elaborador?.name ?? '—'}</span>
                </span>
                {edital.aprovador && (
                  <span className="text-xs text-muted-foreground">
                    Aprovado por <span className="font-medium text-foreground">{edital.aprovador.name}</span>
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

          <EditalForm
            key={edital ? `${edital.id}-${edital.updated_at}` : 'novo'}
            initialValue={
              edital
                ? {
                    ...edital,
                    equipe_planejamento: edital.equipe_planejamento ?? undefined,
                    campos_extras: edital.campos_extras ?? undefined,
                  }
                : // Ainda não existe Edital: o backend pré-preenche objeto/
                  // critério de julgamento/sanções a partir do DFD/TR ao
                  // criar (ver EditalService::criar) — aqui só antecipamos a
                  // equipe, mesmo raciocínio das fases anteriores.
                  { equipe_planejamento: processo.tr?.equipe_planejamento ?? undefined }
            }
            disabled={!editavel}
            submitLabel={edital ? 'Salvar Alterações' : 'Criar Edital'}
            onSubmit={edital ? handleUpdate : handleCreate}
            camposExtras={camposExtras}
          />

          {edital && (edital.versoes?.length ?? 0) > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">Histórico de Versões</h3>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {[...edital.versoes].reverse().map((v) => (
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

export default EditalDetailPage;
