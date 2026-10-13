import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckSquare, ChevronDown, ChevronRight, ExternalLink, School, XSquare } from 'lucide-react';
import { Button, Card, CardContent, StatusChip, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@sysgov/ui';
import { EmptyState } from '@/components/ui';
import { erroApi, type Turma } from '../../escola/api';
import { ConfirmarModal } from '../../escola/components/ConfirmarModal';
import { passeioApi } from '../api';
import type { PropsAba } from '../ModuloPasseioMain';

/**
 * Turmas do Cadastro Escolar no ano letivo do passeio (sem criar/editar aqui): inscritos por turma e
 * marcar/desmarcar a turma inteira numa só operação (D18).
 */
export const TurmasPasseio: React.FC<PropsAba> = ({ ativo, dados, recarregar, avisar, permissoes }) => {
  const navigate = useNavigate();
  const [aberta, setAberta] = useState<number | null>(null);
  const [lote, setLote] = useState<{ turma: Turma; vai: boolean } | null>(null);
  const ano = ativo.data_passeio.slice(0, 4);

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-muted-foreground">Turmas e alunos de <span className="font-mono tabular-nums">{ano}</span> são mantidos no Cadastro Escolar. Transferidos não participam.</p>
          <Button variant="outline" leftIcon={<ExternalLink className="h-4 w-4" />} onClick={() => navigate('/escola')}>Abrir Cadastro Escolar</Button>
        </div>
        {dados.turmas.length === 0 ? (
          <EmptyState icon={<School className="h-8 w-8" />} title={`Nenhuma turma em ${ano}`} description="Cadastre as turmas do ano letivo do passeio no Cadastro Escolar." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Turma</TableHead><TableHead>Turno</TableHead><TableHead className="text-right">Alunos</TableHead>
                <TableHead className="text-right">Vão</TableHead><TableHead className="text-right">Termos</TableHead><TableHead className="text-right">Pagos</TableHead>
                {permissoes.passeios && <TableHead className="text-right">Turma inteira</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {dados.turmas.map((t) => {
                const daTurma = dados.inscricoes.filter((i) => i.aluno?.turma_id === t.id);
                const vao = daTurma.filter((i) => i.vai);
                const expandida = aberta === t.id;
                return (
                  <React.Fragment key={t.id}>
                    <TableRow>
                      <TableCell className="font-medium">
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-expanded={expandida}
                          aria-label={`Ver inscritos do ${t.nome}`}
                          leftIcon={expandida ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          onClick={() => setAberta(expandida ? null : t.id)}
                        >
                          {t.nome}
                        </Button>
                      </TableCell>
                      <TableCell>{t.turno?.nome ?? '—'}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{t.total_alunos ?? '—'}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{vao.length}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{vao.filter((i) => i.autorizacao_entregue).length}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{vao.filter((i) => i.pago).length}</TableCell>
                      {permissoes.passeios && (
                        <TableCell className="whitespace-nowrap text-right">
                          <Button size="sm" variant="outline" leftIcon={<CheckSquare className="h-4 w-4" />} onClick={() => setLote({ turma: t, vai: true })} aria-label={`Marcar toda a turma ${t.nome}`}>Marcar</Button>{' '}
                          <Button size="sm" variant="outline" leftIcon={<XSquare className="h-4 w-4" />} onClick={() => setLote({ turma: t, vai: false })} disabled={vao.length === 0} aria-label={`Desmarcar toda a turma ${t.nome}`}>Desmarcar</Button>
                        </TableCell>
                      )}
                    </TableRow>
                    {expandida && (
                      <TableRow>
                        <TableCell colSpan={permissoes.passeios ? 7 : 6} className="bg-muted/40">
                          {daTurma.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Nenhum aluno desta turma inscrito.</p>
                          ) : (
                            <ul className="grid gap-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
                              {daTurma.map((i) => (
                                <li key={i.id} className="flex items-center gap-2">
                                  <StatusChip label={i.vai ? 'Vai' : 'Não vai'} variant={i.vai ? 'success' : 'neutral'} />
                                  {i.aluno?.nome}
                                </li>
                              ))}
                            </ul>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <ConfirmarModal
        aberto={lote !== null}
        titulo={lote?.vai ? 'Marcar a turma inteira' : 'Desmarcar a turma inteira'}
        mensagem={lote?.vai
          ? <>Todos os alunos da turma <strong>{lote.turma.nome}</strong> (menos os transferidos) passam a ir ao passeio; quem não estava inscrito é inscrito.</>
          : <>Todos os alunos da turma <strong>{lote?.turma.nome}</strong> deixam de ir ao passeio e perdem o assento marcado. As outras turmas não mudam.</>}
        rotuloConfirmar={lote?.vai ? 'Marcar' : 'Desmarcar'}
        perigo={lote?.vai === false}
        onFechar={() => setLote(null)}
        onConfirmar={async () => {
          if (!lote) return;
          try {
            const r = await passeioApi.inscricoesEmLote(ativo.id, lote.turma.id, lote.vai);
            avisar({ type: 'success', title: 'Turma atualizada', message: `${lote.turma.nome}: ${r.afetadas} aluno(s) ${lote.vai ? 'marcados' : 'desmarcados'}.` });
            await recarregar();
          } catch (e) {
            avisar({ type: 'error', title: 'Não foi possível atualizar a turma', message: erroApi(e).mensagem });
          }
        }}
      />
    </Card>
  );
};
