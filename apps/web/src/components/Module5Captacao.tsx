import React, { useState } from 'react';
import {
  HandCoins,
  FileSpreadsheet,
  Building,
  Users,
  Target,
  CheckCircle,
  Clock,
  ExternalLink,
  Search,
  Filter,
  Sparkles,
  Zap,
} from 'lucide-react';
import { EmendaParlamentar, ConvenioRecurso } from '../types/fiscal';
import { RadarCaptacao } from './RadarCaptacao';
import {
  formatCurrency,
  formatCompactCurrency,
  formatPercent,
  exportToCSV,
  isEmendaRecente,
  formatDataBR,
  getDiasDecorridos,
} from '../utils/formatters';

interface Module5CaptacaoProps {
  metaAnual: number;
  captadoAcumulado: number;
  percentualAtingimento: string;
  emendas: EmendaParlamentar[];
  convenios: ConvenioRecurso[];
  searchQuery: string;
  cidade?: string;
  uf?: string;
}

export const Module5Captacao: React.FC<Module5CaptacaoProps> = ({
  metaAnual,
  captadoAcumulado,
  percentualAtingimento,
  emendas,
  convenios,
  searchQuery,
  cidade = 'Araucária',
  uf = 'PR',
}) => {
  const [activeTab, setActiveTab] = useState<'radar' | 'emendas' | 'convenios'>('radar');
  const [selectedEsfera, setSelectedEsfera] = useState<'todas' | 'Federal' | 'Estadual' | 'recentes'>('todas');

  const safeEmendas = Array.isArray(emendas) ? emendas : [];
  const safeConvenios = Array.isArray(convenios) ? convenios : [];

  const novasEmendasCount = safeEmendas.filter(e => e && isEmendaRecente(e.dataProcessamento)).length;

  const filteredEmendas = safeEmendas.filter(e => {
    if (!e) return false;
    const matchesSearch =
      searchQuery === '' ||
      (e.autor && e.autor.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (e.objeto && e.objeto.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (e.partido && e.partido.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (e.tipo && e.tipo.toLowerCase().includes(searchQuery.toLowerCase()));

    if (selectedEsfera === 'recentes') {
      return matchesSearch && isEmendaRecente(e.dataProcessamento);
    }
    const matchesEsfera = selectedEsfera === 'todas' || e.esfera === selectedEsfera;
    return matchesSearch && matchesEsfera;
  });

  const filteredConvenios = safeConvenios.filter(
    c =>
      !c ||
      searchQuery === '' ||
      (c.objeto && c.objeto.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.ministerio && c.ministerio.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.concedente && c.concedente.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalEmendasPagas = safeEmendas.reduce((a, b) => a + (b?.valorPago || 0), 0);
  const totalEmendasEmpenhadas = safeEmendas.reduce((a, b) => a + (b?.valorEmpenhado || 0), 0);
  const totalConveniosRepasse = safeConvenios.reduce((a, b) => a + (b?.valorRepasse || 0), 0);

  const handleExportCSV = () => {
    if (activeTab === 'emendas') {
      const exportData = filteredEmendas.map(e => ({
        'Autor': e.autor,
        'Partido': e.partido,
        'Esfera': e.esfera,
        'Tipo de Emenda': e.tipo,
        'Número': e.numero,
        'Data Processamento API': e.dataProcessamento ? formatDataBR(e.dataProcessamento) : '-',
        'Processada nos Últimos 7 Dias': isEmendaRecente(e.dataProcessamento) ? 'SIM' : 'NÃO',
        'Objeto': e.objeto,
        'Órgão Destino': e.orgaoDestino,
        'Valor Indicado (R$)': e.valorIndicado,
        'Valor Empenhado (R$)': e.valorEmpenhado,
        'Valor Pago (R$)': e.valorPago,
        'Status': e.status,
      }));
      exportToCSV('emendas_parlamentares_araucaria', exportData);
    } else {
      const exportData = filteredConvenios.map(c => ({
        'Proposta': c.numeroProposta,
        'Concedente': c.concedente,
        'Ministério/Órgão': c.ministerio,
        'Objeto': c.objeto,
        'Valor Global (R$)': c.valorGlobal,
        'Valor Repasse (R$)': c.valorRepasse,
        'Contrapartida': c.contrapartida,
        'Valor Liberado (R$)': c.valorLiberado,
        'Status': c.status,
        'Vigência Fim': c.vigenciaFim,
      }));
      exportToCSV('convenios_transferegov_araucaria', exportData);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-navy-950 border border-slate-200/90 dark:border-navy-800/80 rounded-sm p-4 shadow-sm font-sans">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-xs text-[10px] font-bold uppercase tracking-wider bg-[#0a1128] text-white border border-navy-700 flex items-center gap-1 font-sans">
                <Target className="w-3 h-3 text-emerald-400" />
                Meta Estratégica de Captação Externa
              </span>
              <span className="text-[10px] font-bold text-slate-500 uppercase">Exercício {2026}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold uppercase tracking-tight text-slate-950 dark:text-white font-sans">
              Captação de Recursos Extraorçamentários
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed font-medium">
              Monitoramento de Emendas Parlamentares Federais (RP6/RP7/RP8), Emendas Estaduais da ALEP e Convênios do Transferegov para mitigar o impacto da perda de receitas industriais da REPAR.
            </p>
          </div>

          {/* Progress Box */}
          <div className="bg-slate-50 dark:bg-navy-900/60 border border-slate-200 dark:border-navy-800 rounded-sm p-4 w-full md:w-auto md:min-w-[280px] font-sans">
            <div className="flex justify-between items-baseline mb-1.5 font-sans">
              <span className="text-[10px] text-slate-500 uppercase font-bold">Meta Anual:</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">{formatCompactCurrency(metaAnual)}</span>
            </div>
            <div className="flex justify-between items-baseline mb-2 font-sans">
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-bold">Captado Acumulado:</span>
              <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatCompactCurrency(captadoAcumulado)}</span>
            </div>

            {/* Bar */}
            <div className="h-2 bg-slate-200 dark:bg-navy-800 rounded-xs overflow-hidden mb-1.5">
              <div
                className="h-full bg-emerald-500 rounded-xs transition-all duration-700"
                style={{ width: `${percentualAtingimento}%` }}
              />
            </div>
            <div className="text-right text-[10px] text-slate-500 font-bold tabular-nums">
              {percentualAtingimento}% da meta atingida
            </div>
          </div>
        </div>
      </div>

      {/* Metric Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">TOTAL EMENDAS INDICADAS</span>
            <div className="w-2 h-2 rounded-full bg-slate-400"></div>
          </div>
          <div className="text-2xl font-bold font-mono tracking-tighter text-slate-900 dark:text-white">
            {formatCompactCurrency(totalEmendasEmpenhadas)}
          </div>
          <span className="text-[10px] font-mono text-slate-400">{emendas.length} parlamentares / comissões</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-900/80 rounded-sm p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">EMENDAS PAGAS NA CONTA</span>
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
          </div>
          <div className="text-2xl font-bold font-mono tracking-tighter text-emerald-600 dark:text-emerald-400">
            {formatCompactCurrency(totalEmendasPagas)}
          </div>
          <span className="text-[10px] font-mono text-slate-500">Recurso financeiro creditado</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">CONVÊNIOS TRANSFEREGOV</span>
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
          </div>
          <div className="text-2xl font-bold font-mono tracking-tighter text-blue-600 dark:text-blue-400">
            {formatCompactCurrency(totalConveniosRepasse)}
          </div>
          <span className="text-[10px] font-mono text-slate-400">{convenios.length} contratos ativos</span>
        </div>
      </div>

      {/* Alert Banner for Recent Parliamentary Amendments */}
      {novasEmendasCount > 0 && (
        <div
          id="alerta-emendas-recentes-banner"
          className="bg-emerald-950/60 border border-emerald-500/50 rounded-sm p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-white shadow-sm animate-in fade-in"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-sm bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0 font-bold">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold font-mono uppercase tracking-wider text-emerald-300">
                  Novas Emendas Processadas na API (Últimos 7 Dias)
                </span>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-emerald-400 text-slate-950 animate-pulse">
                  {novasEmendasCount} NOVAS
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Foram identificadas {novasEmendasCount} emendas parlamentares com liquidação ou liberação de recursos atualizadas recentemente no SICONFI/Transferegov.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setActiveTab('emendas');
              setSelectedEsfera('recentes');
            }}
            className="px-3 py-1.5 rounded-sm text-xs font-mono font-bold uppercase tracking-wider bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition shrink-0 cursor-pointer shadow-xs"
          >
            Filtrar Apenas Recentes ({novasEmendasCount})
          </button>
        </div>
      )}

      {/* Switcher & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-sm border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveTab('radar')}
              className={`px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider rounded-sm transition flex items-center gap-1.5 ${
                activeTab === 'radar'
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              <span>Radar de Editais (Transferegov)</span>
            </button>
            <button
              onClick={() => setActiveTab('emendas')}
              className={`px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider rounded-sm transition ${
                activeTab === 'emendas'
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Emendas Parlamentares ({filteredEmendas.length})
            </button>
            <button
              onClick={() => setActiveTab('convenios')}
              className={`px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider rounded-sm transition ${
                activeTab === 'convenios'
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Convênios & Projetos ({filteredConvenios.length})
            </button>
          </div>

          {activeTab === 'emendas' && (
            <div className="hidden sm:flex items-center space-x-1 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-sm p-0.5 text-xs font-mono">
              {(['todas', 'Federal', 'Estadual', 'recentes'] as const).map(esfera => (
                <button
                  key={esfera}
                  onClick={() => setSelectedEsfera(esfera)}
                  className={`px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase transition flex items-center gap-1 ${
                    selectedEsfera === esfera
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {esfera === 'todas' && 'Todas Esferas'}
                  {esfera === 'Federal' && 'Federal'}
                  {esfera === 'Estadual' && 'Estadual'}
                  {esfera === 'recentes' && (
                    <>
                      <span>Novas (7 dias)</span>
                      {novasEmendasCount > 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      )}
                    </>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {activeTab !== 'radar' && (
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-sm hover:bg-emerald-100 transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Exportar Planilha (CSV)</span>
          </button>
        )}
      </div>

      {/* Renderização Condicional: Radar ou Tabelas */}
      {activeTab === 'radar' ? (
        <RadarCaptacao
          cidade={cidade}
          uf={uf}
          metaCaptacao={{
            metaAnual: metaAnual || 32000000,
            captadoRealizado: captadoAcumulado || 18450000,
            potencialGlobal: (metaAnual || 32000000) * 3.5,
            percentualAtingido: parseFloat(percentualAtingimento) || 57.6,
            resumoTexto: `Você captou ${formatCompactCurrency(captadoAcumulado || 18450000)} de ${formatCompactCurrency(metaAnual || 32000000)} da meta anual (${percentualAtingimento}% atingido). Potencial em editais abertos: ${formatCompactCurrency((metaAnual || 32000000) * 3.5)}.`,
          }}
        />
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            {activeTab === 'emendas' ? (
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300 font-mono">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-4 font-sans">Parlamentar / Autor</th>
                  <th className="py-2.5 px-4">Tipo & Número</th>
                  <th className="py-2.5 px-4">Processamento API</th>
                  <th className="py-2.5 px-4 font-sans">Objeto da Destinação</th>
                  <th className="py-2.5 px-4 font-sans">Órgão Destino</th>
                  <th className="py-2.5 px-4 text-right">Indicado</th>
                  <th className="py-2.5 px-4 text-right">Pago</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {filteredEmendas.map(e => {
                  const isRecente = isEmendaRecente(e.dataProcessamento);
                  const diasDecorridos = getDiasDecorridos(e.dataProcessamento);

                  return (
                    <tr
                      key={e.id}
                      className={`transition ${
                        isRecente
                          ? 'bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                          : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white font-sans">
                        <div className="flex items-center gap-1.5">
                          <span>{e.autor}</span>
                          {isRecente && (
                            <span
                              className="px-1.5 py-0.2 rounded-sm text-[8px] font-mono font-bold uppercase bg-emerald-500 text-slate-950 inline-flex items-center gap-1"
                              title={`Processada há ${diasDecorridos} dias`}
                            >
                              <span className="w-1 h-1 rounded-full bg-slate-950 animate-ping inline-block" />
                              NOVA ({diasDecorridos}d)
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-normal font-mono">
                          {e.partido} • {e.esfera}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-1.5 py-0.5 rounded-sm text-[10px] font-mono font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {e.tipo}
                        </span>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{e.numero}</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="text-xs font-mono font-bold text-slate-700 dark:text-slate-200">
                          {e.dataProcessamento ? formatDataBR(e.dataProcessamento) : '-'}
                        </div>
                        {isRecente ? (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
                            há {diasDecorridos} dia{diasDecorridos !== 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-mono">
                            regular
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 max-w-xs text-slate-800 dark:text-slate-200 font-sans">
                        {e.objeto}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-sans">
                        {e.orgaoDestino}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300">
                        {formatCurrency(e.valorIndicado)}
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400 font-bold">
                        {formatCurrency(e.valorPago)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-sm text-[10px] font-mono font-bold uppercase border ${
                            e.status === 'Paga'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300 dark:border-blue-800'
                          }`}
                        >
                          {e.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300 font-mono">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-4 font-sans">Proposta / Concedente</th>
                  <th className="py-2.5 px-4 font-sans">Objeto do Convênio</th>
                  <th className="py-2.5 px-4 text-right">Valor Global</th>
                  <th className="py-2.5 px-4 text-right">Repasse Federal</th>
                  <th className="py-2.5 px-4 text-right">Contrapartida</th>
                  <th className="py-2.5 px-4 text-right">Liberado</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {filteredConvenios.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white font-sans">
                      <div>{c.concedente}</div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Nº {c.numeroProposta}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-sm text-slate-800 dark:text-slate-200 font-sans">
                      {c.objeto}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300">
                      {formatCurrency(c.valorGlobal)}
                    </td>
                    <td className="py-3 px-4 text-right text-blue-600 dark:text-blue-400 font-semibold">
                      {formatCurrency(c.valorRepasse)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500">
                      {formatCurrency(c.contrapartida)}
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400 font-bold">
                      {formatCurrency(c.valorLiberado)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-sm text-[10px] font-mono font-bold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      )}
    </div>
  );
};
