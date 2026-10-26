import React, { useMemo, useRef, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Lock, Pencil, Plus, Trash2 } from 'lucide-react';
import { ActionsMenu, Badge, Button, Card, CardContent, DataTable, Input, Modal, Select } from '@sysgov/ui';
import type { Toast } from '../../escola/components/AdminModal';
import { EstadoCarga } from '../../escola/components/AdminModal';
import { useCarga } from '../../escola/useCarga';
import { dataHora, mensagemDeErro, multiApi, type Atendimento, type FiltrosAtendimento, type Opcoes, type Ref } from '../api';
import { AtendimentoModal } from './AtendimentoModal';
import { useFormValidationModal } from '@/lib/useFormValidationModal';

/** Relato com quebra de linha preservada; sigiloso sem acesso aparece mascarado (D6). */
export const Relato: React.FC<{ a: Atendimento }> = ({ a }) =>
  a.relato_visivel ? (
    <p className="whitespace-pre-line text-sm">{a.relato || <span className="text-muted-foreground">Sem relato.</span>}</p>
  ) : (
    <p className="text-sm italic text-muted-foreground"><Lock className="mr-1 inline h-3.5 w-3.5" />Registro sigiloso</p>
  );

const colEstudantes: ColumnDef<Atendimento, unknown> = {
  id: 'estudantes',
  header: 'Estudantes',
  accessorFn: (a) => a.alunos.map((x) => x.nome).join(', '),
  meta: { exportHeader: 'Estudantes', exportValue: (a) => a.alunos.map((x) => x.nome).join(', ') },
};

/**
 * Lista de atendimentos com filtros. Com `aluno`, vira o histórico daquele estudante (usado na ficha do acompanhado).
 */
export const Atendimentos: React.FC<{ opcoes: Opcoes; avisar: Toast; aluno?: Ref; aoMudar?: () => void }> = ({ opcoes, avisar, aluno, aoMudar }) => {
  const [filtros, setFiltros] = useState<FiltrosAtendimento>({ aluno_id: aluno?.id, page: 1 });
  const { tratarErro } = useFormValidationModal();
  const carga = useCarga(() => multiApi.atendimentos(filtros), [JSON.stringify(filtros)]);
  const [editando, setEditando] = useState<Atendimento | 'novo' | null>(null);
  const [aberto, setAberto] = useState<Atendimento | null>(null);
  const [excluindo, setExcluindo] = useState<Atendimento | null>(null);

  const filtro = (k: keyof FiltrosAtendimento) => (v: string) => setFiltros((f) => ({ ...f, [k]: v ? (k === 'de' || k === 'ate' ? v : Number(v) || undefined) : undefined, page: 1 }));

  const depoisDeSalvar = async (mensagem: string) => {
    setEditando(null);
    setExcluindo(null);
    avisar({ type: 'success', title: 'Atendimento', message: mensagem });
    await carga.recarregar();
    aoMudar?.();
  };

  const excluir = async (a: Atendimento) => {
    try {
      await multiApi.excluirAtendimento(a.id);
      await depoisDeSalvar('Atendimento excluído.');
    } catch (e) {
      if (!tratarErro(e)) avisar({ type: 'error', title: 'Atendimento', message: mensagemDeErro(e) });
    }
  };

  const pagina = carga.dados;
  const todos = { value: 0, label: 'Todos' };

  // Colunas estáveis; só mudam se a grade for a do histórico de um estudante (sem a coluna "Estudantes").
  const ctx = useRef({ setEditando, setExcluindo });
  ctx.current = { setEditando, setExcluindo };
  const colunas = useMemo<ColumnDef<Atendimento, unknown>[]>(() => [
    {
      id: 'acoes',
      header: '',
      size: 56,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-center">
          <ActionsMenu
            triggerLabel="Ações do atendimento"
            items={row.original.pode_editar ? [
              { key: 'editar', label: 'Editar', icon: <Pencil className="h-3.5 w-3.5" />, onSelect: () => ctx.current.setEditando(row.original) },
              { key: 'excluir', label: 'Excluir', icon: <Trash2 className="h-3.5 w-3.5" />, onSelect: () => ctx.current.setExcluindo(row.original) },
            ] : []}
          />
        </div>
      ),
    },
    {
      id: 'data',
      header: 'Data',
      accessorKey: 'data_hora',
      cell: ({ row }) => (
        <span className="font-mono text-xs tabular-nums">
          {dataHora(row.original.data_hora)}
          <span className="block text-muted-foreground">{row.original.turno_rotulo}</span>
        </span>
      ),
      meta: { exportHeader: 'Data', exportValue: (a) => dataHora(a.data_hora) },
    },
    ...(aluno ? [] : [colEstudantes]),
    {
      id: 'escola',
      header: 'Escola',
      accessorFn: (a) => a.escola.nome,
      cell: ({ row }) => <span>{row.original.escola.nome}{row.original.equipe && <span className="block text-xs text-muted-foreground">{row.original.equipe.nome}</span>}</span>,
      meta: { exportHeader: 'Escola', exportValue: (a) => a.escola.nome },
    },
    {
      id: 'tipos',
      header: 'Tipos',
      accessorFn: (a) => a.tipos.map((t) => t.nome).join(', '),
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.tipos.map((t) => <Badge key={t.id} variant="outline">{t.nome}</Badge>)}
          {row.original.sigiloso && <Badge variant="secondary"><Lock className="mr-1 h-3 w-3" />Sigiloso</Badge>}
        </div>
      ),
      meta: { exportHeader: 'Tipos', exportValue: (a) => a.tipos.map((t) => t.nome).join(', ') },
    },
    {
      id: 'profissionais',
      header: 'Profissionais',
      accessorFn: (a) => a.profissionais.map((p) => p.nome).join(', '),
      cell: ({ row }) => <span className="text-sm">{row.original.profissionais.map((p) => p.nome).join(', ')}</span>,
      meta: { exportHeader: 'Profissionais', exportValue: (a) => a.profissionais.map((p) => p.nome).join(', ') },
    },
  ], [aluno?.id]);

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-wrap items-end gap-3">
          {!aluno && (
            <>
              <div className="w-56"><Select label="Escola" value={filtros.escola_id ?? 0} onChange={filtro('escola_id')} options={[todos, ...opcoes.escolas.map((e) => ({ value: e.id, label: e.nome }))]} /></div>
              <div className="w-56"><Select label="Profissional" value={filtros.profissional_id ?? 0} onChange={filtro('profissional_id')} options={[todos, ...opcoes.profissionais.map((p) => ({ value: p.id, label: p.nome }))]} /></div>
              <div className="w-48"><Select label="Tipo" value={filtros.tipo_id ?? 0} onChange={filtro('tipo_id')} options={[todos, ...opcoes.tipos_atendimento.map((t) => ({ value: t.id, label: t.nome }))]} /></div>
            </>
          )}
          <div className="w-40"><Input label="De" type="date" value={filtros.de ?? ''} onChange={(e) => filtro('de')(e.target.value)} /></div>
          <div className="w-40"><Input label="Até" type="date" value={filtros.ate ?? ''} onChange={(e) => filtro('ate')(e.target.value)} /></div>
          {opcoes.permissoes.atender && (
            <Button className="ml-auto" onClick={() => setEditando('novo')}><Plus className="mr-1 h-4 w-4" />Registrar atendimento</Button>
          )}
        </div>

        <EstadoCarga carregando={carga.carregando && !pagina} erro={carga.erro} onTentar={() => void carga.recarregar()} />
        {pagina && (
          <DataTable
            columns={colunas}
            data={pagina.data}
            emptyText="Nenhum atendimento encontrado."
            onRowClick={(a) => setAberto(a)}
            pageSizeOptions={[15, 30, 50, 100]}
            paginationState={{
              currentPage: pagina.current_page,
              totalPages: pagina.last_page,
              onPageChange: (p) => setFiltros((f) => ({ ...f, page: p })),
              total: pagina.total,
              perPage: filtros.per_page ?? 30,
              onPerPageChange: (n) => setFiltros((f) => ({ ...f, per_page: n, page: 1 })),
            }}
          />
        )}
      </CardContent>

      {editando && (
        <AtendimentoModal opcoes={opcoes} atendimento={editando === 'novo' ? null : editando} alunoInicial={aluno}
          aoFechar={() => setEditando(null)} aoSalvar={() => void depoisDeSalvar('Atendimento salvo.')} />
      )}
      {aberto && (
        <Modal open onClose={() => setAberto(null)} title={`Atendimento de ${dataHora(aberto.data_hora)}`} size="lg">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="font-semibold">Escola</dt><dd>{aberto.escola.nome}</dd></div>
            <div><dt className="font-semibold">Equipe</dt><dd>{aberto.equipe?.nome ?? '—'}</dd></div>
            <div><dt className="font-semibold">Estudantes</dt><dd>{aberto.alunos.map((x) => x.nome).join(', ')}</dd></div>
            <div><dt className="font-semibold">Profissionais</dt><dd>{aberto.profissionais.map((x) => x.nome).join(', ')}</dd></div>
            <div><dt className="font-semibold">Tipos</dt><dd>{aberto.tipos.map((x) => x.nome).join(', ')}</dd></div>
            <div><dt className="font-semibold">Registrado por</dt><dd>{aberto.autor ?? '—'}</dd></div>
          </dl>
          <div className="mt-4 rounded-md border p-3"><Relato a={aberto} /></div>
        </Modal>
      )}
      {excluindo && (
        <Modal open onClose={() => setExcluindo(null)} title="Excluir atendimento" size="sm"
          footer={<><Button variant="outline" onClick={() => setExcluindo(null)}>Cancelar</Button><Button variant="destructive" onClick={() => void excluir(excluindo)}>Excluir</Button></>}>
          <p className="text-sm">Excluir o atendimento de <span className="font-mono tabular-nums">{dataHora(excluindo.data_hora)}</span>? A exclusão fica registrada na auditoria.</p>
        </Modal>
      )}
    </Card>
  );
};
