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
  Eye,
  Info,
  ShieldAlert,
  QrCode,
  FileText,
  Upload,
  MapPin,
  UserX,
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
import { ModalQrCodeJazigo } from './ModalQrCodeJazigo';
import { ModalFichaCadastral } from './ModalFichaCadastral';
import { BarraAcoesLote } from './BarraAcoesLote';
import { ModalAcaoLoteManutencao } from './ModalAcaoLoteManutencao';
import { ModalImpressaoLoteQr } from './ModalImpressaoLoteQr';
import { ModalImportadorJazigos } from './ModalImportadorJazigos';
import { SecaoVistoriasJazigo } from './SecaoVistoriasJazigo';
import { ModalNovaVistoriaJazigo } from './ModalNovaVistoriaJazigo';
import { GrupoAlertasRegulorios } from './BadgeAlertaRegulatorio';
import { PainelRegulatorioDrawer } from './PainelRegulatorioDrawer';
import { LocalizacaoGeorreferenciada } from './LocalizacaoGeorreferenciada';
import { obterAlertasReguloriosJazigo } from '../regulamentacao.utils';
import { useCemiteriosNavigation } from '../CemiteriosContext';

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
  criterioRegulatorio: 'todos',
  busca: '',
};

/**
 * Inventário Físico de Cemitérios Municipais (SIGCM).
 * Inclui KPIs superiores no padrão CAPD, filtros avançados e DataTable com exportação nativa.
 */
export const InventarioView: React.FC = () => {
  const { can } = useCan();
  const gerencia = can('cemiterios.inventario.manage');
  const { navegarParaMapa, cemiterioAtivoId, cemiterioAtivo } = useCemiteriosNavigation();

  const [filtros, setFiltros] = useState<InventarioFiltrosState>(() => ({
    ...ESTADO_FILTROS_INICIAL,
    parqueId: cemiterioAtivoId ? String(cemiterioAtivoId) : null,
  }));
  const [modal, setModal] = useState<'parque' | 'setor' | 'jazigo' | null>(null);
  const [selecionado, setSelecionado] = useState<Jazigo | null>(null);
  const [qrJazigo, setQrJazigo] = useState<Jazigo | null>(null);
  const [fichaJazigo, setFichaJazigo] = useState<Jazigo | null>(null);
  const [selecionadosIds, setSelecionadosIds] = useState<Set<number>>(new Set());
  const [modalImportador, setModalImportador] = useState(false);
  const [modalLoteManutencao, setModalLoteManutencao] = useState(false);
  const [modalLoteQr, setModalLoteQr] = useState(false);

  // Necrópole efetiva: prioriza contexto ativo
  const parqueIdEfetivo = cemiterioAtivoId ? String(cemiterioAtivoId) : filtros.parqueId;

  // Carga de dados base
  const parques = useDados(() => cemiteriosApi.parques(), []);
  const parque = useDados(
    () => (parqueIdEfetivo ? cemiteriosApi.parque(Number(parqueIdEfetivo)) : Promise.resolve(null)),
    [parqueIdEfetivo]
  );

  const jazigosQuery = useDados(
    () =>
      cemiteriosApi.jazigos({
        parque: parqueIdEfetivo ?? undefined,
        setor: filtros.setorId ?? undefined,
        estado: filtros.estado && filtros.estado !== 'todos' ? filtros.estado : undefined,
        tipo: filtros.tipo && filtros.tipo !== 'todos' ? filtros.tipo : undefined,
        q: filtros.busca.trim() || undefined,
        per_page: 200,
      }),
    [parqueIdEfetivo, filtros.setorId, filtros.estado, filtros.tipo, filtros.busca]
  );

  const todosJazigos = jazigosQuery.dados?.data ?? [];

  // Setores disponíveis para o filtro (estritamente da necrópole ativa ou agregados)
  const setoresDisponiveis = useMemo(() => {
    if (parqueIdEfetivo) {
      const pEncontrado = (parques.dados ?? []).find((p) => String(p.id) === String(parqueIdEfetivo));
      if (pEncontrado?.setores?.length) return pEncontrado.setores;
      if (parque.dados?.setores?.length) return parque.dados.setores;
    }
    if (parque.dados?.setores) return parque.dados.setores;
    return (parques.dados ?? []).flatMap((p) => p.setores ?? []);
  }, [parqueIdEfetivo, parque.dados, parques.dados]);

  // Opções de setores para formulário modal com indicação do cemitério
  const opcoesSetores = useMemo(() => {
    if (filtros.parqueId && parque.dados?.setores?.length) {
      return parque.dados.setores.map((s) => ({
        value: String(s.id),
        label: s.descricao ? `${s.codigo} (${s.descricao})` : s.codigo,
      }));
    }
    const mapaParques = new Map((parques.dados ?? []).map((p) => [p.id, p.nome]));
    return setoresDisponiveis.map((s) => {
      const nomeCemiterio = mapaParques.get(s.park_id);
      return {
        value: String(s.id),
        label: nomeCemiterio ? `${nomeCemiterio} · Setor ${s.codigo}` : s.codigo,
      };
    });
  }, [filtros.parqueId, parque.dados, parques.dados, setoresDisponiveis]);

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

      // Filtro de critério regulatório
      if (filtros.criterioRegulatorio && filtros.criterioRegulatorio !== 'todos') {
        const alertas = obterAlertasReguloriosJazigo({
          jazigo: j,
          concessao: (j as unknown as { concessao?: Concessao }).concessao,
          inumacoes: (j as unknown as { inumacoes?: Inumacao[] }).inumacoes,
        });

        if (filtros.criterioRegulatorio === 'exumacao_elegivel') {
          const temElegivel = alertas.some((a) => a.tipo === 'exumacao_elegivel');
          if (!temElegivel) return false;
        } else if (filtros.criterioRegulatorio === 'concessao_vencida') {
          const vencida = alertas.some((a) => a.tipo === 'concessao_vencida');
          if (!vencida) return false;
        } else if (filtros.criterioRegulatorio === 'concessao_a_vencer') {
          const aVencer = alertas.some((a) => a.tipo === 'concessao_a_vencer');
          if (!aVencer) return false;
        } else if (filtros.criterioRegulatorio === 'critico') {
          const critico = j.estado === 'manutencao' || alertas.some((a) => a.tipo === 'risco_estrutural');
          if (!critico) return false;
        }
      }

      return true;
    });
  }, [todosJazigos, filtros]);

  // Definição das Colunas com TanStack Table
  const colunas = useMemo<ColumnDef<Jazigo, unknown>[]>(() => {
    const cols: ColumnDef<Jazigo, unknown>[] = [
      {
        id: 'select',
        size: 40,
        header: () => (
          <input
            type="checkbox"
            checked={
              jazigosFiltrados.length > 0 &&
              selecionadosIds.size === jazigosFiltrados.length
            }
            onChange={(e) => {
              if (e.target.checked) {
                setSelecionadosIds(new Set(jazigosFiltrados.map((j) => j.id)));
              } else {
                setSelecionadosIds(new Set());
              }
            }}
            className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer align-middle"
            aria-label="Selecionar todos os registros filtrados"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={selecionadosIds.has(row.original.id)}
            onChange={(e) => {
              e.stopPropagation();
              setSelecionadosIds((prev) => {
                const next = new Set(prev);
                if (next.has(row.original.id)) {
                  next.delete(row.original.id);
                } else {
                  next.add(row.original.id);
                }
                return next;
              });
            }}
            onClick={(e) => e.stopPropagation()}
            className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer align-middle"
            aria-label={`Selecionar unidade ${row.original.codigo}`}
          />
        ),
      },
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
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelecionado(row.original);
            }}
            className="font-mono font-bold text-primary hover:underline hover:text-primary/80 text-xs inline-flex items-center gap-1.5 cursor-pointer text-left focus:outline-none group"
            title={`Clique para ver todas as informações do túmulo ${row.original.codigo}`}
          >
            <span>{row.original.codigo}</span>
            <Info className="h-3 w-3 text-muted-foreground/60 group-hover:text-primary transition-colors" />
          </button>
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
        id: 'alertas',
        header: 'Alertas Regulatórios',
        size: 170,
        meta: {
          exportHeader: 'Alertas Regulatórios',
          exportValue: (r) => {
            const alertas = obterAlertasReguloriosJazigo({
              jazigo: r,
              concessao: (r as unknown as { concessao?: Concessao }).concessao,
              inumacoes: (r as unknown as { inumacoes?: Inumacao[] }).inumacoes,
            });
            return alertas.map((a) => a.rotulo).join('; ') || 'Regular';
          },
          sortValue: (r) => (r.estado === 'manutencao' ? 1 : 0),
        },
        cell: ({ row }) => {
          const alertas = obterAlertasReguloriosJazigo({
            jazigo: row.original,
            concessao: (row.original as unknown as { concessao?: Concessao }).concessao,
            inumacoes: (row.original as unknown as { inumacoes?: Inumacao[] }).inumacoes,
          });

          if (alertas.length === 0) {
            return (
              <span className="text-[11px] text-muted-foreground/70 inline-flex items-center gap-1 font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/70 inline-block" />
                Regular
              </span>
            );
          }

          return <GrupoAlertasRegulorios alertas={alertas} limite={2} />;
        },
      },
      {
        id: 'acoes',
        header: 'Ações',
        size: 190,
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setSelecionado(row.original);
              }}
              className="h-7 text-xs px-2 gap-1 text-primary border-primary/30 hover:bg-primary/10 font-semibold"
              title={`Abrir informações completas do túmulo ${row.original.codigo}`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Ver Túmulo</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setQrJazigo(row.original);
              }}
              title="Plaqueta QR Code"
              aria-label="Plaqueta QR Code"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            >
              <QrCode className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setFichaJazigo(row.original);
              }}
              title="Ficha Cadastral"
              aria-label="Ficha Cadastral"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            >
              <FileText className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                navegarParaMapa({
                  jazigoId: row.original.id,
                  codigo: row.original.codigo,
                  lat: row.original.lat,
                  lng: row.original.lng,
                });
              }}
              title="Ver no Mapa GIS"
              aria-label="Ver no Mapa GIS"
              className="h-7 w-7 p-0 text-primary hover:text-primary/80"
            >
              <MapPin className="h-3.5 w-3.5" />
            </Button>
          </div>
        ),
      },
    ];

    if (cemiterioAtivoId) {
      return cols.filter((c) => c.id !== 'cemiterio');
    }
    return cols;
  }, [jazigosFiltrados, selecionadosIds, cemiterioAtivoId, navegarParaMapa]);

  const jazigosSelecionados = useMemo(
    () => todosJazigos.filter((j) => selecionadosIds.has(j.id)),
    [todosJazigos, selecionadosIds]
  );

  return (
    <div className="space-y-4">
      {/* ── 1. Painel Superior de Indicadores (KPI Cards no Padrão CAPD) ── */}
      <InventarioKpis
        jazigos={todosJazigos}
        parqueNome={cemiterioAtivo?.nome ?? parque.dados?.nome ?? null}
        carregando={jazigosQuery.carregando}
      />

      {/* ── 2. Ações de Gestão de Cadastros ── */}
      {gerencia && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/20 p-3 rounded-lg border border-border">
          <div className="text-xs text-muted-foreground font-medium">
            {cemiterioAtivo ? (
              <span>
                Inventário operacional exclusivo: <strong className="text-foreground">{cemiterioAtivo.nome}</strong> ({cemiterioAtivo.endereco ?? 'Endereço não informado'})
              </span>
            ) : parque.dados ? (
              <span>
                Cemitério selecionado: <strong className="text-foreground">{parque.dados.nome}</strong> ({parque.dados.endereco ?? 'Sem endereço'})
              </span>
            ) : (
              <span>Visão integrada de todos os cemitérios do município</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2 ml-auto">
            {/* O botão Novo Cemitério só aparece se nenhum cemitério estiver selecionado no contexto */}
            {!cemiterioAtivoId && (
              <Button variant="outline" size="sm" onClick={() => setModal('parque')} className="gap-1.5 h-8 text-xs">
                <Plus className="h-3.5 w-3.5" /> Novo Cemitério
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={!parques.dados?.length}
              onClick={() => setModal('setor')}
              className="gap-1.5 h-8 text-xs"
              title={!parques.dados?.length ? 'Cadastre ao menos um cemitério antes de adicionar setores' : undefined}
            >
              <Plus className="h-3.5 w-3.5" /> Novo Setor/Quadra
            </Button>
            <Button
              size="sm"
              disabled={setoresDisponiveis.length === 0}
              onClick={() => setModal('jazigo')}
              className="gap-1.5 h-8 text-xs"
              title={setoresDisponiveis.length === 0 ? 'Cadastre ao menos um setor/quadra antes de criar jazigos' : undefined}
            >
              <Plus className="h-3.5 w-3.5" /> Novo Jazigo
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setModalImportador(true)}
              className="gap-1.5 h-8 text-xs"
            >
              <Upload className="h-3.5 w-3.5" /> Importar Planilha (CSV)
            </Button>
          </div>
        </div>
      )}

      {/* ── 3. Painel de Filtros Avançados ── */}
      <InventarioFiltros
        filtros={filtros}
        onFiltrosChange={(novos) => setFiltros((prev) => ({ ...prev, ...novos }))}
        onLimparFiltros={() =>
          setFiltros({
            ...ESTADO_FILTROS_INICIAL,
            parqueId: cemiterioAtivoId ? String(cemiterioAtivoId) : null,
          })
        }
        parques={parques.dados ?? []}
        setoresDisponiveis={setoresDisponiveis}
        totalRegistros={todosJazigos.length}
        totalFiltrados={jazigosFiltrados.length}
        carregando={jazigosQuery.carregando}
        ocultarFiltroCemiterio={Boolean(cemiterioAtivoId)}
      />

      <ErroBox erro={jazigosQuery.erro ?? parques.erro} />

      {/* ── 4. DataTable com Ordenação, Paginação Fixa em 10 e Exportação ── */}
      <DataTable
        columns={colunas}
        data={jazigosFiltrados}
        loading={jazigosQuery.carregando}
        searchable={false}
        exportable
        pagination
        pageSize={10}
        pageSizeSelector={false}
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

      {/* ── 5.1 Modais de QR Code e Ficha Cadastral (acionados pela tabela) ── */}
      <ModalQrCodeJazigo
        aberto={qrJazigo !== null}
        jazigo={qrJazigo}
        onFechar={() => setQrJazigo(null)}
      />
      <ModalFichaCadastral
        aberto={fichaJazigo !== null}
        jazigo={fichaJazigo}
        onFechar={() => setFichaJazigo(null)}
      />

      {/* ── 5.2 Barra de Ações em Lote e Modais Coletivos ── */}
      <BarraAcoesLote
        totalSelecionados={selecionadosIds.size}
        onLimparSelecao={() => setSelecionadosIds(new Set())}
        onInterditarLote={() => setModalLoteManutencao(true)}
        onImprimirLoteQr={() => setModalLoteQr(true)}
        onExportarSelecionados={() => {
          const selecionados = todosJazigos.filter((j) => selecionadosIds.has(j.id));
          const csvContent =
            'Código,Cemitério,Setor,Tipo,Capacidade,Ocupação,Estado\n' +
            selecionados
              .map(
                (j) =>
                  `"${j.codigo}","${j.cemiterio?.nome ?? ''}","${j.setor?.codigo ?? ''}","${j.tipo}",${j.capacidade},${j.ocupacao},"${j.estado}"`
              )
              .join('\n');
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `jazigos_selecionados_${new Date().toISOString().slice(0, 10)}.csv`;
          link.click();
          URL.revokeObjectURL(url);
        }}
      />

      <ModalAcaoLoteManutencao
        aberto={modalLoteManutencao}
        jazigos={jazigosSelecionados}
        onFechar={() => setModalLoteManutencao(false)}
        onConcluido={() => {
          setSelecionadosIds(new Set());
          void jazigosQuery.recarregar();
        }}
      />

      <ModalImpressaoLoteQr
        aberto={modalLoteQr}
        jazigos={jazigosSelecionados}
        onFechar={() => setModalLoteQr(false)}
      />

      <ModalImportadorJazigos
        aberto={modalImportador}
        parques={parques.dados ?? []}
        setores={setoresDisponiveis}
        onFechar={() => setModalImportador(false)}
        onSucesso={() => {
          setModalImportador(false);
          void jazigosQuery.recarregar();
          void parques.recarregar();
        }}
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
        titulo={filtros.parqueId ? `Novo Setor/Quadra — ${parque.dados?.nome ?? ''}` : 'Novo Setor/Quadra'}
        description="Cadastro de quadra ou setor para delimitação física das sepulturas."
        onFechar={() => setModal(null)}
        iniciais={{
          tipo_zona: 'jazigos',
          parque_id: filtros.parqueId ?? (parques.dados?.[0] ? String(parques.dados[0].id) : ''),
        }}
        campos={[
          ...(!filtros.parqueId
            ? [
                {
                  nome: 'parque_id',
                  rotulo: 'Cemitério Municipal',
                  tipo: 'select' as const,
                  obrigatorio: true,
                  opcoes: (parques.dados ?? []).map((p) => ({ value: String(p.id), label: `${p.nome} (${p.codigo})` })),
                },
              ]
            : []),
          { nome: 'codigo', rotulo: 'Código da Quadra/Setor (ex: Q-01)', obrigatorio: true },
          { nome: 'tipo_zona', rotulo: 'Tipo de Unidades', tipo: 'select' as const, opcoes: ZONAS, obrigatorio: true },
          { nome: 'descricao', rotulo: 'Descrição / Identificação' },
        ]}
        onEnviar={async (v) => {
          const targetParqueId = filtros.parqueId ? Number(filtros.parqueId) : Number(v.parque_id);
          await cemiteriosApi.criarSetor(targetParqueId, {
            codigo: String(v.codigo),
            tipo_zona: String(v.tipo_zona),
            descricao: v.descricao ? String(v.descricao) : null,
          });
          await Promise.all([parque.recarregar(), parques.recarregar()]);
        }}
      />

      <FormModal
        aberto={modal === 'jazigo'}
        titulo="Nova Unidade de Sepultamento"
        description="Cadastro técnico de jazigo, gaveta ou nicho ossuário."
        onFechar={() => setModal(null)}
        iniciais={{
          tipo: 'jazigo',
          capacidade: '3',
          sector_id: opcoesSetores[0]?.value ?? '',
        }}
        campos={[
          {
            nome: 'sector_id',
            rotulo: 'Setor / Quadra',
            tipo: 'select' as const,
            obrigatorio: true,
            opcoes: opcoesSetores,
          },
          { nome: 'codigo', rotulo: 'Código do Jazigo (ex: JAZ-001)', obrigatorio: true },
          { nome: 'tipo', rotulo: 'Tipo', tipo: 'select' as const, opcoes: TIPOS_JAZIGO, obrigatorio: true },
          { nome: 'capacidade', rotulo: 'Capacidade Máxima (restos mortais)', tipo: 'number' as const, obrigatorio: true },
          { nome: 'comprimento_m', rotulo: 'Comprimento (metros)', tipo: 'number' as const },
          { nome: 'largura_m', rotulo: 'Largura (metros)', tipo: 'number' as const },
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
  const vistorias = useDados(() => (id ? cemiteriosApi.vistorias(id) : Promise.resolve(null)), [id]);

  const [confirmar, setConfirmar] = useState(false);
  const [abrirQr, setAbrirQr] = useState(false);
  const [abrirFicha, setAbrirFicha] = useState(false);
  const [abrirNovaVistoria, setAbrirNovaVistoria] = useState(false);
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
      size="lg"
      className="sm:max-w-lg"
      title={j ? `Informações do Túmulo — ${j.codigo}` : 'Informações do Túmulo'}
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
          <p className="text-xs text-muted-foreground -mt-1 pb-1 border-b border-border/40">
            Dados cadastrais completos da sepultura · {j.cemiterio?.nome ?? ''} · Setor <Mono className="font-semibold">{j.setor?.codigo ?? ''}</Mono>
          </p>
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

          {/* Botões de Ações de Documentação e Identificação */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAbrirQr(true)}
              className="h-8 text-xs gap-1.5 font-medium"
            >
              <QrCode className="h-3.5 w-3.5 text-primary" /> Plaqueta QR Code
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAbrirFicha(true)}
              className="h-8 text-xs gap-1.5 font-medium"
            >
              <FileText className="h-3.5 w-3.5 text-indigo-500" /> Ficha Cadastral
            </Button>
          </div>

          {/* Inteligência Regulatória, Sanitária e Concessória */}
          <PainelRegulatorioDrawer
            jazigo={j}
            concessao={concessaoAtiva}
            inumacoes={listaOcupantes}
            vistorias={vistorias.dados?.data ?? []}
          />

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

          {/* Posicionamento Cartográfico & Atalho GIS */}
          <LocalizacaoGeorreferenciada jazigo={j} onFecharDrawer={onFechar} />

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
                  {(concessaoAtiva.processo_administrativo || j.processo_administrativo) && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Proc. Administrativo:</span>
                      <Mono className="font-semibold text-foreground">
                        {concessaoAtiva.processo_administrativo ?? j.processo_administrativo}
                      </Mono>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Titular:</span>
                    <span className="font-medium text-foreground">{concessaoAtiva.concessionario?.nome ?? '—'}</span>
                  </div>
                  {concessaoAtiva.concessionario?.titular_falecido && (
                    <div className="p-2 rounded-md border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs flex items-center gap-2 mt-1">
                      <UserX className="h-4 w-4 text-rose-400 shrink-0" />
                      <div>
                        <span className="font-semibold block text-[11px] uppercase tracking-wider text-rose-400">
                          Titular Falecido — Sucessão Pendente
                        </span>
                        <span className="text-[11px] text-rose-200/80">
                          Sepultamentos de terceiros bloqueados até inventário ou autorização judicial.
                        </span>
                      </div>
                    </div>
                  )}
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
                <div className="space-y-1">
                  {j.processo_administrativo && (
                    <div className="flex items-center justify-between pb-1 border-b border-border/40">
                      <span className="text-muted-foreground">Proc. Administrativo:</span>
                      <Mono className="font-semibold text-foreground">{j.processo_administrativo}</Mono>
                    </div>
                  )}
                  <p className="text-muted-foreground text-xs italic">
                    Nenhuma concessão ativa registrada para esta unidade.
                  </p>
                </div>
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
                        <div className="flex items-center gap-1.5">
                          {oc.gaveta_numero && (
                            <Badge variant="secondary" className="font-mono text-[10px] px-1 py-0 h-4">
                              Gaveta {oc.gaveta_numero}
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {oc.situacao}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>Data do Sepultamento:</span>
                        <Mono>{formatarData(oc.sepultado_em)}</Mono>
                      </div>
                      {(oc.coveiro_nome || oc.pedreiro_nome) && (
                        <div className="text-[10px] text-muted-foreground/80 flex flex-wrap gap-2 pt-0.5 font-mono">
                          {oc.coveiro_nome && <span>Coveiro: {oc.coveiro_nome}</span>}
                          {oc.pedreiro_nome && <span>Pedreiro: {oc.pedreiro_nome}</span>}
                        </div>
                      )}
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

          {/* 5. Vistorias Técnicas e Laudos de Conservação */}
          <SecaoVistoriasJazigo
            vistorias={vistorias.dados?.data ?? []}
            onNovaVistoria={() => setAbrirNovaVistoria(true)}
            podeEditar={pode}
          />
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

      {/* Modais de Documentação no Drawer */}
      <ModalQrCodeJazigo
        aberto={abrirQr}
        jazigo={j ?? null}
        ocupantes={listaOcupantes}
        onFechar={() => setAbrirQr(false)}
      />
      <ModalFichaCadastral
        aberto={abrirFicha}
        jazigo={j ?? null}
        concessao={concessaoAtiva}
        ocupantes={listaOcupantes}
        onFechar={() => setAbrirFicha(false)}
      />
      <ModalNovaVistoriaJazigo
        aberto={abrirNovaVistoria}
        jazigo={j ?? null}
        onFechar={() => setAbrirNovaVistoria(false)}
        onSucesso={() => {
          void vistorias.recarregar();
          void historico.recarregar();
          void detalhe.recarregar();
        }}
      />
    </Drawer>
  );
};
