import React, { useMemo } from 'react';
import { StatCard } from '@sysgov/ui';
import type { OrdemServico, Inumacao, Exumacao } from '../../api';

export interface MetricasOperacoes {
  totalOrdens: number;
  ordensAbertas: number;
  ordensEmExecucao: number;
  ordensConcluidas: number;
  ordensHoje: number;
  totalInumacoes: number;
  inumacoesMes: number;
  totalExumacoes: number;
  exumacoesAtivas: number;
}

export function calcularMetricasOperacoes(
  ordens: OrdemServico[],
  inumacoes: Inumacao[],
  exumacoes: Exumacao[]
): MetricasOperacoes {
  const hojeStr = new Date().toISOString().slice(0, 10);
  const mesAtualStr = new Date().toISOString().slice(0, 7);

  let ordensAbertas = 0;
  let ordensEmExecucao = 0;
  let ordensConcluidas = 0;
  let ordensHoje = 0;

  for (const o of ordens) {
    if (o.situacao === 'emitida' || o.situacao === 'em_execucao') {
      ordensAbertas++;
    }
    if (o.situacao === 'em_execucao') {
      ordensEmExecucao++;
    }
    if (o.situacao === 'concluida') {
      ordensConcluidas++;
    }
    if (o.agendada_para && o.agendada_para.startsWith(hojeStr)) {
      ordensHoje++;
    }
  }

  let inumacoesMes = 0;
  for (const i of inumacoes) {
    if (i.sepultado_em && i.sepultado_em.startsWith(mesAtualStr)) {
      inumacoesMes++;
    }
  }

  let exumacoesAtivas = 0;
  for (const e of exumacoes) {
    if (e.situacao === 'agendada' || e.situacao === 'liberada' || e.situacao === 'em_andamento') {
      exumacoesAtivas++;
    }
  }

  return {
    totalOrdens: ordens.length,
    ordensAbertas,
    ordensEmExecucao,
    ordensConcluidas,
    ordensHoje,
    totalInumacoes: inumacoes.length,
    inumacoesMes,
    totalExumacoes: exumacoes.length,
    exumacoesAtivas,
  };
}

interface OperacoesKpisProps {
  ordens: OrdemServico[];
  inumacoes: Inumacao[];
  exumacoes: Exumacao[];
  carregando?: boolean;
  parqueNome?: string | null;
}

export const OperacoesKpis: React.FC<OperacoesKpisProps> = ({
  ordens,
  inumacoes,
  exumacoes,
  carregando = false,
  parqueNome,
}) => {
  const metricas = useMemo(
    () => calcularMetricasOperacoes(ordens, inumacoes, exumacoes),
    [ordens, inumacoes, exumacoes]
  );

  if (carregando) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {Array.from({ length: 5 }).map((_, idx) => (
          <div
            key={idx}
            className="h-24 rounded-lg bg-muted/40 animate-pulse border border-border/60"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {parqueNome && (
        <div className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 px-0.5">
          <span>Escopo das operações:</span>
          <span className="font-semibold text-foreground">{parqueNome}</span>
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <StatCard
          label="OS em Aberto"
          value={metricas.ordensAbertas.toLocaleString('pt-BR')}
          caption={`${metricas.ordensEmExecucao} em execução`}
          accentClassName="border-l-primary"
          valueClassName="text-primary font-mono tabular-nums font-bold"
        />

        <StatCard
          label="Agendadas para Hoje"
          value={metricas.ordensHoje.toLocaleString('pt-BR')}
          caption="Equipes de campo"
          accentClassName="border-l-amber-500"
          valueClassName="text-amber-600 dark:text-amber-400 font-mono tabular-nums font-bold"
          captionClassName="text-amber-600 dark:text-amber-400"
        />

        <StatCard
          label="Inumações no Mês"
          value={metricas.inumacoesMes.toLocaleString('pt-BR')}
          caption={`${metricas.totalInumacoes} registradas`}
          accentClassName="border-l-emerald-500"
          valueClassName="text-emerald-600 dark:text-emerald-400 font-mono tabular-nums font-bold"
          captionClassName="text-emerald-600 dark:text-emerald-400"
        />

        <StatCard
          label="Exumações Ativas"
          value={metricas.exumacoesAtivas.toLocaleString('pt-BR')}
          caption={`${metricas.totalExumacoes} cadastradas`}
          accentClassName="border-l-cyan-500"
          valueClassName="text-cyan-600 dark:text-cyan-400 font-mono tabular-nums font-bold"
          captionClassName="text-cyan-600 dark:text-cyan-400"
        />

        <StatCard
          label="OS Concluídas"
          value={metricas.ordensConcluidas.toLocaleString('pt-BR')}
          caption={`${metricas.totalOrdens} total de ordens`}
          accentClassName="border-l-indigo-500"
          valueClassName="text-indigo-600 dark:text-indigo-400 font-mono tabular-nums font-bold"
          captionClassName="text-indigo-600 dark:text-indigo-400"
        />
      </div>
    </div>
  );
};
