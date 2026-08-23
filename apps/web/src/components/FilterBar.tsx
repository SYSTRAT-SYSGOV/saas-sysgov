import React, { useState } from 'react';
import {
  Search,
  RotateCcw,
  Building2,
  Calendar,
  ArrowLeftRight,
  BarChart3,
  CalendarDays,
  Percent,
  SlidersHorizontal,
  X,
  Check,
  Filter,
  Sparkles,
  Info,
  ChevronDown,
} from 'lucide-react';
import { ComparativeMode, DataSourceMetadata } from '../types/fiscal';
import { MONTH_NAMES, QUARTERS_INFO } from '../utils/comparative';
import { DataSourceBadge } from './DataSourceBadge';

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedPeriod: string;
  onPeriodChange: (p: string) => void;
  selectedUnidade: string;
  onUnidadeChange: (u: string) => void;
  onResetFilters: () => void;
  comparativeMode?: ComparativeMode;
  onComparativeModeChange?: (mode: ComparativeMode) => void;
  selectedQuarter?: number;
  onQuarterChange?: (quarter: number) => void;
  selectedMonth?: number;
  onMonthChange?: (month: number) => void;
  isComparativoAnual?: boolean;
  onToggleComparativoAnual?: (enabled: boolean) => void;
  anoAtual?: number;
  dataSource?: DataSourceMetadata;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedPeriod,
  onPeriodChange,
  selectedUnidade,
  onUnidadeChange,
  onResetFilters,
  comparativeMode = 'nenhum',
  onComparativeModeChange,
  selectedQuarter = 1,
  onQuarterChange,
  selectedMonth = 8,
  onMonthChange,
  isComparativoAnual = false,
  onToggleComparativoAnual,
  anoAtual = 2026,
  dataSource,
}) => {
  // Padrão: SEMPRE FECHADO para não poluir a tela e liberar espaço máximo para os dashboards
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const anoAnterior = anoAtual - 1;

  const activeMode: ComparativeMode =
    comparativeMode === 'anual' || comparativeMode === 'trimestral' || comparativeMode === 'mensal'
      ? comparativeMode
      : isComparativoAnual
      ? 'anual'
      : 'nenhum';

  const setMode = (mode: ComparativeMode) => {
    if (onComparativeModeChange) {
      onComparativeModeChange(mode);
    }
    if (onToggleComparativoAnual) {
      onToggleComparativoAnual(mode === 'anual');
    }
  };

  const handleExecuteReset = () => {
    onSearchChange('');
    onPeriodChange('todos');
    onUnidadeChange('todas');
    if (onComparativeModeChange) {
      onComparativeModeChange('nenhum');
    }
    if (onToggleComparativoAnual) {
      onToggleComparativoAnual(false);
    }
    if (onQuarterChange) {
      onQuarterChange(1);
    }
    if (onMonthChange) {
      onMonthChange(8);
    }
    onResetFilters();
  };

  const activeFiltersCount =
    (searchQuery ? 1 : 0) +
    (selectedPeriod !== 'todos' ? 1 : 0) +
    (selectedUnidade !== 'todas' ? 1 : 0) +
    (activeMode !== 'nenhum' ? 1 : 0);

  const isFiltered = activeFiltersCount > 0;

  const mesAtualNome = MONTH_NAMES[selectedMonth - 1] || 'Agosto';
  const mesAnteriorIndex = selectedMonth === 1 ? 12 : selectedMonth - 1;
  const mesAnteriorNome = MONTH_NAMES[mesAnteriorIndex - 1] || 'Julho';
  const activeQuarterMeta = QUARTERS_INFO.find(q => q.trimestre === selectedQuarter) || QUARTERS_INFO[0];

  const getUnidadeLabel = (u: string) => {
    switch (u) {
      case 'prefeitura': return 'Executivo Municipal';
      case 'saude': return 'Fundo Municipal de Saúde';
      case 'educacao': return 'Sec. Educação (SMED)';
      case 'fpma': return 'FPMA Previdência';
      case 'camara': return 'Câmara Municipal';
      default: return 'Consolidado Municipal';
    }
  };

  const getPeriodoLabel = (p: string) => {
    switch (p) {
      case 'b1': return '1º Bimestre';
      case 'b2': return '2º Bimestre';
      case 'b3': return '3º Bimestre';
      case 'b4': return '4º Bimestre';
      case 'q1': return '1º Quadrimestre LRF';
      case 'q2': return '2º Quadrimestre LRF';
      case 'q3': return '3º Quadrimestre LRF';
      default: return 'Exercício Completo';
    }
  };

  return (
    <div className="mb-4">
      {/* Barra Minimalista de Gatilho e Tags Ativas */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs border border-slate-200/80 dark:border-slate-800/80 rounded-sm px-3 py-1.5 shadow-xs">
        {/* Lado Esquerdo: Botão Discreto de Abrir Filtros Avançados */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsOpen(prev => !prev)}
            className={`flex items-center gap-2 px-2.5 py-1 rounded-sm text-xs font-mono font-bold transition cursor-pointer border ${
              isFiltered
                ? 'bg-emerald-500/10 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filtros Avançados & Comparativos</span>
            {isFiltered && (
              <span className="px-1.5 py-0.2 rounded-xs bg-emerald-600 text-white text-[10px] font-mono">
                {activeFiltersCount}
              </span>
            )}
            <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Active Filter Pills (Discretas) */}
          {searchQuery && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-[11px] font-mono text-slate-700 dark:text-slate-300">
              <Search className="w-3 h-3 text-slate-400" />
              <span className="max-w-[150px] truncate">"{searchQuery}"</span>
              <button
                onClick={() => onSearchChange('')}
                className="hover:text-rose-500 cursor-pointer ml-0.5"
                title="Remover busca"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {activeMode !== 'nenhum' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-300">
              <ArrowLeftRight className="w-3 h-3" />
              <span>
                {activeMode === 'anual' && `Comp. Anual (${anoAtual} vs ${anoAnterior})`}
                {activeMode === 'trimestral' && `Comp. Trimestral (${activeQuarterMeta.trimestreNome})`}
                {activeMode === 'mensal' && `Comp. Mensal (${mesAtualNome} vs ${mesAnteriorNome})`}
              </span>
              <button
                onClick={() => setMode('nenhum')}
                className="hover:text-rose-500 cursor-pointer ml-0.5"
                title="Desativar modo comparativo"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {selectedUnidade !== 'todas' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs bg-blue-50 dark:bg-blue-950/60 border border-blue-300 dark:border-blue-800 text-[11px] font-mono text-blue-700 dark:text-blue-300">
              <Building2 className="w-3 h-3" />
              <span>{getUnidadeLabel(selectedUnidade)}</span>
              <button
                onClick={() => onUnidadeChange('todas')}
                className="hover:text-rose-500 cursor-pointer ml-0.5"
                title="Remover filtro de unidade"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {selectedPeriod !== 'todos' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-[11px] font-mono text-amber-700 dark:text-amber-300">
              <Calendar className="w-3 h-3" />
              <span>{getPeriodoLabel(selectedPeriod)}</span>
              <button
                onClick={() => onPeriodChange('todos')}
                className="hover:text-rose-500 cursor-pointer ml-0.5"
                title="Remover filtro de período"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {isFiltered && (
            <button
              id="btn-limpar-filtros-bar"
              onClick={handleExecuteReset}
              className="text-[11px] font-mono text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 flex items-center gap-1 transition cursor-pointer ml-1"
              title="Limpar todos os filtros"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Limpar tudo</span>
            </button>
          )}
        </div>

        {/* Lado Direito: Badge SICONFI / Origem de Dados Discreto */}
        <div className="flex items-center gap-2 text-xs">
          <DataSourceBadge dataSource={dataSource} size="sm" showDetails />
        </div>
      </div>

      {/* Painel Retrátil Sofisticado (Drawer / Dropdown Avançado) */}
      {isOpen && (
        <div className="mt-2 p-3 sm:p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm shadow-xl animate-in fade-in zoom-in-98 duration-150 space-y-4 max-h-[85vh] overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  Painel de Filtros Avançados & Modos de Análise
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                  Personalize o recorte temporal, modo comparativo e granularidade das contas
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-sm text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Fechar painel de filtros"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Busca Multicritério */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-400 uppercase flex items-center gap-1.5">
                <Search className="w-3 h-3 text-emerald-500" />
                <span>Busca Rápida</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => onSearchChange(e.target.value)}
                  placeholder="Conta, fonte, órgão..."
                  className="w-full pl-3 pr-8 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition"
                />
                {searchQuery && (
                  <button
                    onClick={() => onSearchChange('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <p className="text-[10px] text-slate-400 font-mono">Filtra tabelas e itens nos dashboards</p>
            </div>

            {/* 2. Modo Comparativo */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-400 uppercase flex items-center gap-1.5">
                <ArrowLeftRight className="w-3 h-3 text-emerald-500" />
                <span>Modo de Análise</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setMode('nenhum')}
                  className={`px-2 py-1.5 rounded-sm text-[11px] font-mono font-bold uppercase transition cursor-pointer text-left border ${
                    activeMode === 'nenhum'
                      ? 'bg-slate-800 text-white border-slate-700 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Exercício {anoAtual}
                </button>
                <button
                  type="button"
                  onClick={() => setMode('anual')}
                  className={`px-2 py-1.5 rounded-sm text-[11px] font-mono font-bold uppercase transition cursor-pointer text-left border ${
                    activeMode === 'anual'
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  YoY Anual
                </button>
                <button
                  type="button"
                  onClick={() => setMode('trimestral')}
                  className={`px-2 py-1.5 rounded-sm text-[11px] font-mono font-bold uppercase transition cursor-pointer text-left border ${
                    activeMode === 'trimestral'
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Trimestral
                </button>
                <button
                  type="button"
                  onClick={() => setMode('mensal')}
                  className={`px-2 py-1.5 rounded-sm text-[11px] font-mono font-bold uppercase transition cursor-pointer text-left border ${
                    activeMode === 'mensal'
                      ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  MoM Mensal
                </button>
              </div>
            </div>

            {/* 3. Recorte Trimestre / Mês / Período */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-400 uppercase flex items-center gap-1.5">
                <Calendar className="w-3 h-3 text-emerald-500" />
                <span>Janela Temporal</span>
              </label>

              {activeMode === 'trimestral' && onQuarterChange && (
                <select
                  value={selectedQuarter}
                  onChange={e => onQuarterChange(parseInt(e.target.value, 10))}
                  className="w-full px-2.5 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-sm text-slate-800 dark:text-slate-200 cursor-pointer focus:outline-none focus:border-indigo-500"
                >
                  <option value={1}>1º Trimestre (Jan-Mar / Q1)</option>
                  <option value={2}>2º Trimestre (Abr-Jun / Q2)</option>
                  <option value={3}>3º Trimestre (Jul-Set / Q3)</option>
                  <option value={4}>4º Trimestre (Out-Dez / Q4)</option>
                </select>
              )}

              {activeMode === 'mensal' && onMonthChange && (
                <select
                  value={selectedMonth}
                  onChange={e => onMonthChange(parseInt(e.target.value, 10))}
                  className="w-full px-2.5 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-sm text-slate-800 dark:text-slate-200 cursor-pointer focus:outline-none focus:border-blue-500"
                >
                  <option value={8}>Agosto (Ago vs Jul)</option>
                  <option value={7}>Julho (Jul vs Jun)</option>
                  <option value={6}>Junho (Jun vs Mai)</option>
                  <option value={5}>Maio (Mai vs Abr)</option>
                  <option value={4}>Abril (Abr vs Mar)</option>
                  <option value={3}>Março (Mar vs Fev)</option>
                  <option value={2}>Fevereiro (Fev vs Jan)</option>
                  <option value={1}>Janeiro (Jan vs Dez/Ant)</option>
                  <option value={9}>Setembro (Set vs Ago)</option>
                  <option value={10}>Outubro (Out vs Set)</option>
                  <option value={11}>Novembro (Nov vs Out)</option>
                  <option value={12}>Dezembro (Dez vs Nov)</option>
                </select>
              )}

              {activeMode === 'nenhum' && (
                <select
                  value={selectedPeriod}
                  onChange={e => onPeriodChange(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-sm text-slate-800 dark:text-slate-200 cursor-pointer focus:outline-none focus:border-emerald-500"
                >
                  <option value="todos">Exercício Completo (Acumulado)</option>
                  <option value="b1">1º Bimestre (Jan-Fev)</option>
                  <option value="b2">2º Bimestre (Mar-Abr)</option>
                  <option value="b3">3º Bimestre (Mai-Jun)</option>
                  <option value="b4">4º Bimestre (Jul-Ago)</option>
                  <option value="q1">1º Quadrimestre (LRF)</option>
                  <option value="q2">2º Quadrimestre (LRF)</option>
                  <option value="q3">3º Quadrimestre (LRF)</option>
                </select>
              )}

              {activeMode === 'anual' && (
                <div className="p-2 rounded-sm bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] font-mono text-emerald-800 dark:text-emerald-300">
                  Comparação completa entre <strong>{anoAtual}</strong> e <strong>{anoAnterior}</strong>.
                </div>
              )}
            </div>

            {/* 4. Unidade Orçamentária */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-400 uppercase flex items-center gap-1.5">
                <Building2 className="w-3 h-3 text-emerald-500" />
                <span>Unidade Orçamentária</span>
              </label>
              <select
                value={selectedUnidade}
                onChange={e => onUnidadeChange(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-sm text-slate-800 dark:text-slate-200 cursor-pointer focus:outline-none focus:border-emerald-500"
              >
                <option value="todas">Consolidado Municipal (Todos os Órgãos)</option>
                <option value="prefeitura">Prefeitura Municipal (Executivo)</option>
                <option value="saude">Fundo Municipal de Saúde (FMS)</option>
                <option value="educacao">Secretaria de Educação (SMED)</option>
                <option value="fpma">FPMA - Previdência Municipal</option>
                <option value="camara">Câmara Municipal de Araucária</option>
              </select>
              <p className="text-[10px] text-slate-400 font-mono">Segmenta receitas e despesas por órgão</p>
            </div>
          </div>

          {/* Footer do Painel de Filtros */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="text-[11px] font-mono text-slate-500 flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-slate-400" />
              <span>Filtros aplicados em tempo real sobre os demonstrativos fiscais.</span>
            </div>

            <div className="flex items-center gap-2">
              {isFiltered && (
                <button
                  type="button"
                  id="btn-restaurar-padrao-drawer"
                  onClick={handleExecuteReset}
                  className="px-3 py-1.5 rounded-sm text-xs font-mono font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Restaurar Padrão
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-1.5 rounded-sm text-xs font-mono font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition cursor-pointer"
              >
                Aplicar e Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterBar;
