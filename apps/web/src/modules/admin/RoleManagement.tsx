import React, { useState, useEffect } from 'react';
import { Plus, Search, Pencil, Trash2, ChevronDown, ChevronUp, Shield, Key, Loader2, X } from 'lucide-react';
import { adminApi } from './api';
import { Role, Permission, permissaoVisivel } from './types';
import { Button, useFormValidationModal } from '@sysgov/ui';

export const RoleManagement: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const { modal: modalValidacao, tratarErro } = useFormValidationModal();
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
      if (!tratarErro(error)) alert('Erro ao excluir role. Verifique se não está em uso.');
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
      if (!tratarErro(error)) alert(error.message || 'Erro ao salvar role');
    }
  };

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
          <h1 className="text-2xl font-bold text-foreground">Roles</h1>
          <p className="text-muted-foreground mt-1">Gerencie roles e permissões por tenant</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova Role
        </button>
      </div>

      <div className="bg-card border border-border rounded-lg">
        <div className="p-4 border-b border-border">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar role por nome ou slug..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-ring focus:border-ring outline-none"
            />
          </div>
        </div>

        <div className="divide-y divide-border">
          {filteredRoles.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              Nenhuma role encontrada
            </div>
          ) : (
            filteredRoles.map(role => {
              const permissoesVisiveis = role.permissions.filter(permissaoVisivel);
              const groupedPerms = getPermissionsByModule(permissoesVisiveis);
              const isExpanded = expandedId === role.id;

              return (
                <div key={role.id} className="bg-card hover:bg-accent transition-colors">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setExpandedId(isExpanded ? null : role.id)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setExpandedId(isExpanded ? null : role.id);
                      }
                    }}
                    className="w-full p-4 flex items-center justify-between hover:bg-accent transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="p-2 bg-status-success-bg rounded-lg">
                        <Shield className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-medium text-foreground truncate">{role.name}</h3>
                        <div className="flex items-center gap-2 mt-1 text-sm">
                          <span className="px-2 py-0.5 bg-muted text-muted-foreground rounded font-mono text-xs">{role.slug}</span>
                          <span className="px-2 py-0.5 bg-accent text-primary rounded text-xs">{permissoesVisiveis.length} permissões</span>
                        </div>
                        {role.description && (
                          <p className="text-muted-foreground text-sm mt-1 truncate">{role.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      <button
                        onClick={e => { e.stopPropagation(); handleOpenEdit(role); }}
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                        aria-label="Editar role"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(role); }}
                        className="p-2 text-muted-foreground hover:text-status-danger hover:bg-status-danger-bg rounded-lg transition-colors"
                        aria-label="Excluir role"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="bg-muted border-t border-border p-4">
                      <h4 className="font-medium text-foreground mb-3">Permissões</h4>
                      <div className="space-y-3">
                        {Object.entries(groupedPerms).map(([module, perms]) => (
                          <div key={module} className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 bg-muted text-foreground rounded text-xs font-medium uppercase tracking-wider">{module}</span>
                              <span className="px-2 py-0.5 bg-status-success-bg text-status-success rounded text-xs font-mono">{perms.length}</span>
                            </div>
                            <div className="flex flex-wrap gap-2 ml-4">
                              {perms.map(p => (
                                <span key={p.id} className="px-2 py-1 bg-card border border-border rounded text-xs text-foreground font-mono">{p.slug}</span>
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
  const { modal: modalValidacao, validar } = useFormValidationModal();
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
    if (!validar([['Nome', formData.name], ['Slug', formData.slug]])) return;
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
      {modalValidacao}
      <div className="bg-card rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">{role ? 'Editar Role' : 'Nova Role'}</h2>
          <button onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form noValidate onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Nome *</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-ring focus:border-ring outline-none"
               
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Slug *</label>
              <input
                type="text"
                value={formData.slug}
                onChange={e => setFormData({ ...formData, slug: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm font-mono focus:ring-2 focus:ring-ring focus:border-ring outline-none"
               
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Escopo *</label>
              <select
                value={formData.scope}
                onChange={e => setFormData({ ...formData, scope: e.target.value as 'systrat' | 'tenant' })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-ring focus:border-ring outline-none"
              >
                <option value="systrat">SYSTRAT (Plataforma)</option>
                <option value="tenant">Tenant (Cliente)</option>
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-foreground mb-1">Descrição</label>
              <textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-ring focus:border-ring outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Permissões</label>
            {/* Permissão de módulo desligado não aparece na grade, mas segue em permission_ids: salvar o perfil não a revoga. */}
            <div className="space-y-3 max-h-[45vh] overflow-y-auto custom-scrollbar border border-border rounded-lg p-4">
              {Object.entries(
                permissions.filter(permissaoVisivel).reduce((acc, p) => {
                  if (!acc[p.module]) acc[p.module] = [];
                  acc[p.module].push(p);
                  return acc;
                }, {} as Record<string, Permission[]>)
              ).map(([module, perms]) => (
                <div key={module} className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{module}</h4>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {perms.map(p => (
                      <label key={p.id} className="flex items-center gap-2 px-3 py-1.5 bg-card border border-border rounded-lg text-sm cursor-pointer hover:bg-accent transition-colors min-w-0">
                        <input
                          type="checkbox"
                          checked={formData.permission_ids.includes(p.id)}
                          onChange={e => handlePermissionChange(p.id, e.target.checked)}
                          className="w-4 h-4 text-primary border-border rounded focus:ring-ring"
                        />
                        <span className="font-mono text-xs text-foreground truncate" title={p.slug}>{p.slug}</span>
                        <span className="text-xs text-muted-foreground truncate ml-auto" title={p.name}>{p.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" isLoading={saving}>
              {role ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RoleManagement;