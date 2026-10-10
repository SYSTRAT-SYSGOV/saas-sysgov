import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { Button, Card, CardContent, StatusChip, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@sysgov/ui';
import { formatarCentavos } from '@/lib/formatacao';
import { situacaoDoFormando } from '../formato';
import type { PropsAba } from '../ModuloFormaturaMain';

/** Turmas formandas do Cadastro Escolar (sem criar/editar aqui), com os participantes de cada uma. */
export const TurmasConsulta: React.FC<PropsAba> = ({ dados }) => {
  const navigate = useNavigate();
  const [aberta, setAberta] = useState<number | null>(null);
  const ids = dados.configuracao?.turmas_ids ?? [];
  const turmas = dados.turmasDoAno.filter((t) => ids.includes(t.id));

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Turmas e alunos são mantidos no Cadastro Escolar.</p>
          <Button variant="outline" leftIcon={<ExternalLink className="h-4 w-4" />} onClick={() => navigate('/escola')}>Abrir Cadastro Escolar</Button>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Turma</TableHead><TableHead>Turno</TableHead><TableHead className="text-right">Alunos</TableHead><TableHead className="text-right">Participantes</TableHead><TableHead className="text-right">Arrecadado</TableHead></TableRow></TableHeader>
          <TableBody>
            {turmas.map((t) => {
              const daTurma = dados.formandos.filter((f) => f.turma_id === t.id);
              const participantes = daTurma.filter((f) => f.participa);
              const expandida = aberta === t.id;
              return (
                <React.Fragment key={t.id}>
                  <TableRow>
                    <TableCell className="font-medium">
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-expanded={expandida}
                        aria-label={`Ver participantes do ${t.nome}`}
                        leftIcon={expandida ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        onClick={() => setAberta(expandida ? null : t.id)}
                      >
                        {t.nome}
                      </Button>
                    </TableCell>
                    <TableCell>{t.turno?.nome ?? '—'}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{daTurma.length}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{participantes.length}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{formatarCentavos(participantes.reduce((s, f) => s + f.total_pago_centavos, 0))}</TableCell>
                  </TableRow>
                  {expandida && (
                    <TableRow>
                      <TableCell colSpan={5} className="bg-muted/40">
                        {participantes.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Nenhum aluno participando nesta turma.</p>
                        ) : (
                          <Table>
                            <TableHeader><TableRow><TableHead>Nº</TableHead><TableHead>Nome</TableHead><TableHead className="text-right">Convidados</TableHead><TableHead className="text-right">Pago</TableHead><TableHead className="text-right">Saldo</TableHead><TableHead>Situação</TableHead></TableRow></TableHeader>
                            <TableBody>
                              {participantes.map((f) => {
                                const s = situacaoDoFormando(f);
                                return (
                                  <TableRow key={f.aluno_id}>
                                    <TableCell className="font-mono tabular-nums">{f.numero ?? '—'}</TableCell>
                                    <TableCell>{f.nome}</TableCell>
                                    <TableCell className="text-right font-mono tabular-nums">{f.convidados}</TableCell>
                                    <TableCell className="text-right font-mono tabular-nums">{formatarCentavos(f.total_pago_centavos)}</TableCell>
                                    <TableCell className="text-right font-mono tabular-nums">{formatarCentavos(f.saldo_devedor_centavos)}</TableCell>
                                    <TableCell><StatusChip label={s.rotulo} variant={s.variante} /></TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
