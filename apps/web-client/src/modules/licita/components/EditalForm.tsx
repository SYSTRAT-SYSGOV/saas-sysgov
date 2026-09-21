import React, { useMemo, useState } from 'react';
import { Button, Select } from '@sysgov/ui';
import { Plus, Trash2 } from 'lucide-react';
import type { CampoConfig, CreateEditalInput, CriterioJulgamentoTr, MembroEquipePlanejamento } from '@sysgov/sdk';
import { CampoExtraField } from './CamposExtrasFields';
import { RichTextEditorWithIa } from './RichTextEditorWithIa';
import { ValidationErrorModal } from '@/components/ui';
import { getApiErrorMessage, getApiValidationErrors, type ApiFieldError } from '@/lib/apiErrors';

/** Aba usada por campos sem `aba` definida — sempre a primeira (ver TrForm/EtpForm/DfdForm, mesmo padrão). */
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

/** Placeholder de cada seção nativa — o rótulo em si vem de `campo.label` (configurável, ver CamposConfiguracaoPage). */
const PLACEHOLDER_NATIVO: Partial<Record<string, string>> = {
  preambulo: 'Modalidade, tipo de julgamento, número do processo, data/hora/local da sessão pública.',
  objeto: 'Objeto detalhado da licitação — nasce copiado do DFD, mas pode ser reescrito para o edital.',
  condicoes_participacao: 'Quem pode participar, impedimentos e vedações (art. 14 da Lei 14.133/2021).',
  requisitos_habilitacao: 'Habilitação jurídica, fiscal, social e trabalhista, técnica e econômico-financeira (art. 62 a 70).',
  procedimento_sessao_publica: 'Etapas da sessão pública: credenciamento, envio de propostas, disputa, julgamento, habilitação.',
  prazo_recursal: 'Prazo, forma de interposição e efeitos dos recursos administrativos (art. 165 a 168).',
  sancoes_administrativas: 'Penalidades aplicáveis em caso de inexecução total ou parcial do contrato — nasce copiado do TR.',
  disposicoes_gerais: 'Foro, anexos do edital (minuta de contrato, TR, planilhas) e demais disposições finais.',
};

/** Chave nativa cujo valor é HTML rico via RichTextEditorWithIa (as demais nativas têm renderer próprio abaixo). */
const NATIVOS_TEXTO_LONGO = new Set([
  'preambulo',
  'objeto',
  'condicoes_participacao',
  'requisitos_habilitacao',
  'procedimento_sessao_publica',
  'prazo_recursal',
  'sancoes_administrativas',
  'disposicoes_gerais',
]);

interface EditalFormProps {
  initialValue?: Partial<CreateEditalInput>;
  disabled?: boolean;
  submitLabel: string;
  onSubmit: (data: CreateEditalInput) => Promise<void> | void;
  /**
   * Configuração de campos do Edital — tanto as seções nativas (`nativo: true`,
   * ver CampoConfiguracaoService::CAMPOS_NATIVOS) quanto os campos extras
   * cadastrados pelo órgão, já mescladas pelo backend (getCamposConfiguracao)
   * e livremente reorganizáveis em abas pelo tenant (ver CamposConfiguracaoPage).
   */
  camposExtras?: CampoConfig[];
}

/**
 * Formulário do Edital (art. 25 da Lei 14.133/2021) — mesmo espírito
 * estrutural do TrForm: seções nativas configuráveis pelo órgão (rótulo,
 * aba, obrigatoriedade), intercaladas com campos extras na mesma aba/ordem.
 * Objeto, Critério de Julgamento e Sanções Administrativas costumam chegar
 * já preenchidos (copiados do DFD/TR pelo backend na criação, ver
 * EditalService::criar) — o elaborador só ajusta o que for específico do
 * edital em si.
 */
export const EditalForm: React.FC<EditalFormProps> = ({
  initialValue,
  disabled,
  submitLabel,
  onSubmit,
  camposExtras = [],
}) => {
  const [preambulo, setPreambulo] = useState(initialValue?.preambulo ?? '');
  const [objeto, setObjeto] = useState(initialValue?.objeto ?? '');
  const [criterioJulgamento, setCriterioJulgamento] = useState<CriterioJulgamentoTr | null>(initialValue?.criterio_julgamento ?? null);
  const [condicoesParticipacao, setCondicoesParticipacao] = useState(initialValue?.condicoes_participacao ?? '');
  const [requisitosHabilitacao, setRequisitosHabilitacao] = useState(initialValue?.requisitos_habilitacao ?? '');
  const [procedimentoSessaoPublica, setProcedimentoSessaoPublica] = useState(initialValue?.procedimento_sessao_publica ?? '');
  const [prazoRecursal, setPrazoRecursal] = useState(initialValue?.prazo_recursal ?? '');
  const [sancoesAdministrativas, setSancoesAdministrativas] = useState(initialValue?.sancoes_administrativas ?? '');
  const [disposicoesGerais, setDisposicoesGerais] = useState(initialValue?.disposicoes_gerais ?? '');
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

  const setCampoExtraValor = (key: string, valor: unknown) => {
    setCamposExtrasValores((prev) => ({ ...prev, [key]: valor }));
  };

  /** Renderiza a seção nativa `campo` (rótulo/ajuda configuráveis, widget fixo por chave). */
  const renderCampoNativo = (campo: CampoConfig): React.ReactNode => {
    if (NATIVOS_TEXTO_LONGO.has(campo.key)) {
      const valorPorChave: Record<string, [string, (v: string) => void]> = {
        preambulo: [preambulo, setPreambulo],
        objeto: [objeto, setObjeto],
        condicoes_participacao: [condicoesParticipacao, setCondicoesParticipacao],
        requisitos_habilitacao: [requisitosHabilitacao, setRequisitosHabilitacao],
        procedimento_sessao_publica: [procedimentoSessaoPublica, setProcedimentoSessaoPublica],
        prazo_recursal: [prazoRecursal, setPrazoRecursal],
        sancoes_administrativas: [sancoesAdministrativas, setSancoesAdministrativas],
        disposicoes_gerais: [disposicoesGerais, setDisposicoesGerais],
      };
      const [valor, setValor] = valorPorChave[campo.key];
      return (
        <RichTextEditorWithIa
          label={`${campo.label}${campo.obrigatorio ? ' *' : ''}`}
          value={valor}
          onChange={setValor}
          disabled={disabled}
          minHeight={200}
          placeholder={PLACEHOLDER_NATIVO[campo.key]}
          campo={`${campo.label} (Edital)`}
        />
      );
    }

    if (campo.key === 'criterio_julgamento') {
      return (
        <div className="max-w-sm">
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-foreground/70">
            {campo.label} {campo.obrigatorio && '*'}
          </label>
          <Select
            value={criterioJulgamento}
            onChange={(v) => setCriterioJulgamento(v as CriterioJulgamentoTr)}
            options={CRITERIO_JULGAMENTO_OPTIONS}
            disabled={disabled}
            placeholder="Selecione o critério..."
          />
        </div>
      );
    }

    if (campo.key === 'equipe_planejamento') {
      return (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-foreground">
              {campo.label} <span className="font-normal text-muted-foreground">(mínimo 2 pessoas)</span>{campo.obrigatorio && ' *'}
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
      );
    }

    return null;
  };

  const camposPorAba = useMemo(() => {
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
    for (const aba of camposPorAba.keys()) {
      if (!nomes.includes(aba)) nomes.push(aba);
    }
    return nomes;
  }, [camposPorAba]);

  const abaAtivaSegura = nomesAbas.includes(abaAtiva) ? abaAtiva : ABA_PADRAO;
  const camposDaAbaAtiva = camposPorAba.get(abaAtivaSegura) ?? [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setValidationErrors(null);
    setSaving(true);
    try {
      await onSubmit({
        preambulo: preambulo || null,
        objeto: objeto || null,
        criterio_julgamento: criterioJulgamento,
        condicoes_participacao: condicoesParticipacao || null,
        requisitos_habilitacao: requisitosHabilitacao || null,
        procedimento_sessao_publica: procedimentoSessaoPublica || null,
        prazo_recursal: prazoRecursal || null,
        sancoes_administrativas: sancoesAdministrativas || null,
        disposicoes_gerais: disposicoesGerais || null,
        equipe_planejamento: equipe.filter((m) => m.nome && m.cargo && m.matricula),
        campos_extras: camposExtrasValores,
      });
    } catch (err) {
      const fieldErrors = getApiValidationErrors(err);
      if (fieldErrors) {
        setValidationErrors(fieldErrors);
      } else {
        setError(getApiErrorMessage(err, 'Erro ao salvar o Edital.'));
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

      <div className="space-y-4">
        {camposDaAbaAtiva.map((campo) =>
          campo.nativo ? (
            <React.Fragment key={campo.key}>{renderCampoNativo(campo)}</React.Fragment>
          ) : (
            <CampoExtraField
              key={campo.key}
              campo={campo}
              valor={camposExtrasValores[campo.key]}
              onChange={setCampoExtraValor}
              disabled={disabled}
            />
          ),
        )}
      </div>

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

export default EditalForm;
