import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  Button,
  Badge,
  Input,
  Select,
  Switch,
  Modal,
  StatCard,
} from '@sysgov/ui';
import { Field, EmptyState, DataTable, ConfirmDialog } from '@/components/ui';
import {
  Network,
  Plus,
  RefreshCw,
  Trash2,
  Crown,
  Layers,
  Table as TableIcon,
  Play,
  UserCheck,
  UserX,
  ChevronRight,
  Shield,
  ArrowUpRight,
  Search,
  X,
  HelpCircle,
  Building2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { SysgovApi } from '@sysgov/sdk';
import type { ApiNivelHierarquia } from '@sysgov/sdk';
import {
  calcularKpisHierarquia,
  validarIntegridadeHierarquia,
  simularCadeiaAvaliacao,
  type NivelHierarquiaItem,
  type CenarioSimulacao,
} from './HierarquiaConfigPanel.simulador';

const api = new SysgovApi();

const REGRAS = [
  { value: 'superior_hierarquico', label: 'Superior Hierárquico (sobe a árvore avaliativa)' },
  { value: 'substituto_legal', label: 'Substituto Legal (formalmente designado no escalão)' },
];

type FormState = {
  nivel: number;
  nome: string;
  cargo_referencia: string;
  regra_substituicao: 'substituto_legal' | 'superior_hierarquico';
  is_topo: boolean;
  avaliador_topo_user_id: string;
  avaliador_topo_role: string;
};

const ESTADO_INICIAL: FormState = {
  nivel: 0,
  nome: '',
  cargo_referencia: '',
  regra_substituicao: 'superior_hierarquico',
  is_topo: false,
  avaliador_topo_user_id: '',
  avaliador_topo_role: '',
};

type ModoVisualizacao = 'tabela' | 'arvore' | 'simulador';

export const HierarquiaConfigPanel: React.FC = () => {
  const [niveis, setNiveis] = useState<ApiNivelHierarquia[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [modalAberto, setModalAberto] = useState<boolean>(false);
  const [salvando, setSalvando] = useState<boolean>(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(ESTADO_INICIAL);
  const [erro, setErro] = useState<string | null>(null);

  // Estados de navegação e filtros
  const [modoVisualizacao, setModoVisualizacao] = useState<ModoVisualizacao>('tabela');
  const [termoBusca, setTermoBusca] = useState<string>('');

  // Estado de diálogo de confirmação seguro (sem window.confirm)
  const [dialogExclusao, setDialogExclusao] = useState<{
    aberto: boolean;
    nivelId: number | null;
    nome: string;
  }>({
    aberto: false,
    nivelId: null,
    nome: '',
  });

  // Estado do Simulador Interativo ("Quem avalia quem?")
  const [cenarioSimulacao, setCenarioSimulacao] = useState<CenarioSimulacao>({
    nivelBaseId: 0,
    chefiaImediataAfastada: false,
    motivoAfastamento: 'Férias Regulamentares (30 dias)',
  });

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.capd.listNiveisHierarquia();
      const ordenados = data.sort((a, b) => a.nivel - b.nivel);
      setNiveis(ordenados);

      // Sincroniza o nível inicial do simulador se houver dados
      if (ordenados.length > 0 && cenarioSimulacao.nivelBaseId === 0) {
        setCenarioSimulacao((prev) => ({ ...prev, nivelBaseId: ordenados[0].id }));
      }
    } finally {
      setLoading(false);
    }
  }, [cenarioSimulacao.nivelBaseId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Cálculos puros e consolidação de indicadores
  const niveisCast = useMemo<NivelHierarquiaItem[]>(() => niveis as NivelHierarquiaItem[], [niveis]);
  const kpisHierarquia = useMemo(() => calcularKpisHierarquia(niveisCast), [niveisCast]);
  const integridade = useMemo(() => validarIntegridadeHierarquia(niveisCast), [niveisCast]);

  // Filtragem para o DataTable
  const niveisFiltrados = useMemo(() => {
    if (!termoBusca.trim()) return niveisCast;
    const termo = termoBusca.toLowerCase();
    return niveisCast.filter(
      (n) =>
        n.nome.toLowerCase().includes(termo) ||
        (n.cargo_referencia && n.cargo_referencia.toLowerCase().includes(termo)) ||
        String(n.nivel).includes(termo) ||
        n.regra_substituicao.toLowerCase().includes(termo)
    );
  }, [niveisCast, termoBusca]);

  // Resultado da simulação avaliativa
  const resultadoSimulacao = useMemo(() => {
    return simularCadeiaAvaliacao(niveisCast, cenarioSimulacao);
  }, [niveisCast, cenarioSimulacao]);

  const abrirNovo = () => {
    setEditandoId(null);
    // Sugere próximo nível numérico
    const proximoNivel = niveis.length > 0 ? Math.max(...niveis.map((n) => n.nivel)) + 1 : 0;
    setForm({
      ...ESTADO_INICIAL,
      nivel: proximoNivel,
    });
    setErro(null);
    setModalAberto(true);
  };

  const abrirEdicao = (nivel: ApiNivelHierarquia) => {
    setEditandoId(nivel.id);
    setForm({
      nivel: nivel.nivel,
      nome: nivel.nome,
      cargo_referencia: nivel.cargo_referencia ?? '',
      regra_substituicao: nivel.regra_substituicao,
      is_topo: nivel.is_topo,
      avaliador_topo_user_id: nivel.avaliador_topo_user_id ? String(nivel.avaliador_topo_user_id) : '',
      avaliador_topo_role: nivel.avaliador_topo_role ?? '',
    });
    setErro(null);
    setModalAberto(true);
  };

  const salvar = async () => {
    setSalvando(true);
    setErro(null);
    try {
      const payload = {
        nivel: form.nivel,
        nome: form.nome,
        cargo_referencia: form.cargo_referencia || null,
        regra_substituicao: form.regra_substituicao,
        is_topo: form.is_topo,
        avaliador_topo_user_id: form.avaliador_topo_user_id ? Number(form.avaliador_topo_user_id) : null,
        avaliador_topo_role: form.avaliador_topo_role || null,
      };

      if (editandoId) {
        await api.capd.updateNivelHierarquia(editandoId, payload);
      } else {
        await api.capd.createNivelHierarquia(payload);
      }

      setModalAberto(false);
      await carregar();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Não foi possível salvar o nível hierárquico.';
      setErro(msg);
    } finally {
      setSalvando(false);
    }
  };

  const solicitarDesativacao = (nivel: ApiNivelHierarquia) => {
    setDialogExclusao({
      aberto: true,
      nivelId: nivel.id,
      nome: nivel.nome,
    });
  };

  const confirmarDesativacao = async () => {
    if (!dialogExclusao.nivelId) return;
    try {
      await api.capd.deleteNivelHierarquia(dialogExclusao.nivelId);
      setDialogExclusao({ aberto: false, nivelId: null, nome: '' });
      await carregar();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Falha ao desativar o nível.');
    }
  };

  // Definição de Colunas TanStack para o DataTable
  const columns = useMemo<ColumnDef<NivelHierarquiaItem>[]>(
    () => [
      {
        accessorKey: 'nivel',
        header: 'Nível',
        size: 80,
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-xs font-bold text-primary tabular-nums">
              #{row.original.nivel}
            </span>
            {row.original.nivel === 0 && (
              <span className="text-[10px] text-muted-foreground">(Base)</span>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'nome',
        header: 'Escalão Organizacional',
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-foreground">{row.original.nome}</span>
            {row.original.cargo_referencia && (
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Shield className="h-3 w-3 text-muted-foreground/70" />
                {row.original.cargo_referencia}
              </span>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'regra_substituicao',
        header: 'Regra em Afastamentos',
        cell: ({ row }) => {
          const isSuperior = row.original.regra_substituicao === 'superior_hierarquico';
          return (
            <Badge
              variant="outline"
              className={`text-[10px] font-mono ${
                isSuperior
                  ? 'text-blue-600 dark:text-blue-400 border-blue-500/30 bg-blue-500/5'
                  : 'text-purple-600 dark:text-purple-400 border-purple-500/30 bg-purple-500/5'
              }`}
            >
              {isSuperior ? 'Superior Hierárquico (Art. 9º)' : 'Substituto Legal'}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'is_topo',
        header: 'Papel na Cadeia',
        size: 150,
        cell: ({ row }) =>
          row.original.is_topo ? (
            <Badge variant="default" className="text-[10px] font-mono bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40 hover:bg-amber-500/20">
              <Crown className="h-3 w-3 mr-1 text-amber-500" />
              {row.original.avaliador_topo_role
                ? `Topo [${row.original.avaliador_topo_role.toUpperCase()}]`
                : 'Topo do Órgão'}
            </Badge>
          ) : (
            <span className="text-[11px] text-muted-foreground">Escalão Intermediário</span>
          ),
      },
      {
        accessorKey: 'ativo',
        header: 'Status',
        size: 90,
        cell: ({ row }) =>
          row.original.ativo ? (
            <Badge variant="outline" className="text-[10px] font-mono text-emerald-600 border-emerald-500/30">
              Ativo
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground border-border">
              Inativo
            </Badge>
          ),
      },
      {
        id: 'acoes',
        header: 'Ações',
        size: 110,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs px-2"
              onClick={() => abrirEdicao(row.original as ApiNivelHierarquia)}
            >
              Editar
            </Button>
            {row.original.ativo && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10"
                onClick={() => solicitarDesativacao(row.original as ApiNivelHierarquia)}
                title="Desativar este nível hierárquico"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      {/* CABEÇALHO DO PAINEL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Network className="h-4 w-4 text-primary" />
            Parâmetros de Hierarquia e Cadeia de Comando Avaliativa
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            Regramento dos níveis de supervisão funcional, regras de substituição em afastamentos regimentais e resolução do topo institucional.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={carregar} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button size="sm" onClick={abrirNovo} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="h-4 w-4 mr-1.5" />
            Novo Nível
          </Button>
        </div>
      </div>

      {/* PAINEL EXECUTIVO DE KPIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Níveis Parametrizados"
          value={`${kpisHierarquia.totalNiveis} escalões`}
          caption={`${kpisHierarquia.niveisAtivos} níveis ativos na estrutura`}
          accentClassName="border-l-primary"
          className="font-mono tabular-nums"
        />
        <StatCard
          label="Nível Topo Institucional"
          value={kpisHierarquia.nivelTopoNome || 'Não Homologado'}
          caption={
            kpisHierarquia.temNivelTopo
              ? `Escalão #${kpisHierarquia.nivelTopoNumero} (Autoridade Máxima)`
              : 'Atenção: pendente de configuração'
          }
          accentClassName={kpisHierarquia.temNivelTopo ? 'border-l-amber-500' : 'border-l-rose-500'}
          className="font-mono tabular-nums"
        />
        <StatCard
          label="Regras de Substituição"
          value={`${kpisHierarquia.totalSuperiorHierarquico} ascensões / ${kpisHierarquia.totalSubstitutoLegal} subst.`}
          caption={
            kpisHierarquia.prevalenciaSubstituicao === 'mista'
              ? 'Regime misto de afastamento'
              : kpisHierarquia.prevalenciaSubstituicao === 'superior_hierarquico'
              ? 'Ascensão ao superior imediato'
              : 'Designação formal direta'
          }
          accentClassName="border-l-indigo-500"
          className="font-mono tabular-nums"
        />
        <StatCard
          label="Integridade da Cadeia"
          value={kpisHierarquia.mensagemIntegridade}
          caption={
            integridade.valida
              ? 'Cadeia contínua sem lacunas'
              : `${integridade.problemas.length} inconsistências detectadas`
          }
          accentClassName={
            kpisHierarquia.statusIntegridade === 'conforme'
              ? 'border-l-emerald-500'
              : 'border-l-rose-500'
          }
          className="font-mono tabular-nums"
        />
      </div>

      {/* SELETOR DE MODO DE VISUALIZAÇÃO (SEGMENTED CONTROL) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-2">
        <div className="flex items-center gap-1.5 p-1 bg-muted/40 rounded-lg border border-border w-fit">
          <button
            type="button"
            onClick={() => setModoVisualizacao('tabela')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              modoVisualizacao === 'tabela'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <TableIcon className="h-3.5 w-3.5" />
            Tabela de Níveis ({niveisCast.length})
          </button>
          <button
            type="button"
            onClick={() => setModoVisualizacao('arvore')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              modoVisualizacao === 'arvore'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            Pirâmide Institucional
          </button>
          <button
            type="button"
            onClick={() => setModoVisualizacao('simulador')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              modoVisualizacao === 'simulador'
                ? 'bg-background text-foreground shadow-sm text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Play className="h-3.5 w-3.5" />
            Simulador ("Quem avalia quem?")
          </button>
        </div>

        {/* ALERTA VISUAL DE INTEGRIDADE CASO HAJA PROBLEMAS */}
        {!integridade.valida && (
          <div className="flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400 bg-rose-500/10 px-3 py-1.5 rounded-md border border-rose-500/20">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{integridade.problemas[0]}</span>
          </div>
        )}
      </div>

      {/* ── MODO 1: TABELA DE NÍVEIS COM DATATABLE ────────────────────── */}
      {modoVisualizacao === 'tabela' && (
        <Card className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, cargo, nível..."
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                className="pl-9 text-xs h-8"
              />
              {termoBusca && (
                <button
                  type="button"
                  onClick={() => setTermoBusca('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs text-primary border-primary/30">
                Exibindo: {niveisFiltrados.length} de {niveisCast.length} níveis
              </Badge>
            </div>
          </div>

          <DataTable
            columns={columns}
            data={niveisFiltrados}
            loading={loading}
            emptyText="Nenhum nível hierárquico encontrado."
            pageSize={10}
            pageSizeSelector
          />
        </Card>
      )}

      {/* ── MODO 2: PIRÂMIDE INSTITUCIONAL (ÁRVORE VISUAL) ───────────── */}
      {modoVisualizacao === 'arvore' && (
        <Card className="p-5 space-y-6">
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <div>
              <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                Fluxo de Ascensão Avaliativa (Da Base ao Topo Institucional)
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Representação esquemática da pirâmide de competência avaliativa do órgão.
              </p>
            </div>
            <Badge variant="outline" className="text-xs font-mono">
              {integridade.niveisOrdenados.length} níveis interligados
            </Badge>
          </div>

          {integridade.niveisOrdenados.length === 0 ? (
            <EmptyState
              icon={<Network className="h-8 w-8 text-muted-foreground" />}
              title="Nenhum nível para exibir"
              description="Cadastre ao menos um nível hierárquico para visualizar a pirâmide."
            />
          ) : (
            <div className="flex flex-col items-center space-y-3 py-4 max-w-xl mx-auto">
              {/* Renderiza em ordem decrescente (topo em cima, base embaixo) */}
              {[...integridade.niveisOrdenados].reverse().map((nivel, idx) => (
                <React.Fragment key={nivel.id}>
                  <div
                    className={`w-full p-4 rounded-xl border transition-all ${
                      nivel.is_topo
                        ? 'border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-background to-amber-500/5 shadow-sm'
                        : nivel.nivel === 0
                        ? 'border-primary/40 bg-primary/5'
                        : 'border-border bg-card'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div
                          className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                            nivel.is_topo
                              ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                              : 'bg-primary/10 text-primary'
                          }`}
                        >
                          {nivel.is_topo ? <Crown className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-primary">#{nivel.nivel}</span>
                            <span className="text-xs font-bold text-foreground">{nivel.nome}</span>
                            {nivel.is_topo && (
                              <Badge variant="default" className="text-[9px] font-mono bg-amber-500 text-white">
                                Topo
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {nivel.cargo_referencia || 'Cargo de chefia não especificado'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {nivel.regra_substituicao === 'superior_hierarquico'
                            ? 'Sobe para Superior'
                            : 'Substituto Designado'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {idx < integridade.niveisOrdenados.length - 1 && (
                    <div className="flex flex-col items-center">
                      <div className="w-0.5 h-6 bg-border" />
                      <div className="text-[10px] font-mono text-muted-foreground px-2 py-0.5 rounded bg-muted/60 border border-border/50">
                        ascende em afastamento ▲
                      </div>
                      <div className="w-0.5 h-6 bg-border" />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ── MODO 3: SIMULADOR INTERATIVO ("QUEM AVALIA QUEM?") ────────── */}
      {modoVisualizacao === 'simulador' && (
        <Card className="p-5 space-y-6">
          <div className="flex items-start justify-between border-b border-border/50 pb-3">
            <div>
              <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                <Play className="h-4 w-4 text-emerald-600" />
                Simulador Interativo de Resolução de Avaliador
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Simule em tempo real qual autoridade administrativa será competente para realizar a avaliação segundo as regras cadastradas.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* PAINEL DE CONTROLES DO CENÁRIO */}
            <div className="space-y-4 p-4 rounded-xl border border-border bg-muted/20">
              <h5 className="text-xs font-bold text-foreground flex items-center gap-1.5 border-b border-border/40 pb-2">
                <Shield className="h-3.5 w-3.5 text-primary" />
                Parâmetros do Cenário
              </h5>

              {/* SELETOR DO ESCALÃO BASE */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Escalão Funcional do Servidor</label>
                <select
                  className="w-full h-9 px-2.5 rounded-md border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  value={cenarioSimulacao.nivelBaseId}
                  onChange={(e) =>
                    setCenarioSimulacao((prev) => ({
                      ...prev,
                      nivelBaseId: Number(e.target.value),
                    }))
                  }
                >
                  {niveisCast.map((n) => (
                    <option key={n.id} value={n.id}>
                      Nível #{n.nivel} — {n.nome} ({n.cargo_referencia || 'Chefia'})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground">
                  Representa a unidade ou departamento de lotação do servidor avaliado.
                </p>
              </div>

              {/* CHAVE DE AFASTAMENTO DA CHEFIA */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
                <div>
                  <div className="text-xs font-semibold text-foreground">Chefia Imediata Afastada?</div>
                  <div className="text-[11px] text-muted-foreground">
                    Ativa a regra de substituição regimental
                  </div>
                </div>
                <Switch
                  checked={cenarioSimulacao.chefiaImediataAfastada}
                  onCheckedChange={(checked) =>
                    setCenarioSimulacao((prev) => ({
                      ...prev,
                      chefiaImediataAfastada: checked,
                    }))
                  }
                />
              </div>

              {cenarioSimulacao.chefiaImediataAfastada && (
                <div className="space-y-1.5 animate-in fade-in duration-200">
                  <label className="text-xs font-medium text-foreground">Motivo do Afastamento</label>
                  <Input
                    value={cenarioSimulacao.motivoAfastamento || ''}
                    onChange={(e) =>
                      setCenarioSimulacao((prev) => ({
                        ...prev,
                        motivoAfastamento: e.target.value,
                      }))
                    }
                    placeholder="Ex.: Licença médica, Férias..."
                    className="text-xs h-8"
                  />
                </div>
              )}
            </div>

            {/* PAINEL DE RESULTADO DA SIMULAÇÃO */}
            <div className="lg:col-span-2 space-y-4">
              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-300 font-semibold uppercase tracking-wider">
                    Avaliador Competente Resolvido
                  </span>
                  {resultadoSimulacao.regraSubstituicaoAcionada ? (
                    <Badge variant="outline" className="text-[10px] font-mono text-amber-600 border-amber-500/40">
                      Regra de Substituição Acionada
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] font-mono text-emerald-600 border-emerald-500/40">
                      Titular Ordinário
                    </Badge>
                  )}
                </div>
                <div className="text-base font-bold text-foreground">
                  {resultadoSimulacao.avaliadorDesignado}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {resultadoSimulacao.fundamentacaoRegimental}
                </p>
              </div>

              {/* LINHA DO TEMPO DA RESOLUÇÃO */}
              <div className="space-y-3 pt-2">
                <h6 className="text-xs font-bold text-foreground">Trilho de Resolução da Competência:</h6>
                <div className="space-y-2.5">
                  {resultadoSimulacao.passos.map((passo) => (
                    <div
                      key={passo.ordem}
                      className={`p-3 rounded-lg border flex items-start justify-between gap-3 ${
                        passo.status === 'afastado'
                          ? 'border-rose-500/30 bg-rose-500/5'
                          : passo.status === 'acionado_por_regra'
                          ? 'border-primary/40 bg-primary/5'
                          : 'border-border bg-card'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div
                          className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-mono font-bold shrink-0 ${
                            passo.status === 'afastado'
                              ? 'bg-rose-500/20 text-rose-600'
                              : 'bg-primary/20 text-primary'
                          }`}
                        >
                          {passo.ordem}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-foreground">
                              {passo.nomeAvaliadorSimulado}
                            </span>
                            <span className="text-[10px] font-mono text-muted-foreground">
                              (Nível #{passo.nivelNumero})
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {passo.justificativa}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {passo.status === 'afastado' ? (
                          <Badge variant="outline" className="text-[10px] text-rose-500 border-rose-500/30">
                            Afastado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30">
                            Competente
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* MODAL DE CRIAÇÃO / EDIÇÃO DE NÍVEL HIERÁRQUICO */}
      {modalAberto && (
        <Modal
          open={modalAberto}
          onClose={() => setModalAberto(false)}
          title={editandoId ? 'Editar Nível Hierárquico' : 'Novo Nível Hierárquico'}
          icon={<Network className="h-5 w-5 text-primary" />}
          size="md"
        >
          <div className="space-y-4 p-1">
            {erro && (
              <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-xs text-rose-600 dark:text-rose-400">
                {erro}
              </div>
            )}

            <Field label="Índice do Nível (0 = escalão base mais próximo do servidor)">
              <Input
                type="number"
                min={0}
                value={form.nivel}
                onChange={(e) => setForm({ ...form, nivel: Number(e.target.value) })}
                className="font-mono tabular-nums text-xs"
              />
            </Field>

            <Field label="Nome do Nível">
              <Input
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Ex.: Departamento, Diretoria, Secretaria..."
                className="text-xs"
              />
            </Field>

            <Field label="Cargo de Referência (Informativo)">
              <Input
                value={form.cargo_referencia}
                onChange={(e) => setForm({ ...form, cargo_referencia: e.target.value })}
                placeholder="Ex.: Diretor de Departamento, Secretário..."
                className="text-xs"
              />
            </Field>

            <Field label="Regra de Substituição em Afastamentos Regimentais">
              <Select
                value={form.regra_substituicao}
                onChange={(val) => setForm({ ...form, regra_substituicao: val as FormState['regra_substituicao'] })}
                options={REGRAS}
              />
            </Field>

            <div className="flex items-center justify-between rounded-lg border border-border p-3 bg-muted/20">
              <div>
                <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Crown className="h-3.5 w-3.5 text-amber-500" />
                  Nível Topo da Hierarquia do Órgão
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Quem avalia o gestor máximo do órgão, quando não há superior funcional acima.
                </div>
              </div>
              <Switch checked={form.is_topo} onCheckedChange={(checked) => setForm({ ...form, is_topo: checked })} />
            </div>

            {form.is_topo && (
              <div className="space-y-3 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 animate-in fade-in duration-200">
                <Field label="ID do Usuário Avaliador do Topo (Opcional)">
                  <Input
                    type="number"
                    value={form.avaliador_topo_user_id}
                    onChange={(e) => setForm({ ...form, avaliador_topo_user_id: e.target.value })}
                    placeholder="Ex.: 42"
                    className="font-mono text-xs"
                  />
                </Field>
                <Field label="Ou Papel/Role RBAC Responsável pelo Topo (Opcional)">
                  <Input
                    value={form.avaliador_topo_role}
                    onChange={(e) => setForm({ ...form, avaliador_topo_role: e.target.value })}
                    placeholder="Ex.: controladoria, prefeito, comissao..."
                    className="text-xs font-mono"
                  />
                </Field>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-border/50">
              <Button variant="outline" size="sm" onClick={() => setModalAberto(false)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={salvar} disabled={salvando || !form.nome.trim()}>
                {salvando ? 'Salvando...' : 'Salvar Nível'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* DIÁLOGO SEGURO DE CONFIRMAÇÃO DE DESATIVAÇÃO (SEM WINDOW.CONFIRM) */}
      <ConfirmDialog
        open={dialogExclusao.aberto}
        title="Desativar Nível Hierárquico?"
        description={`Tem certeza que deseja desativar o nível "${dialogExclusao.nome}"? Servidores vinculados a este escalão poderão ter a resolução do avaliador impactada nos próximos ciclos.`}
        confirmLabel="Sim, Desativar"
        cancelLabel="Cancelar"
        destructive={true}
        requireReason={false}
        onConfirm={confirmarDesativacao}
        onClose={() => setDialogExclusao({ aberto: false, nivelId: null, nome: '' })}
      />
    </div>
  );
};
