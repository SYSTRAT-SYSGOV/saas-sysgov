import React, { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  FileDown,
  LayoutList,
  LayoutGrid,
  Eye,
  Plus,
  History,
  ArrowRightLeft,
  Scale,
  RefreshCw,
} from 'lucide-react';
import { Button, ConfirmDialog, DataTable, StatusChip, Tabs } from '@/components/ui';
import { useCan } from '@/core/rbac/useCan';
import {
  cemiteriosApi,
  formatarData,
  type Exumacao,
  type Inumacao,
  type OrdemServico,
  type Trasladacao,
  type Jazigo,
} from '../api';
import { ErroBox, Mono, useAcao, useDados } from './comum';
import { useCemiteriosNavigation } from '../CemiteriosContext';
import { OperacoesKpis } from './operacoes/OperacoesKpis';
import { FiltrosAvancadosOperacoes, type EstadoFiltrosOperacoes } from './operacoes/FiltrosAvancadosOperacoes';
import { OrdensServicoDataTable } from './operacoes/OrdensServicoDataTable';
import { OrdensServicoCards } from './operacoes/OrdensServicoCards';
import { ModalDetalheOrdemServico } from './operacoes/ModalDetalheOrdemServico';
import { ModalNovaInumacao } from './operacoes/ModalNovaInumacao';
import { ModalNovaExumacao } from './operacoes/ModalNovaExumacao';
import { ModalNovaTrasladacao } from './operacoes/ModalNovaTrasladacao';
import { TrasladacoesDataTable } from './operacoes/TrasladacoesDataTable';
import { ModalDetalheJazigo } from './ModalDetalheJazigo';

type Aba = 'ordens' | 'inumacoes' | 'exumacoes' | 'trasladacoes';
type Acao = 'iniciar' | 'concluir' | 'suspender' | 'cancelar';

/** Inumação, exumação, trasladação e ordens de serviço (RF-05..RF-10). */
export const OperacoesView: React.FC = () => {
  const { can } = useCan();
  const { cemiterioAtivo, cemiterioAtivoId } = useCemiteriosNavigation();
  const [aba, setAba] = useState<Aba>('ordens');
  const [modal, setModal] = useState<'inumacao' | 'historica' | 'exumacao' | 'judicial' | 'trasladacao' | null>(null);

  // Estado para abertura do modal detalhado de jazigo
  const [jazigoDetalhe, setJazigoDetalhe] = useState<Jazigo | null>(null);

  const abas = [
    { key: 'ordens' as const, label: 'Ordens de Serviço' },
    { key: 'inumacoes' as const, label: 'Inumações' },
    { key: 'exumacoes' as const, label: 'Exumações' },
    { key: 'trasladacoes' as const, label: 'Trasladações' },
  ];

  // Consultas agregadas para os KPIs superiores
  const ordensQuery = useDados(
    () =>
      cemiteriosApi.ordens({
        park_id: cemiterioAtivoId ?? undefined,
        per_page: 100,
      }),
    [cemiterioAtivoId]
  );

  const inumacoesQuery = useDados(
    () =>
      cemiteriosApi.inumacoes({
        park_id: cemiterioAtivoId ?? undefined,
        per_page: 100,
      }),
    [cemiterioAtivoId]
  );

  const exumacoesQuery = useDados(
    () =>
      cemiteriosApi.exumacoes({
        park_id: cemiterioAtivoId ?? undefined,
        per_page: 100,
      }),
    [cemiterioAtivoId]
  );

  const recarregarTudo = async () => {
    await Promise.all([
      ordensQuery.recarregar(),
      inumacoesQuery.recarregar(),
      exumacoesQuery.recarregar(),
    ]);
  };

  const abrirProntuarioPorCodigo = async (codigo: string) => {
    try {
      const res = await cemiteriosApi.jazigos({ codigo, per_page: 1 });
      if (res.data && res.data.length > 0) {
        setJazigoDetalhe(res.data[0]);
      }
    } catch {
      // Ignora erro se não encontrar
    }
  };

  return (
    <div className="space-y-4">
      {/* ── 1. Painel Superior de Indicadores (KPI Cards no Padrão do Sistema) ── */}
      <OperacoesKpis
        ordens={ordensQuery.dados?.data ?? []}
        inumacoes={inumacoesQuery.dados?.data ?? []}
        exumacoes={exumacoesQuery.dados?.data ?? []}
        carregando={ordensQuery.carregando && inumacoesQuery.carregando}
        parqueNome={cemiterioAtivo?.nome ?? null}
      />

      {/* ── 2. Barra de Navegação e Botões de Ação de Cadastro ── */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between bg-card p-3 rounded-xl border border-border">
        <Tabs items={abas} value={aba} onChange={setAba} />
        <div className="flex flex-wrap items-center gap-2">
          {can('cemiterios.operacoes.create') && (
            <Button size="sm" onClick={() => setModal('inumacao')} className="gap-1.5 h-8 text-xs">
              <Plus className="h-3.5 w-3.5" />
              <span>Nova Inumação</span>
            </Button>
          )}
          {can('cemiterios.operacoes.historico') && (
            <Button size="sm" variant="outline" onClick={() => setModal('historica')} className="gap-1.5 h-8 text-xs">
              <History className="h-3.5 w-3.5" />
              <span>Lançamento Histórico</span>
            </Button>
          )}
          {can('cemiterios.operacoes.create') && (
            <Button size="sm" variant="outline" onClick={() => setModal('exumacao')} className="gap-1.5 h-8 text-xs">
              <span>Exumação</span>
            </Button>
          )}
          {can('cemiterios.exumacao.judicial') && (
            <Button size="sm" variant="outline" onClick={() => setModal('judicial')} className="gap-1.5 h-8 text-xs">
              <Scale className="h-3.5 w-3.5" />
              <span>Exumação Judicial</span>
            </Button>
          )}
          {can('cemiterios.operacoes.create') && (
            <Button size="sm" variant="outline" onClick={() => setModal('trasladacao')} className="gap-1.5 h-8 text-xs">
              <ArrowRightLeft className="h-3.5 w-3.5" />
              <span>Trasladação</span>
            </Button>
          )}
        </div>
      </div>

      {/* ── 3. Visualização das Abas ── */}
      {aba === 'ordens' && (
        <OrdensServicoView
          onVerJazigo={abrirProntuarioPorCodigo}
          onRecarregarOperacoes={recarregarTudo}
        />
      )}
      {aba === 'inumacoes' && (
        <InumacoesView
          onVerJazigo={(jazigo) => setJazigoDetalhe(jazigo as Jazigo)}
          onRecarregarOperacoes={recarregarTudo}
        />
      )}
      {aba === 'exumacoes' && <ExumacoesView />}
      {aba === 'trasladacoes' && <TrasladacoesView />}

      {/* ── 4. Modais Especializados de Cadastro de Operações (Layout Amplo 2xl) ── */}
      <ModalNovaInumacao
        aberto={modal === 'inumacao' || modal === 'historica'}
        modoInicial={modal === 'historica' ? 'historica' : 'regular'}
        cemiterioAtivo={cemiterioAtivo}
        cemiterioAtivoId={cemiterioAtivoId}
        onFechar={() => setModal(null)}
        onSucesso={recarregarTudo}
      />

      <ModalNovaExumacao
        aberto={modal === 'exumacao' || modal === 'judicial'}
        modoInicial={modal === 'judicial' ? 'judicial' : 'ordinaria'}
        cemiterioAtivo={cemiterioAtivo}
        cemiterioAtivoId={cemiterioAtivoId}
        onFechar={() => setModal(null)}
        onSucesso={recarregarTudo}
      />

      <ModalNovaTrasladacao
        aberto={modal === 'trasladacao'}
        cemiterioAtivo={cemiterioAtivo}
        cemiterioAtivoId={cemiterioAtivoId}
        onFechar={() => setModal(null)}
        onSucesso={recarregarTudo}
      />

      {/* ── 5. Modal de Detalhe Completo do Túmulo (Integração Direta) ── */}
      {jazigoDetalhe && (
        <ModalDetalheJazigo
          jazigo={jazigoDetalhe}
          onFechar={() => setJazigoDetalhe(null)}
          onAlterado={() => void recarregarTudo()}
        />
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Subvisão: Ordens de Serviço (com DataTable, Cards e Filtros Avançados)     */
/* -------------------------------------------------------------------------- */

interface OrdensServicoViewProps {
  onVerJazigo: (codigo: string) => void;
  onRecarregarOperacoes: () => Promise<void>;
}

const OrdensServicoView: React.FC<OrdensServicoViewProps> = ({
  onVerJazigo,
  onRecarregarOperacoes,
}) => {
  const { can } = useCan();
  const { cemiterioAtivoId } = useCemiteriosNavigation();
  const [modoVisao, setModoVisao] = useState<'tabela' | 'cards'>('tabela');

  const [filtros, setFiltros] = useState<EstadoFiltrosOperacoes>({
    busca: '',
    situacao: 'todas',
    tipo: 'todos',
    equipe: '',
    dataInicio: '',
    dataFim: '',
  });

  const totalFiltrosAtivos = useMemo(() => {
    return [
      Boolean(filtros.busca.trim()),
      filtros.situacao !== 'todas',
      filtros.tipo !== 'todos',
      Boolean(filtros.equipe.trim()),
      Boolean(filtros.dataInicio),
      Boolean(filtros.dataFim),
    ].filter(Boolean).length;
  }, [filtros]);

  const ordens = useDados(
    () =>
      cemiteriosApi.ordens({
        park_id: cemiterioAtivoId ?? undefined,
        situacao: filtros.situacao !== 'todas' ? filtros.situacao : undefined,
        tipo: filtros.tipo !== 'todos' ? filtros.tipo : undefined,
        equipe: filtros.equipe.trim() ? filtros.equipe.trim() : undefined,
        data_inicio: filtros.dataInicio || undefined,
        data_fim: filtros.dataFim || undefined,
        busca: filtros.busca.trim() ? filtros.busca.trim() : undefined,
        per_page: 100,
      }),
    [filtros, cemiterioAtivoId]
  );

  const [ordemSelecionada, setOrdemSelecionada] = useState<OrdemServico | null>(null);
  const [pendente, setPendente] = useState<{ ordem: OrdemServico; acao: Acao } | null>(null);
  const { erro, executar } = useAcao();

  const executa = can('cemiterios.operacoes.executar');
  const gerencia = can('cemiterios.operacoes.create');

  const iniciarTransicao = (ordem: OrdemServico, acao: Acao) => {
    setPendente({ ordem, acao });
  };

  const confirmarTransicao = async (motivo: string) => {
    if (!pendente) return;
    const { ordem, acao } = pendente;
    setPendente(null);
    if (await executar(() => cemiteriosApi.transicaoOrdem(ordem.id, acao, motivo || undefined))) {
      await ordens.recarregar();
      await onRecarregarOperacoes();
      if (ordemSelecionada?.id === ordem.id) {
        setOrdemSelecionada(null);
      }
    }
  };

  return (
    <div className="space-y-3.5">
      {/* Barra de Controles e Alternância de Modo */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <FiltrosAvancadosOperacoes
          filtros={filtros}
          onAlterarFiltros={(novos) => setFiltros((antigo) => ({ ...antigo, ...novos }))}
          onLimparFiltros={() =>
            setFiltros({
              busca: '',
              situacao: 'todas',
              tipo: 'todos',
              equipe: '',
              dataInicio: '',
              dataFim: '',
            })
          }
          totalAtivos={totalFiltrosAtivos}
        />
      </div>

      <div className="flex items-center justify-between px-1">
        <div className="text-xs text-muted-foreground">
          {ordens.dados?.data.length ?? 0} {ordens.dados?.data.length === 1 ? 'ordem de serviço listada' : 'ordens de serviço listadas'}
        </div>

        {/* Alternância Tabela / Cards */}
        <div className="inline-flex items-center rounded-lg border border-border bg-muted/30 p-0.5">
          <Button
            type="button"
            variant={modoVisao === 'tabela' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setModoVisao('tabela')}
            className="h-7 text-xs px-2.5 gap-1.5"
            title="Visualização estruturada em Tabela"
          >
            <LayoutList className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Tabela</span>
          </Button>

          <Button
            type="button"
            variant={modoVisao === 'cards' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setModoVisao('cards')}
            className="h-7 text-xs px-2.5 gap-1.5"
            title="Visualização em Cartões de Campo"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Cartões</span>
          </Button>
        </div>
      </div>

      <ErroBox erro={erro ?? ordens.erro} />

      {modoVisao === 'tabela' ? (
        <OrdensServicoDataTable
          ordens={ordens.dados?.data ?? []}
          carregando={ordens.carregando}
          onSelecionarOrdem={setOrdemSelecionada}
          onTransicao={iniciarTransicao}
          canExecutar={executa}
          canGerenciar={gerencia}
        />
      ) : (
        <OrdensServicoCards
          ordens={ordens.dados?.data ?? []}
          onSelecionarOrdem={setOrdemSelecionada}
          onTransicao={iniciarTransicao}
          canExecutar={executa}
          canGerenciar={gerencia}
        />
      )}

      {/* Modal de Detalhe Completo da Ordem de Serviço */}
      <ModalDetalheOrdemServico
        ordem={ordemSelecionada}
        onFechar={() => setOrdemSelecionada(null)}
        onTransicao={iniciarTransicao}
        canExecutar={executa}
        canGerenciar={gerencia}
        onVerJazigo={onVerJazigo}
      />

      {/* Diálogo de Confirmação de Transição */}
      <ConfirmDialog
        open={pendente !== null}
        onClose={() => setPendente(null)}
        onConfirm={(motivo) => void confirmarTransicao(motivo)}
        requireReason={pendente?.acao === 'suspender'}
        destructive={pendente?.acao === 'suspender' || pendente?.acao === 'cancelar'}
        title={
          pendente
            ? `${pendente.acao[0].toUpperCase()}${pendente.acao.slice(1)} OS ${pendente.ordem.numero}/${pendente.ordem.ano}`
            : ''
        }
        description={
          pendente?.acao === 'suspender'
            ? 'Informe o motivo detalhado da suspensão (ex.: restos mortais ainda não decompostos). Os restos permanecerão no jazigo e o prazo legal de carência será reiniciado.'
            : 'Confirme a atualização do estado operacional desta ordem de serviço.'
        }
        reasonPlaceholder="Descreva o motivo da suspensão..."
        confirmLabel="Confirmar Operação"
      />
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Subvisão: Inumações (DataTable com ações completas)                         */
/* -------------------------------------------------------------------------- */

interface InumacoesViewProps {
  onVerJazigo: (jazigo: Pick<Jazigo, 'id' | 'codigo'>) => void;
  onRecarregarOperacoes: () => Promise<void>;
}

const InumacoesView: React.FC<InumacoesViewProps> = ({
  onVerJazigo,
  onRecarregarOperacoes,
}) => {
  const { can } = useCan();
  const { cemiterioAtivoId } = useCemiteriosNavigation();
  const [pendentes, setPendentes] = useState(false);

  const lista = useDados(
    () =>
      cemiteriosApi.inumacoes({
        park_id: cemiterioAtivoId ?? undefined,
        revisao_pendente: pendentes ? 1 : undefined,
        per_page: 100,
      }),
    [pendentes, cemiterioAtivoId]
  );

  const [cancelar, setCancelar] = useState<Inumacao | null>(null);
  const { erro, executar } = useAcao();

  const colunas = useMemo<ColumnDef<Inumacao, unknown>[]>(
    () => [
      {
        id: 'falecido',
        header: 'Falecido',
        accessorFn: (r) => r.falecido?.nome ?? '',
        cell: ({ row }) => (
          <div>
            <span className="font-semibold text-xs text-foreground block">
              {row.original.falecido?.nome ?? 'Falecido não identificado'}
            </span>
            {row.original.falecido?.certidao_numero && (
              <span className="text-[10px] text-muted-foreground block font-mono">
                Certidão: {row.original.falecido.certidao_numero}
              </span>
            )}
          </div>
        ),
      },
      {
        id: 'jazigo',
        header: 'Túmulo / Gaveta',
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            <div>
              <span className="font-mono text-xs font-bold text-primary block">
                {row.original.jazigo?.codigo ?? '—'}
              </span>
              {row.original.gaveta_numero ? (
                <span className="font-mono text-[10px] text-muted-foreground block">
                  Gaveta {row.original.gaveta_numero}
                </span>
              ) : null}
            </div>
            {row.original.jazigo && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onVerJazigo(row.original.jazigo!)}
                className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                title="Abrir detalhes do túmulo"
              >
                <Eye className="h-3 w-3" />
              </Button>
            )}
          </div>
        ),
      },
      {
        id: 'data',
        header: 'Sepultamento',
        cell: ({ row }) => (
          <span className="font-mono text-xs tabular-nums text-foreground">
            {formatarData(row.original.sepultado_em)}
          </span>
        ),
      },
      {
        id: 'profissionais',
        header: 'Coveiro / Equipe',
        cell: ({ row }) => {
          const partes = [
            row.original.coveiro_nome ? `Cov: ${row.original.coveiro_nome}` : null,
            row.original.pedreiro_nome ? `Ped: ${row.original.pedreiro_nome}` : null,
          ].filter(Boolean);
          return partes.length > 0 ? (
            <span className="text-xs text-muted-foreground">{partes.join(' · ')}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
      },
      {
        id: 'carencia',
        header: 'Carência Desde',
        cell: ({ row }) => (
          <span className="font-mono text-xs tabular-nums text-foreground">
            {formatarData(row.original.carencia_desde)}
          </span>
        ),
      },
      {
        id: 'situacao',
        header: 'Situação',
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            <StatusChip
              label={row.original.situacao}
              variant={row.original.situacao === 'confirmada' ? 'success' : 'neutral'}
            />
            {row.original.revisao_pendente && (
              <StatusChip label="revisão pendente" variant="warning" />
            )}
          </div>
        ),
      },
      {
        id: 'acoes',
        header: 'Ações',
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            {row.original.revisao_pendente && can('cemiterios.operacoes.historico') && (
              <Button
                size="xs"
                variant="outline"
                onClick={async () => {
                  if (await executar(() => cemiteriosApi.revisar(row.original.id))) {
                    await lista.recarregar();
                    await onRecarregarOperacoes();
                  }
                }}
              >
                Revisar
              </Button>
            )}
            {row.original.situacao === 'confirmada' && can('cemiterios.operacoes.create') && (
              <Button
                size="xs"
                variant="ghost"
                onClick={() => setCancelar(row.original)}
                className="text-destructive hover:bg-destructive/10"
              >
                Cancelar
              </Button>
            )}
          </div>
        ),
      },
    ],
    [can, executar, lista, onRecarregarOperacoes, onVerJazigo]
  );

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between">
        <Tabs
          items={[
            { key: 'todas', label: 'Todas as Inumações' },
            { key: 'pendentes', label: 'Pendentes de Revisão' },
          ]}
          value={pendentes ? 'pendentes' : 'todas'}
          onChange={(v) => setPendentes(v === 'pendentes')}
        />
      </div>

      <ErroBox erro={erro ?? lista.erro} />

      <DataTable
        columns={colunas}
        data={lista.dados?.data ?? []}
        loading={lista.carregando}
        searchable
        exportable
        pagination
        pageSize={10}
        pageSizeOptions={[10, 25, 50, 100]}
        pageSizeSelector={true}
        emptyText="Nenhuma inumação encontrada."
      />

      <ConfirmDialog
        open={cancelar !== null}
        onClose={() => setCancelar(null)}
        destructive
        title="Cancelar Inumação"
        description="O cancelamento desfaz a ocupação da sepultura e reverte o estado do jazigo para disponível."
        confirmLabel="Cancelar Inumação"
        onConfirm={async () => {
          const alvo = cancelar;
          setCancelar(null);
          if (alvo && (await executar(() => cemiteriosApi.cancelarInumacao(alvo.id)))) {
            await lista.recarregar();
            await onRecarregarOperacoes();
          }
        }}
      />
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Subvisão: Exumações                                                        */
/* -------------------------------------------------------------------------- */

const ExumacoesView: React.FC = () => {
  const { cemiterioAtivoId } = useCemiteriosNavigation();
  const lista = useDados(
    () => cemiteriosApi.exumacoes({ park_id: cemiterioAtivoId ?? undefined }),
    [cemiterioAtivoId]
  );

  const colunas = useMemo<ColumnDef<Exumacao, unknown>[]>(
    () => [
      {
        id: 'falecido',
        header: 'Falecido',
        accessorFn: (r) => r.inumacao?.falecido?.nome ?? '',
        cell: ({ row }) => (
          <span className="font-semibold text-xs text-foreground">
            {row.original.inumacao?.falecido?.nome ?? 'Falecido não identificado'}
          </span>
        ),
      },
      { id: 'tipo', header: 'Tipo', accessorKey: 'tipo' },
      {
        id: 'prazo',
        header: 'Prazo Legal Aplicado',
        cell: ({ row }) => (
          <Mono className="text-xs font-semibold">
            {row.original.prazo_aplicado_anos ?? '—'} anos
          </Mono>
        ),
      },
      {
        id: 'liberada',
        header: 'Liberada em',
        cell: ({ row }) => (
          <Mono className="text-xs tabular-nums text-foreground">
            {formatarData(row.original.liberada_em)}
          </Mono>
        ),
      },
      {
        id: 'situacao',
        header: 'Situação Sanitária',
        cell: ({ row }) => (
          <StatusChip
            label={row.original.situacao}
            variant={row.original.situacao === 'suspensa' ? 'danger' : 'info'}
          />
        ),
      },
      {
        id: 'motivo',
        header: 'Motivo da Suspensão / Destino',
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.motivo_suspensao || row.original.destino || '—'}
          </span>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-3">
      <ErroBox erro={lista.erro} />
      <DataTable
        columns={colunas}
        data={lista.dados?.data ?? []}
        loading={lista.carregando}
        searchable
        exportable
        pagination
        pageSize={10}
        pageSizeOptions={[10, 25, 50]}
        pageSizeSelector={true}
        emptyText="Nenhuma exumação registrada."
      />
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Subvisão: Trasladações                                                     */
/* -------------------------------------------------------------------------- */

const TrasladacoesView: React.FC = () => {
  const { cemiterioAtivoId } = useCemiteriosNavigation();
  const lista = useDados(
    () => cemiteriosApi.trasladacoes({ park_id: cemiterioAtivoId ?? undefined }),
    [cemiterioAtivoId]
  );

  return (
    <div className="space-y-3">
      <ErroBox erro={lista.erro} />
      <TrasladacoesDataTable
        trasladacoes={lista.dados?.data ?? []}
        carregando={lista.carregando}
      />
    </div>
  );
};
