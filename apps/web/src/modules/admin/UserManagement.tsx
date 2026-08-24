import React, { useState } from 'react';
import { Plus, Search, Edit, Trash2, Users, ShieldCheck } from 'lucide-react';
import { User } from './types';

interface Props {
  users: User[];
  onCreate: () => void;
  onEdit: (u: User) => void;
  onDelete: (u: User) => void;
  currentUserId: number | null;
}

export const UserManagement: React.FC<Props> = ({ users, onCreate, onEdit, onDelete, currentUserId }) => {
  const [search, setSearch] = useState('');

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  );

  const handleDelete = (u: User) => {
    if (u.id === currentUserId) {
      window.alert('Você não pode excluir o próprio usuário.');
      return;
    }
    if (window.confirm(`Excluir o usuário "${u.name}"? Esta ação é irreversível.`)) {
      onDelete(u);
    }
  };

  return (
    <div className="space-y-6">
      <div className="mod-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold mod-text-primary flex items-center gap-2">
            <Users className="text-indigo-500" size={20} /> Usuários da Plataforma
          </h1>
          <p className="text-sm mod-text-secondary mt-1">Gerencie contas, permissões e tenants vinculados.</p>
        </div>
        <button
          onClick={onCreate}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md"
        >
          <Plus className="w-3.5 h-3.5" /> Novo Usuário
        </button>
      </div>

      <div className="mod-card p-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 mod-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou e-mail..."
            className="mod-input w-full pl-10"
          />
        </div>
      </div>

      <div className="mod-card overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="mod-header border-b mod-border">
              <th className="py-3 px-4 font-semibold mod-text-secondary uppercase tracking-wider">Nome</th>
              <th className="py-3 px-4 font-semibold mod-text-secondary uppercase tracking-wider">E-mail</th>
              <th className="py-3 px-4 font-semibold mod-text-secondary uppercase tracking-wider">Tipo</th>
              <th className="py-3 px-4 font-semibold mod-text-secondary uppercase tracking-wider">Tenants</th>
              <th className="py-3 px-4 font-semibold mod-text-secondary uppercase tracking-wider">Criado em</th>
              <th className="py-3 px-4 text-right font-semibold mod-text-secondary uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y mod-border">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center mod-text-secondary">Nenhum usuário encontrado.</td>
              </tr>
            ) : (
              filtered.map((u) => (
                <tr key={u.id} className="mod-row-hover">
                  <td className="py-3 px-4 font-semibold mod-text-primary">{u.name}</td>
                  <td className="py-3 px-4 font-mono mod-text-secondary">{u.email}</td>
                  <td className="py-3 px-4">
                    {u.is_platform_admin ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700/40">
                        <ShieldCheck size={11} /> Admin
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border mod-border mod-text-secondary">
                        Usuário
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 flex flex-wrap gap-1">
                    {u.tenants.length === 0 ? <span className="mod-text-muted">—</span> : u.tenants.map((t) => (
                      <span key={t.id} className="sgf-badge-demo px-2 py-0.5 rounded text-[10px]">{t.slug}</span>
                    ))}
                  </td>
                  <td className="py-3 px-4 font-mono mod-text-secondary">{u.created_at?.split('T')[0] ?? '—'}</td>
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button onClick={() => onEdit(u)} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-blue-500" title="Editar">
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(u)}
                        disabled={u.id === currentUserId}
                        className="p-1.5 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
