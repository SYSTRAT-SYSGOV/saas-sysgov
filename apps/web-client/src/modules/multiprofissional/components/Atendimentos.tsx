import React, { useState } from 'react';
import { Lock, Pencil, Plus, Trash2 } from 'lucide-react';
import { Badge, Button, Card, CardContent, Input, Modal, Select, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@sysgov/ui';
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
        {pagina && pagina.data.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Nenhum atendimento encontrado.</p>}
        {pagina && pagina.data.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-36">Data</TableHead>
                {!aluno && <TableHead>Estudantes</TableHead>}
                <TableHead>Escola</TableHead>
                <TableHead>Tipos</TableHead>
                <TableHead>Profissionais</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagina.data.map((a) => (
                <TableRow key={a.id} className="cursor-pointer" onClick={() => setAberto(a)}>
                  <TableCell className="font-mono text-xs tabular-nums">
                    {dataHora(a.data_hora)}
                    <span className="block text-muted-foreground">{a.turno_rotulo}</span>
                  </TableCell>
                  {!aluno && <TableCell>{a.alunos.map((x) => x.nome).join(', ')}</TableCell>}
                  <TableCell>{a.escola.nome}{a.equipe && <span className="block text-xs text-muted-foreground">{a.equipe.nome}</span>}</TableCell>
                  <TableCell><div className="flex flex-wrap gap-1">{a.tipos.map((t) => <Badge key={t.id} variant="outline">{t.nome}</Badge>)}{a.sigiloso && <Badge variant="secondary"><Lock className="mr-1 h-3 w-3" />Sigiloso</Badge>}</div></TableCell>
                  <TableCell className="text-sm">{a.profissionais.map((p) => p.nome).join(', ')}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {a.pode_editar && (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" aria-label="Editar atendimento" onClick={() => setEditando(a)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" aria-label="Excluir atendimento" onClick={() => setExcluindo(a)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {pagina && pagina.last_page > 1 && (
          <div className="flex items-center justify-end gap-2 text-sm">
            <span className="font-mono tabular-nums text-muted-foreground">{pagina.current_page}/{pagina.last_page} · {pagina.total} registros</span>
            <Button variant="outline" size="sm" disabled={pagina.current_page <= 1} onClick={() => setFiltros((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}>Anterior</Button>
            <Button variant="outline" size="sm" disabled={pagina.current_page >= pagina.last_page} onClick={() => setFiltros((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}>Próxima</Button>
          </div>
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
