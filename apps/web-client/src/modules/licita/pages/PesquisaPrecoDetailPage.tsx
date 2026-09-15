import React, { useEffect, useState } from 'react';
import { Card, Button } from '@sysgov/ui';
import { StatusChip, PageHeader, ScreenState, ValidationErrorModal } from '@/components/ui';
import { ArrowLeft, Search } from 'lucide-react';
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
  aprovado: 'Aprovado',
};

const STATUS_VARIANT: Record<StatusPesquisaPreco, 'neutral' | 'success'> = {
  rascunho: 'neutral',
  aprovado: 'success',
};

const ACAO_LABEL: Record<AcaoVersaoPesquisaPreco, string> = {
  criado: 'Criado',
  revisado: 'Revisado',
  aprovado: 'Aprovado',
};

interface PesquisaPrecoDetailPageProps {
  processoId: number;
  onBack: () => void;
  onChanged: (processo: Processo) => void;
}

/**
 * Tela da Pesquisa de Preços — sem aprovação individual: fica em rascunho,
 * sempre editável pela equipe de planejamento, até a aprovação final do
 * Ordenador travar tudo de uma vez (ver AprovacaoOrdenadorPage). Só existe a
 * partir do momento em que há um Mapa de Riscos no processo (RN aplicada no
 * backend, PesquisaPrecoService::criar) — antes disso mostra um aviso em
 * vez do formulário.
 */
export const PesquisaPrecoDetailPage: React.FC<PesquisaPrecoDetailPageProps> = ({ processoId, onBack, onChanged }) => {
  const [processo, setProcesso] = useState<Processo | null>(null);
  const [pesquisaPreco, setPesquisaPreco] = useState<PesquisaPreco | null>(null);
  const [camposExtras, setCamposExtras] = useState<CampoConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ApiFieldError[] | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = (t: Toast) => {
    setToasts((prev) => [...prev, t]);
    window.setTimeout(() => setToasts((prev) => prev.filter((x) => x !== t)), 5000);
  };

  const editavel = pesquisaPreco ? pesquisaPreco.status !== 'aprovado' : true;
  const mapaRiscoCadastrado = processo?.mapa_risco != null;

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
    try {
      const novo = await sysgovApi.licita.createPesquisaPreco(processo.id, data);
      setPesquisaPreco(novo);
      await refreshProcesso();
      notify({ type: 'success', title: 'Pesquisa de Preços criada', message: 'O rascunho da Pesquisa de Preços foi salvo com sucesso.' });
    } catch (err) {
      const fieldErrors = getApiValidationErrors(err);
      if (fieldErrors) {
        setValidationErrors(fieldErrors);
      } else {
        notify({ type: 'error', title: 'Erro ao criar', message: getApiErrorMessage(err, 'Erro ao criar a Pesquisa de Preços.') });
      }
    }
  };

  const handleUpdate = async (data: CreatePesquisaPrecoInput) => {
    if (!pesquisaPreco) return;
    try {
      const atualizado = await sysgovApi.licita.updatePesquisaPreco(pesquisaPreco.id, data);
      setPesquisaPreco(atualizado);
      await refreshProcesso();
      notify({ type: 'success', title: 'Pesquisa de Preços salva', message: 'As alterações foram salvas com sucesso.' });
    } catch (err) {
      const fieldErrors = getApiValidationErrors(err);
      if (fieldErrors) {
        setValidationErrors(fieldErrors);
      } else {
        notify({ type: 'error', title: 'Erro ao salvar', message: getApiErrorMessage(err, 'Erro ao salvar a Pesquisa de Preços.') });
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
        icon={<Search className="h-6 w-6" />}
        title={`Processo ${processo.numero}/${processo.ano} — Pesquisa de Preços`}
        subtitle={processo.objeto || undefined}
        actions={
          <Button variant="outline" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={onBack}>
            Voltar
          </Button>
        }
      />

      {!mapaRiscoCadastrado && !pesquisaPreco ? (
        <Card className="p-6">
          <ScreenState
            type="empty"
            title="Mapa de Riscos ainda não cadastrado"
            description="A Pesquisa de Preços só pode ser iniciada depois que o Mapa de Riscos deste processo for cadastrado."
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
                      tipo: item.tipo,
                      cotacoes: [],
                    })),
                  }
            }
            disabled={!editavel}
            submitLabel={pesquisaPreco ? 'Salvar Alterações' : 'Criar Pesquisa de Preços'}
            onSubmit={pesquisaPreco ? handleUpdate : handleCreate}
            camposExtras={camposExtras}
            processoId={processoId}
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
