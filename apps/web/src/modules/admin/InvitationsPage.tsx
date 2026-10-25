import React, { useState, useEffect, useCallback } from 'react';
import { MailPlus, RefreshCw, Trash2, Loader2, Mail, Clock, CheckCircle2, X } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable, ActionsMenu } from '@sysgov/ui';
import { adminApi } from './api';
import { Invitation, Role } from './types';
import { useFormValidationModal } from '@sysgov/ui';

interface Props {
  onAddToast: (toast: { type: 'success' | 'info' | 'warning' | 'error'; title: string; message: string }) => void;
}

export const InvitationsPage: React.FC<Props> = ({ onAddToast }) => {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const { modal: modalValidacao, validar, tratarErro } = useFormValidationModal();
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
    if (!validar([['E-mail', form.email], ['Role', form.role_slug]])) return;
    setSaving(true);
    try {
      await adminApi.createInvitation({ email: form.email, role_slug: form.role_slug });
      onAddToast({ type: 'success', title: 'Convite enviado', message: `Convite para ${form.email} criado (expira em 72h).` });
      setModalOpen(false);
      setForm({ email: '', role_slug: '' });
      load();
    } catch (error: any) {
      if (!tratarErro(error)) onAddToast({ type: 'error', title: 'Falha no convite', message: error.message || 'Não foi possível criar o convite.' });
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
      if (!tratarErro(error)) onAddToast({ type: 'error', title: 'Falha no reenvio', message: error.message || 'Não foi possível reenviar o convite.' });
    }
  };

  const handleCancel = async (inv: Invitation) => {
    if (!window.confirm(`Cancelar o convite para ${inv.email}?`)) return;
    try {
      await adminApi.deleteInvitation(inv.id);
      onAddToast({ type: 'info', title: 'Convite cancelado', message: inv.email });
      load();
    } catch (error: any) {
      if (!tratarErro(error)) onAddToast({ type: 'error', title: 'Falha ao cancelar', message: error.message || 'Não foi possível cancelar o convite.' });
    }
  };

  const statusBadge = (inv: Invitation) => {
    if (inv.accepted_at) {
      return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20"><CheckCircle2 className="w-3 h-3" />Aceito</span>;
    }
    if (inv.status === 'expired') {
      return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-destructive/10 text-status-danger border border-status-danger-border"><X className="w-3 h-3" />Expirado</span>;
    }
    return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-status-warning/10 text-status-warning border border-status-warning-border"><Clock className="w-3 h-3" />Pendente</span>;
  };

  const columns: ColumnDef<Invitation>[] = [
    {
      id: 'acoes', header: '', enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-center">
          <ActionsMenu triggerLabel="Ações do convite" items={[
            { key: 'reenviar', label: 'Reenviar convite', icon: <RefreshCw className="h-3.5 w-3.5" />, onSelect: () => handleResend(row.original) },
            { key: 'cancelar', label: 'Cancelar convite', icon: <Trash2 className="h-3.5 w-3.5" />, onSelect: () => handleCancel(row.original) },
          ]} />
        </div>
      ),
      meta: { exportIgnore: true },
    },
    { accessorKey: 'email', header: 'E-mail', cell: ({ row }) => <span className="font-mono text-xs text-foreground">{row.original.email}</span> },
    {
      accessorKey: 'role_slug', header: 'Role',
      cell: ({ row }) => <span className="px-2 py-0.5 bg-accent text-primary rounded text-[11px] font-mono">{row.original.role_slug}</span>,
    },
    {
      id: 'expira', header: 'Expira em',
      accessorFn: (i) => (i.expires_at ? new Date(i.expires_at).toLocaleString('pt-BR') : '—'),
      cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.expires_at ? new Date(row.original.expires_at).toLocaleString('pt-BR') : '—'}</span>,
    },
    { id: 'status', header: 'Status', accessorFn: (i) => (i.accepted_at ? 'Aceito' : i.status === 'expired' ? 'Expirado' : 'Pendente'), cell: ({ row }) => statusBadge(row.original) },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {modalValidacao}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" /> Convites Pendentes
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Convites expiram em 72 horas. Tokens são enviados por e-mail via fila (outbox).
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <MailPlus className="w-4 h-4" /> Novo Convite
        </button>
      </div>

      <DataTable<Invitation, unknown>
        columns={columns}
        data={invitations}
        emptyText="Nenhum convite pendente."
        searchable
        searchPlaceholder="Buscar convite..."
        pageSizeSelector
        exportable
        exportFileName="convites-pendentes"
        exportTitle="Convites pendentes"
      />

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-sm font-bold text-foreground">Novo Convite</h3>
              <button onClick={() => setModalOpen(false)} className="p-1 rounded-lg hover:bg-muted text-muted-foreground"><X size={16} /></button>
            </div>
            <form noValidate onSubmit={handleCreate} className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">E-mail *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="usuario@sysgov.local"
                  className="bg-card border border-input text-foreground placeholder:text-muted-foreground rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 w-full font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Role *</label>
                <select
                  value={form.role_slug}
                  onChange={(e) => setForm({ ...form, role_slug: e.target.value })}
                  className="bg-card border border-input text-foreground placeholder:text-muted-foreground rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 w-full"
                 
                >
                  <option value="">— Selecione —</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.slug}>{r.name} ({r.slug})</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-foreground border border-border rounded-lg hover:bg-muted">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-primary hover:bg-primary/90 text-white rounded-lg disabled:opacity-50">
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
