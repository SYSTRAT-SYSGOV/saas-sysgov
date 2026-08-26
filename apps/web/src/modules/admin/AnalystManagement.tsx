import React, { useState, useEffect, useCallback } from 'react';
import { UserPlus, Users, X, ChevronDown, ChevronRight, Trash2, Loader2, Headset, Plus, Clock } from 'lucide-react';
import { adminApi } from './api';
import { Analyst, Tenant } from './types';

interface Props {
  onAddToast: (toast: { type: 'success' | 'info' | 'warning' | 'error'; title: string; message: string }) => void;
}

const AnalystManagement: React.FC<Props> = ({ onAddToast }) => {
  const [analysts, setAnalysts] = useState<Analyst[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [createForm, setCreateForm] = useState({ name: '', email: '', password: '', password_confirmation: '' });
  const [assignForm, setAssignForm] = useState<{
    analystId: number;
    tenantId: number;
    can_read: boolean;
    can_write: boolean;
    expires_at: string;
  }>({ analystId: 0, tenantId: 0, can_read: true, can_write: false, expires_at: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, t] = await Promise.all([adminApi.getAnalysts(), adminApi.getTenants()]);
      setAnalysts(a);
      setTenants(t.data ?? []);
    } catch (error: any) {
      onAddToast({ type: 'error', title: 'Falha ao carregar', message: error.message || 'Não foi possível carregar analistas.' });
    } finally {
      setLoading(false);
    }
  }, [onAddToast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (createForm.password !== createForm.password_confirmation) {
      onAddToast({ type: 'error', title: 'Senhas diferentes', message: 'A confirmação de senha não confere.' });
      return;
    }
    setSaving(true);
    try {
      const created = await adminApi.createAnalyst(createForm);
      onAddToast({ type: 'success', title: 'Analista criado', message: `${created.email} agora é analista de suporte.` });
      setCreateOpen(false);
      setCreateForm({ name: '', email: '', password: '', password_confirmation: '' });
      load();
    } catch (error: any) {
      onAddToast({ type: 'error', title: 'Falha ao criar', message: error.message || 'Não foi possível criar o analista.' });
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignForm.analystId || !assignForm.tenantId) return;
    setSaving(true);
    try {
      await adminApi.assignAnalystTenant(assignForm.analystId, {
        tenant_id: assignForm.tenantId,
        can_read: assignForm.can_read,
        can_write: assignForm.can_write,
        expires_at: assignForm.expires_at || null,
      });
      onAddToast({ type: 'success', title: 'Cliente liberado', message: 'Tenant adicionado à carteira do analista.' });
      setAssignForm({ analystId: 0, tenantId: 0, can_read: true, can_write: false, expires_at: '' });
      load();
    } catch (error: any) {
      onAddToast({ type: 'error', title: 'Falha ao liberar', message: error.message || 'Não foi possível liberar o tenant.' });
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async (analystId: number, tenantId: number) => {
    if (!window.confirm('Remover este cliente da carteira do analista?')) return;
    try {
      await adminApi.revokeAnalystTenant(analystId, tenantId);
      onAddToast({ type: 'info', title: 'Acesso revogado', message: 'Cliente removido da carteira.' });
      load();
    } catch (error: any) {
      onAddToast({ type: 'error', title: 'Falha ao revogar', message: error.message || 'Não foi possível revogar o acesso.' });
    }
  };

  const openAssign = (analystId: number) => {
    // Expande a linha do analista para exibir o formulário de liberação
    setExpandedId(analystId);
    setAssignForm({ analystId, tenantId: 0, can_read: true, can_write: false, expires_at: '' });
  };

  if (loading && analysts.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Headset className="w-5 h-5 text-indigo-500" /> Analistas de Suporte
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Cada analista acessa somente os clientes liberados (carteira). Todos os acessos e modificações são auditados.
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <UserPlus className="w-4 h-4" /> Novo Analista
        </button>
      </div>

      <div className="mod-card overflow-hidden">
        {analysts.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">
            Nenhum analista cadastrado. Clique em "Novo Analista".
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b mod-border text-left text-xs uppercase tracking-wider mod-text-secondary">
                <th className="py-3 px-4 font-semibold"></th>
                <th className="py-3 px-4 font-semibold">Nome</th>
                <th className="py-3 px-4 font-semibold">E-mail</th>
                <th className="py-3 px-4 font-semibold">Clientes na Carteira</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 text-right font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {analysts.map((a) => (
                <React.Fragment key={a.id}>
                  <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <button onClick={() => setExpandedId(expandedId === a.id ? null : a.id)} className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800">
                        {expandedId === a.id ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                      </button>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">{a.name}</td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-500">{a.email}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                        <Users className="w-3 h-3" /> {a.tenants.length}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${a.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                        {a.is_active ? 'ATIVO' : 'INATIVO'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => openAssign(a.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" /> Liberar Cliente
                      </button>
                    </td>
                  </tr>
                  {expandedId === a.id && (
                    <tr>
                      <td colSpan={6} className="px-4 pb-4">
                        <div className="bg-slate-50 dark:bg-slate-900 rounded-xl border mod-border p-4">
                          <h4 className="text-xs font-bold mod-text-primary mb-3 uppercase tracking-wider">Carteira de Clientes</h4>
                          {a.tenants.length === 0 ? (
                            <p className="text-xs mod-text-secondary">Nenhum cliente liberado. Use "Liberar Cliente".</p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {a.tenants.map((t) => (
                                <div key={t.id} className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-slate-800 border mod-border">
                                  <div className="min-w-0">
                                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{t.name}</p>
                                    <p className="font-mono text-[10px] text-slate-400">{t.slug}{t.uf ? ` • ${t.city}/${t.uf}` : ''}</p>
                                    <p className="text-[10px] mt-0.5">
                                      <span className={`font-semibold ${t.can_read ? 'text-emerald-600' : 'text-slate-400'}`}>Leitura</span>
                                      <span className="text-slate-300"> • </span>
                                      <span className={`font-semibold ${t.can_write ? 'text-amber-600' : 'text-slate-400'}`}>Escrita</span>
                                      {t.expires_at && (
                                        <span className="text-slate-400 ml-1 inline-flex items-center gap-0.5">
                                          <Clock className="w-3 h-3" /> até {new Date(t.expires_at).toLocaleDateString('pt-BR')}
                                        </span>
                                      )}
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => handleRevoke(a.id, t.id)}
                                    title="Revogar acesso"
                                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Form de liberação */}
                          <form onSubmit={handleAssign} className="mt-4 p-3 rounded-lg bg-white dark:bg-slate-800 border mod-border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                            <input type="hidden" value={assignForm.analystId} readOnly />
                            <div className="lg:col-span-2">
                              <label className="block text-[10px] font-bold uppercase tracking-wider mod-text-secondary mb-1">Cliente</label>
                              <select
                                value={assignForm.analystId === a.id ? assignForm.tenantId : 0}
                                onChange={(e) => setAssignForm({ ...assignForm, analystId: a.id, tenantId: Number(e.target.value) })}
                                className="mod-input w-full"
                              >
                                <option value={0}>— Selecione o cliente —</option>
                                {tenants.filter((t) => !a.tenants.some((x) => x.id === t.id)).map((t) => (
                                  <option key={t.id} value={t.id}>{t.name} ({t.slug})</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold uppercase tracking-wider mod-text-secondary mb-1">Leitura</label>
                              <select
                                value={assignForm.can_read ? 1 : 0}
                                onChange={(e) => setAssignForm({ ...assignForm, can_read: e.target.value === '1' })}
                                className="mod-input w-full"
                              >
                                <option value={1}>Permitida</option>
                                <option value={0}>Negada</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold uppercase tracking-wider mod-text-secondary mb-1">Escrita</label>
                              <select
                                value={assignForm.can_write ? 1 : 0}
                                onChange={(e) => setAssignForm({ ...assignForm, can_write: e.target.value === '1' })}
                                className="mod-input w-full"
                              >
                                <option value={1}>Permitida</option>
                                <option value={0}>Negada</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold uppercase tracking-wider mod-text-secondary mb-1">Expira (opcional)</label>
                              <input
                                type="date"
                                value={assignForm.expires_at}
                                onChange={(e) => setAssignForm({ ...assignForm, expires_at: e.target.value })}
                                className="mod-input w-full font-mono"
                              />
                            </div>
                            <div className="lg:col-span-5 flex justify-end">
                              <button type="submit" disabled={saving || assignForm.tenantId === 0} className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50">
                                {saving ? 'Liberando...' : 'Liberar Cliente'}
                              </button>
                            </div>
                          </form>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="mod-card w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b mod-border">
              <h3 className="text-sm font-bold mod-text-primary">Novo Analista de Suporte</h3>
              <button onClick={() => setCreateOpen(false)} className="p-1 rounded-lg hover:mod-inner mod-text-secondary"><X size={16} /></button>
            </div>
            <form onSubmit={handleCreate} className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold mod-text-secondary mb-1">Nome *</label>
                <input type="text" required value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} className="mod-input w-full" />
              </div>
              <div>
                <label className="block text-xs font-semibold mod-text-secondary mb-1">E-mail *</label>
                <input type="email" required value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} className="mod-input w-full font-mono" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mod-text-secondary mb-1">Senha *</label>
                  <input type="password" required minLength={8} value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} className="mod-input w-full" />
                  <p className="text-[10px] mod-text-secondary mt-1">Mín. 8 chars, maiúscula, minúscula, número e símbolo.</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold mod-text-secondary mb-1">Confirmar *</label>
                  <input type="password" required minLength={8} value={createForm.password_confirmation} onChange={(e) => setCreateForm({ ...createForm, password_confirmation: e.target.value })} className="mod-input w-full" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t mod-border">
                <button type="button" onClick={() => setCreateOpen(false)} className="px-4 py-2 text-sm text-slate-700 dark:text-slate-300 border mod-border rounded-lg hover:mod-inner">Cancelar</button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50">
                  {saving ? 'Criando...' : 'Criar Analista'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalystManagement;
