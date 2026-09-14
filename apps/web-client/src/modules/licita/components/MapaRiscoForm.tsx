import React, { useMemo, useState } from 'react';
import { Button, Select } from '@sysgov/ui';
import { Plus, Trash2 } from 'lucide-react';
import type { AlocacaoRisco, CampoConfig, CreateMapaRiscoInput, FaseRisco, MembroEquipePlanejamento, Risco } from '@sysgov/sdk';
import { CamposExtrasFields } from './CamposExtrasFields';
import { ValidationErrorModal } from '@/components/ui';
import { getApiErrorMessage, getApiValidationErrors, type ApiFieldError } from '@/lib/apiErrors';
import { classificarRisco, CLASSIFICACAO_CORES, CLASSIFICACAO_LABEL, nivelRisco } from '../utils/classificacaoRisco';

const emptyMembro: MembroEquipePlanejamento = { nome: '', cargo: '', matricula: '' };

const emptyRisco: Risco = {
  descricao: '',
  fase: 'planejamento',
  probabilidade: 3,
  impacto: 3,
  causa: '',
  dano: '',
  alocacao: 'contratante',
  acao_preventiva: '',
  responsavel_prevencao: '',
  acao_contingencia: '',
  responsavel_contingencia: '',
};

const FASE_OPTIONS: { value: FaseRisco; label: string }[] = [
  { value: 'planejamento', label: 'Planejamento' },
  { value: 'selecao_fornecedor', label: 'Seleção de Fornecedor' },
  { value: 'gestao_contratual', label: 'Gestão Contratual' },
];

const ALOCACAO_OPTIONS: { value: AlocacaoRisco; label: string }[] = [
  { value: 'contratante', label: 'Contratante' },
  { value: 'contratada', label: 'Contratada' },
  { value: 'compartilhado', label: 'Compartilhado' },
];

const ESCALA_OPTIONS = [1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n) }));

/** Aba usada por campos sem `aba` definida — sempre a primeira (ver DfdForm/EtpForm, mesmo padrão). */
const ABA_PADRAO = 'Geral';

interface MapaRiscoFormProps {
  initialValue?: Partial<CreateMapaRiscoInput>;
  disabled?: boolean;
  submitLabel: string;
  onSubmit: (data: CreateMapaRiscoInput) => Promise<void> | void;
  /** Campos extras configurados pelo órgão para o Mapa de Riscos (ver CamposConfiguracaoPage). */
  camposExtras?: CampoConfig[];
}

/**
 * Formulário do Mapa de Riscos — ao contrário do DFD/ETP, não tem um texto
 * único: é uma matriz de riscos (lista de cards), cada um com a estrutura
 * do modelo de referência (Probabilidade x Impacto 1-5, causa/dano, ações
 * preventiva/contingência com responsável). Nível e classificação são só
 * exibidos (calculados no cliente), nunca enviados ao backend.
 */
export const MapaRiscoForm: React.FC<MapaRiscoFormProps> = ({
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
  const [riscos, setRiscos] = useState<Risco[]>(
    initialValue?.riscos && initialValue.riscos.length > 0 ? initialValue.riscos : [{ ...emptyRisco }],
  );
  const [camposExtrasValores, setCamposExtrasValores] = useState<Record<string, unknown>>(
    initialValue?.campos_extras ?? {},
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ApiFieldError[] | null>(null);
  const [abaAtiva, setAbaAtiva] = useState(ABA_PADRAO);

  // Agrupa os campos extras por aba (ver comentário equivalente no
  // DfdForm/EtpForm) — campos sem aba caem na aba padrão, junto dos riscos
  // e da equipe.
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

  const updateRisco = (index: number, patch: Partial<Risco>) => {
    setRiscos((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setValidationErrors(null);
    setSaving(true);
    try {
      await onSubmit({
        riscos: riscos.filter((r) => r.descricao.trim()),
        equipe_planejamento: equipe.filter((m) => m.nome && m.cargo && m.matricula),
        campos_extras: camposExtrasValores,
      });
    } catch (err) {
      const fieldErrors = getApiValidationErrors(err);
      if (fieldErrors) {
        setValidationErrors(fieldErrors);
      } else {
        setError(getApiErrorMessage(err, 'Erro ao salvar o Mapa de Riscos.'));
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
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-foreground">Riscos Identificados</label>
          {!disabled && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => setRiscos((prev) => [...prev, { ...emptyRisco }])}
            >
              Adicionar Risco
            </Button>
          )}
        </div>

        <div className="space-y-3">
          {riscos.map((risco, index) => {
            const nivel = nivelRisco(risco.probabilidade, risco.impacto);
            const classificacao = classificarRisco(risco.probabilidade, risco.impacto);
            const cor = CLASSIFICACAO_CORES[classificacao];
            return (
              <div key={index} className="rounded-lg border border-border p-3 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-mono font-bold text-muted-foreground pt-2">R{index + 1}</span>
                  <textarea
                    disabled={disabled}
                    placeholder="Descrição do risco"
                    value={risco.descricao}
                    onChange={(e) => updateRisco(index, { descricao: e.target.value })}
                    rows={2}
                    className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  {!disabled && riscos.length > 1 && (
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => setRiscos((prev) => prev.filter((_, i) => i !== index))}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Fase</label>
                    <Select value={risco.fase} onChange={(v) => updateRisco(index, { fase: v as FaseRisco })} options={FASE_OPTIONS} disabled={disabled} />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Probabilidade</label>
                    <Select
                      value={String(risco.probabilidade)}
                      onChange={(v) => updateRisco(index, { probabilidade: Number(v) })}
                      options={ESCALA_OPTIONS}
                      disabled={disabled}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Impacto</label>
                    <Select
                      value={String(risco.impacto)}
                      onChange={(v) => updateRisco(index, { impacto: Number(v) })}
                      options={ESCALA_OPTIONS}
                      disabled={disabled}
                    />
                  </div>
                  <div
                    className="flex items-center justify-center rounded-lg px-3 py-2 text-sm font-mono font-bold tabular-nums"
                    style={{ backgroundColor: cor.bg, color: cor.text }}
                    title={`Nível ${nivel} — ${CLASSIFICACAO_LABEL[classificacao]}`}
                  >
                    {nivel} · {CLASSIFICACAO_LABEL[classificacao]}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Causa</label>
                    <textarea
                      disabled={disabled}
                      value={risco.causa ?? ''}
                      onChange={(e) => updateRisco(index, { causa: e.target.value })}
                      rows={2}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Dano</label>
                    <textarea
                      disabled={disabled}
                      value={risco.dano ?? ''}
                      onChange={(e) => updateRisco(index, { dano: e.target.value })}
                      rows={2}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>

                <div className="max-w-[200px]">
                  <label className="block text-xs text-muted-foreground mb-1">Alocação</label>
                  <Select value={risco.alocacao} onChange={(v) => updateRisco(index, { alocacao: v as AlocacaoRisco })} options={ALOCACAO_OPTIONS} disabled={disabled} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Ação Preventiva</label>
                    <textarea
                      disabled={disabled}
                      value={risco.acao_preventiva ?? ''}
                      onChange={(e) => updateRisco(index, { acao_preventiva: e.target.value })}
                      rows={2}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <input
                      type="text"
                      disabled={disabled}
                      placeholder="Responsável pela prevenção"
                      value={risco.responsavel_prevencao ?? ''}
                      onChange={(e) => updateRisco(index, { responsavel_prevencao: e.target.value })}
                      className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Ação de Contingência</label>
                    <textarea
                      disabled={disabled}
                      value={risco.acao_contingencia ?? ''}
                      onChange={(e) => updateRisco(index, { acao_contingencia: e.target.value })}
                      rows={2}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <input
                      type="text"
                      disabled={disabled}
                      placeholder="Responsável pela contingência"
                      value={risco.responsavel_contingencia ?? ''}
                      onChange={(e) => updateRisco(index, { responsavel_contingencia: e.target.value })}
                      className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
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

      {/* Campos extras da aba ativa — na aba "Geral" ficam junto dos riscos
          e da equipe; nas demais abas aparecem sozinhos (ver DfdForm/EtpForm, mesmo padrão). */}
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

export default MapaRiscoForm;
