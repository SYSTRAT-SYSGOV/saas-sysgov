import React, { useState, useEffect } from 'react';
import { Plus, Search, Pencil, Trash2, ChevronDown, ChevronUp, Shield, Key, Loader2, X } from 'lucide-react';
import { adminApi } from './api';
import { Role, Permission } from './types';

export const RoleManagement: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        adminApi.getRoles(),
        adminApi.getPermissions(),
      ]);
      setRoles(rolesRes.data);
      setPermissions(permsRes);
    } catch (error) {
      console.error('Erro ao carregar roles/permissões:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRoles = roles.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.slug.toLowerCase().includes(search.toLowerCase())
  );

  const getPermissionsByModule = (rolePerms: Permission[]) => {
    const grouped: Record<string, Permission[]> = {};
    rolePerms.forEach(p => {
      if (!grouped[p.module]) grouped[p.module] = [];
      grouped[p.module].push(p);
    });
    return grouped;
  };

  const handleOpenCreate = () => {
    setEditingRole(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (role: Role) => {
    setEditingRole(role);
    setModalOpen(true);
  };

  const handleDelete = async (role: Role) => {
    if (!window.confirm(`Excluir role "${role.name}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await adminApi.deleteRole(role.id);
      setRoles(roles.filter(r => r.id !== role.id));
    } catch (error) {
      alert('Erro ao excluir role. Verifique se não está em uso.');
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingRole(null);
  };

  const handleModalSave = async (data: any) => {
    try {
      if (editingRole) {
        await adminApi.updateRole(editingRole.id, data);
      } else {
        await adminApi.createRole(data);
      }
      handleModalClose();
      loadData();
    } catch (error: any) {
      alert(error.message || 'Erro ao salvar role');
    }
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
          <h1 className="text-2xl font-bold text-slate-900">Roles</h1>
          <p className="text-slate-500 mt-1">Gerencie roles e permissões por tenant</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova Role
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg">
        <div className="p-4 border-b border-slate-200">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar role por nome ou slug..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>
        </div>

        <div className="divide-y divide-slate-200">
          {filteredRoles.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              Nenhuma role encontrada
            </div>
          ) : (
            filteredRoles.map(role => {
              const groupedPerms = getPermissionsByModule(role.permissions);
              const isExpanded = expandedId === role.id;

              return (
                <div key={role.id} className="bg-white hover:bg-slate-50 transition-colors">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : role.id)}
                    className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="p-2 bg-emerald-100 rounded-lg">
                        <Shield className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-medium text-slate-900 truncate">{role.name}</h3>
                        <div className="flex items-center gap-2 mt-1 text-sm">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded font-mono text-xs">{role.slug}</span>
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs">{role.permissions.length} permissões</span>
                        </div>
                        {role.description && (
                          <p className="text-slate-500 text-sm mt-1 truncate">{role.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      <button
                        onClick={e => { e.stopPropagation(); handleOpenEdit(role); }}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        aria-label="Editar role"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(role); }}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        aria-label="Excluir role"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="bg-slate-50 border-t border-slate-200 p-4">
                      <h4 className="font-medium text-slate-700 mb-3">Permissões</h4>
                      <div className="space-y-3">
                        {Object.entries(groupedPerms).map(([module, perms]) => (
                          <div key={module} className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-xs font-medium uppercase tracking-wider">{module}</span>
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-mono">{perms.length}</span>
                            </div>
                            <div className="flex flex-wrap gap-2 ml-4">
                              {perms.map(p => (
                                <span key={p.id} className="px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-700 font-mono">{p.slug}</span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Role Form Modal */}
      {modalOpen && (
        <RoleFormModal
          role={editingRole}
          permissions={permissions}
          onClose={handleModalClose}
          onSave={handleModalSave}
        />
      )}
    </div>
  );
};

// Role Form Modal Component
const RoleFormModal: React.FC<{
  role: Role | null;
  permissions: Permission[];
  onClose: () => void;
  onSave: (data: any) => void;
}> = ({ role, permissions, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    scope: 'systrat' as 'systrat' | 'tenant',
    description: '',
    permission_ids: [] as number[],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (role) {
      setFormData({
        name: role.name,
        slug: role.slug,
        scope: role.scope,
        description: role.description || '',
        permission_ids: role.permissions.map(p => p.id),
      });
    } else {
      setFormData({
        name: '',
        slug: '',
        scope: 'systrat',
        description: '',
        permission_ids: [],
      });
    }
  }, [role]);

  const groupedPermissions = permissions.reduce((acc, p) => {
    if (!acc[p.module]) acc[p.module] = [];
    acc[p.module].push(p);
    return acc;
  }, {} as Record<string, Permission[]>);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    onSave(formData);
    setSaving(false);
  };

  const handlePermissionChange = (permissionId: number, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      permission_ids: checked
        ? [...prev.permission_ids, permissionId]
        : prev.permission_ids.filter(id => id !== permissionId),
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">{role ? 'Editar Role' : 'Nova Role'}</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome *</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Slug *</label>
              <input
                type="text"
                value={formData.slug}
                onChange={e => setFormData({ ...formData, slug: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Escopo *</label>
              <select
                value={formData.scope}
                onChange={e => setFormData({ ...formData, scope: e.target.value as 'systrat' | 'tenant' })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              >
                <option value="systrat">SYSTRAT (Plataforma)</option>
                <option value="tenant">Tenant (Cliente)</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
              <textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Permissões</label>
            <div className="space-y-3 max-h-96 overflow-y-auto border border-slate-200 rounded-lg p-4">
              {Object.entries(
                permissions.reduce((acc, p) => {
                  if (!acc[p.module]) acc[p.module] = [];
                  acc[p.module].push(p);
                  return acc;
                }, {} as Record<string, Permission[]>)
              ).map(([module, perms]) => (
                <div key={module} className="space-y-2">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{module}</h4>
                  <div className="flex flex-wrap gap-2">
                    {perms.map(p => (
                      <label key={p.id} className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm cursor-pointer hover:bg-slate-50 transition-colors">
                        <input
                          type="checkbox"
                          checked={formData.permission_ids.includes(p.id)}
                          onChange={e => handlePermissionChange(p.id, e.target.checked)}
                          className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                        />
                        <span className="font-mono text-xs text-slate-700">{p.slug}</span>
                        <span className="text-xs text-slate-400">{p.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Salvando...' : (role ? 'Atualizar' : 'Criar')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RoleManagement;