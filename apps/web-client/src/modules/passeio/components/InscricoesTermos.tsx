import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { ClipboardCheck, MessageSquare, Search, Trash2, UserPlus } from 'lucide-react';
import { ActionsMenu, Button, Card, CardContent, DataTable, Input, Modal, Select, StatusChip, Switch, Textarea } from '@sysgov/ui';
import { EmptyState } from '@/components/ui';
import { escolaApi, erroApi, type Aluno } from '../../escola/api';
import { ConfirmarModal } from '../../escola/components/ConfirmarModal';
import { passeioApi, type AlteracaoInscricao, type Inscricao } from '../api';
import { FILTRO_INICIAL, filtrarInscricoes, listaDaTurma, naoInscrito, type FiltroInscricoes } from '../formato';
import type { PropsAba } from '../ModuloPasseioMain';
import { useFormValidationModal } from '@/lib/useFormValidationModal';

const sim = (v: boolean, rotuloSim: string, rotuloNao: string) => <StatusChip label={v ? rotuloSim : rotuloNao} variant={v ? 'success' : 'neutral'} />;

/**
 * Alunos inscritos no passeio ativo: vai, termo entregue e pago; inscrição de aluno ou turma. Com uma turma
 * escolhida, a lista traz a turma inteira e marcar "Vai" inscreve o aluno. Termo e pagamento só para quem vai.
 */
export const InscricoesTermos: React.FC<PropsAba> = ({ ativo, dados, recarregar, avisar, permissoes }) => {
  const [filtro, setFiltro] = useState<FiltroInscricoes>(FILTRO_INICIAL);
  const { tratarErro } = useFormValidationModal();
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
      if (!tratarErro(e)) avisar({ type: 'error', title: 'Não foi possível alterar', message: erroApi(e).mensagem });
    } finally {
      setSalvando(null);
    }
  };

  // Colunas estáveis (os switches não remontam ao gravar); o estado atual vem por ref.
  const ctx = useRef({ permissoes, salvando, alterar, setObservacao, setRemover });
  ctx.current = { permissoes, salvando, alterar, setObservacao, setRemover };
  const colunas = useMemo<ColumnDef<Inscricao, unknown>[]>(() => {
    const nomeDe = (i: Inscricao) => i.aluno?.nome ?? 'Aluno';
    const textoSimNao = (v: boolean) => (v ? 'Sim' : 'Não');
    return [
      {
        id: 'acoes',
        header: '',
        size: 56,
        enableSorting: false,
        cell: ({ row }) => {
          const i = row.original;
          const { permissoes: perm, setObservacao: abrirObservacao, setRemover: abrirRemover } = ctx.current;
          return (
            <div className="flex justify-center">
              <ActionsMenu
                triggerLabel={`Ações de ${nomeDe(i)}`}
                items={perm.passeios && !naoInscrito(i) ? [
                  { key: 'observacao', label: 'Observação', icon: <MessageSquare className="h-3.5 w-3.5" />, onSelect: () => abrirObservacao(i) },
                  { key: 'remover', label: 'Remover do passeio', icon: <Trash2 className="h-3.5 w-3.5" />, onSelect: () => abrirRemover(i) },
                ] : []}
              />
            </div>
          );
        },
      },
      {
        id: 'numero',
        header: 'Nº',
        accessorFn: (i) => i.aluno?.numero ?? '',
        cell: ({ row }) => <span className="font-mono tabular-nums">{row.original.aluno?.numero ?? '—'}</span>,
        meta: { exportHeader: 'Nº', exportValue: (i) => i.aluno?.numero ?? '' },
      },
      {
        id: 'aluno',
        header: 'Aluno',
        accessorFn: (i) => nomeDe(i),
        cell: ({ row }) => (
          <div>
            <span className="font-medium">{nomeDe(row.original)}</span>
            {row.original.aluno?.situacao === 'transferido' && <StatusChip label="Transferido" variant="danger" className="ml-2" />}
            {row.original.observacao && <p className="text-xs text-muted-foreground">{row.original.observacao}</p>}
          </div>
        ),
        meta: { exportHeader: 'Aluno', exportValue: (i) => nomeDe(i) },
      },
      { id: 'turma', header: 'Turma', accessorFn: (i) => i.aluno?.turma?.nome ?? '—', meta: { exportHeader: 'Turma', exportValue: (i) => i.aluno?.turma?.nome ?? '—' } },
      {
        id: 'telefone',
        header: 'Telefone',
        accessorFn: (i) => i.aluno?.telefone ?? '',
        cell: ({ row }) => <span className="font-mono tabular-nums">{row.original.aluno?.telefone ?? '—'}</span>,
        meta: { exportHeader: 'Telefone', exportValue: (i) => i.aluno?.telefone ?? '' },
      },
      {
        id: 'vai',
        header: 'Vai',
        accessorFn: (i) => textoSimNao(i.vai),
        cell: ({ row }) => {
          const i = row.original;
          const { permissoes: perm, salvando: emGravacao, alterar: gravar } = ctx.current;
          const transferido = i.aluno?.situacao === 'transferido';
          return perm.passeios
            ? <Switch checked={i.vai} disabled={emGravacao === i.id || (transferido && !i.vai)} onCheckedChange={(v) => void gravar(i, { vai: v })} label={`${nomeDe(i)} vai ao passeio`} />
            : sim(i.vai, 'Vai', 'Não vai');
        },
        meta: { exportHeader: 'Vai', exportValue: (i) => textoSimNao(i.vai) },
      },
      {
        id: 'termo',
        header: 'Termo',
        accessorFn: (i) => textoSimNao(i.autorizacao_entregue),
        cell: ({ row }) => {
          const i = row.original;
          const { permissoes: perm, salvando: emGravacao, alterar: gravar } = ctx.current;
          // Quem não vai não recebe termo nem pagamento (só pode desmarcar o que já estava marcado).
          return perm.passeios
            ? <Switch checked={i.autorizacao_entregue} disabled={emGravacao === i.id || (!i.vai && !i.autorizacao_entregue)} onCheckedChange={(v) => void gravar(i, { autorizacao_entregue: v })} label={`Termo de ${nomeDe(i)} entregue`} />
            : sim(i.autorizacao_entregue, 'Entregue', 'Pendente');
        },
        meta: { exportHeader: 'Termo entregue', exportValue: (i) => textoSimNao(i.autorizacao_entregue) },
      },
      {
        id: 'pago',
        header: 'Pago',
        accessorFn: (i) => textoSimNao(i.pago),
        cell: ({ row }) => {
          const i = row.original;
          const { permissoes: perm, salvando: emGravacao, alterar: gravar } = ctx.current;
          return perm.passeios
            ? <Switch checked={i.pago} disabled={emGravacao === i.id || (!i.vai && !i.pago)} onCheckedChange={(v) => void gravar(i, { pago: v })} label={`${nomeDe(i)} pagou`} />
            : sim(i.pago, 'Pago', 'Pendente');
        },
        meta: { exportHeader: 'Pago', exportValue: (i) => textoSimNao(i.pago) },
      },
    ];
  }, []);

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
          {permissoes.passeios && <Button leftIcon={<UserPlus className="h-4 w-4" />} onClick={() => setInscrever(true)}>Inscrever</Button>}
        </div>

        {visiveis.length === 0 ? (
          <EmptyState icon={<ClipboardCheck className="h-8 w-8" />} title={linhas.length === 0 ? 'Nenhum aluno inscrito' : 'Nenhuma inscrição encontrada'} description={linhas.length === 0 ? 'Inscreva uma turma inteira ou alunos avulsos do Cadastro Escolar.' : 'Ajuste os filtros.'} />
        ) : (
          <DataTable
            columns={colunas}
            data={visiveis}
            emptyText="Nenhuma inscrição encontrada."
            exportable
            exportFileName={`passeio-inscricoes-${ativo.data_passeio}`}
            exportTitle="Passeio — Inscrições e termos"
          />
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
            if (!tratarErro(e)) avisar({ type: 'error', title: 'Não foi possível remover', message: erroApi(e).mensagem });
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
  const { tratarErro } = useFormValidationModal();

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
      if (!tratarErro(e)) setErro(erroApi(e).mensagem);
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
