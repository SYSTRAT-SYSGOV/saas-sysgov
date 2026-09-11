import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, Button, Select } from '@sysgov/ui';
import { PageHeader, ScreenState } from '@/components/ui';
import { Settings2, Plus, Trash2, GripVertical, Sparkles } from 'lucide-react';
import { useCan } from '@/core/rbac/useCan';
import { cn } from '@/lib/utils';
import { sysgovApi, type CampoConfig, type TipoCampoConfiguravel, type TipoDocumentoConfiguravel } from '@sysgov/sdk';
import { CAMPOS_SUGERIDOS } from '../constants/camposSugeridos';
import { slugify } from '../utils/slugify';

/** Nome da aba usada quando o campo não define uma — sempre a primeira. */
const ABA_PADRAO = 'Geral';

const TIPO_DOCUMENTO_OPTIONS: { value: TipoDocumentoConfiguravel; label: string; disponivel: boolean }[] = [
  { value: 'dfd', label: 'DFD', disponivel: true },
  { value: 'dfd_item_material', label: 'DFD — Item de Material', disponivel: true },
  { value: 'dfd_item_servico', label: 'DFD — Item de Serviço', disponivel: true },
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
 * A "Chave" é um identificador técnico (snake_case) sem nenhum valor pro
 * usuário do órgão — ele só lida com o Rótulo. O sistema deriva a chave
 * do rótulo nos bastidores e nunca a expõe no formulário.
 *
 * `_auto` e `_sufixo` só existem em memória, nunca são enviados ao
 * backend: enquanto `_auto` é true, a chave é recalculada a cada tecla
 * como `slugify(rótulo) + '_' + _sufixo` — o sufixo (gerado uma vez, na
 * criação do campo) garante que dois campos com o mesmo rótulo (ou o
 * mesmo início dele) nunca colidam em chaves iguais, o que o backend
 * rejeitaria ("Chave de campo duplicada"). Campos já carregados do
 * servidor NUNCA entram em modo automático — evita reescrever
 * silenciosamente a chave de um campo que documentos antigos já usam.
 */
type CampoEditavel = CampoConfig & { _auto?: boolean; _sufixo?: string };

const gerarSufixo = () => Date.now().toString(36).slice(-4) + Math.floor(Math.random() * 36 ** 2).toString(36);

const novoCampo = (ordem: number): CampoEditavel => {
  const sufixo = gerarSufixo();
  return {
    key: `campo_${sufixo}`,
    label: '',
    tipo: 'texto',
    obrigatorio: false,
    ordem,
    _auto: true,
    _sufixo: sufixo,
  };
};

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
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumentoConfiguravel>('dfd');
  const [campos, setCampos] = useState<CampoEditavel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const disponivel = TIPO_DOCUMENTO_OPTIONS.find((o) => o.value === tipoDocumento)?.disponivel ?? false;

  const load = useCallback(async (tipo: TipoDocumentoConfiguravel) => {
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
        const atualizado = { ...c, ...patch };
        if ('label' in patch && c._auto) {
          // Chave nunca aparece pro usuário — recalculada nos bastidores a
          // cada tecla no rótulo, com o sufixo fixo do campo pra nunca
          // colidir com outro (mesmo que o rótulo seja igual/parecido).
          const base = slugify(atualizado.label) || 'campo';
          atualizado.key = `${base}_${c._sufixo}`;
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

  // Reordenar por arrastar — define a ordem de impressão no PDF e a ordem
  // dentro de cada aba do formulário do DFD. `ordem` é recalculada (0..n-1)
  // pela posição final da lista inteira; a aba de cada campo não muda.
  const moverCampo = (origem: number, destino: number) => {
    if (origem === destino) return;
    setCampos((prev) => {
      const arr = [...prev];
      const [movido] = arr.splice(origem, 1);
      arr.splice(destino, 0, movido);
      return arr.map((c, i) => ({ ...c, ordem: i }));
    });
  };

  const abasExistentes = useMemo(
    () => Array.from(new Set(campos.map((c) => c.aba?.trim()).filter((a): a is string => !!a))),
    [campos],
  );

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
      // _auto/_sufixo são só controle local do formulário — não fazem parte do schema salvo.
      const payload = campos.map(({ _auto, _sufixo, ...campo }) => campo);
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
            onChange={(v) => setTipoDocumento(v as TipoDocumentoConfiguravel)}
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

            <datalist id="abas-existentes">
              <option value={ABA_PADRAO} />
              {abasExistentes.map((aba) => (
                <option key={aba} value={aba} />
              ))}
            </datalist>

            <div className="space-y-3">
              {campos.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum campo extra configurado para este documento.</p>
              )}
              {campos.length > 1 && podeGerenciar && (
                <p className="text-xs text-muted-foreground">
                  Arraste pelo ícone <GripVertical className="inline h-3 w-3 align-text-bottom" /> para reordenar — define a ordem de impressão no PDF.
                </p>
              )}
              {campos.map((campo, index) => (
                <div
                  key={index}
                  onDragOver={(e) => {
                    if (dragIndex === null) return;
                    e.preventDefault();
                    if (dragOverIndex !== index) setDragOverIndex(index);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragIndex !== null) moverCampo(dragIndex, index);
                    setDragIndex(null);
                    setDragOverIndex(null);
                  }}
                  className={cn(
                    'rounded-lg border p-3 space-y-3 transition-colors',
                    dragOverIndex === index && dragIndex !== null && dragIndex !== index
                      ? 'border-primary ring-2 ring-primary/30'
                      : 'border-border',
                  )}
                >
                  <div className="flex items-start gap-2">
                    <div
                      draggable={podeGerenciar && campos.length > 1}
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text/plain', String(index));
                        setDragIndex(index);
                      }}
                      onDragEnd={() => {
                        setDragIndex(null);
                        setDragOverIndex(null);
                      }}
                      className={cn(
                        'mt-2 shrink-0 text-muted-foreground',
                        podeGerenciar && campos.length > 1 && 'cursor-grab active:cursor-grabbing',
                      )}
                      title="Arraste para reordenar"
                    >
                      <GripVertical className="h-4 w-4" />
                    </div>
                    <div className="grid flex-1 grid-cols-1 sm:grid-cols-[1fr_160px] gap-2">
                      <input
                        type="text"
                        disabled={!podeGerenciar}
                        placeholder="Rótulo exibido ao usuário (ex.: Base Legal Municipal Aplicável)"
                        value={campo.label}
                        onChange={(e) => updateCampo(index, { label: e.target.value })}
                        className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-ring"
                      />
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

                  <div>
                    <input
                      type="text"
                      list="abas-existentes"
                      disabled={!podeGerenciar}
                      placeholder={`Aba do formulário (padrão: ${ABA_PADRAO})`}
                      value={campo.aba ?? ''}
                      onChange={(e) => updateCampo(index, { aba: e.target.value })}
                      className="w-full max-w-xs rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Deixe em branco para a aba "{ABA_PADRAO}". Campos com o mesmo nome de aba ficam juntos numa aba própria no formulário do DFD.
                    </p>
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
