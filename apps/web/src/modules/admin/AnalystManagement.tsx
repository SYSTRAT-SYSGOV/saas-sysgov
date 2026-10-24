import React, { useState, useEffect, useCallback } from 'react';
import { UserPlus, Users, X, ChevronDown, ChevronRight, Trash2, Loader2, Headset, Plus, Clock } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { Modal, DataTable, ActionsMenu } from '@sysgov/ui';
import { adminApi } from './api';
import { Analyst, Tenant } from './types';
import { useFormValidationModal } from '@sysgov/ui';

interface Props {
  onAddToast: (toast: { type: 'success' | 'info' | 'warning' | 'error'; title: string; message: string }) => void;
}

const AnalystManagement: React.FC<Props> = ({ onAddToast }) => {
  const [analysts, setAnalysts] = useState<Analyst[]>([]);
  const { modal: modalValidacao, validar, invalidar, tratarErro } = useFormValidationModal();
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
    if (!validar([['Nome', createForm.name], ['E-mail', createForm.email], ['Senha', createForm.password], ['Confirmação de senha', createForm.password_confirmation]])) return;
    if (createForm.password !== createForm.password_confirmation) {
      invalidar([['Confirmação de senha', 'A confirmação de senha não confere.']]);
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
      if (!tratarErro(error)) onAddToast({ type: 'error', title: 'Falha ao criar', message: error.message || 'Não foi possível criar o analista.' });
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignForm.analystId) return;
    if (!validar([['Cliente', assignForm.tenantId || null]])) return;
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
      if (!tratarErro(error)) onAddToast({ type: 'error', title: 'Falha ao liberar', message: error.message || 'Não foi possível liberar o tenant.' });
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
      if (!tratarErro(error)) onAddToast({ type: 'error', title: 'Falha ao revogar', message: error.message || 'Não foi possível revogar o acesso.' });
    }
  };

  const openAssign = (analystId: number) => {
    // Expande a linha do analista para exibir o formulário de liberação
    setExpandedId(analystId);
    setAssignForm({ analystId, tenantId: 0, can_read: true, can_write: false, expires_at: '' });
  };

  const expandedAnalyst = analysts.find((x) => x.id === expandedId) ?? null;

  const columns: ColumnDef<Analyst>[] = [
    {
      id: 'acoes', header: '', enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-center">
          <ActionsMenu triggerLabel="Ações do analista" items={[
            { key: 'carteira', label: 'Carteira de clientes', icon: <Users className="h-3.5 w-3.5" />, onSelect: () => setExpandedId(row.original.id) },
            { key: 'liberar', label: 'Liberar cliente', icon: <Plus className="h-3.5 w-3.5" />, onSelect: () => openAssign(row.original.id) },
          ]} />
        </div>
      ),
      meta: { exportIgnore: true },
    },
    { accessorKey: 'name', header: 'Nome' },
    { accessorKey: 'email', header: 'E-mail', cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.email}</span> },
    {
      id: 'clientes', header: 'Clientes na carteira', accessorFn: (a) => a.tenants.length,
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-accent text-primary">
          <Users className="w-3 h-3" /> {row.original.tenants.length}
        </span>
      ),
    },
    {
      id: 'status', header: 'Status', accessorFn: (a) => (a.is_active ? 'Ativo' : 'Inativo'),
      cell: ({ row }) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${row.original.is_active ? 'bg-status-success-bg text-status-success' : 'bg-muted text-muted-foreground'}`}>
          {row.original.is_active ? 'ATIVO' : 'INATIVO'}
        </span>
      ),
    },
  ];

  if (loading && analysts.length === 0) {
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
            <Headset className="w-5 h-5 text-primary" /> Analistas de Suporte
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Cada analista acessa somente os clientes liberados (carteira). Todos os acessos e modificações são auditados.
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <UserPlus className="w-4 h-4" /> Novo Analista
        </button>
      </div>

      <DataTable<Analyst, unknown>
        columns={columns}
        data={analysts}
        emptyText='Nenhum analista cadastrado. Clique em "Novo Analista".'
        searchable
        searchPlaceholder="Buscar analista..."
        pageSizeSelector
        exportable
        exportFileName="analistas-de-suporte"
        exportTitle="Analistas de suporte"
      />

      <Modal
        open={expandedAnalyst !== null}
        onClose={() => setExpandedId(null)}
        title={`Carteira de clientes${expandedAnalyst ? ` — ${expandedAnalyst.name}` : ''}`}
        size="2xl"
      >
        {expandedAnalyst && (() => {
          const a = expandedAnalyst;
          return (
          <div className="bg-muted rounded-xl border border-border p-4">
            <h4 className="text-xs font-bold text-foreground mb-3 uppercase tracking-wider">Carteira de Clientes</h4>
            {a.tenants.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum cliente liberado. Use "Liberar Cliente".</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {a.tenants.map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-2.5 rounded-lg bg-card border border-border">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{t.name}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">{t.slug}{t.uf ? ` • ${t.city}/${t.uf}` : ''}</p>
                      <p className="text-[10px] mt-0.5">
                        <span className={`font-semibold ${t.can_read ? 'text-primary' : 'text-muted-foreground'}`}>Leitura</span>
                        <span className="text-muted-foreground"> • </span>
                        <span className={`font-semibold ${t.can_write ? 'text-status-warning' : 'text-muted-foreground'}`}>Escrita</span>
                        {t.expires_at && (
                          <span className="text-muted-foreground ml-1 inline-flex items-center gap-0.5">
                            <Clock className="w-3 h-3" /> até {new Date(t.expires_at).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRevoke(a.id, t.id)}
                      title="Revogar acesso"
                      className="p-1.5 rounded-lg text-status-danger hover:bg-status-danger-bg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Form de liberação */}
            <form noValidate onSubmit={handleAssign} className="mt-4 p-3 rounded-lg bg-card border border-border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <input type="hidden" value={assignForm.analystId} readOnly />
              <div className="lg:col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Cliente</label>
                <select
                  value={assignForm.analystId === a.id ? assignForm.tenantId : 0}
                  onChange={(e) => setAssignForm({ ...assignForm, analystId: a.id, tenantId: Number(e.target.value) })}
                  className="bg-card border border-input text-foreground placeholder:text-muted-foreground rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 w-full"
                >
                  <option value={0}>— Selecione o cliente —</option>
                  {tenants.filter((t) => !a.tenants.some((x) => x.id === t.id)).map((t) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.slug})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Leitura</label>
                <select
                  value={assignForm.can_read ? 1 : 0}
                  onChange={(e) => setAssignForm({ ...assignForm, can_read: e.target.value === '1' })}
                  className="bg-card border border-input text-foreground placeholder:text-muted-foreground rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 w-full"
                >
                  <option value={1}>Permitida</option>
                  <option value={0}>Negada</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Escrita</label>
                <select
                  value={assignForm.can_write ? 1 : 0}
                  onChange={(e) => setAssignForm({ ...assignForm, can_write: e.target.value === '1' })}
                  className="bg-card border border-input text-foreground placeholder:text-muted-foreground rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 w-full"
                >
                  <option value={1}>Permitida</option>
                  <option value={0}>Negada</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Expira (opcional)</label>
                <input
                  type="date"
                  value={assignForm.expires_at}
                  onChange={(e) => setAssignForm({ ...assignForm, expires_at: e.target.value })}
                  className="bg-card border border-input text-foreground placeholder:text-muted-foreground rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 w-full font-mono"
                />
              </div>
              <div className="lg:col-span-5 flex justify-end">
                <button type="submit" disabled={saving || assignForm.tenantId === 0} className="px-4 py-2 text-xs font-semibold bg-primary hover:bg-primary/90 text-white rounded-lg disabled:opacity-50">
                  {saving ? 'Liberando...' : 'Liberar Cliente'}
                </button>
              </div>
            </form>
          </div>

          );
        })()}
      </Modal>

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-sm font-bold text-foreground">Novo Analista de Suporte</h3>
              <button onClick={() => setCreateOpen(false)} className="p-1 rounded-lg hover:bg-muted text-muted-foreground"><X size={16} /></button>
            </div>
            <form noValidate onSubmit={handleCreate} className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Nome *</label>
                <input type="text" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} className="bg-card border border-input text-foreground placeholder:text-muted-foreground rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 w-full" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">E-mail *</label>
                <input type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} className="bg-card border border-input text-foreground placeholder:text-muted-foreground rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 w-full font-mono" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Senha *</label>
                  <input type="password" minLength={8} value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} className="bg-card border border-input text-foreground placeholder:text-muted-foreground rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 w-full" />
                  <p className="text-[10px] text-muted-foreground mt-1">Mín. 8 chars, maiúscula, minúscula, número e símbolo.</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Confirmar *</label>
                  <input type="password" minLength={8} value={createForm.password_confirmation} onChange={(e) => setCreateForm({ ...createForm, password_confirmation: e.target.value })} className="bg-card border border-input text-foreground placeholder:text-muted-foreground rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 w-full" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button type="button" onClick={() => setCreateOpen(false)} className="px-4 py-2 text-sm text-foreground border border-border rounded-lg hover:bg-muted">Cancelar</button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-primary hover:bg-primary/90 text-white rounded-lg disabled:opacity-50">
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
