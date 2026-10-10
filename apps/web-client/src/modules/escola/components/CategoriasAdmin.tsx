import React, { useState } from 'react';
import { Tags, Pencil, Trash2 } from 'lucide-react';
import { escolaApi, erroApi, type Categoria as CategoriaOcorrencia } from '../api';
import { useCarga } from '../useCarga';
import AdminModal, { inputCls, labelCls, btnPrimary, btnSecondary, EstadoCarga, type Toast } from './AdminModal';
import { ConfirmModal } from './AlunoModals';

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
      ) : categorias.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-14 text-slate-500">
          <Tags className="w-10 h-10 text-slate-300" />
          <p className="text-sm">Nenhuma categoria cadastrada.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3 w-1/5">Cor</th>
                <th className="px-4 py-3 w-1/4">Ações</th>
              </tr>
            </thead>
            <tbody>
              {categorias.map(c => (
                <tr key={c.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-4">
                    <span className="flex items-center gap-3">
                      <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: c.cor }} />
                      <strong className="text-base text-slate-900 dark:text-white">{c.nome}</strong>
                    </span>
                  </td>
                  <td className="px-4 py-4 font-mono text-xs text-slate-700 dark:text-slate-300">{c.cor}</td>
                  <td className="px-4 py-4">
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setModal({ kind: 'form', categoria: c })}
                        title="Editar"
                        aria-label={`Editar ${c.nome}`}
                        className="w-11 h-8 rounded-lg flex items-center justify-center bg-indigo-100 text-indigo-800 hover:bg-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setModal({ kind: 'excluir', categoria: c })}
                        title="Excluir"
                        aria-label={`Excluir ${c.nome}`}
                        className="w-11 h-8 rounded-lg flex items-center justify-center bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-950/40 dark:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
  const [salvando, setSalvando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = nome.trim();
    if (!n) return setErro('Informe o nome da categoria.');
    setSalvando(true);
    try {
      await escolaApi.salvarCategoria({ nome: n, cor }, categoria?.id);
      onToast({ type: 'success', title: categoria ? 'Categoria atualizada' : 'Categoria cadastrada', message: `${n} salva com sucesso.` });
      onSaved();
    } catch (e) {
      setErro(erroApi(e).mensagem);
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
      <form id="form-categoria" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls} htmlFor="cat-nome">Nome</label>
          <input id="cat-nome" className={inputCls} value={nome} onChange={e => { setNome(e.target.value); setErro(''); }} autoFocus required />
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
