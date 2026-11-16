import React, { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ColumnDef } from '@tanstack/react-table';
import { Button, Card, DataTable, KpiCard, ScreenState, Select } from '@sysgov/ui';
import { SERIES, parecerApi, type Catalogo, type LinhaConceitos, type Relatorio } from '../api';
import { ALTURA_CONTROLE, BarraFiltros, Carga, useCarga, useParecer } from './comum';

/** Cores de status (atingiu / em processo / não atingiu), sempre com legenda e rótulo. */
const COR = { a: '#168821', ep: '#d97706', na: '#e52207' };
const pct = (n: number, t: number) => (t ? Math.round((1000 * n) / t) / 10 : 0);
const fmtPct = (n: number) => `${n.toFixed(1).replace('.', ',')}%`;

/** Barras empilhadas em 100% (A, EP, NA) com tooltip; a tabela ao lado traz os números. */
const Barras: React.FC<{ linhas: (LinhaConceitos & { rotulo: string })[]; titulo: string }> = ({ linhas, titulo }) => {
  const dados = linhas.map((l) => ({ rotulo: l.rotulo, A: pct(l.a, l.total), EP: pct(l.ep, l.total), NA: pct(l.na, l.total) }));
  return (
    <figure className="space-y-1" aria-label={titulo}>
      <figcaption className="text-sm font-semibold">{titulo}</figcaption>
      <div style={{ height: Math.max(160, 40 * linhas.length + 70) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dados} layout="vertical" margin={{ left: 8, right: 16 }} barCategoryGap={6}>
            <CartesianGrid horizontal={false} strokeOpacity={0.25} />
            <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="rotulo" width={170} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => fmtPct(Number(v))} />
            <Legend />
            <Bar dataKey="A" name="A – Atingiu" stackId="c" fill={COR.a} stroke="var(--background)" strokeWidth={2} />
            <Bar dataKey="EP" name="EP – Em processo" stackId="c" fill={COR.ep} stroke="var(--background)" strokeWidth={2} />
            <Bar dataKey="NA" name="NA – Não atingiu" stackId="c" fill={COR.na} stroke="var(--background)" strokeWidth={2} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
};

type LinhaRotulo = LinhaConceitos & { rotulo: string };
const Num: React.FC<{ children: React.ReactNode }> = ({ children }) => <span className="font-mono tabular-nums">{children}</span>;

/** Colunas da tabela de conceitos (A, EP, NA, total e percentuais); `primeira` nomeia a coluna do rótulo. */
const colunasConceitos = (primeira: string): ColumnDef<LinhaRotulo>[] => [
  { id: 'rotulo', header: primeira, accessorFn: (l) => l.rotulo },
  { id: 'a', header: 'A', accessorFn: (l) => l.a, cell: ({ getValue }) => <Num>{getValue<number>()}</Num> },
  { id: 'ep', header: 'EP', accessorFn: (l) => l.ep, cell: ({ getValue }) => <Num>{getValue<number>()}</Num> },
  { id: 'na', header: 'NA', accessorFn: (l) => l.na, cell: ({ getValue }) => <Num>{getValue<number>()}</Num> },
  { id: 'total', header: 'Total', accessorFn: (l) => l.total, cell: ({ getValue }) => <Num>{getValue<number>()}</Num> },
  { id: 'pa', header: '% A', accessorFn: (l) => pct(l.a, l.total), cell: ({ getValue }) => <Num>{fmtPct(getValue<number>())}</Num> },
  { id: 'pep', header: '% EP', accessorFn: (l) => pct(l.ep, l.total), cell: ({ getValue }) => <Num>{fmtPct(getValue<number>())}</Num> },
  { id: 'pna', header: '% NA', accessorFn: (l) => pct(l.na, l.total), cell: ({ getValue }) => <Num>{fmtPct(getValue<number>())}</Num> },
];
const COLUNAS_SERIE = colunasConceitos('Série');
const COLUNAS_MATERIA = colunasConceitos('Matéria');

const TabelaConceitos: React.FC<{ linhas: LinhaRotulo[]; colunas: ColumnDef<LinhaRotulo>[] }> = ({ linhas, colunas }) => (
  <DataTable columns={colunas} data={linhas} pagination={false} emptyText="Sem avaliações para os filtros escolhidos." />
);

/** % de A por matéria: aluno × turma × série (a coluna da série só existe quando há outra turma na série). */
interface LinhaMateria { materia: string; aluno: number; turma: number | null; serie: number | null; dif: number }
const ComparativoMaterias: React.FC<{ comp: NonNullable<Relatorio['comparativo']>; catalogo: Catalogo }> = ({ comp, catalogo }) => {
  const linhas = React.useMemo<LinhaMateria[]>(
    () =>
      comp.materias.flatMap((m) => {
        const ra = comp.m_aluno[m];
        if (!ra) return [];
        const rt = comp.m_turma[m] ?? { a: 0, ep: 0, na: 0, total: 0 };
        const rs = comp.m_serie[m] ?? { a: 0, ep: 0, na: 0, total: 0 };
        const aluno = pct(ra.a, ra.total);
        return [{ materia: catalogo.materias[m], aluno, turma: rt.total ? pct(rt.a, rt.total) : null, serie: rs.total ? pct(rs.a, rs.total) : null, dif: rt.total ? aluno - pct(rt.a, rt.total) : 0 }];
      }),
    [comp, catalogo],
  );
  const colunas = React.useMemo<ColumnDef<LinhaMateria>[]>(() => {
    const pctCell = ({ getValue }: { getValue: () => unknown }) => {
      const v = getValue() as number | null;
      return <Num>{v === null ? '–' : fmtPct(v)}</Num>;
    };
    return [
      { id: 'materia', header: 'Matéria', accessorFn: (l) => l.materia },
      { id: 'aluno', header: 'Aluno', accessorFn: (l) => l.aluno, cell: ({ getValue }) => <span className="font-mono font-semibold tabular-nums">{fmtPct(getValue<number>())}</span> },
      { id: 'turma', header: 'Turma', accessorFn: (l) => l.turma ?? -1, cell: ({ row }) => pctCell({ getValue: () => row.original.turma }) },
      ...(comp.outras > 0 ? [{ id: 'serie', header: 'Série', accessorFn: (l: LinhaMateria) => l.serie ?? -1, cell: ({ row }: { row: { original: LinhaMateria } }) => pctCell({ getValue: () => row.original.serie }) }] : []),
      {
        id: 'situacao',
        header: 'Situação do aluno',
        accessorFn: (l) => l.dif,
        cell: ({ row }) => {
          const dif = row.original.dif;
          return (
            <span>
              {dif >= 5 ? '▲ acima da turma' : dif <= -5 ? '▼ abaixo da turma' : '● na média da turma'}{' '}
              <small className="font-mono">
                ({dif > 0 ? '+' : ''}
                {dif.toFixed(1).replace('.', ',')} p.p.)
              </small>
            </span>
          );
        },
      },
    ];
  }, [comp.outras]);
  return <DataTable columns={colunas} data={linhas} pagination={false} />;
};

/** Relação de alunos com A/EP/NA; o nome abre o comparativo com a turma e a série. Busca e exportação pelo padrão da grade. */
const RelacaoAlunos: React.FC<{ alunos: Relatorio['por_aluno']; onAbrir: (alunoId: number) => void }> = ({ alunos, onAbrir }) => {
  const colunas = React.useMemo<ColumnDef<Relatorio['por_aluno'][number]>[]>(
    () => [
      {
        id: 'aluno',
        header: 'Aluno',
        accessorFn: (a) => a.nome,
        cell: ({ row }) => (
          <Button variant="link" size="xs" onClick={() => onAbrir(row.original.aluno_id)}>
            {row.original.nome}
          </Button>
        ),
      },
      { id: 'serie', header: 'Série', accessorFn: (a) => a.serie },
      { id: 'turma', header: 'Turma', accessorFn: (a) => a.turma },
      { id: 'turno', header: 'Turno', accessorFn: (a) => a.turno ?? '—' },
      { id: 'a', header: 'A', accessorFn: (a) => a.a, cell: ({ getValue }) => <Num>{getValue<number>()}</Num> },
      { id: 'ep', header: 'EP', accessorFn: (a) => a.ep, cell: ({ getValue }) => <Num>{getValue<number>()}</Num> },
      { id: 'na', header: 'NA', accessorFn: (a) => a.na, cell: ({ getValue }) => <Num>{getValue<number>()}</Num> },
      { id: 'pa', header: '% A', accessorFn: (a) => pct(a.a, a.total), cell: ({ getValue }) => <Num>{fmtPct(getValue<number>())}</Num> },
    ],
    [onAbrir],
  );
  return (
    <DataTable
      columns={colunas}
      data={alunos}
      searchable
      searchPlaceholder="Buscar aluno, turma…"
      exportable
      exportFileName="parecer-relatorio-alunos"
      exportTitle="Parecer Descritivo — relação de alunos"
      pageSize={20}
      emptyText="Nenhum aluno com avaliações para os filtros escolhidos."
    />
  );
};

/** Relatórios (relatorios.php): distribuição A/EP/NA e comparativo do aluno com a turma e a série. */
const Relatorios: React.FC = () => {
  const { ano, catalogo } = useParecer();
  const [f, setF] = useState({ tri: 0, serie: 0, turma: 0, materia: '', aluno: 0 });
  const carga = useCarga(() => parecerApi.relatorio({ ano, ...f }), [ano, f.tri, f.serie, f.turma, f.materia, f.aluno]);

  return (
    <Carga carga={carga}>
      {(r: Relatorio) => {
        const tot = r.geral.total;
        const comp = r.comparativo;
        return (
          <div className="space-y-5">
            <BarraFiltros>
              <Filtro rotulo="Trimestre" valor={f.tri} onChange={(v) => setF({ ...f, tri: Number(v) })} opcoes={[[0, 'Todos'], [1, '1º trimestre'], [2, '2º trimestre'], [3, '3º trimestre']]} />
              <Filtro rotulo="Série" valor={f.serie} onChange={(v) => setF({ ...f, serie: Number(v), turma: 0 })} opcoes={[[0, 'Todas'], ...Object.entries(SERIES).map(([s, rot]) => [Number(s), rot] as [number, string])]} />
              <Filtro
                rotulo="Turma"
                valor={f.turma}
                onChange={(v) => setF({ ...f, turma: Number(v) })}
                opcoes={[[0, 'Todas'], ...r.turmas.filter((t) => !f.serie || t.serie === f.serie).map((t) => [t.turma_id, `${SERIES[t.serie]} · ${t.nome} (${t.turno ?? '—'})`] as [number, string])]}
              />
              <Filtro rotulo="Matéria" valor={f.materia} onChange={(v) => setF({ ...f, materia: v })} opcoes={[['', 'Todas'], ...r.materias_visiveis.map((m) => [m, catalogo.materias[m]] as [string, string])]} />
              <Button variant="outline" className={ALTURA_CONTROLE} onClick={() => setF({ tri: 0, serie: 0, turma: 0, materia: '', aluno: 0 })}>
                Limpar filtros
              </Button>
            </BarraFiltros>

            {comp && (
              <Card className="space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-semibold">Comparativo: {comp.aluno.nome}</h2>
                    <p className="text-sm text-muted-foreground">
                      {comp.aluno.serie} · {comp.aluno.turma} ({comp.aluno.turno}) · {f.tri ? `${f.tri}º trimestre` : 'todos os trimestres'}.{' '}
                      {comp.outras ? 'Comparado com a própria turma e com as outras turmas da mesma série.' : 'A escola não tem outra turma desta série; comparado só com a própria turma.'}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setF({ ...f, aluno: 0 })}>
                    ✕ Fechar comparativo
                  </Button>
                </div>
                {comp.linhas[0].total === 0 ? (
                  <ScreenState type="empty" title="Este aluno ainda não tem avaliações para os filtros escolhidos." />
                ) : (
                  <>
                    <Barras titulo="Aluno × turma × série" linhas={comp.linhas} />
                    <h3 className="font-semibold">% de A (Atingiu) por matéria</h3>
                    <ComparativoMaterias comp={comp} catalogo={catalogo} />
                  </>
                )}
              </Card>
            )}

            {tot === 0 ? (
              <ScreenState type="empty" title="Nenhuma avaliação lançada para os filtros escolhidos." />
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <KpiCard title="Avaliações" value={String(tot)} />
                  <KpiCard title="A – Atingiu" value={fmtPct(pct(r.geral.a, tot))} subtitle={`${r.geral.a} avaliações`} valueClassName="text-emerald-700 dark:text-emerald-400" />
                  <KpiCard title="EP – Em processo" value={fmtPct(pct(r.geral.ep, tot))} subtitle={`${r.geral.ep} avaliações`} valueClassName="text-amber-700 dark:text-amber-400" />
                  <KpiCard title="NA – Não atingiu" value={fmtPct(pct(r.geral.na, tot))} subtitle={`${r.geral.na} avaliações`} valueClassName="text-rose-700 dark:text-rose-400" />
                </div>
                <div className="grid gap-5 lg:grid-cols-2">
                  <Card className="p-4">
                    <Barras titulo="Comparação entre séries" linhas={r.por_serie} />
                  </Card>
                  <Card className="p-4">
                    <Barras titulo="Por matéria" linhas={r.por_materia} />
                  </Card>
                </div>
                <Card className="p-4">
                  <Barras titulo="Por turma" linhas={r.por_turma} />
                </Card>
                <h2 className="text-lg font-semibold">Comparação entre séries (tabela)</h2>
                <TabelaConceitos linhas={r.por_serie} colunas={COLUNAS_SERIE} />
                <h2 className="text-lg font-semibold">Por matéria (tabela)</h2>
                <TabelaConceitos linhas={r.por_materia} colunas={COLUNAS_MATERIA} />
                <h2 className="text-lg font-semibold">Relação de alunos</h2>
                <p className="text-sm text-muted-foreground">Clique no nome do aluno para ver o comparativo com a turma e com as outras turmas da série.</p>
                <RelacaoAlunos alunos={r.por_aluno} onAbrir={(aluno) => setF((atual) => ({ ...atual, aluno }))} />
              </>
            )}
          </div>
        );
      }}
    </Carga>
  );
};

function Filtro<T extends string | number>({ rotulo, valor, onChange, opcoes }: { rotulo: string; valor: T; onChange: (v: string) => void; opcoes: [T, string][] }): React.ReactElement {
  return (
    <div>
      <Select label={rotulo} value={valor} onChange={onChange} options={opcoes.map(([v, l]) => ({ value: v, label: l }))} />
    </div>
  );
}

export default Relatorios;
