import React, { useEffect, useMemo, useState } from 'react';
import { Award, BookOpen, FileStack, TrendingDown } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, KpiCard, Skeleton } from '@sysgov/ui';
import { portfolioApi, type Desempenho, type Periodo } from '../api';
import { dadosGraficos, formatarAvaliacao } from '../formato';

// Tokens do tema GOV.BR do Painel do Cliente (index.css) — nada de cor fixa no componente.
const CORES = ['var(--color-gov-primary)', 'var(--color-gov-accent-cyan)', 'var(--color-gov-accent-indigo)', 'var(--color-gov-accent-gold)', 'var(--color-gov-accent-yellow)'];

export const PainelDesempenho: React.FC<{ alunoId: number; periodo: Periodo }> = ({ alunoId, periodo }) => {
  const [d, setD] = useState<Desempenho | null>(null);

  useEffect(() => {
    let ativo = true;
    setD(null);
    portfolioApi.desempenho(alunoId, periodo)
      .then((r) => { if (ativo) setD(r); })
      .catch(() => { if (ativo) setD({ total: 0, media: null, por_materia: [], por_trimestre: null }); });
    return () => { ativo = false; };
  }, [alunoId, periodo]);

  const g = useMemo(() => (d ? dadosGraficos(d) : null), [d]);
  if (!d || !g) return <Skeleton className="h-64 w-full mt-3" />;
  if (d.total === 0) return <p className="text-sm text-muted-foreground pt-3">Nenhum trabalho no período.</p>;

  const ordenadas = [...g.barras].sort((a, b) => b.media - a.media);
  const melhor = ordenadas[0];
  const pior = ordenadas[ordenadas.length - 1];

  return (
    <div className="flex flex-col gap-4 pt-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Trabalhos" value={d.total} icon={<FileStack className="h-4 w-4" />} />
        <KpiCard title="Média geral" value={formatarAvaliacao(d.media)} icon={<BookOpen className="h-4 w-4" />} />
        <KpiCard title="Melhor matéria" value={melhor?.materia ?? '—'} subtitle={melhor ? `média ${formatarAvaliacao(melhor.media)}` : undefined} icon={<Award className="h-4 w-4" />} />
        <KpiCard title="A melhorar" value={pior?.materia ?? '—'} subtitle={pior ? `média ${formatarAvaliacao(pior.media)}` : undefined} icon={<TrendingDown className="h-4 w-4" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm">Média por matéria</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer>
              <BarChart data={g.barras}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="materia" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatarAvaliacao(Number(v))} />
                <Bar dataKey="media" fill={CORES[0]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Trabalhos por matéria</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={g.rosca} dataKey="quantidade" nameKey="materia" innerRadius={50} outerRadius={85} label>
                  {g.rosca.map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {g.linha.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Evolução por trimestre</CardTitle></CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer>
              <LineChart data={g.linha}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="trimestre" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatarAvaliacao(Number(v))} />
                <Line type="monotone" dataKey="media" stroke={CORES[1]} strokeWidth={2} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
