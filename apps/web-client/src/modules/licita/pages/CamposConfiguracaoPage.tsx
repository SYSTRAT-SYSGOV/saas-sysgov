import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, Button, Select } from '@sysgov/ui';
import { PageHeader, ScreenState } from '@/components/ui';
import { Settings2, Plus, Trash2, GripVertical, Sparkles } from 'lucide-react';
import { useCan } from '@/core/rbac/useCan';
import { sysgovApi, type CampoConfig, type FaseLicita, type TipoCampoConfiguravel } from '@sysgov/sdk';
import { CAMPOS_SUGERIDOS } from '../constants/camposSugeridos';
import { slugify } from '../utils/slugify';

const TIPO_DOCUMENTO_OPTIONS: { value: FaseLicita; label: string; disponivel: boolean }[] = [
  { value: 'dfd', label: 'DFD', disponivel: true },
  { value: 'etp', label: 'ETP', disponivel: false },
  { value: 'mapa_riscos', label: 'Mapa de Riscos', disponivel: false },
  { value: 'pesquisa_precos', label: 'Pesquisa de Preços', disponivel: false },
  { value: 'tr', label: 'Termo de Referência', disponivel: false },
  { value: 'edital', label: 'Edital', disponivel: false },
];

const TIPO_CAMPO_OPTIONS: { value: TipoCampoConfiguravel; label: string }[] = [
  { value: 'texto', label: 'Texto curto' },
  { value: 'texto_longo', label: 'Texto rico (editor)' },
  { value: 'numero', label: 'Número' },
  { value: 'data', label: 'Data' },
  { value: 'booleano', label: 'Sim/Não' },
  { value: 'selecao', label: 'Seleção (opções)' },
];

/**
 * `_auto` (só existe em memória, nunca é enviado ao backend): enquanto
 * true, a "Chave" é derivada automaticamente do Rótulo a cada tecla —
 * assim que o usuário edita a Chave diretamente, essa trava é
 * desligada e a edição manual passa a valer. Campos já carregados do
 * servidor nunca entram em modo automático (evita re-gerar a chave de
 * um campo que documentos antigos já usam).
 */
type CampoEditavel = CampoConfig & { _auto?: boolean };

const novoCampo = (ordem: number): CampoEditavel => ({
  key: '',
  label: '',
  tipo: 'texto',
  obrigatorio: false,
  ordem,
  _auto: true,
});

/**
 * Configuração, por órgão, dos campos extras exigidos em cada tipo de
 * documento do Licita — reflete a realidade de múltiplas legislações
 * locais (ex.: decreto municipal com exigências além da Lei 14.133/2021).
 * Hoje só o DFD consome essa configuração; os demais tipos já aparecem
 * no seletor para quando as respectivas fases forem implementadas.
 */
export const CamposConfiguracaoPage: React.FC = () => {
  const { can } = useCan();
  const podeGerenciar = can('licita.campos.manage');
  const [tipoDocumento, setTipoDocumento] = useState<FaseLicita>('dfd');
  const [campos, setCampos] = useState<CampoEditavel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const disponivel = TIPO_DOCUMENTO_OPTIONS.find((o) => o.value === tipoDocumento)?.disponivel ?? false;

  const load = useCallback(async (tipo: FaseLicita) => {
    setLoading(true);
    setError(null);
    setSaved(false);
    try {
      const config = await sysgovApi.licita.getCamposConfiguracao(tipo);
      setCampos(config.campos ?? []);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Erro ao carregar a configuração.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(tipoDocumento);
  }, [tipoDocumento, load]);

  const updateCampo = (index: number, patch: Partial<CampoEditavel>) => {
    setCampos((prev) =>
      prev.map((c, i) => {
        if (i !== index) return c;
        if ('key' in patch) {
          // Usuário editou a chave com a própria mão — respeita e para de
          // regerá-la a partir do rótulo daqui pra frente.
          return { ...c, ...patch, _auto: false };
        }
        const atualizado = { ...c, ...patch };
        if ('label' in patch && c._auto) {
          atualizado.key = slugify(atualizado.label);
        }
        return atualizado;
      }),
    );
  };

  const removeCampo = (index: number) => {
    setCampos((prev) => prev.filter((_, i) => i !== index).map((c, i) => ({ ...c, ordem: i })));
  };

  const addCampo = () => {
    setCampos((prev) => [...prev, novoCampo(prev.length)]);
  };

  // Sugestões do sistema para o tipo de documento atual — só mostra as que
  // ainda não estão na configuração (comparando pela key), pra não duplicar.
  // O órgão decide o que usar: uma sugestão só entra quando o usuário clica
  // em "Adicionar", e a partir daí é um campo normal (renomeia, muda tipo,
  // marca/desmarca obrigatório ou exclui como qualquer outro).
  const sugestoesDisponiveis = useMemo(
    () => (CAMPOS_SUGERIDOS[tipoDocumento] ?? []).filter((s) => !campos.some((c) => c.key === s.key)),
    [tipoDocumento, campos],
  );

  const addSugestao = (sugestao: Omit<CampoConfig, 'ordem'>) => {
    // _auto: false — a sugestão já vem com uma chave definida deliberadamente
    // (ex.: "valor_estimado_referencia"), então editar o rótulo depois não a
    // sobrescreve; só muda se o usuário editar a chave manualmente.
    setCampos((prev) => [...prev, { ...sugestao, ordem: prev.length, _auto: false }]);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      // _auto é só controle local do formulário — não faz parte do schema salvo.
      const payload = campos.map(({ _auto, ...campo }) => campo);
      const config = await sysgovApi.licita.salvarCamposConfiguracao(tipoDocumento, payload);
      setCampos(config.campos ?? []);
      setSaved(true);
    } catch (err: any) {
      setSaveError(err?.response?.data?.error || err?.message || 'Erro ao salvar a configuração.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Settings2 className="h-6 w-6" />}
        title="Campos Obrigatórios por Documento"
        subtitle="Adicione campos extras exigidos pela legislação local em cada tipo de artefato."
      />

      <Card className="p-6 space-y-4">
        <div className="max-w-xs">
          <label className="block text-sm font-medium text-foreground mb-1">Tipo de Documento</label>
          <Select
            value={tipoDocumento}
            onChange={(v) => setTipoDocumento(v as FaseLicita)}
            options={TIPO_DOCUMENTO_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          />
        </div>

        {!disponivel && (
          <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            Disponível quando esta fase for implementada no Licita.
          </div>
        )}

        {disponivel && loading && <ScreenState type="loading" title="Carregando configuração..." />}

        {disponivel && !loading && error && (
          <ScreenState type="error" title="Erro ao carregar" description={error} actionLabel="Tentar novamente" onAction={() => load(tipoDocumento)} />
        )}

        {disponivel && !loading && !error && (
          <>
            {podeGerenciar && sugestoesDisponiveis.length > 0 && (
              <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Sugestões do sistema
                </div>
                <p className="text-xs text-muted-foreground">
                  Pontos de partida comuns para este tipo de documento — adicione só o que fizer sentido pro seu órgão.
                  Depois de adicionado, o campo é seu: renomeie, mude o tipo ou marque como obrigatório à vontade.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {sugestoesDisponiveis.map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => addSugestao(s)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-primary/10"
                    >
                      <Plus className="h-3 w-3 text-primary" />
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              {campos.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum campo extra configurado para este documento.</p>
              )}
              {campos.map((campo, index) => (
                <div key={index} className="rounded-lg border border-border p-3 space-y-3">
                  <div className="flex items-start gap-2">
                    <GripVertical className="mt-2 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="grid flex-1 grid-cols-1 sm:grid-cols-[1fr_1fr_160px] gap-2">
                      <input
                        type="text"
                        disabled={!podeGerenciar}
                        placeholder="Rótulo exibido ao usuário (ex.: Base Legal Municipal Aplicável)"
                        value={campo.label}
                        onChange={(e) => updateCampo(index, { label: e.target.value })}
                        className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <div>
                        <input
                          type="text"
                          disabled={!podeGerenciar}
                          placeholder="Chave — gerada automaticamente"
                          value={campo.key}
                          onChange={(e) => updateCampo(index, { key: e.target.value })}
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono text-foreground disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        {campo._auto && (
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            Gerada a partir do rótulo — edite aqui se quiser outra.
                          </p>
                        )}
                      </div>
                      <Select
                        value={campo.tipo}
                        onChange={(v) => updateCampo(index, { tipo: v as TipoCampoConfiguravel })}
                        options={TIPO_CAMPO_OPTIONS}
                        disabled={!podeGerenciar}
                      />
                    </div>
                    {podeGerenciar && (
                      <Button size="icon-sm" variant="ghost" onClick={() => removeCampo(index)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>

                  {campo.tipo === 'selecao' && (
                    <input
                      type="text"
                      disabled={!podeGerenciar}
                      placeholder="Opções separadas por vírgula"
                      value={(campo.opcoes ?? []).join(', ')}
                      onChange={(e) => updateCampo(index, { opcoes: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  )}

                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm text-foreground">
                      <input
                        type="checkbox"
                        disabled={!podeGerenciar}
                        checked={campo.obrigatorio}
                        onChange={(e) => updateCampo(index, { obrigatorio: e.target.checked })}
                        className="rounded border-input text-primary focus:ring-primary"
                      />
                      Obrigatório
                    </label>
                    <input
                      type="text"
                      disabled={!podeGerenciar}
                      placeholder="Texto de ajuda (opcional)"
                      value={campo.ajuda ?? ''}
                      onChange={(e) => updateCampo(index, { ajuda: e.target.value })}
                      className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
              ))}
            </div>

            {podeGerenciar && (
              <Button type="button" variant="outline" leftIcon={<Plus className="h-4 w-4" />} onClick={addCampo}>
                Adicionar Campo
              </Button>
            )}

            {saveError && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {saveError}
              </div>
            )}
            {saved && (
              <div className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
                Configuração salva com sucesso.
              </div>
            )}

            {podeGerenciar && (
              <div className="flex justify-end pt-2">
                <Button variant="primary" isLoading={saving} onClick={handleSave}>
                  Salvar Configuração
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
};

export default CamposConfiguracaoPage;
