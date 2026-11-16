import React from 'react';
import { Badge, Button, Card, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@sysgov/ui';
import { SERIES, dataBr, parecerApi } from '../api';
import { AbasTurma, BotaoWhats, Carga, FotoAluno, corTurno, useCarga, useParecer } from './comum';

/** Alunos da turma com o progresso da avaliação (alunos.php). O cadastro dos alunos fica no Cadastro Escolar. */
const TurmaAlunos: React.FC<{ turmaId: number }> = ({ turmaId }) => {
  const { ir, imprimir } = useParecer();
  const carga = useCarga(() => parecerApi.alunos(turmaId), [turmaId]);

  return (
    <Carga carga={carga}>
      {(d) => {
        const ativos = d.alunos.filter((a) => a.situacao === 'ativo');
        const tot = d.habilidades_por_trimestre;
        return (
          <div className="space-y-4">
            <Card className="border-l-4 p-4" style={{ borderLeftColor: corTurno(d.turma.turno) }}>
              <div className="text-lg font-semibold">
                {SERIES[d.turma.serie]} · {d.turma.nome}
              </div>
              <div className="text-sm text-muted-foreground">
                {d.turma.turno} · <span className="font-mono tabular-nums">{d.alunos.length}</span> aluno{d.alunos.length === 1 ? '' : 's'}
              </div>
            </Card>
            <div className="flex flex-wrap gap-2 print:hidden">
              <Button variant="outline" size="sm" onClick={() => ir({ aba: 'inicio', turno: d.turma.turno ?? undefined })}>
                ← Escolher outra turma
              </Button>
              {ativos[0] && (
                <Button size="sm" onClick={() => ir({ aba: 'inicio', tela: 'avaliar', alunoId: ativos[0].id, turmaId })}>
                  ✎ Avaliar
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => imprimir({ turmaId })}>
                🖨 Imprimir todos os pareceres
              </Button>
            </div>
            <AbasTurma turma={{ id: d.turma.id, nome: d.turma.nome, serie: d.turma.serie, turno: d.turma.turno }} atual="alunos" />
            <p className="text-sm text-muted-foreground">
              Habilidades por trimestre: <span className="font-mono tabular-nums">{tot['1']} / {tot['2']} / {tot['3']}</span>. Para incluir, editar ou importar alunos, use o Cadastro Escolar.
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12" />
                  <TableHead className="text-right">Nº</TableHead>
                  <TableHead>Aluno</TableHead>
                  <TableHead>CGM</TableHead>
                  <TableHead>Nascimento</TableHead>
                  <TableHead>Situação</TableHead>
                  {(['1', '2', '3'] as const).map((t) => (
                    <TableHead key={t} className="text-right">
                      {t}º tri
                    </TableHead>
                  ))}
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {d.alunos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground">
                      Nenhum aluno nesta turma.
                    </TableCell>
                  </TableRow>
                )}
                {d.alunos.map((a) => (
                  <TableRow key={a.id} className={a.situacao !== 'ativo' ? 'opacity-60' : undefined}>
                    <TableCell>
                      <FotoAluno id={a.id} nome={a.nome} temFoto={a.tem_foto} tamanho="h-8 w-8" />
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{a.numero ?? ''}</TableCell>
                    <TableCell>{a.nome}</TableCell>
                    <TableCell className="font-mono tabular-nums">{a.cgm ?? ''}</TableCell>
                    <TableCell className="font-mono tabular-nums">{a.nascimento ? dataBr(a.nascimento) : ''}</TableCell>
                    <TableCell>
                      <Badge variant={a.situacao === 'ativo' ? 'success' : 'neutral'}>{a.situacao}</Badge>
                    </TableCell>
                    {(['1', '2', '3'] as const).map((t) => (
                      <TableCell key={t} className={`text-right font-mono tabular-nums ${tot[t] && a.progresso[t] >= tot[t] ? 'font-semibold text-emerald-600 dark:text-emerald-400' : ''}`}>
                        {a.progresso[t]}/{tot[t]}
                      </TableCell>
                    ))}
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1">
                        <Button variant="link" size="xs" onClick={() => ir({ aba: 'inicio', tela: 'avaliar', alunoId: a.id, turmaId })}>
                          Avaliar
                        </Button>
                        <Button variant="link" size="xs" onClick={() => imprimir({ alunoId: a.id })}>
                          Imprimir
                        </Button>
                        <Button variant="link" size="xs" onClick={() => ir({ aba: 'ocorrencias', alunoId: a.id, turmaId })}>
                          Ocorrências
                        </Button>
                        <BotaoWhats tel={a.celular} rotulo="WhatsApp" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        );
      }}
    </Carga>
  );
};

export default TurmaAlunos;
