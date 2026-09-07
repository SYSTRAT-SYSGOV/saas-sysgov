import React, { useState } from 'react';
import { DataTable } from '@/components/ui/DataTable';
import { Dialog } from '@/components/ui/Dialog';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Field } from '@/components/ui/Field';
import { PageHeader } from '@/components/ui/PageHeader';
import { ScreenState } from '@/components/ui/ScreenState';
import { Plus, Edit, Trash2, ToggleRight, ToggleLeft, Search, Loader2, Shield, Key, LayoutDashboard, ChevronDown, X, Save, ArrowLeft } from 'lucide-react';

interface Module {
  id: number;
  name: string;
  alias: string;
  description: string | null;
  enabled: boolean;
  monthly_fee_cents: number | null;
  metadata: Record<string, unknown>;
  menu_group?: {
    id: number;
    name: string;
    slug: string;
    icon: string;
    order: number;
  } | null;
  permissions: Array<{
    id: number;
    slug: string;
    name: string;
  }>;
}

interface ModuleFormData {
  name: string;
  alias: string;
  description: string;
  enabled: boolean;
  monthly_fee_cents: number;
  default_permissions: string;
  menu: {
    label: string;
    icon: string;
    order: number;
  };
}

export function ModuleCatalogPage() {
  const [modules, setModules] = useState<Module[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [formData, setFormData] = useState<ModuleFormData>({
    name: '',
    alias: '',
    description: '',
    enabled: true,
    monthly_fee_cents: 0,
    default_permissions: '',
    menu: { label: '', icon: 'Layers', order: 50 },
  });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Module | null>(null);

  const fetchModules = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(perPage),
        search,
      });
      const res = await fetch(`/api/admin/module-catalog?${params}`);
      if (!res.ok) throw new Error('Falha ao carregar módulos');
      const data = await res.json();
      setModules(data.data);
      setTotal(data.total);
    } catch (error) {
      console.error('Erro ao buscar módulos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => setPage(newPage);

  const openCreateDialog = () => {
    setEditingModule(null);
    setFormData({
      name: '',
      alias: '',
      description: '',
      enabled: true,
      monthly_fee_cents: 0,
      default_permissions: '',
      menu: { label: '', icon: 'Layers', order: 50 },
    });
    setDialogOpen(true);
  };

  const openEditDialog = (module: Module) => {
    setEditingModule(module);
    setFormData({
      name: module.name,
      alias: module.alias,
      description: module.description || '',
      enabled: module.enabled,
      monthly_fee_cents: module.monthly_fee_cents || 0,
      default_permissions: module.permissions.map(p => p.slug).join(', '),
      menu: module.menu_group ? {
        label: module.menu_group.name,
        icon: module.menu_group.icon,
        order: module.menu_group.order,
      } : { label: '', icon: 'Layers', order: 50 },
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        alias: formData.alias,
        description: formData.description,
        enabled: formData.enabled,
        monthly_fee_cents: formData.monthly_fee_cents,
        default_permissions: formData.default_permissions
          .split(',')
          .map(s => s.trim())
          .filter(Boolean),
        menu: formData.menu.label ? formData.menu : undefined,
      };

      const url = editingModule
        ? `/api/admin/module-catalog/${editingModule.id}`
        : '/api/admin/module-catalog';
      const method = editingModule ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Erro ao salvar módulo');
      }

      setDialogOpen(false);
      fetchModules();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (module: Module) => {
    setDeleteTarget(module);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/admin/module-catalog/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Falha ao excluir módulo');
      setDeleteDialogOpen(false);
      fetchModules();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      alert(error instanceof Error ? error.message : 'Erro desconhecido');
    }
  };

  const handleToggle = async (module: Module) => {
    try {
      const res = await fetch(`/api/admin/module-catalog/${module.id}/toggle`, {
        method: 'PATCH',
      });
      if (!res.ok) throw new Error('Falha ao alternar status');
      fetchModules();
    } catch (error) {
      console.error('Erro ao alternar:', error);
      alert(error instanceof Error ? error.message : 'Erro desconhecido');
    }
  };

  const formatCurrency = (cents: number | null) => {
    if (!cents) return 'Grátis';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100) + '/mês';
  };

  const columns = [
    { key: 'name', header: 'Módulo', render: (m: Module) => (
      <div>
        <strong className="font-mono">{m.name}</strong>
        <span className="ml-2 text-xs text-slate-500 dark:text-slate-400 font-mono">({m.alias})</span>
      </div>
    )},
    { key: 'description', header: 'Descrição', className: 'hidden md:table-cell' },
    { key: 'monthly_fee_cents', header: 'Preço', render: (m: Module) => formatCurrency(m.monthly_fee_cents) },
    { key: 'enabled', header: 'Status', render: (m: Module) => (
      <button
        onClick={() => handleToggle(m)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          m.enabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
        }`}
        role="switch"
        aria-checked={m.enabled}
        aria-label={m.enabled ? 'Desativar' : 'Ativar'}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          m.enabled ? 'translate-x-6' : 'translate-x-1'
        }`} />
      </button>
    )},
    { key: 'actions', header: 'Ações', render: (m: Module) => (
      <div className="flex items-center gap-2">
        <button onClick={() => openEditDialog(m)} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Editar">
          <Edit className="w-4 h-4" />
        </button>
        <button onClick={() => confirmDelete(m)} className="p-1.5 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400" aria-label="Excluir">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Módulos da Plataforma"
        subtitle="Catálogo de módulos disponíveis para provisionamento nos tenants"
        actions={
          <button onClick={openCreateDialog} className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors">
            <Plus className="w-4 h-4" />
            Novo Módulo
          </button>
        }
      />

      <DataTable
        columns={columns}
        data={modules}
        loading={loading}
        emptyMessage="Nenhum módulo cadastrado"
        pagination={true}
        paginationState={{
          currentPage: page,
          totalPages: Math.ceil(total / perPage),
          onPageChange: handlePageChange,
          total,
          perPage,
        }}
        search={{
          value: search,
          onChange: handleSearch,
          placeholder: 'Buscar por nome ou alias...',
        }}
      />

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title={editingModule ? 'Editar Módulo' : 'Novo Módulo'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label="Nome"
              name="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="Ex: Organograma Municipal"
            />
            <Field
              label="Alias (slug)"
              name="alias"
              value={formData.alias}
              onChange={(e) => setFormData({ ...formData, alias: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
              required
              placeholder="ex: org_chart"
              help="Apenas letras minúsculas, números e underscore"
            />
          </div>

          <Field
            label="Descrição"
            name="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            as="textarea"
            rows={3}
            placeholder="Descrição do módulo para o catálogo"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field
              label="Preço Mensal (centavos)"
              name="monthly_fee_cents"
              type="number"
              value={formData.monthly_fee_cents}
              onChange={(e) => setFormData({ ...formData, monthly_fee_cents: parseInt(e.target.value) || 0 })}
              min="0"
            />
            <Field
              label="Ativo"
              name="enabled"
              type="checkbox"
              value={formData.enabled}
              onChange={(e) => setFormData({ ...formData, enabled: (e.target as HTMLInputElement).checked })}
            />
          </div>

          <div className="border-t pt-4">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4" /> Permissões Padrão
            </h4>
            <Field
              name="default_permissions"
              value={formData.default_permissions}
              onChange={(e) => setFormData({ ...formData, default_permissions: e.target.value })}
              as="textarea"
              rows={4}
              placeholder="Uma permissão por linha (slug). Ex: org_chart.move, org_chart.export"
              help="Permissões adicionais além das CRUD padrão ({alias}.view, .create, .update, .delete)"
            />
          </div>

          <div className="border-t pt-4">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4" /> Menu Padrão
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field
                label="Label do Grupo"
                name="menu.label"
                value={formData.menu.label}
                onChange={(e) => setFormData({ ...formData, menu: { ...formData.menu, label: e.target.value } })}
                placeholder="Ex: Organograma"
              />
              <Field
                label="Ícone (Lucide)"
                name="menu.icon"
                value={formData.menu.icon}
                onChange={(e) => setFormData({ ...formData, menu: { ...formData.menu, icon: e.target.value } })}
                placeholder="Layers"
              />
              <Field
                label="Ordem"
                name="menu.order"
                type="number"
                value={formData.menu.order}
                onChange={(e) => setFormData({ ...formData, menu: { ...formData.menu, order: parseInt(e.target.value) || 50 } })}
                min="1"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setDialogOpen(false)} className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg disabled:opacity-50">
              {saving ? (
                <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</span>
              ) : (
                <span className="flex items-center gap-2"><Save className="w-4 h-4" /> {editingModule ? 'Atualizar' : 'Criar'}</span>
              )}
            </button>
          </div>
        </form>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        title="Excluir Módulo"
        message={`Tem certeza que deseja excluir o módulo "${deleteTarget?.name}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        onConfirm={handleDelete}
        loading={saving}
        variant="destructive"
      />
    </div>
  );
}