import React, { useEffect, useMemo, useState } from 'react';
import { ClipboardCheck, Download, MessageSquare, Search, Trash2, UserPlus } from 'lucide-react';
import { Button, Card, CardContent, Input, Modal, Select, StatusChip, Switch, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Textarea } from '@sysgov/ui';
import { EmptyState } from '@/components/ui';
import { escolaApi, erroApi, type Aluno } from '../../escola/api';
import { ConfirmarModal } from '../../escola/components/ConfirmarModal';
import { passeioApi, type AlteracaoInscricao, type Inscricao } from '../api';
import { FILTRO_INICIAL, csvInscricoes, filtrarInscricoes, listaDaTurma, naoInscrito, type FiltroInscricoes } from '../formato';
import type { PropsAba } from '../ModuloPasseioMain';

const sim = (v: boolean, rotuloSim: string, rotuloNao: string) => <StatusChip label={v ? rotuloSim : rotuloNao} variant={v ? 'success' : 'neutral'} />;

/**
 * Alunos inscritos no passeio ativo: vai, termo entregue e pago; inscrição de aluno ou turma. Com uma turma
 * escolhida, a lista traz a turma inteira e marcar "Vai" inscreve o aluno. Termo e pagamento só para quem vai.
 */
export const InscricoesTermos: React.FC<PropsAba> = ({ ativo, dados, recarregar, avisar, permissoes }) => {
  const [filtro, setFiltro] = useState<FiltroInscricoes>(FILTRO_INICIAL);
  const [salvando, setSalvando] = useState<number | null>(null);
  const [inscrever, setInscrever] = useState(false);
  const [observacao, setObservacao] = useState<Inscricao | null>(null);
  const [remover, setRemover] = useState<Inscricao | null>(null);

  const [alunosDaTurma, setAlunosDaTurma] = useState<{ turmaId: number; alunos: Aluno[] } | null>(null);

  useEffect(() => {
    const turmaId = filtro.turmaId;
    if (turmaId === null) return;
    let cancelado = false;
    escolaApi.todosAlunos({ turma_id: turmaId })
      .then((alunos) => !cancelado && setAlunosDaTurma({ turmaId, alunos }))
      .catch((e) => !cancelado && avisar({ type: 'error', title: 'Não foi possível carregar a turma', message: erroApi(e).mensagem }));
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtro.turmaId]);

  const turmaAberta = filtro.turmaId !== null && alunosDaTurma?.turmaId === filtro.turmaId ? dados.turmas.find((t) => t.id === filtro.turmaId) : undefined;
  const linhas = useMemo(
    () => (turmaAberta && alunosDaTurma ? listaDaTurma(dados.inscricoes, alunosDaTurma.alunos, turmaAberta, ativo.id) : dados.inscricoes),
    [turmaAberta, alunosDaTurma, dados.inscricoes, ativo.id],
  );
  const visiveis = useMemo(() => filtrarInscricoes(linhas, filtro), [linhas, filtro]);
  const definir = <K extends keyof FiltroInscricoes>(k: K, v: FiltroInscricoes[K]) => setFiltro((f) => ({ ...f, [k]: v }));

  const alterar = async (i: Inscricao, mudanca: AlteracaoInscricao) => {
    setSalvando(i.id);
    try {
      // Aluno da turma ainda sem inscrição: marcar "Vai" inscreve.
      if (naoInscrito(i)) await passeioApi.inscreverAluno(ativo.id, i.aluno_id);
      else await passeioApi.atualizarInscricao(i.id, mudanca);
      await recarregar();
    } catch (e) {
      avisar({ type: 'error', title: 'Não foi possível alterar', message: erroApi(e).mensagem });
    } finally {
      setSalvando(null);
    }
  };

  const exportar = () => {
    const url = URL.createObjectURL(new Blob([csvInscricoes(visiveis)], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `inscricoes-${ativo.data_passeio}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="grid gap-2 md:grid-cols-[1fr_12rem_10rem_10rem_10rem]">
          <Input label="Buscar" placeholder="Nome do aluno ou turma" value={filtro.busca} onChange={(e) => definir('busca', e.target.value)} leftIcon={<Search className="h-4 w-4" />} />
          <Select label="Turma" value={filtro.turmaId ?? 'todas'} onChange={(v) => definir('turmaId', v === 'todas' ? null : Number(v))} options={[{ value: 'todas', label: 'Todas' }, ...dados.turmas.map((t) => ({ value: t.id, label: t.nome }))]} />
          <Select label="Vai" value={filtro.participacao} onChange={(v) => definir('participacao', v as FiltroInscricoes['participacao'])} options={[{ value: 'todos', label: 'Todos' }, { value: 'vai', label: 'Vai' }, { value: 'nao_vai', label: 'Não vai' }]} />
          <Select label="Termo" value={filtro.termo} onChange={(v) => definir('termo', v as FiltroInscricoes['termo'])} options={[{ value: 'todos', label: 'Todos' }, { value: 'entregue', label: 'Entregue' }, { value: 'pendente', label: 'Pendente' }]} />
          <Select label="Pagamento" value={filtro.pagamento} onChange={(v) => definir('pagamento', v as FiltroInscricoes['pagamento'])} options={[{ value: 'todos', label: 'Todos' }, { value: 'pago', label: 'Pago' }, { value: 'pendente', label: 'Pendente' }]} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            <span className="font-mono tabular-nums">{visiveis.length}</span> de <span className="font-mono tabular-nums">{linhas.length}</span> {turmaAberta ? `alunos da turma ${turmaAberta.nome}` : 'inscrições'}
            {!turmaAberta && permissoes.passeios && ' · escolha uma turma para ver todos os alunos dela e marcar quem vai'}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" leftIcon={<Download className="h-4 w-4" />} onClick={exportar} disabled={visiveis.length === 0}>Exportar CSV</Button>
            {permissoes.passeios && <Button leftIcon={<UserPlus className="h-4 w-4" />} onClick={() => setInscrever(true)}>Inscrever</Button>}
          </div>
        </div>

        {visiveis.length === 0 ? (
          <EmptyState icon={<ClipboardCheck className="h-8 w-8" />} title={linhas.length === 0 ? 'Nenhum aluno inscrito' : 'Nenhuma inscrição encontrada'} description={linhas.length === 0 ? 'Inscreva uma turma inteira ou alunos avulsos do Cadastro Escolar.' : 'Ajuste os filtros.'} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº</TableHead><TableHead>Aluno</TableHead><TableHead>Turma</TableHead><TableHead>Telefone</TableHead>
                <TableHead>Vai</TableHead><TableHead>Termo</TableHead><TableHead>Pago</TableHead><TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visiveis.map((i) => {
                const nome = i.aluno?.nome ?? 'Aluno';
                const transferido = i.aluno?.situacao === 'transferido';
                const ocupado = salvando === i.id;
                // Quem não vai não recebe termo nem pagamento (só pode desmarcar o que já estava marcado).
                const semTermo = !i.vai && !i.autorizacao_entregue;
                const semPagamento = !i.vai && !i.pago;
                return (
                  <TableRow key={i.id}>
                    <TableCell className="font-mono tabular-nums">{i.aluno?.numero ?? '—'}</TableCell>
                    <TableCell>
                      <span className="font-medium">{nome}</span>
                      {transferido && <StatusChip label="Transferido" variant="danger" className="ml-2" />}
                      {i.observacao && <p className="text-xs text-muted-foreground">{i.observacao}</p>}
                    </TableCell>
                    <TableCell>{i.aluno?.turma?.nome ?? '—'}</TableCell>
                    <TableCell className="font-mono tabular-nums">{i.aluno?.telefone ?? '—'}</TableCell>
                    {permissoes.passeios ? (
                      <>
                        <TableCell><Switch checked={i.vai} disabled={ocupado || (transferido && !i.vai)} onCheckedChange={(v) => void alterar(i, { vai: v })} label={`${nome} vai ao passeio`} /></TableCell>
                        <TableCell><Switch checked={i.autorizacao_entregue} disabled={ocupado || semTermo} onCheckedChange={(v) => void alterar(i, { autorizacao_entregue: v })} label={`Termo de ${nome} entregue`} /></TableCell>
                        <TableCell><Switch checked={i.pago} disabled={ocupado || semPagamento} onCheckedChange={(v) => void alterar(i, { pago: v })} label={`${nome} pagou`} /></TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell>{sim(i.vai, 'Vai', 'Não vai')}</TableCell>
                        <TableCell>{sim(i.autorizacao_entregue, 'Entregue', 'Pendente')}</TableCell>
                        <TableCell>{sim(i.pago, 'Pago', 'Pendente')}</TableCell>
                      </>
                    )}
                    <TableCell className="whitespace-nowrap text-right">
                      {permissoes.passeios && !naoInscrito(i) && (
                        <>
                          <Button size="icon-sm" variant="ghost" aria-label={`Observação de ${nome}`} onClick={() => setObservacao(i)}><MessageSquare /></Button>
                          <Button size="icon-sm" variant="ghost" aria-label={`Remover ${nome} do passeio`} onClick={() => setRemover(i)}><Trash2 /></Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <InscreverModal aberto={inscrever} {...{ ativo, dados, avisar, recarregar }} onFechar={() => setInscrever(false)} />
      <ObservacaoModal inscricao={observacao} onFechar={() => setObservacao(null)} onSalvar={async (texto) => { if (observacao) await alterar(observacao, { observacao: texto || null }); setObservacao(null); }} />
      <ConfirmarModal
        aberto={remover !== null}
        titulo="Remover do passeio"
        mensagem={<>Remover <strong>{remover?.aluno?.nome}</strong> do passeio? O assento dele, se houver, fica livre. Para só marcar que não vai, use a chave "Vai".</>}
        rotuloConfirmar="Remover"
        perigo
        onFechar={() => setRemover(null)}
        onConfirmar={async () => {
          if (!remover) return;
          try {
            await passeioApi.excluirInscricao(remover.id);
            await recarregar();
          } catch (e) {
            avisar({ type: 'error', title: 'Não foi possível remover', message: erroApi(e).mensagem });
          }
        }}
      />
    </Card>
  );
};

/** Inscreve a turma inteira (sem transferidos) ou um aluno avulso do Cadastro Escolar. */
const InscreverModal: React.FC<Pick<PropsAba, 'ativo' | 'dados' | 'avisar' | 'recarregar'> & { aberto: boolean; onFechar: () => void }> = ({ aberto, ativo, dados, avisar, recarregar, onFechar }) => {
  const [turmaId, setTurmaId] = useState<number | null>(null);
  const [alunoId, setAlunoId] = useState<number | null>(null);
  const [alunos, setAlunos] = useState<Aluno[] | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    setAlunoId(null);
    setAlunos(null);
    if (turmaId === null) return;
    let cancelado = false;
    escolaApi.todosAlunos({ turma_id: turmaId }).then((l) => !cancelado && setAlunos(l)).catch((e) => !cancelado && setErro(erroApi(e).mensagem));
    return () => { cancelado = true; };
  }, [turmaId]);

  const inscritos = new Set(dados.inscricoes.map((i) => i.aluno_id));
  const disponiveis = (alunos ?? []).filter((a) => a.situacao !== 'transferido' && !inscritos.has(a.id));

  const fechar = () => {
    setTurmaId(null);
    setErro(null);
    onFechar();
  };

  const confirmar = async () => {
    if (turmaId === null) return;
    setEnviando(true);
    setErro(null);
    try {
      if (alunoId !== null) {
        await passeioApi.inscreverAluno(ativo.id, alunoId);
        avisar({ type: 'success', title: 'Aluno inscrito', message: disponiveis.find((a) => a.id === alunoId)?.nome ?? '' });
      } else {
        const r = await passeioApi.inscreverTurma(ativo.id, turmaId);
        avisar({ type: 'success', title: 'Turma inscrita', message: `${r.criadas} aluno(s) inscrito(s); ${r.ja_inscritos} já estavam.` });
      }
      await recarregar();
      fechar();
    } catch (e) {
      setErro(erroApi(e).mensagem);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal
      open={aberto}
      onClose={fechar}
      title="Inscrever no passeio"
      icon={<UserPlus className="h-5 w-5" />}
      size="md"
      footer={<><Button variant="outline" onClick={fechar} disabled={enviando}>Cancelar</Button><Button onClick={() => void confirmar()} disabled={turmaId === null} isLoading={enviando}>{alunoId === null ? 'Inscrever a turma' : 'Inscrever o aluno'}</Button></>}
    >
      <div className="space-y-3">
        <Select label="Turma" value={turmaId} placeholder="Escolha a turma" onChange={(v) => setTurmaId(Number(v))} options={dados.turmas.map((t) => ({ value: t.id, label: t.nome }))} emptyText="Nenhuma turma no ano letivo do passeio" />
        <Select
          label="Aluno (deixe vazio para inscrever a turma inteira)"
          value={alunoId ?? 'turma'}
          onChange={(v) => setAlunoId(v === 'turma' ? null : Number(v))}
          options={[{ value: 'turma', label: 'Turma inteira' }, ...disponiveis.map((a) => ({ value: a.id, label: a.numero ? `${a.numero} — ${a.nome}` : a.nome }))]}
          disabled={turmaId === null}
          loading={turmaId !== null && alunos === null}
        />
        <p className="text-xs text-muted-foreground">Alunos transferidos não participam do passeio e ficam de fora.</p>
        {erro && <p className="text-sm font-medium text-destructive" role="alert">{erro}</p>}
      </div>
    </Modal>
  );
};

const ObservacaoModal: React.FC<{ inscricao: Inscricao | null; onFechar: () => void; onSalvar: (texto: string) => Promise<void> }> = ({ inscricao, onFechar, onSalvar }) => {
  const [texto, setTexto] = useState('');
  const [atual, setAtual] = useState<Inscricao | null>(null);
  const [salvando, setSalvando] = useState(false);
  if (inscricao !== atual) {
    setAtual(inscricao);
    setTexto(inscricao?.observacao ?? '');
  }
  return (
    <Modal
      open={inscricao !== null}
      onClose={onFechar}
      title={`Observação — ${inscricao?.aluno?.nome ?? ''}`}
      size="md"
      footer={<><Button variant="outline" onClick={onFechar} disabled={salvando}>Cancelar</Button><Button isLoading={salvando} onClick={async () => { setSalvando(true); try { await onSalvar(texto.trim()); } finally { setSalvando(false); } }}>Salvar</Button></>}
    >
      <Textarea rows={3} value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={500} aria-label="Observação da inscrição" placeholder="Ex.: medicação, restrição alimentar, quem busca na volta" />
    </Modal>
  );
};
