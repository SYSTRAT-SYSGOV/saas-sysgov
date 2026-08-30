import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Loader2, X, Check } from 'lucide-react';
import { accessApi, Cargo } from '../AccessApi';

export const CargosManagement: React.FC<{ notify: (t: any) => void }> = ({ notify }) => {
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ edit?: Cargo } | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { const d = await accessApi.cargos(); setCargos(d); }
    catch (e: any) { notify({ type: 'error', title: 'Erro', message: 'Falha ao carregar cargos.' }); }
    finally { setLoading(false); }
  }, [notify]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setName(''); setDescription(''); setModal({}); };
  const openEdit = (c: Cargo) => { setName(c.name); setDescription(c.description ?? ''); setModal({ edit: c }); };

  const handleSave = async () => {
    if (!name.trim()) return;
    try {
      if (modal?.edit) {
        await accessApi.updateCargo(modal.edit.id, { name: name.trim(), description: description.trim() || null });
        notify({ type: 'success', title: 'Atualizado', message: 'Cargo atualizado.' });
      } else {
        await accessApi.createCargo({ name: name.trim(), description: description.trim() || null });
        notify({ type: 'success', title: 'Criado', message: 'Cargo criado.' });
      }
      setModal(null); load();
    } catch (e: any) { notify({ type: 'error', title: 'Erro', message: e?.response?.data?.message || e?.message }); }
  };

  const handleDelete = async (c: Cargo) => {
    if (!window.confirm(`Excluir cargo "${c.name}"?`)) return;
    try { await accessApi.deleteCargo(c.id); notify({ type: 'success', title: 'Excluído', message: 'Cargo removido.' }); load(); }
    catch (e: any) { notify({ type: 'error', title: 'Erro', message: e?.response?.data?.message || e?.message }); }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-gov-border shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gov-border flex items-center justify-between">
        <h3 className="text-sm font-bold text-gov-text-primary">Cargos</h3>
        <button onClick={openCreate} className="inline-flex items-center gap-1.5 bg-gov-primary text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-gov-primary-hover">
          <Plus className="w-3.5 h-3.5" /> Novo Cargo
        </button>
      </div>
      {loading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gov-primary" /></div>
        : cargos.length === 0 ? <p className="text-center text-gov-text-muted py-12 text-xs">Nenhum cargo cadastrado.</p>
        : <table className="w-full text-xs"><thead><tr className="text-left text-gov-text-muted uppercase tracking-wider text-[10px] border-b border-gov-border">
          <th className="py-3 px-4">Nome</th><th className="py-3 px-4">Descrição</th><th className="py-3 px-4 text-right">Ações</th>
        </tr></thead><tbody className="divide-y divide-gov-border">
          {cargos.map((c) => (
            <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
              <td className="py-3 px-4 font-medium text-gov-text-primary">{c.name}</td>
              <td className="py-3 px-4 text-gov-text-muted">{c.description ?? '—'}</td>
              <td className="py-3 px-4 text-right">
                <button onClick={() => openEdit(c)} className="p-1.5 text-gov-text-secondary hover:text-gov-primary"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(c)} className="p-1.5 text-gov-text-secondary hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
              </td>
            </tr>
          ))}
        </tbody></table>}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-sm mx-4 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold">{modal.edit ? 'Editar Cargo' : 'Novo Cargo'}</h3>
              <button onClick={() => setModal(null)}><X className="w-5 h-5 text-gov-text-muted hover:text-gov-text-primary" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="block text-xs font-semibold text-gov-text-secondary mb-1">Nome *</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border border-gov-border rounded-lg text-sm" /></div>
              <div><label className="block text-xs font-semibold text-gov-text-secondary mb-1">Descrição</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full px-3 py-2 border border-gov-border rounded-lg text-sm" /></div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setModal(null)} className="px-4 py-2 text-xs text-gov-text-secondary border border-gov-border rounded-lg">Cancelar</button>
                <button onClick={handleSave} disabled={!name.trim()} className="inline-flex items-center gap-1 px-4 py-2 text-xs bg-gov-primary text-white rounded-lg disabled:opacity-50">
                  <Check className="w-3.5 h-3.5" /> Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};