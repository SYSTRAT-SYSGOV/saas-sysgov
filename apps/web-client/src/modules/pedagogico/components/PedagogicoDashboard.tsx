import React, { useMemo, useState } from 'react';
import {
  Sparkles,
  Download,
  Lock,
  ChevronDown,
  Star,
  PieChart as PieChartIcon
} from 'lucide-react';
import { PedagogicoStats, TurmaPedagogica, AlunoPedagogico, OcorrenciaPedagogica, CategoriaOcorrencia } from '../types/pedagogico';

interface PedagogicoDashboardProps {
  stats: PedagogicoStats;
  turmas: TurmaPedagogica[];
  alunos: AlunoPedagogico[];
  ocorrencias: OcorrenciaPedagogica[];
  categorias: CategoriaOcorrencia[];
  onNavigateSubtab: (tab: string) => void;
}

/** Cores dos turnos (validadas para daltonismo e contraste nos modos claro e escuro). */
const TURNOS = [
  { nome: 'Manhã', cor: '#B45309' },
  { nome: 'Tarde', cor: '#059669' },
  { nome: 'Noite', cor: '#7C3AED' },
] as const;
const COR_SERIE = '#8B5CF6';
const MEDIA_MINIMA = 6;
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** Categorias de elogio contam como destaque, não como problema de comportamento. */
const ehElogio = (categoria: string) => /elogio|destaque/i.test(categoria);
const formatarMedia = (media: number) => media.toFixed(1).replace('.', ',');

/** Arco de pizza de `inicio` a `fim` (frações de 0 a 1). */
function fatia(inicio: number, fim: number, r = 90, c = 100): string {
  if (fim - inicio >= 0.9999) return `M ${c} ${c - r} A ${r} ${r} 0 1 1 ${c - 0.01} ${c - r} Z`;
  const ponto = (f: number) => [c + r * Math.sin(2 * Math.PI * f), c - r * Math.cos(2 * Math.PI * f)];
  const [x1, y1] = ponto(inicio);
  const [x2, y2] = ponto(fim);
  return `M ${c} ${c} L ${x1} ${y1} A ${r} ${r} 0 ${fim - inicio > 0.5 ? 1 : 0} 1 ${x2} ${y2} Z`;
}

/** Escala "redonda" para o eixo y (máximo e passo). */
function escala(maximo: number): { topo: number; passo: number } {
  if (maximo <= 5) return { topo: 5, passo: 1 };
  const bruto = maximo / 5;
  const base = 10 ** Math.floor(Math.log10(bruto));
  const passo = [1, 2, 5, 10].map(m => m * base).find(p => p >= bruto) ?? bruto;
  return { topo: Math.ceil(maximo / passo) * passo, passo };
}

export const PedagogicoDashboard: React.FC<PedagogicoDashboardProps> = ({
  turmas,
  alunos,
  ocorrencias,
  categorias,
  onNavigateSubtab,
}) => {
  const [selectedTurmaFilter, setSelectedTurmaFilter] = useState<string>('all');

  const dados = useMemo(() => {
    const turmasFiltradas = selectedTurmaFilter === 'all' ? turmas : turmas.filter(t => String(t.id) === selectedTurmaFilter);
    const idsTurmas = new Set(turmasFiltradas.map(t => t.id));
    const alunosFiltrados = alunos.filter(a => selectedTurmaFilter === 'all' || idsTurmas.has(a.turma_id));
    const alunoPorId = new Map(alunos.map(a => [a.id, a]));
    const turmaPorId = new Map(turmas.map(t => [t.id, t]));
    const ocorrenciasFiltradas = ocorrencias.filter(o => {
      const aluno = alunoPorId.get(o.aluno_id);
      return selectedTurmaFilter === 'all' || (aluno !== undefined && idsTurmas.has(aluno.turma_id));
    });

    // Tendência: últimos 6 meses
    const hoje = new Date();
    const meses = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - 5 + i, 1);
      const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return { chave, rotulo: `${MESES[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`, total: 0 };
    });
    ocorrenciasFiltradas.forEach(o => {
      const mes = meses.find(m => o.data.startsWith(m.chave));
      if (mes) mes.total++;
    });

    // Por categoria (cor do cadastro), maior primeiro
    const porCategoria = new Map<string, number>();
    ocorrenciasFiltradas.forEach(o => porCategoria.set(o.categoria, (porCategoria.get(o.categoria) ?? 0) + 1));
    const categoriasGrafico = [...porCategoria.entries()]
      .map(([nome, total]) => ({ nome, total, cor: categorias.find(c => c.nome === nome)?.cor ?? '#94A3B8' }))
      .sort((a, b) => b.total - a.total);

    // Por turma e por turno
    const porTurma = turmasFiltradas.map(t => ({
      nome: t.nome,
      total: ocorrenciasFiltradas.filter(o => alunoPorId.get(o.aluno_id)?.turma_id === t.id).length,
    }));
    const porTurno = TURNOS.map(turno => ({
      ...turno,
      total: ocorrenciasFiltradas.filter(o => turmaPorId.get(alunoPorId.get(o.aluno_id)?.turma_id ?? 0)?.turno_nome === turno.nome).length,
    }));

    // Inteligência: comportamento (sem elogios), alerta de média e destaques (elogios)
    const contar = (filtro: (o: OcorrenciaPedagogica) => boolean) => {
      const mapa = new Map<number, number>();
      ocorrenciasFiltradas.filter(filtro).forEach(o => mapa.set(o.aluno_id, (mapa.get(o.aluno_id) ?? 0) + 1));
      return [...mapa.entries()]
        .map(([id, total]) => ({ aluno: alunoPorId.get(id), total }))
        .filter((x): x is { aluno: AlunoPedagogico; total: number } => x.aluno !== undefined)
        .sort((a, b) => b.total - a.total || a.aluno.nome.localeCompare(b.aluno.nome, 'pt-BR'));
    };
    const topComportamental = contar(o => !ehElogio(o.categoria)).slice(0, 5);
    const topDestaque = contar(o => ehElogio(o.categoria)).slice(0, 3);
    const alertaAcademico = alunosFiltrados
      .filter(a => a.media_geral !== undefined && a.media_geral < MEDIA_MINIMA)
      .sort((a, b) => (a.media_geral ?? 0) - (b.media_geral ?? 0))
      .slice(0, 5);

    return { turmasFiltradas, alunosFiltrados, ocorrenciasFiltradas, meses, categoriasGrafico, porTurma, porTurno, topComportamental, topDestaque, alertaAcademico };
  }, [alunos, turmas, ocorrencias, categorias, selectedTurmaFilter]);

  const handleExportCsv = () => {
    const ocorrenciasPorAluno = new Map<number, number>();
    dados.ocorrenciasFiltradas.forEach(o => ocorrenciasPorAluno.set(o.aluno_id, (ocorrenciasPorAluno.get(o.aluno_id) ?? 0) + 1));
    const linhas = [
      ['Nº', 'Aluno', 'Turma', 'Média anual', 'Ocorrências'],
      ...dados.alunosFiltrados.map(a => [
        a.numero ?? '', a.nome, a.turma_nome,
        a.media_geral !== undefined ? formatarMedia(a.media_geral) : '', ocorrenciasPorAluno.get(a.id) ?? 0,
      ]),
    ];
    const csv = linhas.map(l => l.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }));
    link.download = 'painel_pedagogico.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // Geometria da tendência mensal
  const tendencia = escala(Math.max(...dados.meses.map(m => m.total), 1));
  const pontosTendencia = dados.meses.map((m, i) => ({
    ...m,
    x: 35 + i * 88,
    y: 150 - (m.total / tendencia.topo) * 135,
  }));
  const linhaTendencia = pontosTendencia.map((p, i) => `${i ? 'L' : 'M'} ${p.x},${p.y}`).join(' ');

  // Geometria das barras por turma
  const barras = escala(Math.max(...dados.porTurma.map(t => t.total), 1));
  const larguraFaixa = dados.porTurma.length ? 555 / dados.porTurma.length : 0;
  const larguraBarra = Math.min(24, larguraFaixa * 0.6);

  const totalCategorias = dados.categoriasGrafico.reduce((s, c) => s + c.total, 0);
  const totalTurnos = dados.porTurno.reduce((s, t) => s + t.total, 0);
  const circunferencia = 2 * Math.PI * 36;

  const vazio = (texto: string) => (
    <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-8">{texto}</p>
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
            <PieChartIcon className="w-6 h-6" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Dashboard
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <select
              value={selectedTurmaFilter}
              onChange={(e) => setSelectedTurmaFilter(e.target.value)}
              aria-label="Filtrar por turma"
              className="appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-bold px-3.5 py-2 pr-8 rounded-xl focus:outline-none cursor-pointer"
            >
              <option value="all">Todas as Turmas</option>
              {turmas.map(t => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar CSV
          </button>

          <button
            onClick={() => onNavigateSubtab('modulo_pedagogico_alunos')}
            className="px-3.5 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
          >
            <Lock className="w-3.5 h-3.5" />
            Acessar
          </button>
        </div>
      </div>

      {/* Top 3 Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          { rotulo: 'Total de Alunos', valor: dados.alunosFiltrados.length, destaque: false },
          { rotulo: 'Total de Ocorrências', valor: dados.ocorrenciasFiltradas.length, destaque: true },
          { rotulo: 'Turmas Ativas', valor: dados.turmasFiltradas.length, destaque: false },
        ].map(card => (
          <div
            key={card.rotulo}
            className={`bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between ${card.destaque ? 'border-l-4 border-l-[#8B5CF6]' : ''}`}
          >
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">{card.rotulo}</span>
            <div className="mt-3 text-4xl font-black text-slate-900 dark:text-white tracking-tight font-mono tabular-nums">
              {card.valor}
            </div>
          </div>
        ))}
      </div>

      {/* Row 1 Charts: Tendência Mensal & Ocorrências por Categoria */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tendência Mensal */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h2 className="text-sm font-black text-slate-900 dark:text-white">
            Ocorrências por mês (últimos 6 meses)
          </h2>

          <div className="pt-2">
            <svg viewBox="0 0 500 175" className="w-full h-auto overflow-visible" role="img" aria-label="Ocorrências por mês">
              <defs>
                <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COR_SERIE} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={COR_SERIE} stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {Array.from({ length: tendencia.topo / tendencia.passo + 1 }, (_, i) => i * tendencia.passo).map(val => {
                const y = 150 - (val / tendencia.topo) * 135;
                return (
                  <g key={val}>
                    <line x1="30" y1={y} x2="480" y2={y} className="stroke-slate-200 dark:stroke-slate-800" strokeDasharray="3 3" strokeWidth="0.8" />
                    <text x="22" y={y + 3} textAnchor="end" className="text-[9px] fill-slate-400 font-mono">{val}</text>
                  </g>
                );
              })}

              <path d={`${linhaTendencia} L ${pontosTendencia[5].x},150 L ${pontosTendencia[0].x},150 Z`} fill="url(#purpleGradient)" />
              <path d={linhaTendencia} fill="none" stroke={COR_SERIE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

              {pontosTendencia.map(p => (
                <g key={p.chave}>
                  <circle cx={p.x} cy={p.y} r="4" fill={COR_SERIE} className="stroke-white dark:stroke-slate-900" strokeWidth="2" />
                  {/* Alvo maior que o ponto para o hover */}
                  <circle cx={p.x} cy={p.y} r="14" fill="transparent">
                    <title>{`${p.rotulo}: ${p.total} ocorrência(s)`}</title>
                  </circle>
                  <text x={p.x} y="168" textAnchor="middle" className="text-[9px] fill-slate-400 font-medium">{p.rotulo}</text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* Ocorrências por Categoria */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h2 className="text-sm font-black text-slate-900 dark:text-white">
            Ocorrências por Categoria
          </h2>

          {totalCategorias === 0 ? vazio('Nenhuma ocorrência registrada.') : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div className="flex justify-center">
                <svg viewBox="0 0 200 200" className="w-44 h-44" role="img" aria-label="Ocorrências por categoria">
                  {(() => {
                    let acumulado = 0;
                    return dados.categoriasGrafico.map(cat => {
                      const inicio = acumulado / totalCategorias;
                      acumulado += cat.total;
                      return (
                        <path key={cat.nome} d={fatia(inicio, acumulado / totalCategorias)} fill={cat.cor} className="stroke-white dark:stroke-slate-900" strokeWidth="2">
                          <title>{`${cat.nome}: ${cat.total} (${Math.round((cat.total / totalCategorias) * 100)}%)`}</title>
                        </path>
                      );
                    });
                  })()}
                </svg>
              </div>

              <div className="space-y-1.5 text-[11px] font-medium">
                {dados.categoriasGrafico.map(cat => (
                  <div key={cat.nome} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: cat.cor }} />
                    <span className="text-slate-600 dark:text-slate-300 truncate flex-1">{cat.nome}</span>
                    <span className="font-mono tabular-nums text-slate-900 dark:text-white font-bold">{cat.total}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Row 2 Charts: Ocorrências por Turma & Ocorrências por Turno */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ocorrências por Turma */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h2 className="text-sm font-black text-slate-900 dark:text-white">
            Ocorrências por Turma
          </h2>

          {dados.porTurma.length === 0 ? vazio('Nenhuma turma cadastrada.') : (
            <div className="pt-2">
              <svg viewBox="0 0 600 180" className="w-full h-auto overflow-visible" role="img" aria-label="Ocorrências por turma">
                {Array.from({ length: barras.topo / barras.passo + 1 }, (_, i) => i * barras.passo).map(val => {
                  const y = 143 - (val / barras.topo) * 128;
                  return (
                    <g key={val}>
                      <line x1="25" y1={y} x2="585" y2={y} className="stroke-slate-100 dark:stroke-slate-800" strokeWidth="1" />
                      <text x="18" y={y + 3} textAnchor="end" className="text-[8px] fill-slate-400 font-mono">{val}</text>
                    </g>
                  );
                })}

                {dados.porTurma.map((bar, idx) => {
                  const centro = 30 + larguraFaixa * idx + larguraFaixa / 2;
                  const altura = (bar.total / barras.topo) * 128;
                  return (
                    <g key={bar.nome}>
                      {bar.total > 0 ? (
                        <path
                          d={`M ${centro - larguraBarra / 2},143 V ${143 - altura + 4} q 0,-4 4,-4 h ${larguraBarra - 8} q 4,0 4,4 V 143 Z`}
                          fill={COR_SERIE}
                        />
                      ) : (
                        <rect x={centro - larguraBarra / 2} y="142" width={larguraBarra} height="1" className="fill-slate-300 dark:fill-slate-700" />
                      )}
                      <rect x={centro - larguraFaixa / 2} y="10" width={larguraFaixa} height="150" fill="transparent">
                        <title>{`${bar.nome}: ${bar.total} ocorrência(s)`}</title>
                      </rect>
                      <text x={centro} y="158" textAnchor="middle" className="text-[8px] fill-slate-500 font-medium">{bar.nome}</text>
                    </g>
                  );
                })}
              </svg>
            </div>
          )}
        </div>

        {/* Ocorrências por Turno */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
          <h2 className="text-sm font-black text-slate-900 dark:text-white">
            Ocorrências por Turno
          </h2>

          {totalTurnos === 0 ? vazio('Nenhuma ocorrência registrada.') : (
            <div className="flex flex-col items-center justify-center my-auto space-y-4">
              <div className="relative w-40 h-40 flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90" role="img" aria-label="Ocorrências por turno">
                  {(() => {
                    let acumulado = 0;
                    return dados.porTurno.filter(t => t.total > 0).map(turno => {
                      const comprimento = (turno.total / totalTurnos) * circunferencia;
                      const deslocamento = -acumulado;
                      acumulado += comprimento;
                      return (
                        <circle
                          key={turno.nome}
                          cx="50" cy="50" r="36"
                          fill="transparent"
                          stroke={turno.cor}
                          strokeWidth="18"
                          strokeDasharray={`${Math.max(comprimento - 1, 0.5)} ${circunferencia}`}
                          strokeDashoffset={deslocamento}
                        >
                          <title>{`${turno.nome}: ${turno.total}`}</title>
                        </circle>
                      );
                    });
                  })()}
                </svg>
              </div>

              <div className="flex items-center justify-center gap-4 text-xs font-semibold">
                {dados.porTurno.map(turno => (
                  <div key={turno.nome} className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: turno.cor }} />
                    <span className="text-slate-600 dark:text-slate-300">{turno.nome}</span>
                    <span className="font-mono tabular-nums text-slate-900 dark:text-white">{turno.total}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Section: Inteligência Acadêmica e Comportamental */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
            Inteligência Acadêmica e Comportamental
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Top Comportamental */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-amber-600 font-bold text-xs uppercase tracking-wide">
              <span>▲</span> Top Comportamental
            </div>

            <div className="space-y-2.5">
              {dados.topComportamental.length === 0 && vazio('Sem ocorrências de comportamento.')}
              {dados.topComportamental.map(({ aluno, total }) => (
                <div
                  key={aluno.id}
                  className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100/60 dark:border-amber-900/30 flex items-center justify-between"
                >
                  <div>
                    <strong className="block text-xs font-black text-slate-900 dark:text-white">{aluno.nome}</strong>
                    <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold">{aluno.turma_nome}</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-amber-200/60 dark:bg-amber-900/50 text-amber-900 dark:text-amber-200 text-[10px] font-black font-mono tabular-nums">
                    {total} ocor.
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 2: Alerta Acadêmico */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 border-t-4 border-t-red-500 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-red-600 font-bold text-xs uppercase tracking-wide">
              <span>❓</span> Alerta Acadêmico (média abaixo de {formatarMedia(MEDIA_MINIMA)})
            </div>

            <div className="space-y-2.5">
              {dados.alertaAcademico.length === 0 && vazio('Nenhum aluno com média abaixo do mínimo.')}
              {dados.alertaAcademico.map(aluno => (
                <div
                  key={aluno.id}
                  className="p-3 rounded-xl bg-red-50/60 dark:bg-red-950/20 border border-red-100/60 dark:border-red-900/30 flex items-center justify-between"
                >
                  <div>
                    <strong className="block text-xs font-black text-slate-900 dark:text-white">{aluno.nome}</strong>
                    <span className="text-[10px] text-red-700 dark:text-red-400 font-bold">{aluno.turma_nome}</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 text-[10px] font-black font-mono tabular-nums">
                    Média {formatarMedia(aluno.media_geral ?? 0)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 3: Top 3: Alunos Destaque */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 border-t-4 border-t-amber-400 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-amber-600 font-bold text-xs uppercase tracking-wide">
              <span>⭐</span> Top 3: Alunos Destaque
            </div>

            <div className="space-y-2.5">
              {dados.topDestaque.length === 0 && vazio('Nenhum elogio registrado.')}
              {dados.topDestaque.map(({ aluno, total }) => (
                <div
                  key={aluno.id}
                  className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100/60 dark:border-amber-900/30 flex items-center justify-between"
                >
                  <div>
                    <strong className="block text-xs font-black text-slate-900 dark:text-white">{aluno.nome}</strong>
                    <span className="text-[10px] text-slate-500 font-bold">{aluno.turma_nome}</span>
                  </div>
                  <div
                    className="h-6 min-w-6 px-1.5 rounded-full bg-amber-400 text-slate-950 font-black text-[11px] flex items-center gap-0.5 justify-center shadow-sm font-mono tabular-nums"
                    title={`${total} elogio(s)`}
                  >
                    <Star className="w-2.5 h-2.5 fill-slate-950 stroke-none" />
                    {total}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PedagogicoDashboard;
