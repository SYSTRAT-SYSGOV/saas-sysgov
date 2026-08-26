import React, { useState, useEffect } from 'react';
import { Plus, Search, Pencil, Trash2, Loader2, X, Key, Shield } from 'lucide-react';
import { adminApi } from './api';
import { Permission } from './types';

export const PermissionManagement: React.FC = () => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPerm, setEditingPerm] = useState<Permission | null>(null);

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    setLoading(true);
    try {
      const perms = await adminApi.getPermissions();
      setPermissions(perms);
    } catch (error) {
      console.error('Erro ao carregar permissões:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPerms = permissions.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.slug.toLowerCase().includes(search.toLowerCase()) ||
    p.module.toLowerCase().includes(search.toLowerCase())
  );

  const groupedPermissions = filteredPerms.reduce((acc, p) => {
    if (!acc[p.module]) acc[p.module] = [];
    acc[p.module].push(p);
    return acc;
  }, {} as Record<string, Permission[]>);

  const handleOpenCreate = () => {
    setEditingPerm(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (perm: Permission) => {
    setEditingPerm(perm);
    setModalOpen(true);
  };

  const handleDelete = async (perm: Permission) => {
    if (!window.confirm(`Excluir permissão "${perm.name}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await adminApi.deletePermission(perm.id);
      setPermissions(permissions.filter(p => p.id !== perm.id));
    } catch (error) {
      alert('Erro ao excluir permissão. Verifique se não está em uso.');
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingPerm(null);
  };

  const handleModalSave = async (data: any) => {
    try {
      if (editingPerm) {
        await adminApi.updatePermission(editingPerm.id, data);
      } else {
        await adminApi.createPermission(data);
      }
      handleModalClose();
      loadPermissions();
    } catch (error: any) {
      alert(error.message || 'Erro ao salvar permissão');
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
          <h1 className="text-2xl font-bold text-slate-900">Permissões</h1>
          <p className="text-slate-500 mt-1">Gerencie as permissões granulares do sistema</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova Permissão
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg">
        <div className="p-4 border-b border-slate-200">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar permissão por nome, slug ou módulo..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>
        </div>

        {filteredPerms.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            Nenhuma permissão encontrada
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {Object.entries(groupedPermissions).map(([module, perms]) => (
              <div key={module} className="bg-white">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <Key className="w-5 h-5 text-emerald-600" />
                    <span className="font-medium text-slate-900 capitalize">{module}</span>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-mono">{perms.length} permissões</span>
                  </div>
                </div>
                <div className="divide-y divide-slate-100">
                  {perms.map(perm => (
                    <div key={perm.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                          <Shield className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-medium text-slate-900 truncate">{perm.name}</h4>
                          <div className="flex items-center gap-2 mt-1 text-sm">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded font-mono text-xs">{perm.slug}</span>
                            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs">{perm.module}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(perm)}
                          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                          aria-label="Editar permissão"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(perm)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          aria-label="Excluir permissão"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Permission Form Modal */}
      {modalOpen && (
        <PermissionFormModal
          permission={editingPerm}
          onClose={handleModalClose}
          onSave={handleModalSave}
        />
      )}
    </div>
  );
};

const PermissionFormModal: React.FC<{
  permission: Permission | null;
  onClose: () => void;
  onSave: (data: any) => void;
}> = ({ permission, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    module: 'admin',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (permission) {
      setFormData({
        name: permission.name,
        slug: permission.slug,
        module: permission.module,
      });
    } else {
      setFormData({ name: '', slug: '', module: 'admin' });
    }
  }, [permission]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    onSave(formData);
    setSaving(false);
  };

  const modules = ['admin', 'contracts', 'finance', 'procurement', 'documents'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">{permission ? 'Editar Permissão' : 'Nova Permissão'}</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
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
              pattern="[a-z0-9.-]+"
              title="Apenas letras minúsculas, números, pontos e hífens"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Módulo *</label>
            <select
              value={formData.module}
              onChange={e => setFormData({ ...formData, module: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            >
              {modules.map(m => (
                <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
              ))}
            </select>
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
              {saving ? 'Salvando...' : (permission ? 'Atualizar' : 'Criar')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PermissionManagement;