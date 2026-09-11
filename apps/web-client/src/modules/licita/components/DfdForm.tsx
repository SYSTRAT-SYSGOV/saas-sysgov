import React, { useMemo, useState } from 'react';
import { Button, Select, RichTextEditor } from '@sysgov/ui';
import { Plus, Trash2 } from 'lucide-react';
import type { CampoConfig, CreateDfdInput, GrauPrioridade, MembroEquipePlanejamento } from '@sysgov/sdk';
import { CamposExtrasFields } from './CamposExtrasFields';

/** Aba usada por campos sem `aba` definida — sempre a primeira, mesmo que
 * o órgão só tenha criado abas nomeadas depois dela. */
const ABA_PADRAO = 'Geral';

const GRAU_PRIORIDADE_OPTIONS = [
  { value: 'baixa', label: 'Baixa' },
  { value: 'media', label: 'Média' },
  { value: 'alta', label: 'Alta' },
  { value: 'critica', label: 'Crítica' },
];

interface DfdFormProps {
  initialValue?: Partial<CreateDfdInput>;
  disabled?: boolean;
  submitLabel: string;
  onSubmit: (data: CreateDfdInput) => Promise<void> | void;
  onCancel?: () => void;
  /** Campos extras configurados pelo órgão para o DFD (ver CamposConfiguracaoPage). */
  camposExtras?: CampoConfig[];
}

const emptyMembro: MembroEquipePlanejamento = { nome: '', cargo: '', matricula: '' };

/** O backend retorna data_previsao como datetime ISO (ex.: "2026-01-12T03:00:00.000000Z"),
 * mas <input type="date"> só aceita o formato yyyy-MM-dd puro — sem isso o campo fica vazio. */
const toDateInputValue = (value?: string | null): string => (value ? value.slice(0, 10) : '');

export const DfdForm: React.FC<DfdFormProps> = ({ initialValue, disabled, submitLabel, onSubmit, onCancel, camposExtras = [] }) => {
  const [dataPrevisao, setDataPrevisao] = useState(toDateInputValue(initialValue?.data_previsao));
  const [grauPrioridade, setGrauPrioridade] = useState<GrauPrioridade>(initialValue?.grau_prioridade ?? 'media');
  const [justificativa, setJustificativa] = useState(initialValue?.justificativa ?? '');
  const [objeto, setObjeto] = useState(initialValue?.objeto ?? '');
  const [previsaoPca, setPrevisaoPca] = useState(initialValue?.previsao_pca ?? false);
  const [numeroPca, setNumeroPca] = useState(initialValue?.numero_pca ?? '');
  const [areaRequisitante, setAreaRequisitante] = useState(initialValue?.area_requisitante ?? '');
  const [equipe, setEquipe] = useState<MembroEquipePlanejamento[]>(
    initialValue?.equipe_planejamento && initialValue.equipe_planejamento.length > 0
      ? initialValue.equipe_planejamento
      : [{ ...emptyMembro }],
  );
  const [camposExtrasValores, setCamposExtrasValores] = useState<Record<string, unknown>>(
    initialValue?.campos_extras ?? {},
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [abaAtiva, setAbaAtiva] = useState(0);

  // Agrupa os campos extras por aba (definida pelo órgão em Campos por Tipo
  // de Documento) — campos sem aba caem na aba padrão, que vem sempre
  // primeiro. A ordem de impressão no PDF não muda: continua seguindo
  // `ordem` normalmente, independente de em qual aba o campo está.
  const gruposCamposExtras = useMemo(() => {
    const ordenados = [...camposExtras].sort((a, b) => a.ordem - b.ordem);
    const porAba = new Map<string, CampoConfig[]>();
    for (const campo of ordenados) {
      const aba = campo.aba?.trim() || ABA_PADRAO;
      if (!porAba.has(aba)) porAba.set(aba, []);
      porAba.get(aba)!.push(campo);
    }
    const nomes = Array.from(porAba.keys());
    if (porAba.has(ABA_PADRAO)) {
      nomes.splice(nomes.indexOf(ABA_PADRAO), 1);
      nomes.unshift(ABA_PADRAO);
    }
    return nomes.map((aba) => ({ aba, campos: porAba.get(aba)! }));
  }, [camposExtras]);

  // Sem nenhum campo extra configurado, gruposCamposExtras fica vazio — trata
  // como "Geral" (índice 0) pra não esconder os campos fixos do DFD.
  const abaAtivaSegura = gruposCamposExtras.length === 0 ? 0 : Math.min(abaAtiva, gruposCamposExtras.length - 1);

  const updateMembro = (index: number, patch: Partial<MembroEquipePlanejamento>) => {
    setEquipe((prev) => prev.map((m, i) => (i === index ? { ...m, ...patch } : m)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await onSubmit({
        data_previsao: dataPrevisao,
        grau_prioridade: grauPrioridade,
        justificativa,
        objeto,
        previsao_pca: previsaoPca,
        numero_pca: numeroPca || null,
        area_requisitante: areaRequisitante || null,
        equipe_planejamento: equipe.filter((m) => m.nome && m.cargo && m.matricula),
        campos_extras: camposExtrasValores,
      });
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Erro ao salvar o DFD.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Abas do formulário inteiro — só aparece quando o órgão de fato criou
          alguma aba nomeada além da padrão (o caso comum é uma aba só, e aí
          nem essa barra é exibida). "Geral" reúne Objeto, Justificativa e
          todos os campos fixos do DFD, junto com os campos extras sem aba —
          as demais abas mostram só os campos extras daquele agrupamento. */}
      {gruposCamposExtras.length > 1 && (
        <div className="flex gap-1 border-b border-border">
          {gruposCamposExtras.map((grupo, index) => (
            <button
              key={grupo.aba}
              type="button"
              onClick={() => setAbaAtiva(index)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                abaAtivaSegura === index
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {grupo.aba}
            </button>
          ))}
        </div>
      )}

      {abaAtivaSegura === 0 && (
        <>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Objeto *</label>
          <textarea
            required
            disabled={disabled}
            value={objeto}
            onChange={(e) => setObjeto(e.target.value)}
            rows={2}
            maxLength={500}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Ex.: Contratação de empresa especializada em serviços de limpeza predial."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Justificativa *</label>
          <RichTextEditor
            value={justificativa}
            onChange={setJustificativa}
            disabled={disabled}
            minHeight={200}
            placeholder="Demonstre a necessidade e conveniência da contratação (art. 18, I da Lei 14.133/2021)."
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Data Prevista da Contratação *</label>
            <input
              required
              type="date"
              disabled={disabled}
              value={dataPrevisao}
              onChange={(e) => setDataPrevisao(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono tabular-nums text-foreground disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Grau de Prioridade *</label>
            <Select
              value={grauPrioridade}
              onChange={(v) => setGrauPrioridade(v as GrauPrioridade)}
              options={GRAU_PRIORIDADE_OPTIONS}
              disabled={disabled}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Área Requisitante</label>
            <input
              type="text"
              disabled={disabled}
              value={areaRequisitante ?? ''}
              onChange={(e) => setAreaRequisitante(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Nº no PCA</label>
            <input
              type="text"
              disabled={disabled}
              value={numeroPca ?? ''}
              onChange={(e) => setNumeroPca(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono tabular-nums text-foreground disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            disabled={disabled}
            checked={previsaoPca}
            onChange={(e) => setPrevisaoPca(e.target.checked)}
            className="rounded border-input text-primary focus:ring-primary"
          />
          Contratação prevista no Plano de Contratações Anual (PCA)
        </label>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-foreground">Equipe de Planejamento *</label>
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
                {!disabled && equipe.length > 1 && (
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
        </>
      )}

      {/* Campos extras da aba ativa — sem título de seção de propósito: esses
          campos não são "extras do órgão", são campos que o próprio órgão
          define e nomeia em Campos por Tipo de Documento, então já aparecem
          com o rótulo que ele escolheu (ver CamposExtrasFields). Na aba
          "Geral" ficam junto dos campos fixos acima; nas demais abas
          aparecem sozinhos. */}
      {(gruposCamposExtras[abaAtivaSegura]?.campos.length ?? 0) > 0 && (
        <CamposExtrasFields
          campos={gruposCamposExtras[abaAtivaSegura]?.campos ?? []}
          valores={camposExtrasValores}
          onChange={setCamposExtrasValores}
          disabled={disabled}
        />
      )}

      {!disabled && (
        <div className="flex justify-end gap-2 pt-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
          )}
          <Button type="submit" variant="primary" isLoading={saving}>
            {submitLabel}
          </Button>
        </div>
      )}
    </form>
  );
};

export default DfdForm;
