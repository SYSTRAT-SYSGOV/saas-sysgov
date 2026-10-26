import React, { useState, useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  Search,
  MapPin,
  Building2,
  ArrowRight,
  Landmark,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  List,
  LayoutGrid,
  Filter,
  User,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  Button,
  Input,
  Select,
  ActionsMenu,
} from '@sysgov/ui';
import { DataTable } from '@/components/ui';
import { useCemiteriosContext } from '../CemiteriosContext';
import { taxaOcupacao, type Parque } from '../api';

export interface SelecaoNecropoleViewProps {
  onSelecionar?: (id: number) => void;
}

export type ModoExibicao = 'tabela' | 'cards';

const formatarTaxa = (taxa: number | null) => (taxa === null ? '—' : `${taxa.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`);

export const SelecaoNecropoleView: React.FC<SelecaoNecropoleViewProps> = ({ onSelecionar }) => {
  const {
    cemiteriosDisponiveis,
    isCarregandoCemiterios,
    erroCarregamento,
    selecionarCemiterio,
    abrirAdministracaoGeral,
    isGestorMunicipal,
  } = useCemiteriosContext();

  const [modoExibicao, setModoExibicao] = useState<ModoExibicao>('tabela');
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [filtroOcupacao, setFiltroOcupacao] = useState<string>('todas');

  // Filtragem avançada multidimensional
  const cemiteriosFiltrados = useMemo(() => {
    return cemiteriosDisponiveis.filter((c) => {
      // 1. Busca textual
      if (busca.trim()) {
        const termo = busca.toLowerCase().trim();
        const bateNome = c.nome.toLowerCase().includes(termo);
        const bateCodigo = c.codigo.toLowerCase().includes(termo);
        const bateEndereco = c.endereco ? c.endereco.toLowerCase().includes(termo) : false;
        const bateResp = c.responsavel ? c.responsavel.toLowerCase().includes(termo) : false;
        if (!bateNome && !bateCodigo && !bateEndereco && !bateResp) return false;
      }

      // 2. Filtro de status operacional
      if (filtroStatus !== 'todos') {
        if (c.situacao !== filtroStatus) return false;
      }

      // 3. Filtro de faixa de ocupação (taxa real dos jazigos; sem capacidade cadastrada não entra em nenhuma faixa)
      if (filtroOcupacao !== 'todas') {
        const taxa = taxaOcupacao(c);
        if (taxa === null) return false;
        if (filtroOcupacao === 'baixa' && taxa >= 50) return false;
        if (filtroOcupacao === 'media' && (taxa < 50 || taxa > 80)) return false;
        if (filtroOcupacao === 'alta' && taxa <= 80) return false;
      }

      return true;
    });
  }, [cemiteriosDisponiveis, busca, filtroStatus, filtroOcupacao]);

  const handleSelecionar = (id: number) => {
    selecionarCemiterio(id);
    onSelecionar?.(id);
  };

  const colunas = useMemo<ColumnDef<Parque, unknown>[]>(() => [
    {
      id: 'acoes',
      header: '',
      size: 150,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-center">
          <ActionsMenu
            triggerLabel="Ações do cemitério"
            items={[
              { key: 'acessar', label: 'Acessar Gestão', icon: <ArrowRight className="h-3.5 w-3.5" />, onSelect: () => handleSelecionar(row.original.id) },
            ]}
          />
        </div>
      ),
    },
    {
      id: 'codigo',
      header: 'Código',
      accessorKey: 'codigo',
      cell: ({ row }) => (
        <Badge variant="outline" className="font-mono tabular-nums text-xs">{row.original.codigo}</Badge>
      ),
      meta: { exportHeader: 'Código', exportValue: (r) => r.codigo, sortValue: (r) => r.codigo },
    },
    {
      id: 'nome',
      header: 'Nome da Necrópole',
      accessorKey: 'nome',
      cell: ({ row }) => <span className="font-semibold text-foreground">{row.original.nome}</span>,
      meta: { exportHeader: 'Nome da Necrópole', exportValue: (r) => r.nome, sortValue: (r) => r.nome },
    },
    {
      id: 'endereco',
      header: 'Endereço / Bairro',
      accessorFn: (r) => r.endereco ?? '',
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 max-w-[240px] text-muted-foreground text-sm">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{row.original.endereco || '—'}</span>
        </div>
      ),
      meta: { exportHeader: 'Endereço', exportValue: (r) => r.endereco ?? '', sortValue: (r) => r.endereco ?? '' },
    },
    {
      id: 'responsavel',
      header: 'Responsável',
      accessorFn: (r) => r.responsavel ?? '',
      cell: ({ row }) =>
        row.original.responsavel ? (
          <span className="flex items-center gap-1 text-muted-foreground text-sm">
            <User className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{row.original.responsavel}</span>
          </span>
        ) : (
          '—'
        ),
      meta: { exportHeader: 'Responsável', exportValue: (r) => r.responsavel ?? '', sortValue: (r) => r.responsavel ?? '' },
    },
    {
      id: 'setores',
      header: 'Setores',
      accessorFn: (r) => r.setores_count ?? r.setores?.length ?? 0,
      cell: ({ row }) => (
        <span className="font-mono tabular-nums">{row.original.setores_count ?? row.original.setores?.length ?? 0}</span>
      ),
      meta: { exportHeader: 'Setores', exportValue: (r) => r.setores_count ?? r.setores?.length ?? 0 },
    },
    {
      id: 'jazigos',
      header: 'Jazigos',
      accessorFn: (r) => r.jazigos_count ?? 0,
      cell: ({ row }) => (
        <span className="font-mono tabular-nums font-semibold">{(row.original.jazigos_count ?? 0).toLocaleString('pt-BR')}</span>
      ),
      meta: { exportHeader: 'Jazigos', exportValue: (r) => r.jazigos_count ?? 0 },
    },
    {
      id: 'ocupacao',
      header: 'Ocupação',
      accessorFn: (r) => taxaOcupacao(r) ?? -1,
      cell: ({ row }) => (
        <span className="font-mono tabular-nums">{formatarTaxa(taxaOcupacao(row.original))}</span>
      ),
      meta: { exportHeader: 'Ocupação', exportValue: (r) => formatarTaxa(taxaOcupacao(r)) },
    },
    {
      id: 'situacao',
      header: 'Status',
      accessorKey: 'situacao',
      cell: ({ row }) => (
        <Badge variant={row.original.situacao === 'ativo' ? 'default' : 'secondary'} className="capitalize text-xs">
          {row.original.situacao === 'ativo' ? 'Ativo' : row.original.situacao}
        </Badge>
      ),
      meta: { exportHeader: 'Status', exportValue: (r) => r.situacao, sortValue: (r) => r.situacao },
    },
  // handleSelecionar só depende destes dois.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [selecionarCemiterio, onSelecionar]);

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto py-2 overflow-x-hidden">
      {/* Banner de Administração Geral para Gestor Municipal */}
      {isGestorMunicipal && (
        <Card className="border-l-4 border-l-emerald-500 bg-gradient-to-r from-emerald-500/10 via-background to-background">
          <CardContent className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                <Landmark className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground text-base">Painel de Administração Geral Municipal</h3>
                  <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400 border-emerald-500/40 text-xs">
                    Visão Macro
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Acesse os indicadores consolidados, arrecadação municipal, relatórios e manutenções de todos os cemitérios.
                </p>
              </div>
            </div>
            <Button
              onClick={abrirAdministracaoGeral}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
            >
              <ShieldCheck className="h-4 w-4 mr-2" />
              Acessar Administração Geral
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Cabeçalho da Seleção com Controle de Alternância de Visualização */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Selecione o Cemitério para Gestão
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Escolha uma das necrópoles municipais abaixo para gerenciar inventário, jazigos, sepultamentos e concessões.
          </p>
        </div>

        {/* Toggle Lista (Padrão) vs Cards */}
        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          <span className="text-xs text-muted-foreground font-medium mr-1">Visualização:</span>
          <div className="flex items-center rounded-lg border border-border p-1 bg-muted/40">
            <Button
              variant={modoExibicao === 'tabela' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setModoExibicao('tabela')}
              className="h-8 px-2.5 gap-1.5 text-xs"
              aria-label="Visualização em Listagem"
            >
              <List className="h-4 w-4" />
              Listagem
            </Button>
            <Button
              variant={modoExibicao === 'cards' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setModoExibicao('cards')}
              className="h-8 px-2.5 gap-1.5 text-xs"
              aria-label="Visualização em Cards"
            >
              <LayoutGrid className="h-4 w-4" />
              Cards
            </Button>
          </div>
        </div>
      </div>

      {/* Painel de Filtros Avançados */}
      <Card className="p-4 bg-card/60">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          <Filter className="h-3.5 w-3.5 text-primary" />
          Filtros Avançados de Necrópoles
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Busca textual */}
          <div className="md:col-span-2 relative">
            <Input
              placeholder="Buscar por nome, código, bairro ou responsável..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9"
            />
            <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Filtro de Status */}
          <div>
            <Select
              options={[
                { value: 'todos', label: 'Status: Todos os status' },
                { value: 'ativo', label: 'Status: Ativo' },
                { value: 'manutencao', label: 'Status: Em Manutenção' },
                { value: 'inativo', label: 'Status: Inativo / Saturado' },
              ]}
              value={filtroStatus}
              onChange={setFiltroStatus}
            />
          </div>

          {/* Filtro de Ocupação */}
          <div>
            <Select
              options={[
                { value: 'todas', label: 'Ocupação: Todas as taxas' },
                { value: 'baixa', label: 'Ocupação: Baixa (< 50%)' },
                { value: 'media', label: 'Ocupação: Média (50% a 80%)' },
                { value: 'alta', label: 'Ocupação: Crítica (> 80%)' },
              ]}
              value={filtroOcupacao}
              onChange={setFiltroOcupacao}
            />
          </div>
        </div>
      </Card>

      {/* Estados de carregamento e erro */}
      {isCarregandoCemiterios && (
        <div className="py-12 text-center text-muted-foreground">
          <p className="animate-pulse">Carregando cemitérios municipais autorizados...</p>
        </div>
      )}

      {erroCarregamento && !isCarregandoCemiterios && (
        <Card className="border-destructive/30 bg-destructive/10 p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="font-semibold text-destructive">{erroCarregamento}</p>
        </Card>
      )}

      {/* Empty State de Busca */}
      {!isCarregandoCemiterios && !erroCarregamento && cemiteriosFiltrados.length === 0 && (
        <div className="py-12 text-center border rounded-lg bg-card text-card-foreground p-8">
          <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
          <h3 className="font-semibold text-foreground text-lg">Nenhum cemitério encontrado</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            {busca || filtroStatus !== 'todos' || filtroOcupacao !== 'todas'
              ? 'Nenhum resultado corresponde aos filtros aplicados. Tente ajustar os parâmetros.'
              : 'Nenhum cemitério municipal disponível para o seu perfil no momento.'}
          </p>
        </div>
      )}

      {/* 1. VISUALIZAÇÃO EM LISTAGEM (DataTable padrão: exportação, paginação e linhas por página) */}
      {!isCarregandoCemiterios &&
        !erroCarregamento &&
        cemiteriosFiltrados.length > 0 &&
        modoExibicao === 'tabela' && (
          <DataTable
            columns={colunas}
            data={cemiteriosFiltrados}
            exportable
            exportFileName="cemiterios-necropoles"
            exportTitle="Cemitérios — Necrópoles"
            emptyText="Nenhum cemitério encontrado."
          />
        )}

      {/* 2. VISUALIZAÇÃO EM CARDS (OPÇÃO SECUNDÁRIA) */}
      {!isCarregandoCemiterios &&
        !erroCarregamento &&
        cemiteriosFiltrados.length > 0 &&
        modoExibicao === 'cards' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {cemiteriosFiltrados.map((parque) => {
              const totalJazigos = parque.jazigos_count ?? 0;
              const setores =
                parque.setores_count ?? (parque.setores ? parque.setores.length : 0);
              const isAtivo = parque.situacao === 'ativo';

              return (
                <Card
                  key={parque.id}
                  className="hover:border-primary/50 transition-all hover:shadow-md flex flex-col justify-between group cursor-pointer"
                  onClick={() => handleSelecionar(parque.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <Badge variant="outline" className="font-mono tabular-nums text-xs">
                        {parque.codigo}
                      </Badge>
                      <Badge
                        variant={isAtivo ? 'default' : 'secondary'}
                        className="capitalize text-xs"
                      >
                        {isAtivo ? 'Ativo' : parque.situacao}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors mt-2">
                      {parque.nome}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1 line-clamp-1">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      {parque.endereco || 'Endereço não informado'}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="py-2 text-sm">
                    <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/40 border border-border/50 text-xs">
                      <div>
                        <span className="text-muted-foreground block">Setores / Quadras</span>
                        <span className="font-mono tabular-nums font-semibold text-foreground text-sm">
                          {setores}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Total de Jazigos</span>
                        <span className="font-mono tabular-nums font-semibold text-foreground text-sm">
                          {totalJazigos.toLocaleString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="pt-3 border-t border-border/40 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      Gestão Autorizada
                    </span>
                    <Button
                      size="sm"
                      variant="default"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelecionar(parque.id);
                      }}
                      className="gap-1.5 group-hover:bg-primary"
                    >
                      Acessar Gestão
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
    </div>
  );
};
