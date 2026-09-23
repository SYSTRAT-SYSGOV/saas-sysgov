import React, { useMemo } from 'react';
import { StatCard } from '@sysgov/ui';
import type { Jazigo } from '../api';

export interface MetricasInventario {
  total: number;
  disponiveis: number;
  concedidos: number;
  ocupados: number;
  capacidadeMaxima: number;
  manutencao: number;
  capacidadeTotal: number;
  ocupacaoTotal: number;
  taxaOcupacaoPct: number;
  vagasLivresTotal: number;
}

/**
 * Função pura para agregação e cálculo estatístico de inventário de jazigos.
 */
export function calcularMetricasInventario(jazigos: Jazigo[]): MetricasInventario {
  const total = jazigos.length;
  let disponiveis = 0;
  let concedidos = 0;
  let ocupados = 0;
  let capacidadeMaxima = 0;
  let manutencao = 0;
  let capacidadeTotal = 0;
  let ocupacaoTotal = 0;

  for (const j of jazigos) {
    capacidadeTotal += j.capacidade || 1;
    ocupacaoTotal += j.ocupacao || 0;

    switch (j.estado) {
      case 'disponivel':
        disponiveis++;
        break;
      case 'concedido':
        concedidos++;
        break;
      case 'ocupado':
        ocupados++;
        break;
      case 'capacidade_maxima':
        capacidadeMaxima++;
        break;
      case 'manutencao':
        manutencao++;
        break;
    }
  }

  const taxaOcupacaoPct = capacidadeTotal > 0 ? (ocupacaoTotal / capacidadeTotal) * 100 : 0;
  const vagasLivresTotal = Math.max(0, capacidadeTotal - ocupacaoTotal);

  return {
    total,
    disponiveis,
    concedidos,
    ocupados,
    capacidadeMaxima,
    manutencao,
    capacidadeTotal,
    ocupacaoTotal,
    taxaOcupacaoPct,
    vagasLivresTotal,
  };
}

export interface InventarioKpisProps {
  jazigos: Jazigo[];
  parqueNome?: string | null;
  carregando?: boolean;
}

/**
 * Painel de Indicadores Operacionais de Inventário Cemiterial.
 * Utiliza o componente StatCard de @sysgov/ui com o padrão semântico do módulo CAPD.
 */
export const InventarioKpis: React.FC<InventarioKpisProps> = ({
  jazigos,
  parqueNome,
  carregando = false,
}) => {
  const metricas = useMemo(() => calcularMetricasInventario(jazigos), [jazigos]);

  if (carregando) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div
            key={idx}
            className="h-24 rounded-lg bg-muted/40 animate-pulse border border-border/60"
          />
        ))}
      </div>
    );
  }

  const pctDisponivel = metricas.total > 0 ? ((metricas.disponiveis / metricas.total) * 100).toFixed(1) : '0.0';
  const pctConcedido = metricas.total > 0 ? ((metricas.concedidos / metricas.total) * 100).toFixed(1) : '0.0';
  const pctOcupado = metricas.total > 0 ? (((metricas.ocupados + metricas.capacidadeMaxima) / metricas.total) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-1.5">
      {parqueNome && (
        <div className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 px-0.5">
          <span>Escopo do inventário:</span>
          <span className="font-semibold text-foreground">{parqueNome}</span>
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <StatCard
          label="Total de Unidades"
          value={metricas.total.toLocaleString('pt-BR')}
          caption={`${metricas.capacidadeTotal} gavetas/nichos`}
          accentClassName="border-l-primary"
        />

        <StatCard
          label="Disponíveis"
          value={metricas.disponiveis.toLocaleString('pt-BR')}
          caption={`${pctDisponivel}% do inventário`}
          accentClassName="border-l-emerald-500"
          valueClassName="text-emerald-600 dark:text-emerald-400"
          captionClassName="text-emerald-600 dark:text-emerald-400"
        />

        <StatCard
          label="Concedidas"
          value={metricas.concedidos.toLocaleString('pt-BR')}
          caption={`${pctConcedido}% sob concessão`}
          accentClassName="border-l-indigo-500"
          valueClassName="text-indigo-600 dark:text-indigo-400"
          captionClassName="text-indigo-600 dark:text-indigo-400"
        />

        <StatCard
          label="Em Uso / Ocupadas"
          value={metricas.ocupados.toLocaleString('pt-BR')}
          caption={`${pctOcupado}% com sepultamentos`}
          accentClassName="border-l-cyan-500"
          valueClassName="text-cyan-600 dark:text-cyan-400"
          captionClassName="text-cyan-600 dark:text-cyan-400"
        />

        <StatCard
          label="Capacidade Máxima"
          value={metricas.capacidadeMaxima.toLocaleString('pt-BR')}
          caption="100% dos nichos lotados"
          accentClassName="border-l-rose-500"
          valueClassName="text-rose-600 dark:text-rose-400"
          captionClassName="text-rose-600 dark:text-rose-400"
        />

        <StatCard
          label="Em Ruína / Manut."
          value={metricas.manutencao.toLocaleString('pt-BR')}
          caption={
            metricas.taxaOcupacaoPct > 0
              ? `Ocupação global: ${metricas.taxaOcupacaoPct.toFixed(1)}%`
              : 'Sem interdições'
          }
          accentClassName="border-l-amber-500"
          valueClassName="text-amber-600 dark:text-amber-400"
          captionClassName="text-amber-600 dark:text-amber-400"
        />
      </div>
    </div>
  );
};
