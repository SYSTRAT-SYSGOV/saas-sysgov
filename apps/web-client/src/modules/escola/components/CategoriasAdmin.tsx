import React, { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Tags, Pencil, Trash2 } from 'lucide-react';
import { ActionsMenu, DataTable } from '@sysgov/ui';
import { escolaApi, erroApi, type Categoria as CategoriaOcorrencia } from '../api';
import { useCarga } from '../useCarga';
import AdminModal, { inputCls, labelCls, btnPrimary, btnSecondary, EstadoCarga, type Toast } from './AdminModal';
import { ConfirmModal } from './AlunoModals';
import { useFormValidationModal } from '@/lib/useFormValidationModal';

type ModalState =
  | { kind: 'form'; categoria: CategoriaOcorrencia | null }
  | { kind: 'excluir'; categoria: CategoriaOcorrencia }
  | null;

interface CategoriasAdminProps {
  onToast: Toast;
}

export const CategoriasAdmin: React.FC<CategoriasAdminProps> = ({ onToast }) => {
  const carga = useCarga(escolaApi.categorias);
  const categorias = carga.dados ?? [];
  const [modal, setModal] = useState<ModalState>(null);

  const recarregar = async () => {
    setModal(null);
    await carga.recarregar();
  };

  const excluir = async (c: CategoriaOcorrencia) => {
    try {
      await escolaApi.excluirCategoria(c.id);
      onToast({ type: 'success', title: 'Categoria excluída', message: `${c.nome} foi removida.` });
      await recarregar();
    } catch (e) {
      setModal(null);
      onToast({ type: 'error', title: 'Não foi possível excluir', message: erroApi(e).mensagem });
    }
  };

  const colunas = useMemo<ColumnDef<CategoriaOcorrencia, unknown>[]>(() => [
    {
      id: 'acoes',
      header: '',
      size: 56,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-center">
          <ActionsMenu
            triggerLabel={`Ações de ${row.original.nome}`}
            items={[
              { key: 'editar', label: 'Editar', icon: <Pencil className="h-3.5 w-3.5" />, onSelect: () => setModal({ kind: 'form', categoria: row.original }) },
              { key: 'excluir', label: 'Excluir', icon: <Trash2 className="h-3.5 w-3.5" />, onSelect: () => setModal({ kind: 'excluir', categoria: row.original }) },
            ]}
          />
        </div>
      ),
    },
    {
      id: 'nome',
      header: 'Nome',
      accessorKey: 'nome',
      cell: ({ row }) => (
        <span className="flex items-center gap-3">
          <span className="h-4 w-4 shrink-0 rounded-full" style={{ backgroundColor: row.original.cor }} />
          <strong>{row.original.nome}</strong>
        </span>
      ),
      meta: { exportHeader: 'Nome', exportValue: (c) => c.nome },
    },
    {
      id: 'cor',
      header: 'Cor',
      accessorKey: 'cor',
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.cor}</span>,
      meta: { exportHeader: 'Cor', exportValue: (c) => c.cor },
    },
  ], []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Categorias de Ocorrência</h2>
        <button
          onClick={() => setModal({ kind: 'form', categoria: null })}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm"
        >
          <Tags className="w-4 h-4" /> Nova Categoria
        </button>
      </div>

      {carga.carregando || carga.erro ? (
        <EstadoCarga carregando={carga.carregando} erro={carga.erro} onTentar={carga.recarregar} />
      ) : (
        <DataTable
          columns={colunas}
          data={categorias}
          emptyText="Nenhuma categoria cadastrada."
          exportable
          exportFileName="escola-categorias-ocorrencia"
          exportTitle="Cadastro Escolar — Categorias de Ocorrência"
        />
      )}

      {modal?.kind === 'form' && (
        <CategoriaFormModal categoria={modal.categoria} onClose={() => setModal(null)} onSaved={recarregar} onToast={onToast} />
      )}
      {modal?.kind === 'excluir' && (
        <ConfirmModal
          title="Excluir categoria?"
          message={`Excluir a categoria ${modal.categoria.nome}? As ocorrências já registradas mantêm o nome da categoria.`}
          confirmLabel="Sim, excluir"
          onConfirm={() => excluir(modal.categoria)}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
};

// ─── Nova / Editar Categoria (nome + cor) ──────────────────────────────

interface CategoriaFormModalProps {
  categoria: CategoriaOcorrencia | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
  onToast: Toast;
}

const CategoriaFormModal: React.FC<CategoriaFormModalProps> = ({ categoria, onClose, onSaved, onToast }) => {
  const [nome, setNome] = useState(categoria?.nome || '');
  const [cor, setCor] = useState(categoria?.cor || '#6366f1');
  const [erro, setErro] = useState('');
  const { modal: modalValidacao, invalidar, tratarErro } = useFormValidationModal();
  const [salvando, setSalvando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = nome.trim();
    if (!n) return invalidar([['validação', 'Informe o nome da categoria.']]);
    setSalvando(true);
    try {
      await escolaApi.salvarCategoria({ nome: n, cor }, categoria?.id);
      onToast({ type: 'success', title: categoria ? 'Categoria atualizada' : 'Categoria cadastrada', message: `${n} salva com sucesso.` });
      onSaved();
    } catch (e) {
      if (!tratarErro(e)) setErro(erroApi(e).mensagem);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <AdminModal
      title={categoria ? 'Editar Categoria' : 'Nova Categoria'}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <button type="button" onClick={onClose} className={btnSecondary}>Cancelar</button>
          <button type="submit" form="form-categoria" className={btnPrimary} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</button>
        </>
      }
    >
      {modalValidacao}
      <form noValidate id="form-categoria" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls} htmlFor="cat-nome">Nome</label>
          <input id="cat-nome" className={inputCls} value={nome} onChange={e => { setNome(e.target.value); setErro(''); }} autoFocus />
        </div>
        <div>
          <label className={labelCls} htmlFor="cat-cor">Cor</label>
          <div className="flex items-center gap-3">
            <input
              id="cat-cor"
              type="color"
              value={cor}
              onChange={e => setCor(e.target.value)}
              className="flex-1 h-11 p-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 cursor-pointer"
            />
            <span className="font-mono text-xs text-slate-600 dark:text-slate-300 w-16">{cor}</span>
          </div>
        </div>
        {erro && <p className="text-sm font-medium text-red-600">{erro}</p>}
      </form>
    </AdminModal>
  );
};

export default CategoriasAdmin;
