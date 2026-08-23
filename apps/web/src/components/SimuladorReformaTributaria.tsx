import React, { useState } from 'react';
import {
  TrendingDown,
  TrendingUp,
  Scale,
  ShieldCheck,
  AlertTriangle,
  FileSpreadsheet,
  Building2,
  Sparkles,
  Sliders,
  DollarSign,
  ArrowRight,
  Landmark,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { ProjecaoReformaAno, MedidaCompensatoria, SimuladorReformaPayload } from '../types/fiscal';
import { formatCompactCurrency, formatCurrency, formatPercent } from '../utils/formatters';
import { DataSourceBadge } from './DataSourceBadge';

interface SimuladorReformaProps {
  data?: SimuladorReformaPayload | null;
  cidade?: string;
  uf?: string;
}

export const SimuladorReformaTributaria: React.FC<SimuladorReformaProps> = ({
  data: initialData,
  cidade = 'Araucária',
  uf = 'PR',
}) => {
  const [esforcoArrecadacao, setEsforcoArrecadacao] = useState<number>(0);

  // Projeções ZERADAS: os valores são calculados exclusivamente pelo backend
  // (TaxReformSimulator sobre as receitas reais de ICMS/ISS). Mantém-se apenas
  // o cronograma legal de transição da EC 132/2023 — fato normativo, não dado simulado.
  const cronogramaLegalEC132 = [
    { ano: 2026, faseTransicao: 'Alíquota-teste do IBS (0,9% CBS/IBS)' },
    { ano: 2027, faseTransicao: 'Entrada da CBS Federal / Ajuste Alíquotas' },
    { ano: 2029, faseTransicao: 'Redução ICMS/ISS (-10% / IBS 10%)' },
    { ano: 2031, faseTransicao: 'Redução ICMS/ISS (-30% / IBS 30%)' },
    { ano: 2033, faseTransicao: 'Extinção do ICMS/ISS • Pleno IBS Destino' },
  ];

  const fallbackProjecoes: ProjecaoReformaAno[] = cronogramaLegalEC132.map(f => ({
    ano: f.ano,
    icmsSemReforma: 0,
    issSemReforma: 0,
    ibsProjetado: 0,
    fundoCompensacaoFederativo: 0,
    receitaTotalSemReforma: 0,
    receitaTotalComReforma: 0,
    diferencaNominal: 0,
    diferencaPercentual: 0.0,
    faseTransicao: f.faseTransicao,
  }));

  // Medidas compensatórias estratégicas (impacto a dimensionar pelo município)
  const fallbackMedidas: MedidaCompensatoria[] = [
    {
      id: 'med-1',
      titulo: 'Atualização da Planta Genérica de Valores (PGV) e Georreferenciamento',
      categoria: 'IPTU',
      impactoAnualEstimado: 0,
      complexidade: 'MEDIA',
      prazoMeses: 12,
      descricao: `Revisão do cadastro imobiliário para identificar ampliações não declaradas em ${cidade}.`,
      acaoPratica: 'Encaminhar Projeto de Lei Complementar revisando a PGV e lançando recadastramento digital.',
    },
    {
      id: 'med-2',
      titulo: 'Modernização e Expansão da CIP / COSIP (Iluminação Pública Inteligente)',
      categoria: 'CIP / COSIP',
      impactoAnualEstimado: 0,
      complexidade: 'BAIXA',
      prazoMeses: 6,
      descricao: 'Adesão a telegestão em LED e reajuste da base tarifária da contribuição de iluminação.',
      acaoPratica: 'Publicar Decreto regulamentando a taxa de custeio e eficiência energética.',
    },
    {
      id: 'med-3',
      titulo: 'Programa de Recuperação Fiscal (REFIS) e Cobrança Extrajudicial de Dívida Ativa',
      categoria: 'DÍVIDA ATIVA',
      impactoAnualEstimado: 0,
      complexidade: 'BAIXA',
      prazoMeses: 4,
      descricao: 'Protesto de CDA em cartórios e parcelamento incentivado de débitos municipais.',
      acaoPratica: 'Firmar convênio com Instituto de Estudos de Protesto de Títulos do Brasil (IEPTB).',
    },
    {
      id: 'med-4',
      titulo: 'Auditoria de ISSQN sobre Instituições Financeiras (DES-IF) e Marketplaces',
      categoria: 'ISSQN',
      impactoAnualEstimado: 0,
      complexidade: 'MEDIA',
      prazoMeses: 8,
      descricao: 'Cruzamento de dados da DES-IF para apurar subdeclaração de tarifas bancárias e cartões.',
      acaoPratica: 'Contratar módulo de inteligência fiscal bancária para a Secretaria de Finanças.',
    },
  ];

  const payload: SimuladorReformaPayload = initialData || {
    municipio: {
      nome: `Prefeitura Municipal de ${cidade}`,
      cidade,
      uf,
      codigoIbge: '',
      perfilEconomico: 'Aguardando dados do IBGE/IPARDES',
    },
    resumo: {
      perdaOuGanhoAcumulado2033: 0,
      anoPicoImpacto: 2033,
      mediaVariacaoAnualPct: 0,
      recomendacaoGeral: 'Projeção indisponível: aguardando sincronização das receitas reais de ICMS/ISS (SICONFI).',
      fatorDestinoConsumo: 0,
    },
    projecoes: fallbackProjecoes,
    medidasCompensatorias: fallbackMedidas,
    dataSource: {
      origin: 'OFICIAL',
      source: 'TaxReformSimulator (bases reais SICONFI)',
    },
  };

  // Ajuste interativo pelo slider
  const projecoesAjustadas = payload.projecoes.map(p => {
    const ganhoCompensatorio = Math.round(p.receitaTotalSemReforma * (esforcoArrecadacao / 100));
    const receitaComAjustada = p.receitaTotalComReforma + ganhoCompensatorio;
    const difNominal = receitaComAjustada - p.receitaTotalSemReforma;
    const difPct = Number(((difNominal / p.receitaTotalSemReforma) * 100).toFixed(2));

    return {
      ...p,
      receitaTotalComReforma: receitaComAjustada,
      diferencaNominal: difNominal,
      diferencaPercentual: difPct,
    };
  });

  return (
    <div className="space-y-6">
      {/* Top Banner: Reforma Tributária EC 132 */}
      <div className="bg-slate-900 border border-slate-800 rounded-sm p-4 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-sm text-[10px] font-mono font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40">
              SIMULADOR DE TRANSIÇÃO EC 132/2023 (ICMS/ISS → IBS)
            </span>
            <DataSourceBadge dataSource={payload.dataSource} size="xs" showDetails />
          </div>
          <h2 className="text-lg font-bold uppercase tracking-tight">
            IMPACTO DA REFORMA TRIBUTÁRIA (2026–2033) — {payload.municipio.cidade} / {payload.municipio.uf}
          </h2>
          <p className="text-xs text-slate-300">
            Modelagem do princípio do destino, regra de retenção do Fundo de Compensação e medidas para preservação da receita.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <span className="text-[10px] font-mono text-slate-400 block uppercase">Perfil da Base</span>
            <span className="text-xs font-mono font-bold text-amber-400">{payload.municipio.perfilEconomico}</span>
          </div>
          <div className="text-right border-l border-slate-700 pl-3">
            <span className="text-[10px] font-mono text-slate-400 block uppercase">Fator Destino</span>
            <span className="text-xs font-mono font-bold text-white">{(payload.resumo.fatorDestinoConsumo * 100).toFixed(0)}% da média</span>
          </div>
        </div>
      </div>

      {/* 3 Cards de Resumo da Reforma */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
              IMPACTO LÍQUIDO ATÉ 2033
            </span>
            <TrendingDown className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tighter text-rose-600 dark:text-rose-400">
            {formatCompactCurrency(payload.resumo.perdaOuGanhoAcumulado2033)}
          </div>
          <span className="text-[10px] font-mono text-slate-500">
            Sem considerar medidas compensatórias municipais
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
              ANO DE PICO DA TRANSIÇÃO
            </span>
            <Scale className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tighter text-slate-900 dark:text-white">
            {payload.resumo.anoPicoImpacto}
          </div>
          <span className="text-[10px] font-mono text-slate-500">
            Extinção definitiva de ICMS/ISS e vigência integral do IBS
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
              FUNDO DE COMPENSAÇÃO EC 132
            </span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tighter text-emerald-600 dark:text-emerald-400">
            Ativo (Art. 131)
          </div>
          <span className="text-[10px] font-mono text-slate-500">
            Garante até 90% da perda com repasse compensatório
          </span>
        </div>
      </div>

      {/* Slider Interativo de Esforço de Arrecadação Própria */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
              Simulador de Ganho com Medidas de Arrecadação Própria (IPTU, ISS, Dívida Ativa)
            </h3>
          </div>
          <span className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400">
            Esforço Adicional: +{esforcoArrecadacao}% na receita própria
          </span>
        </div>

        <div className="flex items-center gap-4">
          <input
            type="range"
            min="0"
            max="15"
            step="1"
            value={esforcoArrecadacao}
            onChange={e => setEsforcoArrecadacao(Number(e.target.value))}
            className="w-full accent-purple-600 cursor-pointer"
          />
          <span className="text-xs font-mono font-bold text-slate-900 dark:text-white w-12 text-right">
            +{esforcoArrecadacao}%
          </span>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Arraste o slider para simular o efeito da modernização da Planta Genérica de Valores (PGV), fiscalização do ISS bancário e execução de Dívida Ativa no equilíbrio fiscal pós-reforma.
        </p>
      </div>

      {/* Tabela de Transição Ano a Ano */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
            Curva de Transição Federativa: Cenário Atual vs Cenário com Reforma Tributária (EC 132)
          </h3>
          <span className="text-[10px] font-mono text-slate-400 uppercase">Valores em R$ nominais</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300 font-mono">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-4">Exercício</th>
                <th className="py-2.5 px-4">Fase da Transição</th>
                <th className="py-2.5 px-4 text-right">ICMS + ISS (Sem Reforma)</th>
                <th className="py-2.5 px-4 text-right">IBS Projetado (Destino)</th>
                <th className="py-2.5 px-4 text-right">Fundo de Compensação</th>
                <th className="py-2.5 px-4 text-right font-bold text-slate-900 dark:text-white">Receita com Reforma</th>
                <th className="py-2.5 px-4 text-right">Diferença (R$)</th>
                <th className="py-2.5 px-4 text-center">Variação %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {projecoesAjustadas.map(p => (
                <tr key={p.ano} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                    {p.ano}
                  </td>
                  <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-sans text-[11px]">
                    {p.faseTransicao}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-500">
                    {formatCurrency(p.receitaTotalSemReforma)}
                  </td>
                  <td className="py-3 px-4 text-right text-blue-600 dark:text-blue-400 font-semibold">
                    {formatCurrency(p.ibsProjetado)}
                  </td>
                  <td className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400">
                    +{formatCurrency(p.fundoCompensacaoFederativo)}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                    {formatCurrency(p.receitaTotalComReforma)}
                  </td>
                  <td className={`py-3 px-4 text-right font-bold ${p.diferencaNominal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {p.diferencaNominal >= 0 ? '+' : ''}{formatCurrency(p.diferencaNominal)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded-sm text-[10px] font-mono font-bold uppercase ${
                      p.diferencaPercentual >= 0
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                    }`}>
                      {p.diferencaPercentual >= 0 ? '+' : ''}{p.diferencaPercentual}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Plano de Medidas Compensatórias Recomendadas */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm shadow-sm p-4 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
          <Landmark className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
            Plano Estratégico de Medidas Compensatórias de Arrecadação Própria
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {payload.medidasCompensatorias.map((medida, idx) => (
            <div
              key={medida.id}
              className="border border-slate-200 dark:border-slate-800 rounded-sm p-4 bg-slate-50/50 dark:bg-slate-800/20 hover:border-slate-300 dark:hover:border-slate-700 transition space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="px-1.5 py-0.5 rounded-xs text-[9px] font-mono font-bold uppercase bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
                  {medida.categoria}
                </span>
                <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  +{formatCompactCurrency(medida.impactoAnualEstimado)}/ano
                </span>
              </div>

              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                {medida.titulo}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {medida.descricao}
              </p>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-[11px] font-mono text-purple-600 dark:text-purple-400 font-semibold">
                📌 Ação Prática: {medida.acaoPratica}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SimuladorReformaTributaria;
