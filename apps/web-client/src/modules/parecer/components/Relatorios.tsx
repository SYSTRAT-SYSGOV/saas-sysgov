import React, { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button, Card, KpiCard, ScreenState, Select, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@sysgov/ui';
import { SERIES, parecerApi, type LinhaConceitos, type Relatorio } from '../api';
import { Carga, useCarga, useParecer } from './comum';

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

const TabelaConceitos: React.FC<{ linhas: (LinhaConceitos & { rotulo: string })[]; primeira: string }> = ({ linhas, primeira }) => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>{primeira}</TableHead>
        {['A', 'EP', 'NA', 'Total', '% A', '% EP', '% NA'].map((h) => (
          <TableHead key={h} className="text-right">
            {h}
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
    <TableBody>
      {linhas.map((l) => (
        <TableRow key={l.rotulo}>
          <TableCell>{l.rotulo}</TableCell>
          {[l.a, l.ep, l.na, l.total].map((n, i) => (
            <TableCell key={i} className="text-right font-mono tabular-nums">
              {n}
            </TableCell>
          ))}
          {[l.a, l.ep, l.na].map((n, i) => (
            <TableCell key={`p${i}`} className="text-right font-mono tabular-nums">
              {fmtPct(pct(n, l.total))}
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

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
            <Card className="flex flex-wrap items-end gap-3 p-4">
              <Filtro rotulo="Trimestre" valor={f.tri} onChange={(v) => setF({ ...f, tri: Number(v) })} opcoes={[[0, 'Todos'], [1, '1º trimestre'], [2, '2º trimestre'], [3, '3º trimestre']]} />
              <Filtro rotulo="Série" valor={f.serie} onChange={(v) => setF({ ...f, serie: Number(v), turma: 0 })} opcoes={[[0, 'Todas'], ...Object.entries(SERIES).map(([s, rot]) => [Number(s), rot] as [number, string])]} />
              <Filtro
                rotulo="Turma"
                valor={f.turma}
                onChange={(v) => setF({ ...f, turma: Number(v) })}
                opcoes={[[0, 'Todas'], ...r.turmas.filter((t) => !f.serie || t.serie === f.serie).map((t) => [t.turma_id, `${SERIES[t.serie]} · ${t.nome} (${t.turno ?? '—'})`] as [number, string])]}
              />
              <Filtro rotulo="Matéria" valor={f.materia} onChange={(v) => setF({ ...f, materia: v })} opcoes={[['', 'Todas'], ...r.materias_visiveis.map((m) => [m, catalogo.materias[m]] as [string, string])]} />
              <Button variant="outline" size="sm" onClick={() => setF({ tri: 0, serie: 0, turma: 0, materia: '', aluno: 0 })}>
                Limpar filtros
              </Button>
            </Card>

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
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Matéria</TableHead>
                          <TableHead className="text-right">Aluno</TableHead>
                          <TableHead className="text-right">Turma</TableHead>
                          {comp.outras > 0 && <TableHead className="text-right">Série</TableHead>}
                          <TableHead>Situação do aluno</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {comp.materias.map((m) => {
                          const ra = comp.m_aluno[m];
                          if (!ra) return null;
                          const rt = comp.m_turma[m] ?? { a: 0, ep: 0, na: 0, total: 0 };
                          const rs = comp.m_serie[m] ?? { a: 0, ep: 0, na: 0, total: 0 };
                          const dif = rt.total ? pct(ra.a, ra.total) - pct(rt.a, rt.total) : 0;
                          return (
                            <TableRow key={m}>
                              <TableCell>{catalogo.materias[m]}</TableCell>
                              <TableCell className="text-right font-mono font-semibold tabular-nums">{fmtPct(pct(ra.a, ra.total))}</TableCell>
                              <TableCell className="text-right font-mono tabular-nums">{rt.total ? fmtPct(pct(rt.a, rt.total)) : '–'}</TableCell>
                              {comp.outras > 0 && <TableCell className="text-right font-mono tabular-nums">{rs.total ? fmtPct(pct(rs.a, rs.total)) : '–'}</TableCell>}
                              <TableCell>
                                {dif >= 5 ? '▲ acima da turma' : dif <= -5 ? '▼ abaixo da turma' : '● na média da turma'}{' '}
                                <small className="font-mono">
                                  ({dif > 0 ? '+' : ''}
                                  {dif.toFixed(1).replace('.', ',')} p.p.)
                                </small>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
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
                <TabelaConceitos linhas={r.por_serie} primeira="Série" />
                <h2 className="text-lg font-semibold">Por matéria (tabela)</h2>
                <TabelaConceitos linhas={r.por_materia} primeira="Matéria" />
                <h2 className="text-lg font-semibold">Relação de alunos</h2>
                <p className="text-sm text-muted-foreground">Clique no nome do aluno para ver o comparativo com a turma e com as outras turmas da série.</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Aluno</TableHead>
                      <TableHead>Série</TableHead>
                      <TableHead>Turma</TableHead>
                      <TableHead>Turno</TableHead>
                      {['A', 'EP', 'NA', '% A'].map((h) => (
                        <TableHead key={h} className="text-right">
                          {h}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {r.por_aluno.map((a) => (
                      <TableRow key={a.aluno_id}>
                        <TableCell>
                          <Button variant="link" size="xs" onClick={() => setF({ ...f, aluno: a.aluno_id })}>
                            {a.nome}
                          </Button>
                        </TableCell>
                        <TableCell>{a.serie}</TableCell>
                        <TableCell>{a.turma}</TableCell>
                        <TableCell>{a.turno}</TableCell>
                        {[a.a, a.ep, a.na].map((n, i) => (
                          <TableCell key={i} className="text-right font-mono tabular-nums">
                            {n}
                          </TableCell>
                        ))}
                        <TableCell className="text-right font-mono tabular-nums">{fmtPct(pct(a.a, a.total))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
    <div className="w-48">
      <Select label={rotulo} value={valor} onChange={onChange} options={opcoes.map(([v, l]) => ({ value: v, label: l }))} />
    </div>
  );
}

export default Relatorios;
