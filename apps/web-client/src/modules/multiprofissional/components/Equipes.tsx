import React, { useMemo, useRef, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { ActionsMenu, Badge, Button, Card, CardContent, DataTable, Input, Modal, Select, Switch } from '@sysgov/ui';
import type { Toast } from '../../escola/components/AdminModal';
import { EstadoCarga } from '../../escola/components/AdminModal';
import { useCarga } from '../../escola/useCarga';
import { mensagemDeErro, multiApi, type Equipe, type Opcoes } from '../api';
import { SelecaoMultipla } from './Selecao';
import { useFormValidationModal } from '@/lib/useFormValidationModal';

/** Equipes multiprofissionais: profissionais e escolas atendidas. Equipe com atendimento é desativada ao excluir. */
export const Equipes: React.FC<{ opcoes: Opcoes; avisar: Toast; aoMudar: () => void }> = ({ opcoes, avisar, aoMudar }) => {
  const carga = useCarga(() => multiApi.equipes(), []);
  const [editando, setEditando] = useState<Equipe | 'nova' | null>(null);
  const { tratarErro } = useFormValidationModal();
  const gerenciar = opcoes.permissoes.gerenciar;
  const turno = (v: string | null) => opcoes.turnos.find((t) => t.valor === v)?.rotulo ?? '—';

  const excluir = async (e: Equipe) => {
    try {
      const excluida = await multiApi.excluirEquipe(e.id);
      avisar({ type: 'success', title: 'Equipe', message: excluida ? `“${e.nome}” excluída.` : `“${e.nome}” tem atendimentos e foi desativada.` });
      await carga.recarregar();
      aoMudar();
    } catch (err) {
      if (!tratarErro(err)) avisar({ type: 'error', title: 'Equipe', message: mensagemDeErro(err) });
    }
  };

  // Colunas estáveis; o estado atual (permissão, rótulo de turno, excluir) vem por ref.
  const ctx = useRef({ gerenciar, turno, excluir });
  ctx.current = { gerenciar, turno, excluir };
  const colunas = useMemo<ColumnDef<Equipe, unknown>[]>(() => [
    {
      id: 'acoes',
      header: '',
      size: 56,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-center">
          <ActionsMenu
            triggerLabel={`Ações de ${row.original.nome}`}
            items={ctx.current.gerenciar ? [
              { key: 'editar', label: 'Editar', icon: <Pencil className="h-3.5 w-3.5" />, onSelect: () => setEditando(row.original) },
              { key: 'excluir', label: 'Excluir', icon: <Trash2 className="h-3.5 w-3.5" />, onSelect: () => void ctx.current.excluir(row.original) },
            ] : []}
          />
        </div>
      ),
    },
    {
      id: 'equipe',
      header: 'Equipe',
      accessorKey: 'nome',
      cell: ({ row }) => <span className="font-medium">{row.original.nome}{!row.original.ativo && <Badge variant="secondary" className="ml-2">Inativa</Badge>}</span>,
      meta: { exportHeader: 'Equipe', exportValue: (e) => e.nome },
    },
    { id: 'turno', header: 'Turno', accessorFn: (e) => ctx.current.turno(e.turno), meta: { exportHeader: 'Turno', exportValue: (e) => ctx.current.turno(e.turno) } },
    {
      id: 'profissionais',
      header: 'Profissionais',
      accessorFn: (e) => e.profissionais.map((p) => p.nome).join(', ') || '—',
      cell: ({ row }) => <span className="text-sm">{row.original.profissionais.map((p) => p.nome).join(', ') || '—'}</span>,
      meta: { exportHeader: 'Profissionais', exportValue: (e) => e.profissionais.map((p) => p.nome).join(', ') },
    },
    {
      id: 'escolas',
      header: 'Escolas',
      accessorFn: (e) => e.escolas.map((x) => x.nome).join(', ') || '—',
      cell: ({ row }) => <span className="text-sm">{row.original.escolas.map((x) => x.nome).join(', ') || '—'}</span>,
      meta: { exportHeader: 'Escolas', exportValue: (e) => e.escolas.map((x) => x.nome).join(', ') },
    },
  ], []);

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        {gerenciar && <div className="flex justify-end"><Button onClick={() => setEditando('nova')}><Plus className="mr-1 h-4 w-4" />Nova equipe</Button></div>}
        <EstadoCarga carregando={carga.carregando && !carga.dados} erro={carga.erro} onTentar={() => void carga.recarregar()} />
        {carga.dados && (
          <DataTable
            columns={colunas}
            data={carga.dados}
            emptyText="Nenhuma equipe cadastrada."
            exportable
            exportFileName="multiprofissional-equipes"
            exportTitle="Multiprofissional — Equipes"
          />
        )}
      </CardContent>
      {editando && (
        <EquipeModal opcoes={opcoes} equipe={editando === 'nova' ? null : editando} aoFechar={() => setEditando(null)}
          aoSalvar={() => { setEditando(null); avisar({ type: 'success', title: 'Equipe', message: 'Equipe salva.' }); void carga.recarregar(); aoMudar(); }} />
      )}
    </Card>
  );
};

const EquipeModal: React.FC<{ opcoes: Opcoes; equipe: Equipe | null; aoFechar: () => void; aoSalvar: () => void }> = ({ opcoes, equipe, aoFechar, aoSalvar }) => {
  const [nome, setNome] = useState(equipe?.nome ?? '');
  const [turno, setTurno] = useState(equipe?.turno ?? 'manha');
  const [ativo, setAtivo] = useState(equipe?.ativo ?? true);
  const [profissionais, setProfissionais] = useState<number[]>(equipe?.profissionais.map((p) => p.id) ?? []);
  const [escolas, setEscolas] = useState<number[]>(equipe?.escolas.map((e) => e.id) ?? []);
  const [erro, setErro] = useState<string | null>(null);
  const { modal: modalValidacao, invalidar, tratarErro } = useFormValidationModal();
  const [salvando, setSalvando] = useState(false);

  const salvar = async () => {
    if (!nome.trim()) return invalidar([['validação', 'Informe o nome da equipe.']]);
    setSalvando(true);
    setErro(null);
    try {
      await multiApi.salvarEquipe(equipe?.id ?? null, { nome: nome.trim(), turno, ativo, profissionais, escolas });
      aoSalvar();
    } catch (e) {
      if (!tratarErro(e)) setErro(mensagemDeErro(e));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal open onClose={aoFechar} title={equipe ? 'Editar equipe' : 'Nova equipe'} size="lg"
      footer={<><Button variant="outline" onClick={aoFechar}>Cancelar</Button><Button onClick={() => void salvar()} isLoading={salvando}>Salvar</Button></>}>
      {modalValidacao}
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Nome *" value={nome} maxLength={200} onChange={(e) => setNome(e.target.value)} />
          <Select label="Turno" value={turno} onChange={setTurno} options={opcoes.turnos.map((t) => ({ value: t.valor, label: t.rotulo }))} />
        </div>
        <SelecaoMultipla titulo="Profissionais" itens={opcoes.profissionais} marcados={profissionais} aoMudar={setProfissionais} vazio="Cadastre os profissionais primeiro." />
        <SelecaoMultipla titulo="Escolas atendidas" itens={opcoes.escolas} marcados={escolas} aoMudar={setEscolas} vazio="Nenhuma escola no módulo Escola." />
        <label className="flex items-center gap-2 text-sm"><Switch checked={ativo} onCheckedChange={setAtivo} aria-label="Equipe ativa" />Equipe ativa</label>
        {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
      </div>
    </Modal>
  );
};
