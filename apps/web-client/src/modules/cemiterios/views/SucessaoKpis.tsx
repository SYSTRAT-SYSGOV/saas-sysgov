import React from 'react';
import { StatCard } from '@sysgov/ui';
import type { DashboardPendentesResumo, DashboardRegularizacao } from '../api';

export interface MetricasSucessao {
  totalPendentes: number;
  emAnalise: number;
  aguardandoDocumentos: number;
  validadas: number;
  sucedidas: number;
  totalRegularizacao: number;
  regularizacaoVencida: number;
  regularizacaoNoPrazo: number;
}

/** Função pura para agregação dos indicadores de Sucessão Hereditária. */
export function calcularMetricasSucessao(
  resumoPendentes: DashboardPendentesResumo | undefined,
  regularizacao: DashboardRegularizacao | null,
  sucedidas: number
): MetricasSucessao {
  const processosRegularizacao = regularizacao?.processos ?? [];
  const regularizacaoVencida = processosRegularizacao.filter((p) => p.prazo_vencido).length;

  return {
    totalPendentes: resumoPendentes?.total ?? 0,
    emAnalise: resumoPendentes?.em_analise ?? 0,
    aguardandoDocumentos: resumoPendentes?.aguardando_documentos ?? 0,
    validadas: resumoPendentes?.validada ?? 0,
    sucedidas,
    totalRegularizacao: regularizacao?.total ?? 0,
    regularizacaoVencida,
    regularizacaoNoPrazo: processosRegularizacao.length - regularizacaoVencida,
  };
}

export interface SucessaoKpisProps {
  resumoPendentes: DashboardPendentesResumo | undefined;
  regularizacao: DashboardRegularizacao | null;
  sucedidas: number;
}

/**
 * Painel de Indicadores de Sucessão Hereditária.
 * Utiliza o componente StatCard de @sysgov/ui — mesmo padrão adotado em
 * InventarioKpis e OperacoesKpis para os demais módulos de Cemitérios.
 * As três queries de origem (pendentes/regularização/sucedidas) já expõem seu
 * próprio estado de carregamento nas sub-abas; aqui os cards atualizam in-place
 * assim que cada resposta chega, sem esconder os rótulos atrás de um skeleton.
 */
export const SucessaoKpis: React.FC<SucessaoKpisProps> = ({ resumoPendentes, regularizacao, sucedidas }) => {
  const metricas = calcularMetricasSucessao(resumoPendentes, regularizacao, sucedidas);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
      <StatCard
        label="Pendentes de Análise"
        value={metricas.totalPendentes.toLocaleString('pt-BR')}
        caption="Processos aguardando análise"
        accentClassName="border-l-amber-500"
        valueClassName="text-amber-600 dark:text-amber-400"
        captionClassName="text-amber-600 dark:text-amber-400"
      />
      <StatCard
        label="Em Análise"
        value={metricas.emAnalise.toLocaleString('pt-BR')}
        caption="Em qualificação técnica"
        accentClassName="border-l-primary"
      />
      <StatCard
        label="Aguardando Documentos"
        value={metricas.aguardandoDocumentos.toLocaleString('pt-BR')}
        caption="Pendência com requerente"
        accentClassName="border-l-yellow-500"
        valueClassName="text-yellow-600 dark:text-yellow-400"
        captionClassName="text-yellow-600 dark:text-yellow-400"
      />
      <StatCard
        label="Validadas"
        value={metricas.validadas.toLocaleString('pt-BR')}
        caption="Aguardando conclusão"
        accentClassName="border-l-indigo-500"
        valueClassName="text-indigo-600 dark:text-indigo-400"
        captionClassName="text-indigo-600 dark:text-indigo-400"
      />
      <StatCard
        label="Sucessões Concluídas"
        value={metricas.sucedidas.toLocaleString('pt-BR')}
        caption="Titular sucedido e transferido"
        accentClassName="border-l-emerald-500"
        valueClassName="text-emerald-600 dark:text-emerald-400"
        captionClassName="text-emerald-600 dark:text-emerald-400"
      />
      <StatCard
        label="Regularização Vencida"
        value={metricas.regularizacaoVencida.toLocaleString('pt-BR')}
        caption={`${metricas.totalRegularizacao} para regularizar`}
        accentClassName="border-l-rose-500"
        valueClassName="text-rose-600 dark:text-rose-400"
        captionClassName="text-rose-600 dark:text-rose-400"
      />
    </div>
  );
};

export default SucessaoKpis;
