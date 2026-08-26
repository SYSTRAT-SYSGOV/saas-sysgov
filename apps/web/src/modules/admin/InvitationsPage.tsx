import React, { useState, useEffect, useCallback } from 'react';
import { MailPlus, RefreshCw, Trash2, Loader2, Mail, Clock, CheckCircle2, X } from 'lucide-react';
import { adminApi } from './api';
import { Invitation, Role } from './types';

interface Props {
  onAddToast: (toast: { type: 'success' | 'info' | 'warning' | 'error'; title: string; message: string }) => void;
}

export const InvitationsPage: React.FC<Props> = ({ onAddToast }) => {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ email: '', role_slug: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, roleRes] = await Promise.all([adminApi.getInvitations(), adminApi.getRoles()]);
      setInvitations(invRes.data ?? []);
      setRoles((roleRes.data ?? []).filter((r) => r.scope === 'systrat'));
    } catch (error: any) {
      console.error('Erro ao carregar convites:', error);
      onAddToast({ type: 'error', title: 'Falha ao carregar', message: error.message || 'Não foi possível carregar os convites.' });
    } finally {
      setLoading(false);
    }
  }, [onAddToast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.trim() || !form.role_slug) {
      onAddToast({ type: 'warning', title: 'Campos obrigatórios', message: 'Informe o e-mail e a role do convite.' });
      return;
    }
    setSaving(true);
    try {
      await adminApi.createInvitation({ email: form.email, role_slug: form.role_slug });
      onAddToast({ type: 'success', title: 'Convite enviado', message: `Convite para ${form.email} criado (expira em 72h).` });
      setModalOpen(false);
      setForm({ email: '', role_slug: '' });
      load();
    } catch (error: any) {
      onAddToast({ type: 'error', title: 'Falha no convite', message: error.message || 'Não foi possível criar o convite.' });
    } finally {
      setSaving(false);
    }
  };

  const handleResend = async (inv: Invitation) => {
    try {
      await adminApi.resendInvitation(inv.id);
      onAddToast({ type: 'success', title: 'Convite reenviado', message: `Novo token gerado para ${inv.email}.` });
      load();
    } catch (error: any) {
      onAddToast({ type: 'error', title: 'Falha no reenvio', message: error.message || 'Não foi possível reenviar o convite.' });
    }
  };

  const handleCancel = async (inv: Invitation) => {
    if (!window.confirm(`Cancelar o convite para ${inv.email}?`)) return;
    try {
      await adminApi.deleteInvitation(inv.id);
      onAddToast({ type: 'info', title: 'Convite cancelado', message: inv.email });
      load();
    } catch (error: any) {
      onAddToast({ type: 'error', title: 'Falha ao cancelar', message: error.message || 'Não foi possível cancelar o convite.' });
    }
  };

  const statusBadge = (inv: Invitation) => {
    if (inv.accepted_at) {
      return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"><CheckCircle2 className="w-3 h-3" />Aceito</span>;
    }
    if (inv.status === 'expired') {
      return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"><X className="w-3 h-3" />Expirado</span>;
    }
    return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"><Clock className="w-3 h-3" />Pendente</span>;
  };

  if (loading) {
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
            <Mail className="w-5 h-5 text-indigo-500" /> Convites Pendentes
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Convites expiram em 72 horas. Tokens são enviados por e-mail via fila (outbox).
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <MailPlus className="w-4 h-4" /> Novo Convite
        </button>
      </div>

      <div className="mod-card overflow-hidden">
        {invitations.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">
            Nenhum convite pendente.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b mod-border text-left text-xs uppercase tracking-wider mod-text-secondary">
                <th className="py-3 px-4 font-semibold">E-mail</th>
                <th className="py-3 px-4 font-semibold">Role</th>
                <th className="py-3 px-4 font-semibold">Expira em</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 text-right font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {invitations.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-mono text-xs text-slate-700 dark:text-slate-300">{inv.email}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 rounded text-[11px] font-mono">
                      {inv.role_slug}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-slate-500">
                    {inv.expires_at ? new Date(inv.expires_at).toLocaleString('pt-BR') : '—'}
                  </td>
                  <td className="py-3 px-4">{statusBadge(inv)}</td>
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => handleResend(inv)}
                        title="Reenviar convite"
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleCancel(inv)}
                        title="Cancelar convite"
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="mod-card w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b mod-border">
              <h3 className="text-sm font-bold mod-text-primary">Novo Convite</h3>
              <button onClick={() => setModalOpen(false)} className="p-1 rounded-lg hover:mod-inner mod-text-secondary"><X size={16} /></button>
            </div>
            <form onSubmit={handleCreate} className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold mod-text-secondary mb-1">E-mail *</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="usuario@sysgov.local"
                  className="mod-input w-full font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mod-text-secondary mb-1">Role *</label>
                <select
                  value={form.role_slug}
                  onChange={(e) => setForm({ ...form, role_slug: e.target.value })}
                  className="mod-input w-full"
                  required
                >
                  <option value="">— Selecione —</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.slug}>{r.name} ({r.slug})</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t mod-border">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-slate-700 dark:text-slate-300 border mod-border rounded-lg hover:mod-inner">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50">
                  {saving ? 'Enviando...' : 'Enviar Convite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvitationsPage;
