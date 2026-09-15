import React, { useMemo, useState } from 'react';
import { Button, Select } from '@sysgov/ui';
import { Plus, Trash2 } from 'lucide-react';
import type { CampoConfig, CreateTrInput, CriterioJulgamentoTr, MembroEquipePlanejamento } from '@sysgov/sdk';
import { CamposExtrasFields } from './CamposExtrasFields';
import { RichTextEditorWithIa } from './RichTextEditorWithIa';
import { ValidationErrorModal } from '@/components/ui';
import { getApiErrorMessage, getApiValidationErrors, type ApiFieldError } from '@/lib/apiErrors';

/** Aba usada por campos sem `aba` definida — sempre a primeira (ver DfdForm/EtpForm/PesquisaPrecoForm, mesmo padrão). */
const ABA_PADRAO = 'Geral';

const emptyMembro: MembroEquipePlanejamento = { nome: '', cargo: '', matricula: '' };

const CRITERIO_JULGAMENTO_LABEL: Record<CriterioJulgamentoTr, string> = {
  menor_preco: 'Menor Preço',
  maior_desconto: 'Maior Desconto',
  melhor_tecnica: 'Melhor Técnica ou Conteúdo Artístico',
  tecnica_e_preco: 'Técnica e Preço',
  maior_lance: 'Maior Lance (leilão)',
};

const CRITERIO_JULGAMENTO_OPTIONS: { value: CriterioJulgamentoTr; label: string }[] = (
  ['menor_preco', 'maior_desconto', 'melhor_tecnica', 'tecnica_e_preco', 'maior_lance'] as CriterioJulgamentoTr[]
).map((value) => ({ value, label: CRITERIO_JULGAMENTO_LABEL[value] }));

interface TrFormProps {
  initialValue?: Partial<CreateTrInput>;
  disabled?: boolean;
  submitLabel: string;
  onSubmit: (data: CreateTrInput) => Promise<void> | void;
  /** Campos extras configurados pelo órgão para o TR (ver CamposConfiguracaoPage). */
  camposExtras?: CampoConfig[];
}

/**
 * Formulário do Termo de Referência — diferente do ETP (texto único), o TR
 * é dividido em seções estruturadas (art. 6º, XXIII da Lei 14.133/2021):
 * fundamentação, descrição da solução, requisitos, modelo de execução,
 * modelo de gestão do contrato, critério de julgamento, obrigações das
 * partes, sanções, vigência e adequação orçamentária. Todas as seções são
 * opcionais — o documento nasce vazio e a equipe preenche progressivamente.
 */
export const TrForm: React.FC<TrFormProps> = ({
  initialValue,
  disabled,
  submitLabel,
  onSubmit,
  camposExtras = [],
}) => {
  const [fundamentacaoContratacao, setFundamentacaoContratacao] = useState(initialValue?.fundamentacao_contratacao ?? '');
  const [descricaoSolucao, setDescricaoSolucao] = useState(initialValue?.descricao_solucao ?? '');
  const [requisitosContratacao, setRequisitosContratacao] = useState(initialValue?.requisitos_contratacao ?? '');
  const [modeloExecucao, setModeloExecucao] = useState(initialValue?.modelo_execucao ?? '');
  const [modeloGestaoContrato, setModeloGestaoContrato] = useState(initialValue?.modelo_gestao_contrato ?? '');
  const [criterioJulgamento, setCriterioJulgamento] = useState<CriterioJulgamentoTr | null>(initialValue?.criterio_julgamento ?? null);
  const [obrigacoesContratante, setObrigacoesContratante] = useState(initialValue?.obrigacoes_contratante ?? '');
  const [obrigacoesContratada, setObrigacoesContratada] = useState(initialValue?.obrigacoes_contratada ?? '');
  const [sancoesAdministrativas, setSancoesAdministrativas] = useState(initialValue?.sancoes_administrativas ?? '');
  const [vigenciaContrato, setVigenciaContrato] = useState(initialValue?.vigencia_contrato ?? '');
  const [adequacaoOrcamentaria, setAdequacaoOrcamentaria] = useState(initialValue?.adequacao_orcamentaria ?? '');
  const [equipe, setEquipe] = useState<MembroEquipePlanejamento[]>(
    initialValue?.equipe_planejamento && initialValue.equipe_planejamento.length > 0
      ? initialValue.equipe_planejamento
      : [{ ...emptyMembro }, { ...emptyMembro }],
  );
  const [camposExtrasValores, setCamposExtrasValores] = useState<Record<string, unknown>>(
    initialValue?.campos_extras ?? {},
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ApiFieldError[] | null>(null);
  const [abaAtiva, setAbaAtiva] = useState(ABA_PADRAO);

  const updateMembro = (index: number, patch: Partial<MembroEquipePlanejamento>) => {
    setEquipe((prev) => prev.map((m, i) => (i === index ? { ...m, ...patch } : m)));
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setValidationErrors(null);
    setSaving(true);
    try {
      await onSubmit({
        fundamentacao_contratacao: fundamentacaoContratacao || null,
        descricao_solucao: descricaoSolucao || null,
        requisitos_contratacao: requisitosContratacao || null,
        modelo_execucao: modeloExecucao || null,
        modelo_gestao_contrato: modeloGestaoContrato || null,
        criterio_julgamento: criterioJulgamento,
        obrigacoes_contratante: obrigacoesContratante || null,
        obrigacoes_contratada: obrigacoesContratada || null,
        sancoes_administrativas: sancoesAdministrativas || null,
        vigencia_contrato: vigenciaContrato || null,
        adequacao_orcamentaria: adequacaoOrcamentaria || null,
        equipe_planejamento: equipe.filter((m) => m.nome && m.cargo && m.matricula),
        campos_extras: camposExtrasValores,
      });
    } catch (err) {
      const fieldErrors = getApiValidationErrors(err);
      if (fieldErrors) {
        setValidationErrors(fieldErrors);
      } else {
        setError(getApiErrorMessage(err, 'Erro ao salvar o Termo de Referência.'));
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
          <RichTextEditorWithIa
            label="Fundamentação da Contratação"
            value={fundamentacaoContratacao}
            onChange={setFundamentacaoContratacao}
            disabled={disabled}
            minHeight={200}
            placeholder="Justificativa técnica e econômica da contratação, alinhamento com o planejamento do órgão."
            campo="Fundamentação da Contratação (TR)"
          />

          <RichTextEditorWithIa
            label="Descrição da Solução como um Todo"
            value={descricaoSolucao}
            onChange={setDescricaoSolucao}
            disabled={disabled}
            minHeight={200}
            placeholder="Descrição de todas as fases da contratação, considerando o ciclo de vida do objeto."
            campo="Descrição da Solução (TR)"
          />

          <RichTextEditorWithIa
            label="Requisitos da Contratação"
            value={requisitosContratacao}
            onChange={setRequisitosContratacao}
            disabled={disabled}
            minHeight={200}
            placeholder="Requisitos técnicos, de sustentabilidade, de garantia e de manutenção exigidos."
            campo="Requisitos da Contratação (TR)"
          />

          <RichTextEditorWithIa
            label="Modelo de Execução do Objeto"
            value={modeloExecucao}
            onChange={setModeloExecucao}
            disabled={disabled}
            minHeight={200}
            placeholder="Condições de execução, prazos, local de entrega/prestação, forma de recebimento."
            campo="Modelo de Execução do Objeto (TR)"
          />

          <RichTextEditorWithIa
            label="Modelo de Gestão do Contrato"
            value={modeloGestaoContrato}
            onChange={setModeloGestaoContrato}
            disabled={disabled}
            minHeight={200}
            placeholder="Fiscalização, gestão, critérios de medição e forma de pagamento."
            campo="Modelo de Gestão do Contrato (TR)"
          />

          <div className="max-w-sm">
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-foreground/70">
              Critério de Julgamento
            </label>
            <Select
              value={criterioJulgamento}
              onChange={(v) => setCriterioJulgamento(v as CriterioJulgamentoTr)}
              options={CRITERIO_JULGAMENTO_OPTIONS}
              disabled={disabled}
              placeholder="Selecione o critério..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <RichTextEditorWithIa
              label="Obrigações da Contratante"
              value={obrigacoesContratante}
              onChange={setObrigacoesContratante}
              disabled={disabled}
              minHeight={160}
              campo="Obrigações da Contratante (TR)"
            />
            <RichTextEditorWithIa
              label="Obrigações da Contratada"
              value={obrigacoesContratada}
              onChange={setObrigacoesContratada}
              disabled={disabled}
              minHeight={160}
              campo="Obrigações da Contratada (TR)"
            />
          </div>

          <RichTextEditorWithIa
            label="Sanções Administrativas"
            value={sancoesAdministrativas}
            onChange={setSancoesAdministrativas}
            disabled={disabled}
            minHeight={160}
            placeholder="Penalidades aplicáveis em caso de inexecução total ou parcial do contrato."
            campo="Sanções Administrativas (TR)"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-foreground/70">
                Vigência do Contrato
              </label>
              <input
                type="text"
                disabled={disabled}
                placeholder="Ex.: 12 meses, prorrogável até 60 meses"
                value={vigenciaContrato}
                onChange={(e) => setVigenciaContrato(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <RichTextEditorWithIa
            label="Adequação Orçamentária"
            value={adequacaoOrcamentaria}
            onChange={setAdequacaoOrcamentaria}
            disabled={disabled}
            minHeight={160}
            placeholder="Dotação orçamentária e fonte de recursos previstas para a contratação."
            campo="Adequação Orçamentária (TR)"
          />

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

export default TrForm;
