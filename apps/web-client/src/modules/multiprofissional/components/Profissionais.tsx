import React, { useMemo, useRef, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { ActionsMenu, Badge, Button, Card, CardContent, DataTable, Input, Modal, Select, Switch } from '@sysgov/ui';
import type { Toast } from '../../escola/components/AdminModal';
import { EstadoCarga } from '../../escola/components/AdminModal';
import { useCarga } from '../../escola/useCarga';
import { mensagemDeErro, multiApi, type Opcoes, type Profissional } from '../api';
import { useFormValidationModal } from '@/lib/useFormValidationModal';

/** Profissionais: ligados ao Cadastro de Pessoas pelo CPF (D2) e, opcionalmente, a um usuário (D3). */
export const Profissionais: React.FC<{ opcoes: Opcoes; avisar: Toast; aoMudar: () => void }> = ({ opcoes, avisar, aoMudar }) => {
  const carga = useCarga(() => multiApi.profissionais(), []);
  const [editando, setEditando] = useState<Profissional | 'novo' | null>(null);
  const { tratarErro } = useFormValidationModal();
  const gerenciar = opcoes.permissoes.gerenciar;

  const excluir = async (p: Profissional) => {
    try {
      const excluido = await multiApi.excluirProfissional(p.id);
      avisar({ type: 'success', title: 'Profissional', message: excluido ? `${p.nome} excluído(a).` : `${p.nome} tem atendimentos e foi desativado(a).` });
      await carga.recarregar();
      aoMudar();
    } catch (e) {
      if (!tratarErro(e)) avisar({ type: 'error', title: 'Profissional', message: mensagemDeErro(e) });
    }
  };

  // Colunas estáveis; o estado atual (permissão, excluir) vem por ref.
  const ctx = useRef({ gerenciar, excluir });
  ctx.current = { gerenciar, excluir };
  const colunas = useMemo<ColumnDef<Profissional, unknown>[]>(() => [
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
      id: 'nome',
      header: 'Nome',
      accessorKey: 'nome',
      cell: ({ row }) => <span className="font-medium">{row.original.nome}{!row.original.ativo && <Badge variant="secondary" className="ml-2">Inativo</Badge>}</span>,
      meta: { exportHeader: 'Nome', exportValue: (p) => p.nome },
    },
    {
      id: 'cpf',
      header: 'CPF',
      accessorKey: 'cpf_mascarado',
      cell: ({ row }) => <span className="font-mono text-xs tabular-nums">{row.original.cpf_mascarado}</span>,
      meta: { exportHeader: 'CPF', exportValue: (p) => p.cpf_mascarado },
    },
    { id: 'cargo', header: 'Cargo', accessorFn: (p) => p.cargo?.nome ?? '—', meta: { exportHeader: 'Cargo', exportValue: (p) => p.cargo?.nome ?? '' } },
    {
      id: 'registro',
      header: 'Registro',
      accessorFn: (p) => p.registro_profissional ?? '',
      cell: ({ row }) => <span className="font-mono text-xs tabular-nums">{row.original.registro_profissional ?? '—'}</span>,
      meta: { exportHeader: 'Registro', exportValue: (p) => p.registro_profissional ?? '' },
    },
    {
      id: 'usuario',
      header: 'Usuário',
      accessorFn: (p) => p.usuario?.email ?? 'Sem acesso',
      cell: ({ row }) => <span className="text-sm">{row.original.usuario?.email ?? <span className="text-muted-foreground">Sem acesso</span>}</span>,
      meta: { exportHeader: 'Usuário', exportValue: (p) => p.usuario?.email ?? 'Sem acesso' },
    },
  ], []);

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        {gerenciar && <div className="flex justify-end"><Button onClick={() => setEditando('novo')}><Plus className="mr-1 h-4 w-4" />Novo profissional</Button></div>}
        <EstadoCarga carregando={carga.carregando && !carga.dados} erro={carga.erro} onTentar={() => void carga.recarregar()} />
        {carga.dados && (
          <DataTable
            columns={colunas}
            data={carga.dados}
            emptyText="Nenhum profissional cadastrado."
            exportable
            exportFileName="multiprofissional-profissionais"
            exportTitle="Multiprofissional — Profissionais"
          />
        )}
      </CardContent>
      {editando && (
        <ProfissionalModal opcoes={opcoes} profissional={editando === 'novo' ? null : editando} aoFechar={() => setEditando(null)}
          aoSalvar={() => { setEditando(null); avisar({ type: 'success', title: 'Profissional', message: 'Profissional salvo.' }); void carga.recarregar(); aoMudar(); }} />
      )}
    </Card>
  );
};

type Usuario = { id: number; nome: string; email: string };

const ProfissionalModal: React.FC<{ opcoes: Opcoes; profissional: Profissional | null; aoFechar: () => void; aoSalvar: () => void }> = ({ opcoes, profissional, aoFechar, aoSalvar }) => {
  const [dados, setDados] = useState({
    cpf: '', nome: '',
    cargo_id: profissional?.cargo?.id ?? (opcoes.cargos[0]?.id ?? 0),
    registro_profissional: profissional?.registro_profissional ?? '',
    telefone: profissional?.telefone ?? '',
    ativo: profissional?.ativo ?? true,
  });
  const [usuario, setUsuario] = useState<Usuario | null>(profissional?.usuario ?? null);
  const [busca, setBusca] = useState('');
  const [achados, setAchados] = useState<Usuario[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const { modal: modalValidacao, invalidar, tratarErro } = useFormValidationModal();
  const [salvando, setSalvando] = useState(false);

  const buscar = async (q: string) => {
    setBusca(q);
    if (q.trim().length < 2) return setAchados([]);
    try {
      setAchados(await multiApi.usuarios(q.trim()));
    } catch {
      setAchados([]);
    }
  };

  const salvar = async () => {
    setErro(null);
    if (!profissional && (!dados.cpf.trim() || !dados.nome.trim())) return invalidar([['validação', 'Informe CPF e nome.']]);
    if (!dados.cargo_id) return invalidar([['validação', 'Escolha o cargo (cadastre-o na aba Cadastros).']]);
    setSalvando(true);
    try {
      await multiApi.salvarProfissional(profissional?.id ?? null, {
        ...(profissional ? {} : { cpf: dados.cpf, nome: dados.nome.trim() }),
        cargo_id: dados.cargo_id,
        user_id: usuario?.id ?? null,
        registro_profissional: dados.registro_profissional || null,
        telefone: dados.telefone || null,
        ativo: dados.ativo,
      });
      aoSalvar();
    } catch (e) {
      if (!tratarErro(e)) setErro(mensagemDeErro(e));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal open onClose={aoFechar} title={profissional ? `Editar ${profissional.nome}` : 'Novo profissional'} size="lg"
      footer={<><Button variant="outline" onClick={aoFechar}>Cancelar</Button><Button onClick={() => void salvar()} isLoading={salvando}>Salvar</Button></>}>
      {modalValidacao}
      <div className="space-y-4">
        {profissional ? (
          <p className="text-sm">CPF <span className="font-mono tabular-nums">{profissional.cpf_mascarado}</span> — nome e CPF vêm do Cadastro de Pessoas.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="CPF *" value={dados.cpf} inputMode="numeric" maxLength={14} className="font-mono tabular-nums" onChange={(e) => setDados((d) => ({ ...d, cpf: e.target.value }))} />
            <Input label="Nome completo *" value={dados.nome} maxLength={200} onChange={(e) => setDados((d) => ({ ...d, nome: e.target.value }))} />
            <p className="text-xs text-muted-foreground sm:col-span-2">Se o CPF já estiver no Cadastro de Pessoas, o profissional é ligado a essa pessoa e o nome cadastrado lá é mantido.</p>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-3">
          <Select label="Cargo *" value={dados.cargo_id || null} onChange={(v) => setDados((d) => ({ ...d, cargo_id: Number(v) }))} placeholder="Selecione…"
            emptyText="Cadastre os cargos na aba Cadastros." options={opcoes.cargos.map((c) => ({ value: c.id, label: c.nome }))} />
          <Input label="Registro (CRP, CRFa...)" value={dados.registro_profissional} maxLength={50} onChange={(e) => setDados((d) => ({ ...d, registro_profissional: e.target.value }))} />
          <Input label="Telefone" value={dados.telefone} maxLength={30} onChange={(e) => setDados((d) => ({ ...d, telefone: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Usuário de acesso (opcional)</h3>
          {usuario ? (
            <Badge variant="outline" className="gap-1 py-1">{usuario.nome} — {usuario.email}
              <Button variant="ghost" size="sm" className="h-5 w-5 p-0" aria-label="Desligar usuário" onClick={() => setUsuario(null)}><X className="h-3 w-3" /></Button>
            </Badge>
          ) : (
            <div className="relative">
              <Input value={busca} placeholder="Buscar usuário por nome ou e-mail" aria-label="Buscar usuário" onChange={(e) => void buscar(e.target.value)} />
              {achados.length > 0 && (
                <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-background shadow">
                  {achados.map((u) => (
                    <li key={u.id}><button type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-accent" onClick={() => { setUsuario(u); setBusca(''); setAchados([]); }}>{u.nome} <span className="text-muted-foreground">— {u.email}</span></button></li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <p className="text-xs text-muted-foreground">Com usuário ligado, o profissional vê o relato dos atendimentos sigilosos de que participa.</p>
        </div>
        <label className="flex items-center gap-2 text-sm"><Switch checked={dados.ativo} onCheckedChange={(v) => setDados((d) => ({ ...d, ativo: v }))} aria-label="Profissional ativo" />Profissional ativo</label>
        {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
      </div>
    </Modal>
  );
};
