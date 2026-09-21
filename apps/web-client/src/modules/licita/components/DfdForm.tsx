import React, { useMemo, useState } from 'react';
import { Button, Select } from '@sysgov/ui';
import { Plus, Sparkles, Trash2 } from 'lucide-react';
import { sysgovApi, type CampoConfig, type CreateDfdInput, type GrauPrioridade, type ItemDfd, type MembroEquipePlanejamento, type TipoItemDfd } from '@sysgov/sdk';
import { CampoExtraField, CamposExtrasFields } from './CamposExtrasFields';
import { RichTextEditorWithIa } from './RichTextEditorWithIa';
import { ValidationErrorModal } from '@/components/ui';
import { getApiErrorMessage, getApiValidationErrors, type ApiFieldError } from '@/lib/apiErrors';

/** Aba usada por campos sem `aba` definida — sempre a primeira, mesmo que
 * o órgão só tenha criado abas nomeadas depois dela. */
const ABA_PADRAO = 'Geral';

/** Aba fixa dos itens do DFD — sempre presente, ao lado de "Geral", mesmo
 * quando o órgão não configurou nenhum campo extra (ao contrário das
 * demais abas, que só existem se vierem de CampoConfiguracao). */
const ABA_ITENS = 'Itens';

const GRAU_PRIORIDADE_OPTIONS = [
  { value: 'baixa', label: 'Baixa' },
  { value: 'media', label: 'Média' },
  { value: 'alta', label: 'Alta' },
  { value: 'critica', label: 'Crítica' },
];

const TIPO_ITEM_OPTIONS: { value: TipoItemDfd; label: string }[] = [
  { value: 'material', label: 'Material' },
  { value: 'servico', label: 'Serviço' },
];

/** CATMAT (material) ou CATSER (serviço) — o código do catálogo do governo muda de nome conforme o tipo do item. */
const codigoLabel = (tipo: TipoItemDfd) => (tipo === 'material' ? 'CATMAT' : 'CATSER');

const formatarMoeda = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/**
 * Quantidade/valor unitário ficam como STRING enquanto o item está sendo
 * editado (em vez de `number` direto, como em ItemDfd) — um <input
 * type="number"> controlado por `Number(e.target.value)` a cada tecla
 * reformata o valor a cada keystroke, e o navegador normaliza "25." de
 * volta para "25" nesse meio-tempo (o valor intermediário com ponto
 * decimal não é um `number` válido para guardar), apagando o "." que o
 * usuário acabou de digitar antes de conseguir teclar a casa decimal.
 * Convertidos para número só ao montar o payload em handleSubmit.
 */
type ItemDfdForm = Omit<ItemDfd, 'quantidade' | 'valor_unitario'> & { quantidade: string; valor_unitario: string };

interface DfdFormProps {
  initialValue?: Partial<CreateDfdInput>;
  disabled?: boolean;
  submitLabel: string;
  onSubmit: (data: CreateDfdInput) => Promise<void> | void;
  onCancel?: () => void;
  /**
   * Configuração de campos do DFD — tanto as seções nativas (`nativo: true`,
   * ver CampoConfiguracaoService::CAMPOS_NATIVOS) quanto os campos extras
   * cadastrados pelo órgão, já mescladas pelo backend (getCamposConfiguracao)
   * e livremente reorganizáveis em abas pelo tenant (ver CamposConfiguracaoPage).
   * Equipe de planejamento e itens NÃO entram aqui — ver comentário em
   * CampoConfiguracaoService::CAMPOS_NATIVOS sobre por quê.
   */
  camposExtras?: CampoConfig[];
  /** Campos extras configurados pelo órgão para itens de material (ver CamposConfiguracaoPage). */
  camposExtrasItemMaterial?: CampoConfig[];
  /** Campos extras configurados pelo órgão para itens de serviço (ver CamposConfiguracaoPage). */
  camposExtrasItemServico?: CampoConfig[];
}

const emptyMembro: MembroEquipePlanejamento = { nome: '', cargo: '', matricula: '' };

const criarItemVazio = (tipo: TipoItemDfd): ItemDfdForm => ({
  tipo,
  codigo: '',
  descricao: '',
  unidade_medida: '',
  quantidade: '1',
  valor_unitario: '0',
  campos_extras: {},
});

/** O backend retorna data_previsao como datetime ISO (ex.: "2026-01-12T03:00:00.000000Z"),
 * mas <input type="date"> só aceita o formato yyyy-MM-dd puro — sem isso o campo fica vazio. */
const toDateInputValue = (value?: string | null): string => (value ? value.slice(0, 10) : '');

export const DfdForm: React.FC<DfdFormProps> = ({
  initialValue,
  disabled,
  submitLabel,
  onSubmit,
  onCancel,
  camposExtras = [],
  camposExtrasItemMaterial = [],
  camposExtrasItemServico = [],
}) => {
  const [dataPrevisao, setDataPrevisao] = useState(toDateInputValue(initialValue?.data_previsao));
  const [grauPrioridade, setGrauPrioridade] = useState<GrauPrioridade | null>(initialValue?.grau_prioridade ?? null);
  const [justificativa, setJustificativa] = useState(initialValue?.justificativa ?? '');
  const [objeto, setObjeto] = useState(initialValue?.objeto ?? '');
  const [previsaoPca, setPrevisaoPca] = useState(initialValue?.previsao_pca ?? false);
  const [numeroPca, setNumeroPca] = useState(initialValue?.numero_pca ?? '');
  const [areaRequisitante, setAreaRequisitante] = useState(initialValue?.area_requisitante ?? '');
  const [equipe, setEquipe] = useState<MembroEquipePlanejamento[]>(
    initialValue?.equipe_planejamento && initialValue.equipe_planejamento.length > 0
      ? initialValue.equipe_planejamento
      // Já começa com 2 linhas em branco (mínimo exigido pelo backend,
      // ver DfdController) — começar com só 1 deixava o usuário
      // descobrir a exigência apenas ao tentar salvar.
      : [{ ...emptyMembro }, { ...emptyMembro }],
  );
  const [camposExtrasValores, setCamposExtrasValores] = useState<Record<string, unknown>>(
    initialValue?.campos_extras ?? {},
  );
  const [itens, setItens] = useState<ItemDfdForm[]>(
    (initialValue?.itens ?? []).map((it) => ({
      ...it,
      quantidade: String(it.quantidade),
      valor_unitario: String(it.valor_unitario),
    })),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ApiFieldError[] | null>(null);
  const [abaAtiva, setAbaAtiva] = useState(ABA_PADRAO);
  // true só entre o momento em que a sugestão de IA é aceita e a primeira
  // edição manual da justificativa depois disso — vira `gerado_por_ia` no
  // payload, então precisa cair para false assim que o usuário mexer no
  // texto (deixou de ser o que a IA gerou).
  const [justificativaGeradaPorIa, setJustificativaGeradaPorIa] = useState(initialValue?.gerado_por_ia ?? false);
  const [sugerindoItens, setSugerindoItens] = useState(false);
  const [erroSugerirItens, setErroSugerirItens] = useState<string | null>(null);
  const [itensSugeridosPorIa, setItensSugeridosPorIa] = useState(false);

  const handleJustificativaChange = (value: string) => {
    setJustificativa(value);
    setJustificativaGeradaPorIa(false);
  };

  const setCampoExtraValor = (key: string, valor: unknown) => {
    setCamposExtrasValores((prev) => ({ ...prev, [key]: valor }));
  };

  /** Renderiza a seção nativa `campo` (rótulo/ajuda configuráveis, widget fixo por chave). */
  const renderCampoNativo = (campo: CampoConfig): React.ReactNode => {
    if (campo.key === 'objeto') {
      return (
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            {campo.label} {campo.obrigatorio && '*'}
          </label>
          <textarea
            // Sem `required` nativo de propósito: o atributo HTML bloqueia o
            // submit no navegador (um balão nativo, fora do nosso controle
            // visual) ANTES do handleSubmit rodar — a ValidationErrorModal
            // padrão do sistema nunca chegava a aparecer. A obrigatoriedade
            // já é garantida pelo backend (DfdController/DfdService) e cai
            // na mesma modal que qualquer outro erro de validação.
            disabled={disabled}
            value={objeto}
            onChange={(e) => setObjeto(e.target.value)}
            rows={2}
            maxLength={500}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Ex.: Contratação de empresa especializada em serviços de limpeza predial."
          />
        </div>
      );
    }

    if (campo.key === 'justificativa') {
      return (
        <RichTextEditorWithIa
          label={`${campo.label}${campo.obrigatorio ? ' *' : ''}`}
          value={justificativa}
          onChange={handleJustificativaChange}
          disabled={disabled}
          minHeight={200}
          placeholder="Demonstre a necessidade e conveniência da contratação (art. 18, I da Lei 14.133/2021)."
          onSugerir={handleSugerirJustificativa}
          sugerirDesabilitado={!objeto.trim()}
          sugerirDesabilitadoTitulo="Preencha o Objeto para gerar a sugestão."
        />
      );
    }

    if (campo.key === 'data_previsao') {
      return (
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            {campo.label} {campo.obrigatorio && '*'}
          </label>
          <input
            type="date"
            disabled={disabled}
            value={dataPrevisao}
            onChange={(e) => setDataPrevisao(e.target.value)}
            className="w-full max-w-sm rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono tabular-nums text-foreground disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      );
    }

    if (campo.key === 'grau_prioridade') {
      return (
        <div className="max-w-sm">
          <label className="block text-sm font-medium text-foreground mb-1">
            {campo.label} {campo.obrigatorio && '*'}
          </label>
          <Select
            value={grauPrioridade}
            onChange={(v) => setGrauPrioridade(v as GrauPrioridade)}
            options={GRAU_PRIORIDADE_OPTIONS}
            disabled={disabled}
            placeholder="Selecione o grau..."
          />
        </div>
      );
    }

    if (campo.key === 'area_requisitante') {
      return (
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            {campo.label} {campo.obrigatorio && '*'}
          </label>
          <input
            type="text"
            disabled={disabled}
            value={areaRequisitante ?? ''}
            onChange={(e) => setAreaRequisitante(e.target.value)}
            className="w-full max-w-sm rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      );
    }

    if (campo.key === 'numero_pca') {
      return (
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            {campo.label} {campo.obrigatorio && '*'}
          </label>
          <input
            type="text"
            disabled={disabled}
            value={numeroPca ?? ''}
            onChange={(e) => setNumeroPca(e.target.value)}
            className="w-full max-w-sm rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono tabular-nums text-foreground disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      );
    }

    if (campo.key === 'previsao_pca') {
      return (
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            disabled={disabled}
            checked={previsaoPca}
            onChange={(e) => setPrevisaoPca(e.target.checked)}
            className="rounded border-input text-primary focus:ring-primary"
          />
          {campo.label}
        </label>
      );
    }

    return null;
  };

  // Agrupa os campos nativos (objeto/justificativa/data_previsao/
  // grau_prioridade/area_requisitante/numero_pca/previsao_pca) e os campos
  // extras por aba — intercalados na mesma lista, na ordem que o órgão
  // definir (ver TrForm/EtpForm, mesmo padrão). Equipe de planejamento e
  // itens NÃO entram aqui: continuam fixos ("Geral" e "Itens" respectivamente),
  // ver CampoConfiguracaoService::CAMPOS_NATIVOS.
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

  // "Geral" e "Itens" são fixas (sempre existem, mesmo sem nenhum campo
  // extra configurado) — as demais abas só aparecem se o órgão as criou em
  // Campos por Tipo de Documento.
  const nomesAbas = useMemo(() => {
    const nomes = [ABA_PADRAO, ABA_ITENS];
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

  const updateMembro = (index: number, patch: Partial<MembroEquipePlanejamento>) => {
    setEquipe((prev) => prev.map((m, i) => (i === index ? { ...m, ...patch } : m)));
  };

  const updateItem = (index: number, patch: Partial<ItemDfdForm>) => {
    setItens((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  };

  const handleSugerirJustificativa = async () => {
    // Justificativa já tem conteúdo: pede para MELHORAR (expandir) o texto
    // atual em vez de reescrever do zero — ver comentário equivalente em
    // RichTextEditorWithIa/DfdIaService.
    const temConteudo = justificativa.replace(/<[^>]*>/g, '').trim().length > 0;
    const resultado = await sysgovApi.licita.sugerirJustificativaDfd({
      objeto,
      area_requisitante: areaRequisitante || null,
      itens: itens.map((it) => ({ descricao: it.descricao })).filter((it) => it.descricao),
      texto_atual: temConteudo ? justificativa : null,
    });
    setJustificativaGeradaPorIa(true);
    return { texto: resultado.justificativa, legislacaoUtilizada: resultado.legislacao_utilizada };
  };

  const handleSugerirItens = async () => {
    setErroSugerirItens(null);
    setSugerindoItens(true);
    try {
      const resultado = await sysgovApi.licita.sugerirItensDfd({
        objeto,
        area_requisitante: areaRequisitante || null,
        justificativa: justificativa.replace(/<[^>]*>/g, '').trim() || null,
      });
      // Sempre soma aos itens já cadastrados, nunca substitui — mesmo
      // padrão de handleGerarRiscosComIa/handleBuscarPrecos.
      setItens((prev) => [
        ...prev,
        ...resultado.itens.map((it) => ({ ...it, quantidade: String(it.quantidade), valor_unitario: String(it.valor_unitario) })),
      ]);
      setItensSugeridosPorIa(true);
    } catch (err) {
      setErroSugerirItens(getApiErrorMessage(err, 'Não foi possível sugerir itens com IA.'));
    } finally {
      setSugerindoItens(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setValidationErrors(null);
    setSaving(true);
    try {
      await onSubmit({
        data_previsao: dataPrevisao || null,
        grau_prioridade: grauPrioridade,
        justificativa: justificativa || null,
        objeto: objeto || null,
        previsao_pca: previsaoPca,
        numero_pca: numeroPca || null,
        area_requisitante: areaRequisitante || null,
        equipe_planejamento: equipe.filter((m) => m.nome && m.cargo && m.matricula),
        campos_extras: camposExtrasValores,
        gerado_por_ia: justificativaGeradaPorIa,
        itens: itens
          .map((it): ItemDfd => ({ ...it, quantidade: Number(it.quantidade) || 0, valor_unitario: Number(it.valor_unitario) || 0 }))
          .filter((it) => it.codigo && it.descricao && it.unidade_medida && it.quantidade > 0),
      });
    } catch (err) {
      const fieldErrors = getApiValidationErrors(err);
      if (fieldErrors) {
        setValidationErrors(fieldErrors);
      } else {
        setError(getApiErrorMessage(err, 'Erro ao salvar o DFD.'));
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

      {/* Abas do formulário inteiro — "Geral" e "Itens" são fixas; as demais
          só aparecem quando o órgão de fato criou alguma aba nomeada em
          Campos por Tipo de Documento. "Geral" reúne os campos nativos
          (objeto, justificativa etc., na ordem/aba que o órgão definir) e a
          equipe de planejamento (sempre fixa); "Itens" reúne os
          materiais/serviços; as demais abas mostram só os campos daquele
          agrupamento. */}
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

      {abaAtivaSegura !== ABA_ITENS && (
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

          {/* Equipe de planejamento fica sempre na aba "Geral", não é
              reorganizável — ver CampoConfiguracaoService::CAMPOS_NATIVOS
              (mínimo legal de 2 pessoas, RN-005). */}
          {abaAtivaSegura === ABA_PADRAO && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-foreground">
                  Equipe de Planejamento * <span className="font-normal text-muted-foreground">(mínimo 2 pessoas)</span>
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
                    {/* Nunca deixa remover abaixo de 2 — mínimo exigido pelo backend (ver DfdController). */}
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
          )}
        </div>
      )}

      {abaAtivaSegura === ABA_ITENS && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-foreground">Itens (Materiais e Serviços)</label>
            {!disabled && (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  leftIcon={<Sparkles className="h-3.5 w-3.5" />}
                  isLoading={sugerindoItens}
                  disabled={!objeto.trim()}
                  title={!objeto.trim() ? 'Preencha o Objeto para gerar a sugestão.' : undefined}
                  onClick={handleSugerirItens}
                >
                  Sugerir Itens com IA
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                  onClick={() => setItens((prev) => [...prev, criarItemVazio('material')])}
                >
                  Adicionar Item
                </Button>
              </div>
            )}
          </div>

          {erroSugerirItens && (
            <div className="mb-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {erroSugerirItens}
            </div>
          )}

          {itensSugeridosPorIa && (
            <div className="mb-3 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              Itens sugeridos pela IA — código, quantidade e valores são estimativas de planejamento; confira e
              ajuste antes de salvar (a Pesquisa de Preços, mais adiante, apura o valor real).
            </div>
          )}

          <div className="space-y-3">
            {itens.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum item cadastrado.</p>
            )}
            {itens.map((item, index) => {
              const camposExtrasItem = item.tipo === 'material' ? camposExtrasItemMaterial : camposExtrasItemServico;
              return (
                <div key={index} className="rounded-lg border border-border p-3 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr_auto] gap-2 items-start">
                    <Select
                      value={item.tipo}
                      onChange={(v) => updateItem(index, { tipo: v as TipoItemDfd })}
                      options={TIPO_ITEM_OPTIONS}
                      disabled={disabled}
                    />
                    <input
                      type="text"
                      disabled={disabled}
                      placeholder={codigoLabel(item.tipo)}
                      value={item.codigo}
                      onChange={(e) => updateItem(index, { codigo: e.target.value })}
                      className="rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono text-foreground disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    {!disabled && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setItens((prev) => prev.filter((_, i) => i !== index))}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>

                  <input
                    type="text"
                    disabled={disabled}
                    placeholder="Descrição"
                    value={item.descricao}
                    onChange={(e) => updateItem(index, { descricao: e.target.value })}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-ring"
                  />

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <input
                      type="text"
                      disabled={disabled}
                      placeholder="Unidade de Medida"
                      value={item.unidade_medida}
                      onChange={(e) => updateItem(index, { unidade_medida: e.target.value })}
                      className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <input
                      type="number"
                      disabled={disabled}
                      placeholder="Quantidade"
                      min={0}
                      step="any"
                      value={item.quantidade}
                      onChange={(e) => updateItem(index, { quantidade: e.target.value })}
                      className="rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono tabular-nums text-foreground disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <input
                      type="number"
                      disabled={disabled}
                      placeholder="Valor Unitário"
                      min={0}
                      step="any"
                      value={item.valor_unitario}
                      onChange={(e) => updateItem(index, { valor_unitario: e.target.value })}
                      className="rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono tabular-nums text-foreground disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <div className="flex items-center rounded-lg border border-dashed border-input bg-muted/30 px-3 py-2 text-sm font-mono tabular-nums text-muted-foreground">
                      {formatarMoeda((Number(item.quantidade) || 0) * (Number(item.valor_unitario) || 0))}
                    </div>
                  </div>

                  {camposExtrasItem.length > 0 && (
                    <CamposExtrasFields
                      campos={camposExtrasItem}
                      valores={item.campos_extras ?? {}}
                      onChange={(valores) => updateItem(index, { campos_extras: valores })}
                      disabled={disabled}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Campos extras configurados especificamente para a aba "Itens"
              (ex.: um campo geral sobre a lista, não por item) — mesmo
              comportamento anterior. */}
          {(camposPorAba.get(ABA_ITENS)?.length ?? 0) > 0 && (
            <div className="mt-4">
              <CamposExtrasFields
                campos={camposPorAba.get(ABA_ITENS) ?? []}
                valores={camposExtrasValores}
                onChange={setCamposExtrasValores}
                disabled={disabled}
              />
            </div>
          )}
        </div>
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
