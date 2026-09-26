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
  Filter,
} from 'lucide-react';
import { Accordion, Card, CardHeader, CardTitle, CardContent, Badge, Button } from '@sysgov/ui';
import { ConfirmDialog, DataTable } from '@/components/ui';
import { useCan } from '@/core/rbac/useCan';
import {
  cemiteriosApi,
  erroApi,
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
import { ModalDetalheJazigo } from './ModalDetalheJazigo';
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
  concessaoStatus: 'todas',
  financeiroStatus: 'todas',
  georreferenciado: 'todos',
  criterioRegulatorio: 'todos',
  busca: '',
  sepultado: '',
};

/**
 * Inventário Físico de Cemitérios Municipais (SIGCM).
 * Inclui KPIs superiores no padrão CAPD, filtros avançados e DataTable com exportação nativa.
 */
export const InventarioView: React.FC = () => {
  const { can } = useCan();
  const gerencia = can('cemiterios.inventario.manage');
  const {
    navegarParaMapa,
    cemiterioAtivoId,
    cemiterioAtivo,
    cemiteriosDisponiveis,
    recarregarCemiterios,
    erroCarregamento,
  } = useCemiteriosNavigation();

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

  // Se o contexto não tiver parques carregados (ex.: testes isolados), carrega sob demanda
  const parquesFallback = useDados(
    () => (cemiteriosDisponiveis.length === 0 ? cemiteriosApi.parques() : Promise.resolve([])),
    [cemiteriosDisponiveis.length]
  );
  const listaParques = cemiteriosDisponiveis.length > 0 ? cemiteriosDisponiveis : (parquesFallback.dados ?? []);

  // Necrópole efetiva: prioriza contexto ativo
  const parqueIdEfetivo = cemiterioAtivoId ? String(cemiterioAtivoId) : filtros.parqueId;
  const parqueAtual =
    cemiterioAtivo ??
    listaParques.find((p) => String(p.id) === String(parqueIdEfetivo)) ??
    null;

  const jazigosQuery = useDados(
    () =>
      cemiteriosApi.jazigos({
        parque: parqueIdEfetivo ?? undefined,
        setor: filtros.setorId ?? undefined,
        estado: filtros.estado && filtros.estado !== 'todos' ? filtros.estado : undefined,
        tipo: filtros.tipo && filtros.tipo !== 'todos' ? filtros.tipo : undefined,
        concessao_status: filtros.concessaoStatus && filtros.concessaoStatus !== 'todas' ? filtros.concessaoStatus : undefined,
        financeiro_status: filtros.financeiroStatus && filtros.financeiroStatus !== 'todas' ? filtros.financeiroStatus : undefined,
        faixa_ocupacao: filtros.faixaOcupacao !== 'todas' ? filtros.faixaOcupacao : undefined,
        georreferenciado: filtros.georreferenciado && filtros.georreferenciado !== 'todos' ? filtros.georreferenciado : undefined,
        q: filtros.busca.trim() || undefined,
        sepultado: filtros.sepultado?.trim() || undefined,
        per_page: 50,
      }),
    [
      parqueIdEfetivo,
      filtros.setorId,
      filtros.estado,
      filtros.tipo,
      filtros.concessaoStatus,
      filtros.financeiroStatus,
      filtros.faixaOcupacao,
      filtros.georreferenciado,
      filtros.busca,
      filtros.sepultado,
    ]
  );

  const todosJazigos = jazigosQuery.dados?.data ?? [];

  // Setores disponíveis para o filtro (estritamente da necrópole ativa ou agregados)
  const setoresDisponiveis = useMemo(() => {
    if (parqueAtual?.setores?.length) {
      return parqueAtual.setores;
    }
    if (parqueIdEfetivo) {
      const pEncontrado = listaParques.find((p) => String(p.id) === String(parqueIdEfetivo));
      if (pEncontrado?.setores?.length) return pEncontrado.setores;
    }
    return listaParques.flatMap((p) => p.setores ?? []);
  }, [parqueAtual, parqueIdEfetivo, listaParques]);

  // Opções de setores para formulário modal com indicação do cemitério
  const opcoesSetores = useMemo(() => {
    if (filtros.parqueId && parqueAtual?.setores?.length) {
      return parqueAtual.setores.map((s) => ({
        value: String(s.id),
        label: s.descricao ? `${s.codigo} (${s.descricao})` : s.codigo,
      }));
    }
    const mapaParques = new Map(listaParques.map((p) => [p.id, p.nome]));
    return setoresDisponiveis.map((s) => {
      const nomeCemiterio = mapaParques.get(s.park_id);
      return {
        value: String(s.id),
        label: nomeCemiterio ? `${nomeCemiterio} · Setor ${s.codigo}` : s.codigo,
      };
    });
  }, [filtros.parqueId, parqueAtual, listaParques, setoresDisponiveis]);

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

      // Filtro de georreferenciamento
      if (filtros.georreferenciado === 'com_gps' && (j.lat == null || j.lng == null)) return false;
      if (filtros.georreferenciado === 'sem_gps' && j.lat != null && j.lng != null) return false;

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
        header: 'Código & Topografia',
        accessorKey: 'codigo',
        size: 160,
        meta: {
          exportHeader: 'Código',
          exportValue: (r) => r.codigo,
          sortValue: (r) => r.codigo,
        },
        cell: ({ row }) => (
          <div>
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
            <div className="flex items-center gap-1.5 mt-0.5">
              {row.original.codigo_legado ? (
                <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[90px]" title={`Código legado: ${row.original.codigo_legado}`}>
                  Livro: {row.original.codigo_legado}
                </span>
              ) : null}
              {row.original.lat && row.original.lng ? (
                <span className="inline-flex items-center text-[10px] text-emerald-500 gap-0.5" title="Georreferenciado com GPS">
                  <MapPin className="h-2.5 w-2.5" />
                </span>
              ) : null}
            </div>
          </div>
        ),
      },
      {
        id: 'cemiterio',
        header: 'Cemitério',
        size: 160,
        meta: {
          exportHeader: 'Cemitério',
          exportValue: (r) => r.cemiterio?.nome ?? '—',
          sortValue: (r) => r.cemiterio?.nome ?? '',
        },
        cell: ({ row }) => (
          <div className="truncate max-w-[150px]" title={row.original.cemiterio?.nome}>
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
          <span title={row.original.setor?.descricao ?? undefined}>
            <Mono className="text-xs text-muted-foreground">
              {row.original.setor?.codigo ?? '—'}
            </Mono>
          </span>
        ),
      },
      {
        id: 'tipo',
        header: 'Tipo',
        accessorKey: 'tipo',
        size: 110,
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
        id: 'titular',
        header: 'Titular / Concessão',
        size: 180,
        meta: {
          exportHeader: 'Titular',
          exportValue: (r) => r.concessoes?.[0]?.concessionario?.nome ?? 'Sem concessão',
          sortValue: (r) => r.concessoes?.[0]?.concessionario?.nome ?? '',
        },
        cell: ({ row }) => {
          const conc = row.original.concessoes?.[0];
          const titular = conc?.concessionario;
          if (!conc || !titular) {
            return (
              <span className="text-xs text-muted-foreground/70 italic">
                Sem concessão (Pública)
              </span>
            );
          }
          return (
            <div className="truncate max-w-[170px]">
              <span className="font-semibold text-foreground text-xs block truncate" title={titular.nome}>
                {titular.nome}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-muted-foreground font-mono">
                  Conc. #{conc.numero}
                </span>
                {titular.titular_falecido ? (
                  <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4">
                    Falecido
                  </Badge>
                ) : null}
              </div>
            </div>
          );
        },
      },
      {
        id: 'ocupacao',
        header: 'Ocupação & Gavetas',
        size: 170,
        meta: {
          exportHeader: 'Ocupação',
          exportValue: (r) => `${r.ocupacao}/${Math.max(r.capacidade || 1, r.ocupacao || 0)}`,
          sortValue: (r) => {
            const cap = Math.max(r.capacidade || 1, r.ocupacao || 0);
            return cap > 0 ? (r.ocupacao || 0) / cap : 0;
          },
        },
        cell: ({ row }) => {
          const ocupacao = row.original.ocupacao || 0;
          const capacidade = Math.max(row.original.capacidade || 1, ocupacao);
          const livres = Math.max(0, capacidade - ocupacao);
          const pct = Math.min(100, Math.round((ocupacao / capacidade) * 100));
          return (
            <div className="min-w-[125px]">
              <div className="flex items-center justify-between text-xs mb-1">
                <Mono className="tabular-nums font-semibold text-foreground">
                  {ocupacao} / {capacidade} gavetas
                </Mono>
                {ocupacao === 0 ? (
                  <span className="text-[10px] text-emerald-500 font-medium">Livre</span>
                ) : livres > 0 ? (
                  <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono font-medium">
                    {livres} livre(s)
                  </span>
                ) : (
                  <span className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">Lotado</span>
                )}
              </div>
              <div className="w-full h-1.5 rounded-full bg-muted/60 overflow-hidden border border-border/40">
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
            </div>
          );
        },
      },
      {
        id: 'sepultados',
        header: 'Sepultados / Inumados',
        size: 170,
        meta: {
          exportHeader: 'Sepultados',
          exportValue: (r) => r.inumacoes?.map((i) => i.falecido?.nome).filter(Boolean).join(', ') || 'Nenhum',
          sortValue: (r) => r.inumacoes?.length ?? 0,
        },
        cell: ({ row }) => {
          const inums = row.original.inumacoes ?? [];
          if (inums.length === 0) {
            return <span className="text-xs text-muted-foreground/60 italic">Nenhum sepultado</span>;
          }
          const maisRecente = inums[0];
          return (
            <div className="truncate max-w-[160px]">
              <span className="text-xs font-medium text-foreground block truncate" title={maisRecente.falecido?.nome}>
                {maisRecente.falecido?.nome || 'Inumado registrado'}
              </span>
              <span className="text-[10px] text-muted-foreground block font-mono">
                {inums.length > 1
                  ? `+${inums.length - 1} outro(s) sepultado(s)`
                  : maisRecente.sepultado_em
                  ? `Sep. ${formatarData(maisRecente.sepultado_em)}`
                  : 'Sepultamento ativo'}
              </span>
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
        cell: ({ row }) => {
          const c = row.original.comprimento_m;
          const l = row.original.largura_m;
          if (c && l) {
            return (
              <div>
                <Mono className="text-xs text-foreground font-semibold">
                  {c} × {l} m
                </Mono>
                <span className="text-[10px] text-muted-foreground block font-mono">
                  {(c * l).toFixed(2)} m²
                </span>
              </div>
            );
          }
          return <span className="text-xs text-muted-foreground/60">—</span>;
        },
      },
      {
        id: 'estado',
        header: 'Estado',
        accessorKey: 'estado',
        size: 140,
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
        size: 160,
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

  const totalFiltrosAtivos = useMemo(() => {
    return [
      Boolean(filtros.parqueId && !cemiterioAtivoId),
      Boolean(filtros.setorId),
      Boolean(filtros.tipo && filtros.tipo !== 'todos'),
      Boolean(filtros.estado && filtros.estado !== 'todos'),
      filtros.faixaOcupacao !== 'todas',
      Boolean(filtros.concessaoStatus && filtros.concessaoStatus !== 'todas'),
      Boolean(filtros.financeiroStatus && filtros.financeiroStatus !== 'todas'),
      Boolean(filtros.georreferenciado && filtros.georreferenciado !== 'todos'),
      Boolean(filtros.criterioRegulatorio && filtros.criterioRegulatorio !== 'todos'),
      Boolean(filtros.busca.trim()),
    ].filter(Boolean).length;
  }, [filtros, cemiterioAtivoId]);

  return (
    <div className="space-y-4">
      {/* ── 1. Painel Superior de Indicadores (KPI Cards no Padrão CAPD) ── */}
      <InventarioKpis
        jazigos={todosJazigos}
        parqueNome={cemiterioAtivo?.nome ?? parqueAtual?.nome ?? null}
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
            ) : parqueAtual ? (
              <span>
                Cemitério selecionado: <strong className="text-foreground">{parqueAtual.nome}</strong> ({parqueAtual.endereco ?? 'Sem endereço'})
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
              disabled={!listaParques.length}
              onClick={() => setModal('setor')}
              className="gap-1.5 h-8 text-xs"
              title={!listaParques.length ? 'Cadastre ao menos um cemitério antes de adicionar setores' : undefined}
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

      {/* ── 3. Painel de Filtros Avançados dentro de Accordion (sempre abre a página fechado) ── */}
      <Accordion
        items={[
          {
            value: 'filtros-inventario',
            title: (
              <div className="flex flex-wrap items-center gap-2 w-full">
                <span className="font-semibold text-xs sm:text-sm text-foreground uppercase tracking-wide">
                  Filtros de Inventário
                </span>
                {totalFiltrosAtivos > 0 ? (
                  <Badge variant="outline" className="text-[10px] text-primary border-primary/40 font-mono">
                    {totalFiltrosAtivos} filtro(s) ativo(s)
                  </Badge>
                ) : (
                  <span className="text-[11px] text-muted-foreground font-normal">
                    (Clique para expandir e filtrar por concessão, status fiscal, ocupação e GPS)
                  </span>
                )}
                <span className="ml-auto text-xs text-muted-foreground font-mono tabular-nums pr-2">
                  Exibindo <strong className="text-foreground">{jazigosFiltrados.length}</strong> de{' '}
                  <strong className="text-foreground">{todosJazigos.length}</strong> unidades
                </span>
              </div>
            ),
            children: (
              <div className="pt-1">
                <InventarioFiltros
                  filtros={filtros}
                  onFiltrosChange={(novos) => setFiltros((prev) => ({ ...prev, ...novos }))}
                  onLimparFiltros={() =>
                    setFiltros({
                      ...ESTADO_FILTROS_INICIAL,
                      parqueId: cemiterioAtivoId ? String(cemiterioAtivoId) : null,
                    })
                  }
                  parques={listaParques}
                  setoresDisponiveis={setoresDisponiveis}
                  totalRegistros={todosJazigos.length}
                  totalFiltrados={jazigosFiltrados.length}
                  carregando={jazigosQuery.carregando}
                  ocultarFiltroCemiterio={Boolean(cemiterioAtivoId)}
                />
              </div>
            ),
            defaultOpen: false, // Inicia sempre fechado na abertura da página
          },
        ]}
        icon={<Filter className="h-4 w-4 text-primary shrink-0" />}
        className="border border-border rounded-lg bg-card shadow-2xs"
      />

      <ErroBox erro={jazigosQuery.erro ?? (erroCarregamento ? erroApi(erroCarregamento) : null)} />

      {/* ── 4. DataTable com Ordenação, Paginação Fixa em 10, Seletor e Exportação ── */}
      <DataTable
        columns={colunas}
        data={jazigosFiltrados}
        loading={jazigosQuery.carregando}
        searchable={false}
        exportable
        pagination
        pageSize={10}
        pageSizeOptions={[10, 25, 50, 100]}
        pageSizeSelector={true}
        fixedLayout
        onRowClick={setSelecionado}
        emptyText="Nenhum jazigo encontrado para os filtros selecionados."
      />

      {/* ── 5. Modal de Detalhes Completo da Unidade com Sub-Abas e Financeiro ── */}
      <ModalDetalheJazigo
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
        parques={cemiteriosDisponiveis}
        setores={setoresDisponiveis}
        onFechar={() => setModalImportador(false)}
        onSucesso={() => {
          setModalImportador(false);
          void jazigosQuery.recarregar();
          void recarregarCemiterios();
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
          await recarregarCemiterios();
        }}
      />

      <FormModal
        aberto={modal === 'setor'}
        titulo={filtros.parqueId ? `Novo Setor/Quadra — ${parqueAtual?.nome ?? ''}` : 'Novo Setor/Quadra'}
        description="Cadastro de quadra ou setor para delimitação física das sepulturas."
        onFechar={() => setModal(null)}
        iniciais={{
          tipo_zona: 'jazigos',
          parque_id: filtros.parqueId ?? (cemiteriosDisponiveis[0] ? String(cemiteriosDisponiveis[0].id) : ''),
        }}
        campos={[
          ...(!filtros.parqueId
            ? [
                {
                  nome: 'parque_id',
                  rotulo: 'Cemitério Municipal',
                  tipo: 'select' as const,
                  obrigatorio: true,
                  opcoes: cemiteriosDisponiveis.map((p) => ({ value: String(p.id), label: `${p.nome} (${p.codigo})` })),
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
          await recarregarCemiterios();
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
 * Export retrocompatível apontando para o novo ModalDetalheJazigo com sub-abas e dados financeiros.
 */
export const DetalheJazigo = ModalDetalheJazigo;

