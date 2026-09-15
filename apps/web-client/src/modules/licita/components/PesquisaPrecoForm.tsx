import React, { useMemo, useState } from 'react';
import { Button, Select } from '@sysgov/ui';
import { Plus, Trash2 } from 'lucide-react';
import type {
  CampoConfig,
  CotacaoItemPesquisaPreco,
  CreatePesquisaPrecoInput,
  ItemPesquisaPreco,
  MembroEquipePlanejamento,
  MetodoReferenciaPreco,
} from '@sysgov/sdk';
import { CamposExtrasFields } from './CamposExtrasFields';
import { ValidationErrorModal } from '@/components/ui';
import { getApiErrorMessage, getApiValidationErrors, type ApiFieldError } from '@/lib/apiErrors';
import { MINIMO_COTACOES_POR_ITEM, METODO_REFERENCIA_LABEL, cotacoesValidas, valorReferenciaItem } from '../utils/precoReferencia';

const emptyMembro: MembroEquipePlanejamento = { nome: '', cargo: '', matricula: '' };

const emptyCotacao: CotacaoItemPesquisaPreco = {
  fonte: '',
  fornecedor: '',
  valor_unitario: 0,
  data_cotacao: '',
  referencia: '',
};

const METODO_OPTIONS: { value: MetodoReferenciaPreco; label: string }[] = (
  ['mediana', 'media', 'menor_valor'] as MetodoReferenciaPreco[]
).map((value) => ({ value, label: METODO_REFERENCIA_LABEL[value] }));

/** Aba usada por campos sem `aba` definida — sempre a primeira (ver DfdForm/EtpForm/MapaRiscoForm, mesmo padrão). */
const ABA_PADRAO = 'Geral';

function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

interface PesquisaPrecoFormProps {
  initialValue?: Partial<CreatePesquisaPrecoInput>;
  disabled?: boolean;
  submitLabel: string;
  onSubmit: (data: CreatePesquisaPrecoInput) => Promise<void> | void;
  /** Campos extras configurados pelo órgão para a Pesquisa de Preços (ver CamposConfiguracaoPage). */
  camposExtras?: CampoConfig[];
}

/**
 * Formulário da Pesquisa de Preços — os itens (codigo/descricao/unidade/
 * quantidade) vêm fixos do DFD do processo (não são editáveis aqui: quem
 * quiser mudar um item precisa reabrir o DFD, isso é intencional, ver
 * PesquisaPrecoService::criar); o que se edita por item é a lista de
 * cotações (mínimo 3 fontes válidas por item para poder enviar para
 * revisão — RN-006). O valor de referência de cada item é só exibido
 * (calculado no cliente conforme o método escolhido), nunca enviado ao
 * backend.
 */
export const PesquisaPrecoForm: React.FC<PesquisaPrecoFormProps> = ({
  initialValue,
  disabled,
  submitLabel,
  onSubmit,
  camposExtras = [],
}) => {
  const [equipe, setEquipe] = useState<MembroEquipePlanejamento[]>(
    initialValue?.equipe_planejamento && initialValue.equipe_planejamento.length > 0
      ? initialValue.equipe_planejamento
      : [{ ...emptyMembro }, { ...emptyMembro }],
  );
  const [itens, setItens] = useState<ItemPesquisaPreco[]>(initialValue?.itens ?? []);
  const [metodoReferencia, setMetodoReferencia] = useState<MetodoReferenciaPreco>(
    initialValue?.metodo_referencia ?? 'mediana',
  );
  const [justificativaMetodo, setJustificativaMetodo] = useState(initialValue?.justificativa_metodo ?? '');
  const [camposExtrasValores, setCamposExtrasValores] = useState<Record<string, unknown>>(
    initialValue?.campos_extras ?? {},
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ApiFieldError[] | null>(null);
  const [abaAtiva, setAbaAtiva] = useState(ABA_PADRAO);

  const camposExtrasPorAba = useMemo(() => {
    const ordenados = [...camposExtras].sort((a, b) => a.ordem - b.ordem);
    const porAba = new Map<string, CampoConfig[]>();
    for (const campo of ordenados) {
      const aba = campo.aba?.trim() || ABA_PADRAO;
      if (!porAba.has(aba)) porAba.set(aba, []);
      porAba.get(aba)!.push(campo);
    }
    return porAba;
  }, [camposExtras]);

  const nomesAbas = useMemo(() => {
    const nomes = [ABA_PADRAO];
    for (const aba of camposExtrasPorAba.keys()) {
      if (!nomes.includes(aba)) nomes.push(aba);
    }
    return nomes;
  }, [camposExtrasPorAba]);

  const abaAtivaSegura = nomesAbas.includes(abaAtiva) ? abaAtiva : ABA_PADRAO;

  const updateMembro = (index: number, patch: Partial<MembroEquipePlanejamento>) => {
    setEquipe((prev) => prev.map((m, i) => (i === index ? { ...m, ...patch } : m)));
  };

  const updateCotacao = (itemIndex: number, cotacaoIndex: number, patch: Partial<CotacaoItemPesquisaPreco>) => {
    setItens((prev) =>
      prev.map((item, i) =>
        i === itemIndex
          ? { ...item, cotacoes: item.cotacoes.map((c, j) => (j === cotacaoIndex ? { ...c, ...patch } : c)) }
          : item,
      ),
    );
  };

  const addCotacao = (itemIndex: number) => {
    setItens((prev) => prev.map((item, i) => (i === itemIndex ? { ...item, cotacoes: [...item.cotacoes, { ...emptyCotacao }] } : item)));
  };

  const removeCotacao = (itemIndex: number, cotacaoIndex: number) => {
    setItens((prev) =>
      prev.map((item, i) => (i === itemIndex ? { ...item, cotacoes: item.cotacoes.filter((_, j) => j !== cotacaoIndex) } : item)),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setValidationErrors(null);
    setSaving(true);
    try {
      await onSubmit({
        itens,
        metodo_referencia: metodoReferencia,
        justificativa_metodo: justificativaMetodo || null,
        equipe_planejamento: equipe.filter((m) => m.nome && m.cargo && m.matricula),
        campos_extras: camposExtrasValores,
      });
    } catch (err) {
      const fieldErrors = getApiValidationErrors(err);
      if (fieldErrors) {
        setValidationErrors(fieldErrors);
      } else {
        setError(getApiErrorMessage(err, 'Erro ao salvar a Pesquisa de Preços.'));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <ValidationErrorModal
        open={validationErrors !== null}
        onClose={() => setValidationErrors(null)}
        errors={validationErrors ?? []}
      />
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {nomesAbas.length > 1 && (
        <div className="flex gap-1 border-b border-border">
          {nomesAbas.map((aba) => (
            <button
              key={aba}
              type="button"
              onClick={() => setAbaAtiva(aba)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                abaAtivaSegura === aba
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {aba}
            </button>
          ))}
        </div>
      )}

      {abaAtivaSegura === ABA_PADRAO && (
      <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Método de Cálculo do Valor de Referência</label>
          <Select
            value={metodoReferencia}
            onChange={(v) => setMetodoReferencia(v as MetodoReferenciaPreco)}
            options={METODO_OPTIONS}
            disabled={disabled}
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Justificativa do Método (se diferente da mediana)</label>
          <input
            type="text"
            disabled={disabled}
            value={justificativaMetodo ?? ''}
            onChange={(e) => setJustificativaMetodo(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Itens e Cotações <span className="font-normal text-muted-foreground">(mínimo {MINIMO_COTACOES_POR_ITEM} fontes por item para enviar à revisão)</span>
        </label>

        {itens.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            Nenhum item encontrado. Os itens da Pesquisa de Preços vêm do DFD deste processo — cadastre itens no DFD antes de continuar.
          </div>
        )}

        <div className="space-y-3">
          {itens.map((item, itemIndex) => {
            const validas = cotacoesValidas(item.cotacoes);
            const referencia = valorReferenciaItem(item.cotacoes, metodoReferencia);
            const completo = validas.length >= MINIMO_COTACOES_POR_ITEM;

            return (
              <div key={itemIndex} className="rounded-lg border border-border p-3 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-mono font-bold text-muted-foreground">{item.codigo}</span>
                    <p className="text-sm font-medium text-foreground">{item.descricao}</p>
                    <span className="text-xs text-muted-foreground">
                      {item.quantidade} {item.unidade_medida}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        completo ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'
                      }`}
                    >
                      {validas.length}/{MINIMO_COTACOES_POR_ITEM} cotações válidas
                    </span>
                    {referencia !== null && (
                      <span className="rounded-lg bg-muted px-3 py-1.5 text-sm font-mono font-bold tabular-nums text-foreground">
                        {formatarMoeda(referencia)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  {item.cotacoes.map((cotacao, cotacaoIndex) => (
                    <div key={cotacaoIndex} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_140px_150px_1fr_auto] gap-2 items-center">
                      <input
                        type="text"
                        disabled={disabled}
                        placeholder="Fonte (ex.: Painel de Preços)"
                        value={cotacao.fonte}
                        onChange={(e) => updateCotacao(itemIndex, cotacaoIndex, { fonte: e.target.value })}
                        className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <input
                        type="text"
                        disabled={disabled}
                        placeholder="Fornecedor"
                        value={cotacao.fornecedor ?? ''}
                        onChange={(e) => updateCotacao(itemIndex, cotacaoIndex, { fornecedor: e.target.value })}
                        className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        disabled={disabled}
                        placeholder="Valor unitário"
                        value={cotacao.valor_unitario || ''}
                        onChange={(e) => updateCotacao(itemIndex, cotacaoIndex, { valor_unitario: Number(e.target.value) })}
                        className="rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono text-foreground disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <input
                        type="date"
                        disabled={disabled}
                        value={cotacao.data_cotacao ?? ''}
                        onChange={(e) => updateCotacao(itemIndex, cotacaoIndex, { data_cotacao: e.target.value })}
                        className="rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono text-foreground disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <input
                        type="text"
                        disabled={disabled}
                        placeholder="Referência (link, nº proposta...)"
                        value={cotacao.referencia ?? ''}
                        onChange={(e) => updateCotacao(itemIndex, cotacaoIndex, { referencia: e.target.value })}
                        className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      {!disabled && (
                        <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeCotacao(itemIndex, cotacaoIndex)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {!disabled && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    leftIcon={<Plus className="h-3.5 w-3.5" />}
                    onClick={() => addCotacao(itemIndex)}
                  >
                    Adicionar Cotação
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-foreground">
            Equipe de Planejamento <span className="font-normal text-muted-foreground">(mínimo 2 pessoas)</span>
          </label>
          {!disabled && (
            <Button type="button" variant="ghost" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => setEquipe((prev) => [...prev, { ...emptyMembro }])}>
              Adicionar
            </Button>
          )}
        </div>
        <div className="space-y-2">
          {equipe.map((membro, index) => (
            <div key={index} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_120px_auto] gap-2 items-center">
              <input
                type="text"
                disabled={disabled}
                placeholder="Nome"
                value={membro.nome}
                onChange={(e) => updateMembro(index, { nome: e.target.value })}
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <input
                type="text"
                disabled={disabled}
                placeholder="Cargo/Função"
                value={membro.cargo}
                onChange={(e) => updateMembro(index, { cargo: e.target.value })}
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <input
                type="text"
                disabled={disabled}
                placeholder="Matrícula"
                value={membro.matricula}
                onChange={(e) => updateMembro(index, { matricula: e.target.value })}
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono text-foreground disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {!disabled && equipe.length > 2 && (
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => setEquipe((prev) => prev.filter((_, i) => i !== index))}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
      </>
      )}

      {(camposExtrasPorAba.get(abaAtivaSegura)?.length ?? 0) > 0 && (
        <CamposExtrasFields
          campos={camposExtrasPorAba.get(abaAtivaSegura) ?? []}
          valores={camposExtrasValores}
          onChange={setCamposExtrasValores}
          disabled={disabled}
        />
      )}

      {!disabled && (
        <div className="flex justify-end gap-2 pt-2">
          <Button type="submit" variant="primary" isLoading={saving}>
            {submitLabel}
          </Button>
        </div>
      )}
    </form>
  );
};

export default PesquisaPrecoForm;
