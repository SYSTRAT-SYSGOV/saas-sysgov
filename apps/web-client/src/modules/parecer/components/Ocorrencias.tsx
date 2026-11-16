import React, { useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { ActionsMenu, Badge, Button, Card, Checkbox, ConfirmDialog, DataTable, Field, Input, ScreenState, Select, Textarea } from '@sysgov/ui';
import { dataBr, hojeIso, parecerApi, type Ocorrencia, type OcorrenciasTurma } from '../api';
import { AbasTurma, Aviso, BotaoWhats, Carga, EscolherTurma, mensagemDeErro, useCarga, useParecer, type Mensagem } from './comum';

/** Ocorrências do aluno ou da turma (ocorrencias.php), com contato do responsável pelo WhatsApp. */
const Ocorrencias: React.FC<{ turmaId?: number; alunoId?: number }> = ({ turmaId, alunoId }) => {
  const { ir } = useParecer();
  if (alunoId) return <DoAluno key={alunoId} alunoId={alunoId} />;
  if (!turmaId) return <EscolherTurma texto="Escolha a turma para registrar ou consultar as ocorrências." onEscolher={(t) => ir({ aba: 'ocorrencias', turmaId: t.turma_id })} />;
  return <DaTurma key={turmaId} turmaId={turmaId} />;
};

const Selo: React.FC<{ o: Ocorrencia }> = ({ o }) => (
  <span className="rounded px-2 py-0.5 text-xs font-medium text-white" style={{ background: o.categoria?.cor ?? '#777' }}>
    {o.categoria?.nome ?? 'Sem categoria'}
  </span>
);

const Item: React.FC<{ o: Ocorrencia; comAluno?: boolean; onEditar?: () => void; onExcluir?: () => void; onAluno?: () => void }> = ({ o, comAluno, onEditar, onExcluir, onAluno }) => (
  <Card className="space-y-1 p-3">
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <b className="font-mono tabular-nums">{dataBr(o.data)}</b>
      {comAluno && (
        <Button variant="link" size="xs" onClick={onAluno}>
          {o.aluno}
        </Button>
      )}
      <Selo o={o} />
      <span className="text-muted-foreground">por {o.registrado_nome ?? '—'}</span>
      <span className="ml-auto flex gap-1">
        {o.pode_mexer && onEditar && (
          <Button variant="link" size="xs" onClick={onEditar}>
            Editar
          </Button>
        )}
        {o.pode_mexer && onExcluir && (
          <Button variant="link" size="xs" className="text-destructive" onClick={onExcluir}>
            Excluir
          </Button>
        )}
      </span>
    </div>
    <p className="whitespace-pre-line text-sm">{o.descricao}</p>
    {o.anexo_nome && (
      <Button variant="link" size="xs" onClick={() => void parecerApi.baixarAnexo(o)}>
        📎 {o.anexo_nome}
      </Button>
    )}
  </Card>
);

const DoAluno: React.FC<{ alunoId: number }> = ({ alunoId }) => {
  const { ir } = useParecer();
  const carga = useCarga(() => parecerApi.ocorrenciasAluno(alunoId), [alunoId]);
  const [editar, setEditar] = useState<Ocorrencia | null>(null);
  const [excluir, setExcluir] = useState<Ocorrencia | null>(null);
  const [msg, setMsg] = useState<Mensagem>(null);
  const [form, setForm] = useState({ data: hojeIso(), categoria: '', descricao: '', anexo: null as File | null, remover: false });
  const [chave, setChave] = useState(0);

  const limpar = () => {
    setEditar(null);
    setForm({ data: hojeIso(), categoria: '', descricao: '', anexo: null, remover: false });
    setChave((k) => k + 1);
  };

  return (
    <Carga carga={carga}>
      {(d) => {
        const salvar = async (e: React.FormEvent) => {
          e.preventDefault();
          if (form.descricao.trim() === '') {
            setMsg({ tipo: 'erro', texto: 'Descreva a ocorrência.' });
            return;
          }
          try {
            await parecerApi.salvarOcorrencia(editar?.id ?? null, {
              aluno_id: alunoId,
              data: form.data,
              categoria_id: form.categoria ? Number(form.categoria) : (d.categorias[0]?.id ?? null),
              descricao: form.descricao,
              anexo: form.anexo,
              remover_anexo: form.remover,
            });
            setMsg({ tipo: 'ok', texto: editar ? 'Ocorrência atualizada.' : 'Ocorrência registrada.' });
            limpar();
            carga.recarregar();
          } catch (err) {
            setMsg(mensagemDeErro(err));
          }
        };
        return (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => ir({ aba: 'ocorrencias', turmaId: d.aluno.turma_id })}>
                ← Ocorrências da turma
              </Button>
              <Button variant="outline" size="sm" onClick={() => ir({ aba: 'inicio', tela: 'avaliar', alunoId })}>
                Parecer do aluno
              </Button>
              <BotaoWhats tel={d.aluno.celular} rotulo="Responsável" mensagem={`Olá! Aqui é da escola, sobre ${d.aluno.nome}.`} />
            </div>
            <h2 className="text-lg font-semibold">
              {d.aluno.nome} <span className="text-sm font-normal text-muted-foreground">{d.aluno.turma}</span>
            </h2>
            <Aviso msg={msg} onFechar={() => setMsg(null)} />
            <Card className="p-4">
              <form key={chave} onSubmit={(e) => void salvar(e)} className="grid gap-3 sm:grid-cols-2" id="form-ocorrencia">
                <h3 className="font-semibold sm:col-span-2">{editar ? 'Editar ocorrência' : 'Nova ocorrência'}</h3>
                <Field label="Data" required>
                  <Input type="date" value={form.data} max={hojeIso()} onChange={(e) => setForm({ ...form, data: e.target.value })} required />
                </Field>
                <Field label="Categoria">
                  <Select value={form.categoria || (d.categorias[0]?.id ?? '')} onChange={(v) => setForm({ ...form, categoria: v })} options={d.categorias.map((c) => ({ value: c.id, label: c.nome }))} emptyText="Cadastre as categorias no Cadastro Escolar" />
                </Field>
                <Field label="Descrição" required className="sm:col-span-2">
                  <Textarea rows={4} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} required spellCheck lang="pt-BR" placeholder="Descreva o que aconteceu..." />
                </Field>
                <Field label="Anexo (opcional: foto ou PDF, até 5 MB)" className="sm:col-span-2">
                  <Input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => setForm({ ...form, anexo: e.target.files?.[0] ?? null })} />
                </Field>
                {editar?.anexo_nome && <Checkbox label={`Remover o anexo atual (${editar.anexo_nome})`} checked={form.remover} onCheckedChange={(v) => setForm({ ...form, remover: v === true })} />}
                <div className="flex gap-2 sm:col-span-2">
                  <Button type="submit">{editar ? 'Salvar alteração' : 'Registrar ocorrência'}</Button>
                  {editar && (
                    <Button type="button" variant="outline" onClick={limpar}>
                      Cancelar
                    </Button>
                  )}
                </div>
              </form>
            </Card>
            {d.ocorrencias.length === 0 ? (
              <ScreenState type="empty" title="Nenhuma ocorrência registrada para este aluno." />
            ) : (
              <div className="space-y-2">
                {d.ocorrencias.map((o) => (
                  <Item
                    key={o.id}
                    o={o}
                    onEditar={() => {
                      setEditar(o);
                      setForm({ data: o.data, categoria: o.categoria ? String(o.categoria.id) : '', descricao: o.descricao, anexo: null, remover: false });
                      setChave((k) => k + 1);
                      document.getElementById('form-ocorrencia')?.scrollIntoView?.({ behavior: 'smooth' });
                    }}
                    onExcluir={() => setExcluir(o)}
                  />
                ))}
              </div>
            )}
            <ConfirmDialog
              open={excluir !== null}
              onClose={() => setExcluir(null)}
              destructive
              title="Excluir esta ocorrência?"
              description="A ocorrência e o anexo serão apagados."
              confirmLabel="Excluir"
              onConfirm={() => {
                const o = excluir;
                setExcluir(null);
                if (o)
                  parecerApi
                    .excluirOcorrencia(o.id)
                    .then(() => {
                      setMsg({ tipo: 'ok', texto: 'Ocorrência excluída.' });
                      carga.recarregar();
                    })
                    .catch((e: unknown) => setMsg(mensagemDeErro(e)));
              }}
            />
          </div>
        );
      }}
    </Carga>
  );
};

/** Alunos da turma com o total de ocorrências: busca, ordenação e exportação pelo padrão; ação no menu ⋮. */
const ListaAlunos: React.FC<{ alunos: OcorrenciasTurma['alunos']; onAbrir: (alunoId: number) => void }> = ({ alunos, onAbrir }) => {
  const colunas = React.useMemo<ColumnDef<OcorrenciasTurma['alunos'][number]>[]>(
    () => [
      { id: 'aluno', header: 'Aluno', accessorFn: (a) => a.nome, cell: ({ row }) => <span className={row.original.situacao !== 'ativo' ? 'opacity-60' : undefined}>{row.original.nome}</span> },
      {
        id: 'ocorrencias',
        header: 'Ocorrências',
        accessorFn: (a) => a.total,
        cell: ({ row }) => (row.original.total > 0 ? <Badge variant="warning">{row.original.total}</Badge> : <span className="font-mono">0</span>),
      },
      {
        id: 'responsavel',
        header: 'Responsável',
        accessorFn: (a) => a.celular ?? '',
        cell: ({ row }) => <BotaoWhats tel={row.original.celular} rotulo="WhatsApp" mensagem={`Olá! Aqui é da escola, sobre ${row.original.nome}.`} />,
      },
      {
        id: 'actions',
        header: 'Ações',
        enableSorting: false,
        meta: { exportIgnore: true },
        cell: ({ row }) => <ActionsMenu triggerLabel={`Ações de ${row.original.nome}`} items={[{ key: 'ver', label: '+ Registrar / ver', onSelect: () => onAbrir(row.original.id) }]} />,
      },
    ],
    [onAbrir],
  );
  return <DataTable columns={colunas} data={alunos} searchable searchPlaceholder="Buscar aluno…" pageSize={20} exportable exportFileName="parecer-ocorrencias-alunos" exportTitle="Parecer Descritivo — ocorrências por aluno" />;
};

const DaTurma: React.FC<{ turmaId: number }> = ({ turmaId }) => {
  const { ir } = useParecer();
  const carga = useCarga(() => parecerApi.ocorrenciasTurma(turmaId), [turmaId]);
  const turma = useCarga(() => parecerApi.alunos(turmaId), [turmaId]);
  return (
    <div className="space-y-4">
      {turma.dados && <AbasTurma turma={{ id: turmaId, nome: turma.dados.turma.nome, serie: turma.dados.turma.serie, turno: turma.dados.turma.turno }} atual="ocorrencias" />}
      <Carga carga={carga}>
        {(d) => (
          <>
            <Button variant="outline" size="sm" onClick={() => void parecerApi.baixarPlanilhaOcorrencias(turmaId)}>
              ⬇ Exportar planilha (CSV)
            </Button>
            <ListaAlunos alunos={d.alunos} onAbrir={(alunoId) => ir({ aba: 'ocorrencias', alunoId, turmaId })} />
            <h3 className="font-semibold">Últimas ocorrências</h3>
            {d.ocorrencias.length === 0 ? (
              <ScreenState type="empty" title="Nenhuma ocorrência registrada nesta turma." />
            ) : (
              <div className="space-y-2">
                {d.ocorrencias.map((o) => (
                  <Item key={o.id} o={o} comAluno onAluno={() => ir({ aba: 'ocorrencias', alunoId: o.aluno_id, turmaId })} />
                ))}
              </div>
            )}
          </>
        )}
      </Carga>
    </div>
  );
};

export default Ocorrencias;
