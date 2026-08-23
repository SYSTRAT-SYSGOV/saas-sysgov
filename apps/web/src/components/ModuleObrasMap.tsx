import React, { useState, useMemo } from 'react';
import {
  MapPin,
  Building2,
  HeartPulse,
  GraduationCap,
  Trees,
  Shield,
  Trophy,
  Compass,
  Filter,
  Search,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Layers,
  LayoutGrid,
  Map as MapIcon,
  ExternalLink,
  ChevronRight,
  Sparkles,
  TrendingUp,
  Calendar,
  DollarSign,
  UserCheck,
  Building,
  ArrowUpRight,
  Maximize2,
  X,
  Share2,
  Printer,
  Camera,
  Activity,
  FileCheck,
  AlertCircle,
  BarChart3,
  HardHat,
  Flame,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';
import { ObraAraucaria, ObraStatus, ObraSecretaria, ObraFonteRecurso, ObrasSummary } from '../types/fiscal';
import { formatCurrency, formatCompactCurrency, formatPercent, exportToCSV, formatDataBR } from '../utils/formatters';
import { AraucariaSvgMap } from './AraucariaSvgMap';

interface ModuleObrasMapProps {
  obras: ObraAraucaria[];
  summary: ObrasSummary | null;
  ano: number;
}

interface MedicaoObra {
  numero: number;
  mes: string;
  data: string;
  valorMedido: number;
  valorAcumulado: number;
  pctFisico: number;
  pctFinanceiro: number;
  fiscal: string;
  artRrt: string;
  status: 'HOMOLOGADA' | 'EM_ANALISE' | 'PAGA';
}

interface AditivoObra {
  numero: string;
  tipo: 'VALOR' | 'PRAZO' | 'META_FISICA';
  descricao: string;
  valorAditivo: number;
  diasProrrogacao: number;
  dataAssinatura: string;
  parecerJuridico: string;
}

export const ModuleObrasMap: React.FC<ModuleObrasMapProps> = ({
  obras: initialObras,
  summary: initialSummary,
  ano,
}) => {
  const [obrasList] = useState<ObraAraucaria[]>(initialObras);
  const [viewMode, setViewMode] = useState<'mapa' | 'grade' | 'medicoes' | 'aditivos'>('mapa');

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSecretaria, setSelectedSecretaria] = useState<string>('todas');
  const [selectedStatus, setSelectedStatus] = useState<string>('todos');
  const [selectedFaixaValor, setSelectedFaixaValor] = useState<string>('todas');
  const [selectedFonte, setSelectedFonte] = useState<string>('todas');
  const [selectedRegiao, setSelectedRegiao] = useState<string>('todas');

  // Selected Obra for Inspector and Modal
  const [selectedObra, setSelectedObra] = useState<ObraAraucaria | null>(
    initialObras.find(o => o.destaque) || initialObras[0] || null
  );
  const [isDossieModalOpen, setIsDossieModalOpen] = useState<boolean>(false);

  // Filter logic
  const filteredObras = useMemo(() => {
    return obrasList.filter(obra => {
      // Search
      const matchesSearch =
        searchQuery === '' ||
        obra.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        obra.bairro.toLowerCase().includes(searchQuery.toLowerCase()) ||
        obra.empresaContratada.toLowerCase().includes(searchQuery.toLowerCase()) ||
        obra.numeroContrato.toLowerCase().includes(searchQuery.toLowerCase()) ||
        obra.secretariaNome.toLowerCase().includes(searchQuery.toLowerCase());

      // Secretaria
      const matchesSecretaria =
        selectedSecretaria === 'todas' || obra.secretaria === selectedSecretaria;

      // Status
      const matchesStatus =
        selectedStatus === 'todos' || obra.status === selectedStatus;

      // Faixa de Valor
      let matchesFaixa = true;
      if (selectedFaixaValor === 'ate5m') matchesFaixa = obra.valorPrevisto <= 5000000;
      else if (selectedFaixaValor === '5ma20m')
        matchesFaixa = obra.valorPrevisto > 5000000 && obra.valorPrevisto <= 20000000;
      else if (selectedFaixaValor === 'acima20m') matchesFaixa = obra.valorPrevisto > 20000000;

      // Fonte de Recurso
      const matchesFonte =
        selectedFonte === 'todas' || obra.fonteRecurso === selectedFonte;

      // Região
      const matchesRegiao =
        selectedRegiao === 'todas' || obra.regiao.toLowerCase() === selectedRegiao.toLowerCase();

      return matchesSearch && matchesSecretaria && matchesStatus && matchesFaixa && matchesFonte && matchesRegiao;
    });
  }, [obrasList, searchQuery, selectedSecretaria, selectedStatus, selectedFaixaValor, selectedFonte, selectedRegiao]);

  // Aggregate metrics for filtered data
  const totalFilteredInvestimento = filteredObras.reduce((acc, o) => acc + o.valorPrevisto, 0);
  const totalFilteredLiquidado = filteredObras.reduce((acc, o) => acc + o.valorLiquidado, 0);
  const totalFilteredSaldo = Math.max(0, totalFilteredInvestimento - totalFilteredLiquidado);
  const totalFilteredEmExecucao = filteredObras.filter(o => o.status === 'Em Execução').length;
  const totalFilteredConcluidas = filteredObras.filter(o => o.status === 'Concluída').length;
  const totalFilteredLicitacao = filteredObras.filter(o => o.status === 'Em Licitação').length;
  const mediaFisicaFiltered =
    filteredObras.length > 0
      ? Number(
          (filteredObras.reduce((acc, o) => acc + o.progressoFisico, 0) / filteredObras.length).toFixed(1)
        )
      : 0;

  // Medições e aditivos: exibidos apenas quando existirem na base de dados real.
  // Nenhum registro é simulado localmente.
  const medicoesObraAtiva: MedicaoObra[] = [];

  const aditivosObraAtiva: AditivoObra[] = [];

  // Export to CSV
  const handleExportCSV = () => {
    const exportData = filteredObras.map(o => ({
      'Código': o.codigo,
      'Título da Obra': o.titulo,
      'Secretaria': `${o.secretaria} - ${o.secretariaNome}`,
      'Status de Investimento': o.status,
      'Bairro / Localidade': o.bairro,
      'Região': o.regiao,
      'Valor Previsto (R$)': o.valorPrevisto,
      'Valor Liquidado (R$)': o.valorLiquidado,
      'Saldo a Executar (R$)': o.valorPrevisto - o.valorLiquidado,
      'Progresso Físico (%)': `${o.progressoFisico}%`,
      'Progresso Financeiro (%)': `${o.progressoFinanceiro}%`,
      'Fonte de Recursos': o.fonteRecurso,
      'Empresa Contratada': o.empresaContratada,
      'Contrato Nº': o.numeroContrato,
      'Data Início': formatDataBR(o.dataInicio),
      'Previsão de Conclusão': formatDataBR(o.dataPrevisaoFim),
      'Beneficiários Estimados': o.beneficiariosEstimados || '-',
      'Impacto Social / Urbano': o.impactoSocial,
    }));

    exportToCSV(`obras_publicas_araucaria_${ano}`, exportData);
  };

  const getSecretariaIcon = (sec: ObraSecretaria) => {
    switch (sec) {
      case 'SMOP':
        return Building2;
      case 'SMSA':
        return HeartPulse;
      case 'SMED':
        return GraduationCap;
      case 'SMMA':
        return Trees;
      case 'SMSP':
        return Shield;
      case 'SMEL':
        return Trophy;
      case 'SMURB':
      case 'SMAS':
      default:
        return Compass;
    }
  };

  const getStatusBadgeStyle = (status: ObraStatus) => {
    switch (status) {
      case 'Em Execução':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'Concluída':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'Em Licitação':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'Em Projeto':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'Paralisada':
      default:
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800';
    }
  };

  return (
    <div className="space-y-4 font-sans text-slate-800 dark:text-slate-100 animate-fadeIn">
      {/* ============================================================
          1. HEADER SUPERIOR DO MÓDULO DE OBRAS
          ============================================================ */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-sm p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-xs bg-slate-950 text-white border border-slate-800 flex items-center gap-1">
                <HardHat className="w-3 h-3 text-amber-400" />
                MÓDULO 09 • FISCALIZAÇÃO TERRITORIAL & OBRAS PÚBLICAS
              </span>
              <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                Exercício {ano}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-950 dark:text-white uppercase tracking-tight font-sans">
              MAPA DE OBRAS PÚBLICAS & INVESTIMENTOS DE ARAUCÁRIA / PR
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-3xl leading-relaxed font-medium">
              Monitoramento georreferenciado e auditoria físico-financeira das obras municipais (Siconfi, Obrasgov, TCE-PR e Novo PAC), com controle de medições, boletins de engenharia e termos aditivos.
            </p>
          </div>

          {/* Abas de Visualização & Ações */}
          <div className="flex items-center gap-2 flex-wrap self-start lg:self-center font-mono">
            {/* View Switcher */}
            <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-sm border border-slate-300 dark:border-slate-700 flex items-center text-xs">
              <button
                type="button"
                onClick={() => setViewMode('mapa')}
                className={`px-3 py-1.5 rounded-xs transition flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'mapa'
                    ? 'bg-slate-900 text-white font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <MapIcon className="w-3.5 h-3.5" />
                Mapa
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grade')}
                className={`px-3 py-1.5 rounded-xs transition flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'grade'
                    ? 'bg-slate-900 text-white font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Grade ({filteredObras.length})
              </button>
              <button
                type="button"
                onClick={() => setViewMode('medicoes')}
                className={`px-3 py-1.5 rounded-xs transition flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'medicoes'
                    ? 'bg-slate-900 text-white font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                Curva S & Medições
              </button>
              <button
                type="button"
                onClick={() => setViewMode('aditivos')}
                className={`px-3 py-1.5 rounded-xs transition flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'aditivos'
                    ? 'bg-slate-900 text-white font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <FileCheck className="w-3.5 h-3.5 text-amber-400" />
                Aditivos & TCE
              </button>
            </div>

            {/* CSV Export */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-sm text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs border border-slate-700"
              title="Exportar planilha de obras em formato CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Exportar CSV</span>
            </button>
          </div>
        </div>

        {/* 4 Cards de Métricas em JetBrains Mono */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-4 mt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="p-3 bg-slate-50/70 dark:bg-slate-800/40 rounded-sm border border-slate-200/80 dark:border-slate-800">
            <span className="text-[10px] uppercase font-mono text-slate-500 dark:text-slate-400 font-bold block">
              Investimento Total Mapeado
            </span>
            <div className="text-base sm:text-lg font-extrabold text-slate-950 dark:text-white mt-0.5 font-mono tabular-nums">
              {formatCurrency(totalFilteredInvestimento)}
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              {filteredObras.length} obras identificadas
            </span>
          </div>

          <div className="p-3 bg-slate-50/70 dark:bg-slate-800/40 rounded-sm border border-slate-200/80 dark:border-slate-800">
            <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 font-bold block">
              Valor Liquidado / Executado
            </span>
            <div className="text-base sm:text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 tabular-nums">
              {formatCurrency(totalFilteredLiquidado)}
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              {totalFilteredInvestimento > 0
                ? `${((totalFilteredLiquidado / totalFilteredInvestimento) * 100).toFixed(1)}% executado financeiramente`
                : '0%'}
            </span>
          </div>

          <div className="p-3 bg-slate-50/70 dark:bg-slate-800/40 rounded-sm border border-slate-200/80 dark:border-slate-800">
            <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 font-bold block">
              Obras em Execução Ativa
            </span>
            <div className="text-base sm:text-lg font-bold font-mono text-blue-600 dark:text-blue-400 mt-0.5 tabular-nums">
              {totalFilteredEmExecucao} em andamento
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              {totalFilteredConcluidas} concluídas • {totalFilteredLicitacao} em licitação
            </span>
          </div>

          <div className="p-3 bg-slate-50/70 dark:bg-slate-800/40 rounded-sm border border-slate-200/80 dark:border-slate-800">
            <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 font-bold block">
              Avanço Físico Médio no Canteiro
            </span>
            <div className="text-base sm:text-lg font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-0.5 tabular-nums">
              {mediaFisicaFiltered.toFixed(1)}%
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 mt-1.5 overflow-hidden">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all"
                style={{ width: `${mediaFisicaFiltered}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================
          2. BARRA DE FILTROS INTERATIVOS MULTIDIMENSIONAIS
          ============================================================ */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-4 shadow-xs space-y-3 font-mono">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Busca Textual */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar obra, bairro, contrato..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Secretaria Dropdown */}
          <div className="relative">
            <select
              value={selectedSecretaria}
              onChange={e => setSelectedSecretaria(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-bold"
            >
              <option value="todas">🏢 Todas as Secretarias ({obrasList.length})</option>
              <option value="SMOP">SMOP - Obras Públicas ({obrasList.filter(o => o.secretaria === 'SMOP').length})</option>
              <option value="SMSA">SMSA - Saúde ({obrasList.filter(o => o.secretaria === 'SMSA').length})</option>
              <option value="SMED">SMED - Educação ({obrasList.filter(o => o.secretaria === 'SMED').length})</option>
              <option value="SMMA">SMMA - Meio Ambiente ({obrasList.filter(o => o.secretaria === 'SMMA').length})</option>
              <option value="SMURB">SMURB - Urbanismo ({obrasList.filter(o => o.secretaria === 'SMURB').length})</option>
              <option value="SMSP">SMSP - Segurança Pública ({obrasList.filter(o => o.secretaria === 'SMSP').length})</option>
              <option value="SMEL">SMEL - Esporte e Lazer ({obrasList.filter(o => o.secretaria === 'SMEL').length})</option>
            </select>
          </div>

          {/* Status Dropdown */}
          <div className="relative">
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-bold"
            >
              <option value="todos">🚦 Todos os Status ({obrasList.length})</option>
              <option value="Em Execução">🔵 Em Execução ({obrasList.filter(o => o.status === 'Em Execução').length})</option>
              <option value="Concluída">🟢 Concluída ({obrasList.filter(o => o.status === 'Concluída').length})</option>
              <option value="Em Licitação">🟡 Em Licitação ({obrasList.filter(o => o.status === 'Em Licitação').length})</option>
              <option value="Em Projeto">🟣 Em Projeto ({obrasList.filter(o => o.status === 'Em Projeto').length})</option>
              <option value="Paralisada">🔴 Paralisada ({obrasList.filter(o => o.status === 'Paralisada').length})</option>
            </select>
          </div>

          {/* Fonte de Recursos */}
          <div className="relative">
            <select
              value={selectedFonte}
              onChange={e => setSelectedFonte(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-bold"
            >
              <option value="todas">💰 Todas as Fontes ({obrasList.length})</option>
              <option value="Tesouro Municipal">Tesouro Municipal</option>
              <option value="FINISA / Caixa">FINISA / Caixa Econômica</option>
              <option value="Governo Federal / PAC">Governo Federal (Novo PAC)</option>
              <option value="Paranacidade / Estado">Paranacidade (Estadual)</option>
              <option value="Emenda Parlamentar">Emenda Parlamentar</option>
            </select>
          </div>

          {/* Região / Bairro */}
          <div className="relative">
            <select
              value={selectedRegiao}
              onChange={e => setSelectedRegiao(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-bold"
            >
              <option value="todas">📍 Todas as Regiões</option>
              <option value="centro">Centro & Sede</option>
              <option value="norte">Região Norte</option>
              <option value="sul">Região Sul</option>
              <option value="leste">Região Leste</option>
              <option value="oeste">Região Oeste</option>
              <option value="rural">Zona Rural / Guajuvira</option>
            </select>
          </div>
        </div>

        {/* Pílulas de Filtros Rápidos */}
        <div className="flex items-center gap-1.5 flex-wrap text-[11px] pt-1">
          <span className="text-slate-400 font-bold flex items-center gap-1">
            <Filter className="w-3 h-3" />
            Filtros rápidos:
          </span>

          <button
            type="button"
            onClick={() => {
              setSelectedSecretaria('todas');
              setSelectedStatus('todos');
              setSelectedFaixaValor('todas');
              setSelectedFonte('todas');
              setSelectedRegiao('todas');
              setSearchQuery('');
            }}
            className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
          >
            Limpar Filtros
          </button>

          <button
            type="button"
            onClick={() => setSelectedStatus('Em Execução')}
            className={`px-2 py-0.5 rounded border transition cursor-pointer flex items-center gap-1 ${
              selectedStatus === 'Em Execução'
                ? 'bg-blue-600 text-white border-blue-600 font-bold'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            Em Canteiro Ativo ({obrasList.filter(o => o.status === 'Em Execução').length})
          </button>

          <button
            type="button"
            onClick={() => setSelectedFaixaValor(selectedFaixaValor === 'acima20m' ? 'todas' : 'acima20m')}
            className={`px-2 py-0.5 rounded border transition cursor-pointer flex items-center gap-1 ${
              selectedFaixaValor === 'acima20m'
                ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
            }`}
          >
            <DollarSign className="w-3 h-3" />
            Macro Obras (&gt; R$ 20M)
          </button>
        </div>
      </div>

      {/* ============================================================
          3. ÁREA PRINCIPAL: MAPA INTERATIVO / GRADE / MEDIÇÕES / ADITIVOS
          ============================================================ */}
      {viewMode === 'mapa' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Coluna Esquerda: Mapa Interativo SVG (8 cols) */}
          <div className="lg:col-span-8 space-y-3">
            <AraucariaSvgMap
              obras={filteredObras}
              selectedObraId={selectedObra?.id || null}
              onSelectObra={obra => setSelectedObra(obra)}
              selectedSecretaria={selectedSecretaria}
              selectedStatus={selectedStatus}
            />

            <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 bg-white dark:bg-slate-900 p-2.5 rounded border border-slate-200 dark:border-slate-800">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                Interatividade: Clique nos marcadores do mapa para inspecionar medições e cronogramas.
              </span>
              <span>{filteredObras.length} de {obrasList.length} obras visíveis</span>
            </div>
          </div>

          {/* Coluna Direita: Inspector de Obras (4 cols) */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-4 shadow-xs space-y-4">
            {selectedObra ? (
              <div className="space-y-4 font-sans">
                {/* Cabeçalho do Card */}
                <div className="space-y-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold text-slate-400">
                      {selectedObra.codigo}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${getStatusBadgeStyle(selectedObra.status)}`}>
                      {selectedObra.status}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 dark:text-white text-sm leading-snug">
                    {selectedObra.titulo}
                  </h3>

                  <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                    <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>{selectedObra.bairro} ({selectedObra.regiao})</span>
                  </div>
                </div>

                {/* Progresso Físico vs Financeiro */}
                <div className="space-y-2.5 bg-slate-50 dark:bg-slate-800/60 p-3 rounded border border-slate-200 dark:border-slate-700/80 font-mono">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Valor Contratado:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {formatCurrency(selectedObra.valorPrevisto)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Valor Já Liquidado:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(selectedObra.valorLiquidado)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Saldo a Executar:</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      {formatCurrency(selectedObra.valorPrevisto - selectedObra.valorLiquidado)}
                    </span>
                  </div>

                  <div className="pt-2 space-y-2">
                    <div>
                      <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                        <span>Avanço Físico no Canteiro:</span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">{selectedObra.progressoFisico.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-indigo-600 h-full rounded-full transition-all"
                          style={{ width: `${selectedObra.progressoFisico}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                        <span>Execução Financeira:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{selectedObra.progressoFinanceiro.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all"
                          style={{ width: `${selectedObra.progressoFinanceiro}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detalhes Técnicos & Contrato */}
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                    <span className="text-slate-400">Secretaria:</span>
                    <span className="font-bold text-slate-900 dark:text-white text-right">
                      {selectedObra.secretaria} — {selectedObra.secretariaNome}
                    </span>
                  </div>

                  <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                    <span className="text-slate-400">Fonte de Recurso:</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 text-right">
                      {selectedObra.fonteRecurso}
                    </span>
                  </div>

                  <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                    <span className="text-slate-400">Contrato / PNCP:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {selectedObra.numeroContrato}
                    </span>
                  </div>

                  <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                    <span className="text-slate-400">Empresa Contratada:</span>
                    <span className="font-bold text-slate-900 dark:text-white truncate max-w-[170px]" title={selectedObra.empresaContratada}>
                      {selectedObra.empresaContratada}
                    </span>
                  </div>

                  <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                    <span className="text-slate-400">Prazo de Conclusão:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {selectedObra.dataPrevisaoFim}
                    </span>
                  </div>
                </div>

                {/* Botão de Dossiê Completo */}
                <button
                  type="button"
                  onClick={() => setIsDossieModalOpen(true)}
                  className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white rounded-sm text-xs font-mono font-bold uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                >
                  <FileCheck className="w-4 h-4 text-emerald-400" />
                  <span>Dossiê & Boletim de Vistoria</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 font-mono text-xs">
                Selecione uma obra no mapa ou na grade para inspecionar.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================
          4. GRADE ANALÍTICA DE CARDS DE OBRAS
          ============================================================ */}
      {viewMode === 'grade' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 font-sans">
          {filteredObras.map(obra => {
            const Icon = getSecretariaIcon(obra.secretaria);
            return (
              <div
                key={obra.id}
                onClick={() => {
                  setSelectedObra(obra);
                  setIsDossieModalOpen(true);
                }}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 rounded-sm p-4 shadow-xs hover:shadow-md transition cursor-pointer flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-[10px] font-mono font-bold flex items-center gap-1">
                      <Icon className="w-3 h-3 text-indigo-500" />
                      {obra.secretaria}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${getStatusBadgeStyle(obra.status)}`}>
                      {obra.status}
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-2 leading-snug">
                    {obra.titulo}
                  </h4>

                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono mt-1">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span>{obra.bairro} • {obra.regiao}</span>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Investimento:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {formatCurrency(obra.valorPrevisto)}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>Avanço Físico:</span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">{obra.progressoFisico}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${obra.progressoFisico}%` }} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                    <span>Contrato: {obra.numeroContrato}</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-0.5">
                      Ver Ficha <ArrowUpRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================
          5. ABA CURVA S & CRONOGRAMA DE MEDIÇÕES
          ============================================================ */}
      {viewMode === 'medicoes' && selectedObra && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-4 sm:p-5 shadow-sm space-y-5 font-sans">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800">
                  BOLETIM DE MEDIÇÃO & ENGENHARIA
                </span>
                <span className="text-xs font-mono text-slate-400">Contrato {selectedObra.numeroContrato}</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-950 dark:text-white mt-1">
                {selectedObra.titulo} — {selectedObra.empresaContratada}
              </h3>
            </div>

            <div className="flex items-center gap-2 font-mono">
              <select
                value={selectedObra.id}
                onChange={e => {
                  const target = obrasList.find(o => o.id === e.target.value);
                  if (target) setSelectedObra(target);
                }}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs font-bold text-slate-800 dark:text-slate-200"
              >
                {obrasList.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.codigo} - {o.titulo.slice(0, 35)}...
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Gráfico Curva S */}
          <div className="bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between font-mono text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                CURVA S DE EXECUÇÃO FÍSICO-FINANCEIRA (PREVISTO VS. REALIZADO)
              </span>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-blue-600" /> % Físico Realizado
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-emerald-500" /> % Financeiro Pago
                </span>
              </div>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={medicoesObraAtiva} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                  <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'JetBrains Mono' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'JetBrains Mono' }} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px', color: '#fff', fontFamily: 'JetBrains Mono' }}
                    formatter={(val: any) => [`${val}%`, 'Execução']}
                  />
                  <Area type="monotone" dataKey="pctFisico" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.15} strokeWidth={2} name="% Físico" />
                  <Area type="monotone" dataKey="pctFinanceiro" stroke="#10b981" fill="#10b981" fillOpacity={0.15} strokeWidth={2} name="% Financeiro" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tabela de Boletins de Medição */}
          <div className="space-y-2 font-mono">
            <span className="text-xs font-bold uppercase text-slate-500 block">
              HISTÓRICO OFICIAL DE MEDIÇÕES (BOLETINS DE ENGENHARIA)
            </span>
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-sm">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800 text-[11px]">
                  <tr>
                    <th className="p-2.5">Medição</th>
                    <th className="p-2.5">Período / Data</th>
                    <th className="p-2.5 text-right">Valor Medido (R$)</th>
                    <th className="p-2.5 text-right">Acumulado (R$)</th>
                    <th className="p-2.5 text-center">% Físico</th>
                    <th className="p-2.5 text-center">% Financ.</th>
                    <th className="p-2.5">ART / RRT</th>
                    <th className="p-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 text-xs tabular-nums">
                  {medicoesObraAtiva.map(m => (
                    <tr key={m.numero} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-2.5 font-bold">{m.numero}ª Medição</td>
                      <td className="p-2.5">{m.mes} ({m.data})</td>
                      <td className="p-2.5 text-right font-bold text-slate-900 dark:text-white">
                        {formatCurrency(m.valorMedido)}
                      </td>
                      <td className="p-2.5 text-right text-emerald-600 dark:text-emerald-400 font-bold">
                        {formatCurrency(m.valorAcumulado)}
                      </td>
                      <td className="p-2.5 text-center font-bold text-blue-600">{m.pctFisico}%</td>
                      <td className="p-2.5 text-center font-bold text-emerald-600">{m.pctFinanceiro}%</td>
                      <td className="p-2.5 text-[11px] text-slate-400">{m.artRrt}</td>
                      <td className="p-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          m.status === 'PAGA' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        }`}>
                          {m.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          6. ABA ADITIVOS & AUDITORIA TCE-PR
          ============================================================ */}
      {viewMode === 'aditivos' && selectedObra && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-4 sm:p-5 shadow-sm space-y-4 font-sans">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 font-mono">
            <div>
              <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-800">
                AUDITORIA DE TERMOS ADITIVOS • LEI 14.133/2021
              </span>
              <h3 className="text-base font-bold text-slate-950 dark:text-white mt-1">
                Controle de Aditivos e Conformidade TCE-PR — {selectedObra.titulo}
              </h3>
            </div>

            <span className="text-xs text-slate-400 font-bold">
              Limite Máximo Legal: 25% (Obras de Engenharia)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {aditivosObraAtiva.map((aditivo, idx) => (
              <div
                key={idx}
                className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-200 dark:border-slate-800 space-y-2 font-mono text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">{aditivo.numero}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    aditivo.tipo === 'VALOR' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                  }`}>
                    {aditivo.tipo}
                  </span>
                </div>

                <p className="text-slate-600 dark:text-slate-300 font-sans leading-relaxed text-xs">
                  {aditivo.descricao}
                </p>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-2 text-[11px]">
                  {aditivo.valorAditivo > 0 && (
                    <div>
                      <span className="text-slate-400 block text-[10px]">Impacto Financeiro:</span>
                      <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{formatCurrency(aditivo.valorAditivo)}</strong>
                    </div>
                  )}
                  {aditivo.diasProrrogacao > 0 && (
                    <div>
                      <span className="text-slate-400 block text-[10px]">Prorrogação:</span>
                      <strong className="text-amber-600 dark:text-amber-400 font-bold">+{aditivo.diasProrrogacao} dias</strong>
                    </div>
                  )}
                  <div className="col-span-2">
                    <span className="text-slate-400 block text-[10px]">Fundamento Jurídico:</span>
                    <span className="text-slate-700 dark:text-slate-300 font-medium">{aditivo.parecerJuridico}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================
          7. MODAL DE DOSSIÊ DA OBRA & RELATÓRIO DE VISTORIA
          ============================================================ */}
      {isDossieModalOpen && selectedObra && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150 font-sans">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between shrink-0 font-mono">
              <div className="flex items-center gap-2.5">
                <HardHat className="w-5 h-5 text-amber-400" />
                <div>
                  <span className="text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-xs border border-emerald-500/40">
                    DOSSIÊ DE ENGENHARIA & FISCALIZAÇÃO MUNICIPAL
                  </span>
                  <h3 className="text-base font-bold mt-0.5">
                    {selectedObra.codigo} — {selectedObra.titulo}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Imprimir PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsDossieModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-5 overflow-y-auto space-y-5 text-xs font-sans">
              {/* Quadro Resumo */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-200 dark:border-slate-800 font-mono">
                <div>
                  <span className="text-slate-400 block text-[10px]">Secretaria Gestora:</span>
                  <strong className="text-slate-900 dark:text-white text-xs">{selectedObra.secretaria} - {selectedObra.secretariaNome}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Empresa Contratada:</span>
                  <strong className="text-slate-900 dark:text-white text-xs">{selectedObra.empresaContratada}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Contrato Administrativo:</span>
                  <strong className="text-slate-900 dark:text-white text-xs">{selectedObra.numeroContrato}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Fonte de Recursos:</span>
                  <strong className="text-indigo-600 dark:text-indigo-400 text-xs">{selectedObra.fonteRecurso}</strong>
                </div>
              </div>

              {/* Matriz Financeira */}
              <div className="grid grid-cols-3 gap-3 text-center font-mono">
                <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-500 block">Investimento Contratado</span>
                  <strong className="text-slate-900 dark:text-white text-sm font-bold">{formatCurrency(selectedObra.valorPrevisto)}</strong>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded border border-emerald-200 dark:border-emerald-800">
                  <span className="text-[10px] text-emerald-600 block">Total Liquidado / Pago</span>
                  <strong className="text-emerald-700 dark:text-emerald-300 text-sm font-bold">{formatCurrency(selectedObra.valorLiquidado)}</strong>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded border border-blue-200 dark:border-blue-800">
                  <span className="text-[10px] text-blue-600 block">Saldo Livre a Executar</span>
                  <strong className="text-blue-700 dark:text-blue-300 text-sm font-bold">{formatCurrency(selectedObra.valorPrevisto - selectedObra.valorLiquidado)}</strong>
                </div>
              </div>

              {/* Cronograma de Vistorias e Fotos */}
              <div className="space-y-2">
                <span className="font-mono font-bold text-slate-500 text-[10px] uppercase block">
                  Galeria de Evolução & Vistoria Técnica no Canteiro:
                </span>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-center space-y-1">
                    <Camera className="w-6 h-6 text-slate-400 mx-auto" />
                    <span className="font-mono font-bold text-[11px] block">Etapa 01: Fundação & Terraplanagem</span>
                    <span className="text-[10px] text-emerald-600 font-mono font-bold">100% Concluída</span>
                  </div>
                  <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-center space-y-1">
                    <Camera className="w-6 h-6 text-slate-400 mx-auto" />
                    <span className="font-mono font-bold text-[11px] block">Etapa 02: Alvenaria & Estrutura</span>
                    <span className="text-[10px] text-blue-600 font-mono font-bold">{selectedObra.progressoFisico}% em Canteiro</span>
                  </div>
                  <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-center space-y-1">
                    <Camera className="w-6 h-6 text-slate-400 mx-auto" />
                    <span className="font-mono font-bold text-[11px] block">Etapa 03: Instalações & Acabamento</span>
                    <span className="text-[10px] text-slate-400 font-mono">Previsão: {selectedObra.dataPrevisaoFim}</span>
                  </div>
                </div>
              </div>

              {/* Impacto Social */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="font-mono font-bold text-slate-500 text-[10px] uppercase block">
                  Impacto Urbano & Social para o Município:
                </span>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {selectedObra.impactoSocial}
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between font-mono text-xs">
              <span className="text-slate-500">Local: {selectedObra.bairro} ({selectedObra.regiao})</span>
              <button
                type="button"
                onClick={() => setIsDossieModalOpen(false)}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded uppercase tracking-wider cursor-pointer"
              >
                Fechar Dossiê
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
