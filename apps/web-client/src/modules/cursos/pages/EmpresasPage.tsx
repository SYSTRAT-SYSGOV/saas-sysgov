import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Building2, Pencil, Save, Trash2, X } from 'lucide-react';
import { Button, Card, Input, Switch, DataTable } from '@sysgov/ui';
import { sysgovApi, type EmpresaCursos, type EmpresaCursosInput } from '@sysgov/sdk';
import { ConfirmDialog, EmptyState, ScreenState, StatusChip } from '@/components/ui';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { colunaAcoes } from '@/lib/colunaAcoes';
import { ErroFormulario } from '../components/ErroFormulario';
import { useFormValidationModal } from '@/lib/useFormValidationModal';

const VAZIO = { razao_social: '', nome_fantasia: '', cnpj: '', email: '', telefone: '', responsavel: '', observacoes: '' };

/** 00.000.000/0000-00 a partir dos dígitos. */
export function formatarCnpj(cnpj: string | null): string {
  const d = (cnpj ?? '').replace(/\D/g, '');
  return d.length === 14 ? `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}` : d;
}

/**
 * Biblioteca de empresas do órgão (D10). O participante ligado a uma empresa imprime {EMPRESA}
 * (nome fantasia, ou a razão social) e {CNPJ} no certificado; sem empresa, {EMPRESA} sai
 * "Autônomo", como no sistema de referência.
 */
export const EmpresasPage: React.FC = () => {
  const [empresas, setEmpresas] = useState<EmpresaCursos[] | null>(null);
  const [form, setForm] = useState(VAZIO);
  const [editando, setEditando] = useState<EmpresaCursos | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const { modal: modalValidacao, validar, tratarErro } = useFormValidationModal();
  const [excluir, setExcluir] = useState<EmpresaCursos | null>(null);

  const carregar = useCallback(async () => {
    try {
      setEmpresas((await sysgovApi.cursos.listarEmpresas()).empresas);
    } catch (e) {
      if (!tratarErro(e)) setErro(getApiErrorMessage(e, 'Não foi possível carregar as empresas.'));
      setEmpresas([]);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const definir = (campo: keyof typeof VAZIO, valor: string) => setForm((f) => ({ ...f, [campo]: valor }));

  const editar = (e: EmpresaCursos) => {
    setEditando(e);
    setErro(null);
    setForm({
      razao_social: e.razao_social, nome_fantasia: e.nome_fantasia ?? '', cnpj: formatarCnpj(e.cnpj), email: e.email ?? '',
      telefone: e.telefone ?? '', responsavel: e.responsavel ?? '', observacoes: e.observacoes ?? '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelar = () => {
    setEditando(null);
    setForm(VAZIO);
    setErro(null);
  };

  const salvar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validar([['Razão social', form.razao_social]])) return;
    setSalvando(true);
    setErro(null);
    const dados: EmpresaCursosInput = {
      razao_social: form.razao_social.trim(),
      nome_fantasia: form.nome_fantasia.trim() || null,
      cnpj: form.cnpj.trim() || null,
      email: form.email.trim() || null,
      telefone: form.telefone.trim() || null,
      responsavel: form.responsavel.trim() || null,
      observacoes: form.observacoes.trim() || null,
    };
    try {
      if (editando) await sysgovApi.cursos.atualizarEmpresa(editando.id, dados);
      else await sysgovApi.cursos.criarEmpresa(dados);
      cancelar();
      await carregar();
    } catch (e) {
      if (!tratarErro(e)) setErro(getApiErrorMessage(e, 'Não foi possível salvar a empresa.'));
    } finally {
      setSalvando(false);
    }
  };

  const alternarAtiva = async (e: EmpresaCursos) => {
    try {
      await sysgovApi.cursos.atualizarEmpresa(e.id, { ativa: !e.ativa });
      await carregar();
    } catch (err) {
      if (!tratarErro(err)) setErro(getApiErrorMessage(err, 'Não foi possível alterar a empresa.'));
    }
  };

  // Colunas estáveis (o switch não remonta ao gravar); os handlers atuais vêm por ref.
  const ctx = useRef({ editar, alternarAtiva });
  ctx.current = { editar, alternarAtiva };
  const colunas = useMemo<ColumnDef<EmpresaCursos, unknown>[]>(() => [
    colunaAcoes<EmpresaCursos>((e) => `Ações de ${e.razao_social}`, (e) => [
      { key: 'editar', label: 'Editar', icon: <Pencil className="h-3.5 w-3.5" />, onSelect: () => ctx.current.editar(e) },
      { key: 'excluir', label: 'Excluir', icon: <Trash2 className="h-3.5 w-3.5" />, onSelect: () => setExcluir(e) },
    ]),
    { id: 'razao', header: 'Razão social', accessorKey: 'razao_social', cell: ({ row }) => <span className="font-medium">{row.original.razao_social}</span>, meta: { exportHeader: 'Razão social', exportValue: (e) => e.razao_social } },
    { id: 'fantasia', header: 'Nome fantasia', accessorFn: (e) => e.nome_fantasia ?? '', cell: ({ row }) => <span className="text-sm">{row.original.nome_fantasia || '—'}</span>, meta: { exportHeader: 'Nome fantasia', exportValue: (e) => e.nome_fantasia ?? '' } },
    { id: 'cnpj', header: 'CNPJ', accessorFn: (e) => formatarCnpj(e.cnpj), cell: ({ row }) => <span className="font-mono text-sm tabular-nums">{formatarCnpj(row.original.cnpj) || '—'}</span>, meta: { exportHeader: 'CNPJ', exportValue: (e) => formatarCnpj(e.cnpj) } },
    {
      id: 'status', header: 'Status', accessorFn: (e) => (e.ativa ? 'Ativa' : 'Inativa'),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Switch checked={row.original.ativa} onCheckedChange={() => void ctx.current.alternarAtiva(row.original)} label={`Ativar ${row.original.razao_social}`} />
          <StatusChip label={row.original.ativa ? 'Ativa' : 'Inativa'} variant={row.original.ativa ? 'success' : 'neutral'} />
        </div>
      ),
      meta: { exportHeader: 'Status', exportValue: (e) => (e.ativa ? 'Ativa' : 'Inativa') },
    },
  ], []);

  if (empresas === null) return <ScreenState type="loading" title="Carregando empresas..." />;

  return (
    <div className="space-y-4">
      {modalValidacao}
      <Card className="p-4">
        <h3 className="mb-3 text-base font-semibold">{editando ? `Editar empresa — ${editando.razao_social}` : 'Cadastrar nova empresa'}</h3>
        <form noValidate onSubmit={salvar} className="space-y-3">
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_14rem]">
            <Input label="Razão social *" value={form.razao_social} onChange={(e) => definir('razao_social', e.target.value)} maxLength={150} />
            <Input label="Nome fantasia (sai em {EMPRESA})" value={form.nome_fantasia} onChange={(e) => definir('nome_fantasia', e.target.value)} maxLength={150} />
            <Input label="CNPJ" value={form.cnpj} onChange={(e) => definir('cnpj', e.target.value)} maxLength={18} placeholder="00.000.000/0000-00" className="font-mono tabular-nums" />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <Input label="E-mail" type="email" value={form.email} onChange={(e) => definir('email', e.target.value)} maxLength={150} />
            <Input label="Telefone" value={form.telefone} onChange={(e) => definir('telefone', e.target.value)} maxLength={20} className="font-mono tabular-nums" />
            <Input label="Responsável" value={form.responsavel} onChange={(e) => definir('responsavel', e.target.value)} maxLength={150} />
          </div>
          <Input label="Observações internas" value={form.observacoes} onChange={(e) => definir('observacoes', e.target.value)} maxLength={255} />
          <ErroFormulario mensagem={erro} />
          <div className="flex gap-2">
            <Button type="submit" isLoading={salvando}><Save className="h-4 w-4" /> Salvar empresa</Button>
            {editando && <Button type="button" variant="outline" onClick={cancelar}><X className="h-4 w-4" /> Cancelar edição</Button>}
          </div>
        </form>
      </Card>

      <Card className="p-4">
        <h3 className="mb-3 text-base font-semibold">Empresas cadastradas</h3>
        {empresas.length === 0 ? (
          <EmptyState icon={<Building2 className="h-8 w-8" />} title="Nenhuma empresa" description="Cadastre as empresas que enviam participantes; elas saem em {EMPRESA} e {CNPJ} no certificado." />
        ) : (
          <DataTable
            columns={colunas}
            data={empresas}
            emptyText="Nenhuma empresa."
            exportable
            exportFileName="cursos-empresas"
            exportTitle="Cursos — Empresas"
          />
        )}
      </Card>

      <ConfirmDialog
        open={excluir !== null}
        onClose={() => setExcluir(null)}
        requireReason={false}
        title="Excluir empresa"
        description={`Excluir "${excluir?.razao_social ?? ''}"? Se houver participante ligado a ela, a exclusão será recusada — desative-a.`}
        confirmLabel="Excluir"
        onConfirm={() => {
          const alvo = excluir;
          setExcluir(null);
          if (alvo) sysgovApi.cursos.excluirEmpresa(alvo.id).then(carregar).catch((e) => setErro(getApiErrorMessage(e, 'Não foi possível excluir.')));
        }}
      />
    </div>
  );
};

export default EmpresasPage;
