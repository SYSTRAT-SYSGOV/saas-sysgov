import React, { useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, Trash2 } from 'lucide-react';
import { ActionsMenu, Button, Card, CardContent, DataTable, Input, Switch } from '@sysgov/ui';
import type { Toast } from '../../escola/components/AdminModal';
import { EstadoCarga } from '../../escola/components/AdminModal';
import { useCarga } from '../../escola/useCarga';
import { ataApi, mensagemDeErro, type TipoAta } from '../api';
import { useFormValidationModal } from '@/lib/useFormValidationModal';

/** Tipos de ata do tenant. Tipo já usado em ata é desativado em vez de excluído (o servidor decide). */
export const TiposAta: React.FC<{ avisar: Toast; aoMudar: () => void }> = ({ avisar, aoMudar }) => {
  const carga = useCarga(() => ataApi.tipos(), []);
  const [novo, setNovo] = useState('');
  const { modal: modalValidacao, validar, tratarErro } = useFormValidationModal();

  const salvar = async (tipo: { id?: number; nome: string; ativo: boolean }) => {
    try {
      await ataApi.salvarTipo(tipo);
      await carga.recarregar();
      aoMudar();
    } catch (e) {
      if (!tratarErro(e)) avisar({ type: 'error', title: 'Tipo de ata', message: mensagemDeErro(e) });
    }
  };

  const excluir = async (t: TipoAta) => {
    try {
      await ataApi.excluirTipo(t.id);
      await carga.recarregar();
      aoMudar();
      avisar({ type: 'success', title: 'Tipo de ata', message: `“${t.nome}” removido (ou desativado, se já foi usado).` });
    } catch (e) {
      avisar({ type: 'error', title: 'Tipo de ata', message: mensagemDeErro(e) });
    }
  };

  // As ações dependem de salvar/excluir (recriadas a cada render), então as colunas não são memoizadas.
  const colunas: ColumnDef<TipoAta, unknown>[] = [
    {
      id: 'acoes',
      header: '',
      size: 56,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-center">
          <ActionsMenu
            triggerLabel="Ações do tipo de ata"
            items={[{ key: 'excluir', label: 'Excluir', icon: <Trash2 className="h-3.5 w-3.5" />, onSelect: () => void excluir(row.original) }]}
          />
        </div>
      ),
    },
    { id: 'nome', header: 'Nome', accessorKey: 'nome', meta: { exportHeader: 'Nome', exportValue: (t) => t.nome } },
    {
      id: 'ativo',
      header: 'Ativo',
      accessorFn: (t) => (t.ativo ? 'Sim' : 'Não'),
      cell: ({ row }) => <Switch checked={row.original.ativo} onCheckedChange={(v) => void salvar({ ...row.original, ativo: v })} aria-label={`Ativar ${row.original.nome}`} />,
      meta: { exportHeader: 'Ativo', exportValue: (t) => (t.ativo ? 'Sim' : 'Não') },
    },
  ];

  return (
    <Card>
      {modalValidacao}
      <CardContent className="space-y-4 p-4">
        <div className="flex items-end gap-2">
          <div className="flex-1"><Input label="Novo tipo de ata" value={novo} onChange={(e) => setNovo(e.target.value)} maxLength={150} /></div>
          <Button onClick={() => { if (validar([['Nome do tipo', novo]])) void salvar({ nome: novo.trim(), ativo: true }).then(() => setNovo('')); }}><Plus className="mr-1 h-4 w-4" />Adicionar</Button>
        </div>
        <EstadoCarga carregando={carga.carregando && !carga.dados} erro={carga.erro} onTentar={() => void carga.recarregar()} />
        {carga.dados && (
          <DataTable
            columns={colunas}
            data={carga.dados}
            emptyText="Nenhum tipo de ata cadastrado."
            exportable
            exportFileName="ata-tipos"
            exportTitle="Atas — Tipos de ata"
          />
        )}
      </CardContent>
    </Card>
  );
};
