import React, { useMemo, useRef, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { ListPlus, Plus, Trash2 } from 'lucide-react';
import { ActionsMenu, Button, Card, CardContent, CardHeader, CardTitle, DataTable, Input, Switch } from '@sysgov/ui';
import type { Toast } from '../../escola/components/AdminModal';
import { EstadoCarga } from '../../escola/components/AdminModal';
import { useCarga } from '../../escola/useCarga';
import { mensagemDeErro, multiApi, type ItemCadastro, type TipoCadastro } from '../api';
import { useFormValidationModal } from '@/lib/useFormValidationModal';

const TITULOS: Record<TipoCadastro, string> = { cargos: 'Cargos', condicoes: 'Condições (CID)', 'tipos-atendimento': 'Tipos de atendimento' };

/** Cadastros simples. Item em uso é desativado em vez de excluído (o servidor decide). */
export const Cadastros: React.FC<{ avisar: Toast; aoMudar: () => void }> = ({ avisar, aoMudar }) => {
  const [versao, setVersao] = useState(0);

  const padroes = async () => {
    try {
      const r = await multiApi.carregarPadroes();
      avisar({ type: 'success', title: 'Itens padrão', message: `${r.cargos} cargo(s) e ${r.tipos} tipo(s) de atendimento criados.` });
      setVersao((v) => v + 1);
      aoMudar();
    } catch (e) {
      avisar({ type: 'error', title: 'Itens padrão', message: mensagemDeErro(e) });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button variant="outline" onClick={() => void padroes()}><ListPlus className="mr-1 h-4 w-4" />Carregar itens padrão</Button></div>
      <div className="grid gap-4 xl:grid-cols-3">
        {(Object.keys(TITULOS) as TipoCadastro[]).map((t) => <ListaCadastro key={`${t}-${versao}`} tipo={t} avisar={avisar} aoMudar={aoMudar} />)}
      </div>
    </div>
  );
};

const ListaCadastro: React.FC<{ tipo: TipoCadastro; avisar: Toast; aoMudar: () => void }> = ({ tipo, avisar, aoMudar }) => {
  const carga = useCarga(() => multiApi.cadastro(tipo), [tipo]);
  const [nome, setNome] = useState('');
  const { tratarErro } = useFormValidationModal();
  const [extra, setExtra] = useState('');
  const campoExtra = tipo === 'cargos' ? 'objetivos' : tipo === 'condicoes' ? 'cid' : null;

  const salvar = async (item: Partial<ItemCadastro> & { nome: string }) => {
    try {
      await multiApi.salvarCadastro(tipo, item);
      await carga.recarregar();
      aoMudar();
      return true;
    } catch (e) {
      if (!tratarErro(e)) avisar({ type: 'error', title: TITULOS[tipo], message: mensagemDeErro(e) });
      return false;
    }
  };

  const adicionar = async () => {
    const ok = await salvar({ nome: nome.trim(), ativo: true, ...(campoExtra ? { [campoExtra]: extra.trim() || null } : {}) });
    if (ok) { setNome(''); setExtra(''); }
  };

  const excluir = async (i: ItemCadastro) => {
    try {
      const excluido = await multiApi.excluirCadastro(tipo, i.id);
      avisar({ type: 'success', title: TITULOS[tipo], message: excluido ? `“${i.nome}” excluído.` : `“${i.nome}” está em uso e foi desativado.` });
      await carga.recarregar();
      aoMudar();
    } catch (e) {
      if (!tratarErro(e)) avisar({ type: 'error', title: TITULOS[tipo], message: mensagemDeErro(e) });
    }
  };

  // Colunas estáveis (o switch não remonta ao gravar); salvar/excluir atuais vêm por ref.
  const ctx = useRef({ salvar, excluir });
  ctx.current = { salvar, excluir };
  const colunas = useMemo<ColumnDef<ItemCadastro, unknown>[]>(() => [
    {
      id: 'acoes',
      header: '',
      size: 56,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-center">
          <ActionsMenu
            triggerLabel={`Ações de ${row.original.nome}`}
            items={[{ key: 'excluir', label: 'Excluir', icon: <Trash2 className="h-3.5 w-3.5" />, onSelect: () => void ctx.current.excluir(row.original) }]}
          />
        </div>
      ),
    },
    {
      id: 'nome',
      header: 'Nome',
      accessorFn: (i) => (tipo === 'condicoes' && i.cid ? `${i.cid} ${i.nome}` : i.nome),
      cell: ({ row }) => (
        <span>
          {tipo === 'condicoes' && row.original.cid && <span className="mr-2 font-mono text-xs tabular-nums">{row.original.cid}</span>}{row.original.nome}
          {row.original.objetivos && <span className="block text-xs text-muted-foreground">{row.original.objetivos}</span>}
        </span>
      ),
      meta: { exportHeader: 'Nome', exportValue: (i) => (tipo === 'condicoes' && i.cid ? `${i.cid} ${i.nome}` : i.nome) },
    },
    {
      id: 'ativo',
      header: 'Ativo',
      accessorFn: (i) => (i.ativo ? 'Sim' : 'Não'),
      cell: ({ row }) => <Switch checked={row.original.ativo} onCheckedChange={(v) => void ctx.current.salvar({ ...row.original, ativo: v })} aria-label={`Ativar ${row.original.nome}`} />,
      meta: { exportHeader: 'Ativo', exportValue: (i) => (i.ativo ? 'Sim' : 'Não') },
    },
  ], [tipo]);

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{TITULOS[tipo]}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end gap-2">
          {tipo === 'condicoes' && <div className="w-24"><Input label="CID" value={extra} maxLength={20} className="font-mono" onChange={(e) => setExtra(e.target.value)} /></div>}
          <div className="flex-1"><Input label="Novo item" value={nome} maxLength={tipo === 'condicoes' ? 200 : 150} onChange={(e) => setNome(e.target.value)} /></div>
          <Button disabled={!nome.trim()} aria-label={`Adicionar em ${TITULOS[tipo]}`} onClick={() => void adicionar()}><Plus className="h-4 w-4" /></Button>
        </div>
        {tipo === 'cargos' && <Input placeholder="Objetivos do cargo (opcional)" aria-label="Objetivos do cargo" value={extra} maxLength={300} onChange={(e) => setExtra(e.target.value)} />}
        <EstadoCarga carregando={carga.carregando && !carga.dados} erro={carga.erro} onTentar={() => void carga.recarregar()} />
        {carga.dados && (
          <DataTable
            columns={colunas}
            data={carga.dados}
            emptyText="Nenhum item cadastrado."
            exportable
            exportFileName={`multiprofissional-${tipo}`}
            exportTitle={`Multiprofissional — ${TITULOS[tipo]}`}
          />
        )}
      </CardContent>
    </Card>
  );
};
