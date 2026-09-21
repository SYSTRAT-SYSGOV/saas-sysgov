import React, { useMemo, useState } from 'react';
import { Button } from '@sysgov/ui';
import { Plus, Trash2 } from 'lucide-react';
import type { CampoConfig, CreateEtpInput, MembroEquipePlanejamento } from '@sysgov/sdk';
import { CampoExtraField } from './CamposExtrasFields';
import { RichTextEditorWithIa } from './RichTextEditorWithIa';
import { ValidationErrorModal } from '@/components/ui';
import { getApiErrorMessage, getApiValidationErrors, type ApiFieldError } from '@/lib/apiErrors';

/** Aba usada por campos sem `aba` definida — sempre a primeira, mesmo que o órgão só tenha criado abas nomeadas depois dela (ver DfdForm, mesmo padrão). */
const ABA_PADRAO = 'Geral';

const emptyMembro: MembroEquipePlanejamento = { nome: '', cargo: '', matricula: '' };

interface EtpFormProps {
  initialValue?: Partial<CreateEtpInput>;
  /** Objeto do processo — só para dar contexto à sugestão de IA, não é salvo pelo ETP (esse campo é do DFD). */
  objetoProcesso?: string | null;
  disabled?: boolean;
  submitLabel: string;
  onSubmit: (data: CreateEtpInput) => Promise<void> | void;
  /**
   * Configuração de campos do ETP — tanto as seções nativas (`nativo: true`,
   * ver CampoConfiguracaoService::CAMPOS_NATIVOS) quanto os campos extras
   * cadastrados pelo órgão, já mescladas pelo backend (getCamposConfiguracao)
   * e livremente reorganizáveis em abas pelo tenant (ver CamposConfiguracaoPage).
   */
  camposExtras?: CampoConfig[];
}

/**
 * Formulário do ETP — mais simples que o DfdForm (sem itens) e que o
 * TrForm (só duas seções nativas: conteúdo e equipe), mas segue o mesmo
 * espírito: rótulo, aba e obrigatoriedade das seções nativas são
 * configuráveis pelo órgão e intercaladas livremente com os campos extras
 * na mesma aba, na ordem que o órgão definir.
 */
export const EtpForm: React.FC<EtpFormProps> = ({
  initialValue,
  objetoProcesso,
  disabled,
  submitLabel,
  onSubmit,
  camposExtras = [],
}) => {
  const [conteudo, setConteudo] = useState(initialValue?.conteudo ?? '');
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
  // Mesma lógica do DfdForm: vira false assim que o usuário mexe manualmente
  // no conteúdo depois de aceitar uma sugestão de IA.
  const [conteudoGeradoPorIa, setConteudoGeradoPorIa] = useState(initialValue?.gerado_por_ia ?? false);

  const handleConteudoChange = (value: string) => {
    setConteudo(value);
    setConteudoGeradoPorIa(false);
  };

  const updateMembro = (index: number, patch: Partial<MembroEquipePlanejamento>) => {
    setEquipe((prev) => prev.map((m, i) => (i === index ? { ...m, ...patch } : m)));
  };

  const setCampoExtraValor = (key: string, valor: unknown) => {
    setCamposExtrasValores((prev) => ({ ...prev, [key]: valor }));
  };

  /** Renderiza a seção nativa `campo` (rótulo/ajuda configuráveis, widget fixo por chave). */
  const renderCampoNativo = (campo: CampoConfig): React.ReactNode => {
    if (campo.key === 'conteudo') {
      return (
        <RichTextEditorWithIa
          label={`${campo.label}${campo.obrigatorio ? ' *' : ''}`}
          value={conteudo}
          onChange={handleConteudoChange}
          disabled={disabled}
          minHeight={400}
          placeholder="Descreva a necessidade, os requisitos da contratação, o levantamento de mercado, a solução escolhida, a estimativa de quantidades e valor, o alinhamento com o PCA e os demais elementos do art. 18, §1º da Lei 14.133/2021."
          campo={`${campo.label} (ETP)`}
          contexto={objetoProcesso ? `Objeto do processo: ${objetoProcesso}` : undefined}
        />
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
              <Button
                type="button"
                variant="ghost"
                size="sm"
                leftIcon={<Plus className="h-3.5 w-3.5" />}
                onClick={() => setEquipe((prev) => [...prev, { ...emptyMembro }])}
              >
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
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setEquipe((prev) => prev.filter((_, i) => i !== index))}
                  >
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

  // Protege contra abaAtiva apontando pra uma aba custom que deixou de
  // existir (ex.: o órgão removeu os campos daquela aba desde a última vez
  // que este formulário foi aberto).
  const abaAtivaSegura = nomesAbas.includes(abaAtiva) ? abaAtiva : ABA_PADRAO;
  const camposDaAbaAtiva = camposPorAba.get(abaAtivaSegura) ?? [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setValidationErrors(null);
    setSaving(true);
    try {
      await onSubmit({
        conteudo: conteudo || null,
        equipe_planejamento: equipe.filter((m) => m.nome && m.cargo && m.matricula),
        campos_extras: camposExtrasValores,
        gerado_por_ia: conteudoGeradoPorIa,
      });
    } catch (err) {
      const fieldErrors = getApiValidationErrors(err);
      if (fieldErrors) {
        setValidationErrors(fieldErrors);
      } else {
        setError(getApiErrorMessage(err, 'Erro ao salvar o ETP.'));
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

      {/* Só mostra abas quando existe mais de uma — o órgão pode nunca ter
          criado nenhuma aba própria, e nesse caso o formulário fica sem essa
          barra, igual ao comportamento anterior. */}
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

export default EtpForm;
