import React, { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  History,
  Plus,
  Building2,
  Layers,
  User,
  Calendar,
  AlertTriangle,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { Drawer, Card, CardHeader, CardTitle, CardContent, Badge, Button } from '@sysgov/ui';
import { ConfirmDialog, DataTable } from '@/components/ui';
import { useCan } from '@/core/rbac/useCan';
import {
  cemiteriosApi,
  ESTADOS,
  formatarData,
  type Jazigo,
  type Parque,
  type Inumacao,
  type Concessao,
} from '../api';
import { ErroBox, EstadoChip, FormModal, Mono, useAcao, useDados } from './comum';
import { InventarioKpis } from './InventarioKpis';
import {
  InventarioFiltros,
  type InventarioFiltrosState,
} from './InventarioFiltros';

const TIPOS_JAZIGO = [
  { value: 'jazigo', label: 'Jazigo' },
  { value: 'gaveta', label: 'Gaveta' },
  { value: 'ossuario', label: 'Ossuário/Nicho' },
  { value: 'cova_publica', label: 'Cova pública' },
];

const ZONAS = [
  { value: 'jazigos', label: 'Jazigos' },
  { value: 'gavetas', label: 'Gavetas' },
  { value: 'ossuario', label: 'Ossuário' },
  { value: 'cova_publica', label: 'Cova pública' },
];

const ESTADO_FILTROS_INICIAL: InventarioFiltrosState = {
  parqueId: null,
  setorId: null,
  tipo: null,
  estado: null,
  faixaOcupacao: 'todas',
  busca: '',
};

/**
 * Inventário Físico de Cemitérios Municipais (SIGCM).
 * Inclui KPIs superiores no padrão CAPD, filtros avançados e DataTable com exportação nativa.
 */
export const InventarioView: React.FC = () => {
  const { can } = useCan();
  const gerencia = can('cemiterios.inventario.manage');

  const [filtros, setFiltros] = useState<InventarioFiltrosState>(ESTADO_FILTROS_INICIAL);
  const [modal, setModal] = useState<'parque' | 'setor' | 'jazigo' | null>(null);
  const [selecionado, setSelecionado] = useState<Jazigo | null>(null);

  // Carga de dados base
  const parques = useDados(() => cemiteriosApi.parques(), []);
  const parque = useDados(
    () => (filtros.parqueId ? cemiteriosApi.parque(Number(filtros.parqueId)) : Promise.resolve(null)),
    [filtros.parqueId]
  );

  const jazigosQuery = useDados(
    () =>
      cemiteriosApi.jazigos({
        parque: filtros.parqueId ?? undefined,
        setor: filtros.setorId ?? undefined,
        estado: filtros.estado && filtros.estado !== 'todos' ? filtros.estado : undefined,
        tipo: filtros.tipo && filtros.tipo !== 'todos' ? filtros.tipo : undefined,
        q: filtros.busca.trim() || undefined,
        per_page: 200,
      }),
    [filtros.parqueId, filtros.setorId, filtros.estado, filtros.tipo, filtros.busca]
  );

  const todosJazigos = jazigosQuery.dados?.data ?? [];

  // Setores disponíveis para o filtro (do parque ativo ou agregados de todos)
  const setoresDisponiveis = useMemo(() => {
    if (parque.dados?.setores) return parque.dados.setores;
    return (parques.dados ?? []).flatMap((p) => p.setores ?? []);
  }, [parque.dados, parques.dados]);

  // Filtragem complementar no cliente (faixa de ocupação e busca aproximada adicional)
  const jazigosFiltrados = useMemo(() => {
    return todosJazigos.filter((j) => {
      // Filtro de faixa de ocupação
      if (filtros.faixaOcupacao === 'vazio' && j.ocupacao > 0) return false;
      if (filtros.faixaOcupacao === 'parcial' && (j.ocupacao === 0 || j.ocupacao >= j.capacidade))
        return false;
      if (filtros.faixaOcupacao === 'lotado' && j.ocupacao < j.capacidade) return false;

      // Filtro local de setor caso a API não o tenha isolado
      if (filtros.setorId && String(j.sector_id) !== filtros.setorId) return false;

      // Filtro local de tipo caso a API retorne conjunto amplo
      if (filtros.tipo && filtros.tipo !== 'todos' && j.tipo !== filtros.tipo) return false;

      // Filtro local de estado caso selecionado
      if (filtros.estado && filtros.estado !== 'todos' && j.estado !== filtros.estado) return false;

      return true;
    });
  }, [todosJazigos, filtros]);

  // Definição das Colunas com TanStack Table
  const colunas = useMemo<ColumnDef<Jazigo, unknown>[]>(
    () => [
      {
        id: 'codigo',
        header: 'Código',
        accessorKey: 'codigo',
        size: 130,
        meta: {
          exportHeader: 'Código',
          exportValue: (r) => r.codigo,
          sortValue: (r) => r.codigo,
        },
        cell: ({ row }) => (
          <Mono className="font-bold text-foreground text-xs">{row.original.codigo}</Mono>
        ),
      },
      {
        id: 'cemiterio',
        header: 'Cemitério',
        size: 190,
        meta: {
          exportHeader: 'Cemitério',
          exportValue: (r) => r.cemiterio?.nome ?? '—',
          sortValue: (r) => r.cemiterio?.nome ?? '',
        },
        cell: ({ row }) => (
          <div className="truncate max-w-[180px]" title={row.original.cemiterio?.nome}>
            <span className="text-xs font-medium text-foreground">
              {row.original.cemiterio?.nome ?? '—'}
            </span>
          </div>
        ),
      },
      {
        id: 'setor',
        header: 'Setor / Quadra',
        size: 130,
        meta: {
          exportHeader: 'Setor',
          exportValue: (r) => r.setor?.codigo ?? '—',
          sortValue: (r) => r.setor?.codigo ?? '',
        },
        cell: ({ row }) => (
          <Mono className="text-xs text-muted-foreground">{row.original.setor?.codigo ?? '—'}</Mono>
        ),
      },
      {
        id: 'tipo',
        header: 'Tipo',
        accessorKey: 'tipo',
        size: 130,
        meta: {
          exportHeader: 'Tipo',
          exportValue: (r) => r.tipo,
          sortValue: (r) => r.tipo,
        },
        cell: ({ row }) => (
          <span className="capitalize text-xs font-medium text-muted-foreground">
            {row.original.tipo.replace('_', ' ')}
          </span>
        ),
      },
      {
        id: 'ocupacao',
        header: 'Ocupação (Restos / Cap)',
        size: 170,
        meta: {
          exportHeader: 'Ocupação',
          exportValue: (r) => `${r.ocupacao}/${r.capacidade}`,
          sortValue: (r) => (r.capacidade > 0 ? r.ocupacao / r.capacidade : 0),
        },
        cell: ({ row }) => {
          const { ocupacao, capacidade } = row.original;
          const pct = Math.min(100, Math.round((ocupacao / (capacidade || 1)) * 100));
          return (
            <div className="flex items-center gap-2 min-w-[120px]">
              <div className="w-14 h-2 rounded-full bg-muted/60 overflow-hidden shrink-0 border border-border/40">
                <div
                  className={`h-full transition-all ${
                    pct >= 100
                      ? 'bg-rose-500'
                      : pct > 0
                      ? 'bg-cyan-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <Mono className="text-xs tabular-nums font-semibold">
                {ocupacao}/{capacidade}
              </Mono>
            </div>
          );
        },
      },
      {
        id: 'dim',
        header: 'Dimensões (m)',
        size: 130,
        meta: {
          exportHeader: 'Dimensões (m)',
          exportValue: (r) => `${r.comprimento_m ?? '—'} × ${r.largura_m ?? '—'}`,
          sortValue: (r) => (r.comprimento_m ?? 0) * (r.largura_m ?? 0),
        },
        cell: ({ row }) => (
          <Mono className="text-xs text-muted-foreground">
            {row.original.comprimento_m ?? '—'} × {row.original.largura_m ?? '—'}
          </Mono>
        ),
      },
      {
        id: 'estado',
        header: 'Estado',
        accessorKey: 'estado',
        size: 150,
        meta: {
          exportHeader: 'Estado',
          exportValue: (r) => ESTADOS[r.estado]?.rotulo ?? r.estado,
          sortValue: (r) => r.estado,
        },
        cell: ({ row }) => <EstadoChip estado={row.original.estado} />,
      },
      {
        id: 'acoes',
        header: 'Ações',
        size: 110,
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setSelecionado(row.original);
            }}
            className="h-7 text-xs px-2 text-primary hover:text-primary/80 gap-1 font-medium"
          >
            Ver Detalhes
          </Button>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-4">
      {/* ── 1. Painel Superior de Indicadores (KPI Cards no Padrão CAPD) ── */}
      <InventarioKpis
        jazigos={todosJazigos}
        parqueNome={parque.dados?.nome ?? null}
        carregando={jazigosQuery.carregando}
      />

      {/* ── 2. Ações de Gestão de Cadastros ── */}
      {gerencia && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/20 p-3 rounded-lg border border-border">
          <div className="text-xs text-muted-foreground font-medium">
            {parque.dados ? (
              <span>
                Cemitério selecionado: <strong className="text-foreground">{parque.dados.nome}</strong> ({parque.dados.endereco ?? 'Sem endereço'})
              </span>
            ) : (
              <span>Visão integrada de todos os cemitérios do município</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2 ml-auto">
            <Button variant="outline" size="sm" onClick={() => setModal('parque')} className="gap-1.5 h-8 text-xs">
              <Plus className="h-3.5 w-3.5" /> Novo Cemitério
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!filtros.parqueId}
              onClick={() => setModal('setor')}
              className="gap-1.5 h-8 text-xs"
              title={!filtros.parqueId ? 'Selecione um cemitério para adicionar setores' : undefined}
            >
              <Plus className="h-3.5 w-3.5" /> Novo Setor/Quadra
            </Button>
            <Button
              size="sm"
              disabled={!parque.dados?.setores?.length}
              onClick={() => setModal('jazigo')}
              className="gap-1.5 h-8 text-xs"
              title={!parque.dados?.setores?.length ? 'Crie setores antes de cadastrar jazigos' : undefined}
            >
              <Plus className="h-3.5 w-3.5" /> Novo Jazigo
            </Button>
          </div>
        </div>
      )}

      {/* ── 3. Painel de Filtros Avançados ── */}
      <InventarioFiltros
        filtros={filtros}
        onFiltrosChange={(novos) => setFiltros((prev) => ({ ...prev, ...novos }))}
        onLimparFiltros={() => setFiltros(ESTADO_FILTROS_INICIAL)}
        parques={parques.dados ?? []}
        setoresDisponiveis={setoresDisponiveis}
        totalRegistros={todosJazigos.length}
        totalFiltrados={jazigosFiltrados.length}
        carregando={jazigosQuery.carregando}
      />

      <ErroBox erro={jazigosQuery.erro ?? parques.erro} />

      {/* ── 4. DataTable com Ordenação, Paginação e Exportação ── */}
      <DataTable
        columns={colunas}
        data={jazigosFiltrados}
        loading={jazigosQuery.carregando}
        searchable={false}
        exportable
        pagination
        pageSize={25}
        pageSizeSelector
        pageSizeOptions={[10, 25, 50, 100]}
        fixedLayout
        onRowClick={setSelecionado}
        emptyText="Nenhum jazigo encontrado para os filtros selecionados."
      />

      {/* ── 5. Drawer de Detalhes Completo da Unidade ── */}
      <DetalheJazigo
        jazigo={selecionado}
        onFechar={() => setSelecionado(null)}
        onAlterado={() => void jazigosQuery.recarregar()}
      />

      {/* ── 6. Modais de Cadastro ── */}
      <FormModal
        aberto={modal === 'parque'}
        titulo="Novo Cemitério Municipal"
        onFechar={() => setModal(null)}
        campos={[
          { nome: 'codigo', rotulo: 'Código do Cemitério', obrigatorio: true },
          { nome: 'nome', rotulo: 'Nome da Necrópole', obrigatorio: true },
          { nome: 'endereco', rotulo: 'Endereço Completo' },
          { nome: 'responsavel', rotulo: 'Administrador / Responsável' },
          {
            nome: 'tipo',
            rotulo: 'Tipo de Gestão',
            tipo: 'select',
            opcoes: [
              { value: 'municipal', label: 'Municipal' },
              { value: 'distrital', label: 'Distrital' },
              { value: 'outro', label: 'Outro' },
            ],
          },
        ]}
        onEnviar={async (v) => {
          await cemiteriosApi.criarParque(v as Partial<Parque>);
          await parques.recarregar();
        }}
      />

      <FormModal
        aberto={modal === 'setor'}
        titulo={`Novo Setor/Quadra — ${parque.dados?.nome ?? ''}`}
        onFechar={() => setModal(null)}
        campos={[
          { nome: 'codigo', rotulo: 'Código da Quadra/Setor (ex: Q-01)', obrigatorio: true },
          { nome: 'tipo_zona', rotulo: 'Tipo de Unidades', tipo: 'select', opcoes: ZONAS, obrigatorio: true },
          { nome: 'descricao', rotulo: 'Descrição / Identificação' },
        ]}
        onEnviar={async (v) => {
          await cemiteriosApi.criarSetor(Number(filtros.parqueId), v);
          await parque.recarregar();
        }}
      />

      <FormModal
        aberto={modal === 'jazigo'}
        titulo="Nova Unidade de Sepultamento"
        onFechar={() => setModal(null)}
        iniciais={{ tipo: 'jazigo', capacidade: '3' }}
        campos={[
          {
            nome: 'sector_id',
            rotulo: 'Setor / Quadra',
            tipo: 'select',
            obrigatorio: true,
            opcoes: (parque.dados?.setores ?? []).map((s) => ({ value: String(s.id), label: s.codigo })),
          },
          { nome: 'codigo', rotulo: 'Código do Jazigo (ex: JAZ-001)', obrigatorio: true },
          { nome: 'tipo', rotulo: 'Tipo', tipo: 'select', opcoes: TIPOS_JAZIGO, obrigatorio: true },
          { nome: 'capacidade', rotulo: 'Capacidade Máxima (restos mortais)', tipo: 'number', obrigatorio: true },
          { nome: 'comprimento_m', rotulo: 'Comprimento (metros)', tipo: 'number' },
          { nome: 'largura_m', rotulo: 'Largura (metros)', tipo: 'number' },
        ]}
        onEnviar={async (v) => {
          await cemiteriosApi.criarJazigo({
            ...v,
            sector_id: Number(v.sector_id),
            capacidade: Number(v.capacidade),
          } as Partial<Jazigo>);
          await jazigosQuery.recarregar();
        }}
      />
    </div>
  );
};

/**
 * Painel lateral detalhado do jazigo: dados físicos, ocupantes atuais, concessão ativa e linha do tempo (RF-19).
 */
export const DetalheJazigo: React.FC<{
  jazigo: Pick<Jazigo, 'id'> | null;
  onFechar: () => void;
  onAlterado?: () => void;
}> = ({ jazigo, onFechar, onAlterado }) => {
  const { can } = useCan();
  const pode = can('cemiterios.inventario.manage') || can('cemiterios.gis.edit');
  const id = jazigo?.id ?? null;

  const detalhe = useDados(() => (id ? cemiteriosApi.jazigo(id) : Promise.resolve(null)), [id]);
  const historico = useDados(() => (id ? cemiteriosApi.historico(id) : Promise.resolve([])), [id]);
  const inumacoes = useDados(() => (id ? cemiteriosApi.inumacoes({ plot_id: id }) : Promise.resolve(null)), [id]);
  const concessoes = useDados(() => (id ? cemiteriosApi.concessoes({ plot_id: id }) : Promise.resolve(null)), [id]);

  const [confirmar, setConfirmar] = useState(false);
  const { erro, executar } = useAcao();

  const j = detalhe.dados;
  const emManutencao = j?.estado === 'manutencao';
  const listaOcupantes: Inumacao[] = inumacoes.dados?.data ?? [];
  const concessaoAtiva: Concessao | undefined = concessoes.dados?.data?.[0];

  const transicionar = async (motivo: string) => {
    setConfirmar(false);
    if (!j) return;
    const ok = await executar(() =>
      cemiteriosApi.alterarEstado(j.id, emManutencao ? 'restaurar' : 'manutencao', motivo, j.lock_version)
    );
    if (ok) {
      await Promise.all([detalhe.recarregar(), historico.recarregar()]);
      onAlterado?.();
    }
  };

  return (
    <Drawer
      open={id !== null}
      onClose={onFechar}
      title={j ? `Unidade ${j.codigo}` : 'Detalhes do Jazigo'}
      icon={<Building2 className="h-5 w-5 text-primary" />}
      footer={
        pode && j ? (
          <Button
            variant={emManutencao ? 'outline' : 'destructive'}
            onClick={() => setConfirmar(true)}
            className="w-full sm:w-auto"
          >
            {emManutencao ? 'Restaurar / Liberar Jazigo' : 'Interditar por Ruína / Manutenção'}
          </Button>
        ) : undefined
      }
    >
      {j && (
        <div className="space-y-4">
          <ErroBox erro={erro} />

          {/* Cabeçalho de Status */}
          <div className="p-3.5 rounded-lg border border-border bg-muted/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Estado Operacional:</span>
              <EstadoChip estado={j.estado} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Capacidade Física:</span>
              <Mono className="text-xs font-bold text-foreground">
                {j.ocupacao} de {j.capacidade} ocupados ({Math.min(100, Math.round((j.ocupacao / j.capacidade) * 100))}%)
              </Mono>
            </div>
            <p className="text-xs text-muted-foreground pt-1 border-t border-border/60">
              {j.cemiterio?.nome} · Setor <Mono className="font-semibold">{j.setor?.codigo}</Mono> · {j.tipo}
            </p>
          </div>

          {/* 1. Dados Físicos da Unidade */}
          <Card className="gap-0 py-0 overflow-hidden shadow-2xs">
            <CardHeader className="p-3 border-b border-border bg-muted/30">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-primary" /> Dimensões e Localização
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Dimensões (m):</span>
                  <Mono className="font-semibold">
                    {j.comprimento_m ?? '—'} m × {j.largura_m ?? '—'} m
                  </Mono>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Área Estimada:</span>
                  <Mono className="font-semibold">
                    {j.comprimento_m && j.largura_m ? (j.comprimento_m * j.largura_m).toFixed(2) : '—'} m²
                  </Mono>
                </div>
              </div>
              {j.lat && j.lng && (
                <div className="pt-2 border-t border-border/40 text-[11px] text-muted-foreground flex items-center gap-1">
                  <span>Georreferenciamento:</span>
                  <Mono className="text-foreground">
                    {j.lat.toFixed(6)}, {j.lng.toFixed(6)}
                  </Mono>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 2. Concessão Vigente */}
          <Card className="gap-0 py-0 overflow-hidden shadow-2xs">
            <CardHeader className="p-3 border-b border-border bg-muted/30">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-indigo-500" /> Concessão Vinculada
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2 text-xs">
              {concessaoAtiva ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Termo Nº:</span>
                    <Mono className="font-bold">{concessaoAtiva.numero}</Mono>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Titular:</span>
                    <span className="font-medium text-foreground">{concessaoAtiva.concessionario?.nome ?? '—'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Modalidade:</span>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {concessaoAtiva.modalidade}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border/40">
                    <span className="text-muted-foreground">Vigência:</span>
                    <Mono>
                      {formatarData(concessaoAtiva.inicio)} até {concessaoAtiva.termino ? formatarData(concessaoAtiva.termino) : 'Perpétua'}
                    </Mono>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-xs italic">
                  Nenhuma concessão ativa registrada para esta unidade.
                </p>
              )}
            </CardContent>
          </Card>

          {/* 3. Ocupantes Sepultados */}
          <Card className="gap-0 py-0 overflow-hidden shadow-2xs">
            <CardHeader className="p-3 border-b border-border bg-muted/30">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>Restos Mortais Inumados</span>
                <Badge variant="secondary" className="font-mono text-[10px]">
                  {listaOcupantes.length} ocupante(s)
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 text-xs">
              {listaOcupantes.length > 0 ? (
                <ul className="divide-y divide-border/60">
                  {listaOcupantes.map((oc) => (
                    <li key={oc.id} className="py-2 first:pt-0 last:pb-0 space-y-1">
                      <div className="flex items-center justify-between font-semibold text-foreground">
                        <span>{oc.falecido?.nome ?? 'Restos não identificados'}</span>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {oc.situacao}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>Data do Sepultamento:</span>
                        <Mono>{formatarData(oc.sepultado_em)}</Mono>
                      </div>
                      {oc.ordem_servico && (
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1 font-mono">
                          <span>OS #{oc.ordem_servico.numero}/{oc.ordem_servico.ano}</span>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-xs italic">
                  Nenhum registro de inumação ativo nesta unidade.
                </p>
              )}
            </CardContent>
          </Card>

          {/* 4. Linha do Tempo / Histórico do Jazigo (RF-19) */}
          <Card className="gap-0 py-0 overflow-hidden shadow-2xs">
            <CardHeader className="p-3 border-b border-border bg-muted/30">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <History className="h-3.5 w-3.5 text-primary" /> Linha do Tempo e Trilha Histórica
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 text-xs">
              <ol className="space-y-3 border-l-2 border-border/80 pl-3.5 ml-1">
                {(historico.dados ?? []).map((e, i) => (
                  <li key={i} className="text-xs relative">
                    <div className="absolute -left-[19px] top-1 h-2 w-2 rounded-full bg-primary" />
                    <Mono className="block text-[10px] text-muted-foreground">{formatarData(e.data)}</Mono>
                    <span className="font-semibold text-foreground capitalize mr-1">{e.tipo}:</span>
                    <span className="text-muted-foreground">{e.descricao}</span>
                  </li>
                ))}
                {!historico.carregando && historico.dados?.length === 0 && (
                  <li className="text-xs text-muted-foreground italic">
                    Sem registros na linha do tempo.
                  </li>
                )}
              </ol>
            </CardContent>
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={confirmar}
        onClose={() => setConfirmar(false)}
        onConfirm={(motivo) => void transicionar(motivo)}
        requireReason
        title={emManutencao ? 'Restaurar Jazigo' : 'Interditar por Ruína / Manutenção'}
        description="Informe formalmente a justificativa técnica. O registro será gravado com fé pública na trilha de auditoria e no histórico do jazigo."
        confirmLabel="Confirmar Transição"
        destructive={!emManutencao}
        reasonPlaceholder="Descreva o motivo da alteração de estado..."
      />
    </Drawer>
  );
};
