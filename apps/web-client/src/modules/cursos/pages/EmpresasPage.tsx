import React, { useCallback, useEffect, useState } from 'react';
import { Building2, Pencil, Save, Trash2, X } from 'lucide-react';
import { Button, Card, Input, Switch, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@sysgov/ui';
import { sysgovApi, type EmpresaCursos, type EmpresaCursosInput } from '@sysgov/sdk';
import { ConfirmDialog, EmptyState, ScreenState, StatusChip } from '@/components/ui';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { ErroFormulario } from '../components/ErroFormulario';

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
  const [excluir, setExcluir] = useState<EmpresaCursos | null>(null);

  const carregar = useCallback(async () => {
    try {
      setEmpresas((await sysgovApi.cursos.listarEmpresas()).empresas);
    } catch (e) {
      setErro(getApiErrorMessage(e, 'Não foi possível carregar as empresas.'));
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
      setErro(getApiErrorMessage(e, 'Não foi possível salvar a empresa.'));
    } finally {
      setSalvando(false);
    }
  };

  const alternarAtiva = async (e: EmpresaCursos) => {
    try {
      await sysgovApi.cursos.atualizarEmpresa(e.id, { ativa: !e.ativa });
      await carregar();
    } catch (err) {
      setErro(getApiErrorMessage(err, 'Não foi possível alterar a empresa.'));
    }
  };

  if (empresas === null) return <ScreenState type="loading" title="Carregando empresas..." />;

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="mb-3 text-base font-semibold">{editando ? `Editar empresa — ${editando.razao_social}` : 'Cadastrar nova empresa'}</h3>
        <form onSubmit={salvar} className="space-y-3">
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_14rem]">
            <Input label="Razão social *" value={form.razao_social} onChange={(e) => definir('razao_social', e.target.value)} required maxLength={150} />
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Razão social</TableHead>
                <TableHead>Nome fantasia</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {empresas.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.razao_social}</TableCell>
                  <TableCell className="text-sm">{e.nome_fantasia || '—'}</TableCell>
                  <TableCell className="font-mono text-sm tabular-nums">{formatarCnpj(e.cnpj) || '—'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch checked={e.ativa} onCheckedChange={() => void alternarAtiva(e)} label={`Ativar ${e.razao_social}`} />
                      <StatusChip label={e.ativa ? 'Ativa' : 'Inativa'} variant={e.ativa ? 'success' : 'neutral'} />
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    <Button size="icon-sm" variant="ghost" aria-label={`Editar ${e.razao_social}`} onClick={() => editar(e)}><Pencil /></Button>
                    <Button size="icon-sm" variant="ghost" aria-label={`Excluir ${e.razao_social}`} onClick={() => setExcluir(e)}><Trash2 /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
