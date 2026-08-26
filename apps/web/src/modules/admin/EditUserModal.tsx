import React, { useState } from 'react';
import { X, Save, User, Mail, Shield, Building2 } from 'lucide-react';
import { User as UserType } from './types';

interface Props {
  user: UserType;
  onSave: (user: UserType) => void;
  onClose: () => void;
}

export const EditUserModal: React.FC<Props> = ({ user, onSave, onClose }) => {
  const [formData, setFormData] = useState<UserType>({ ...user });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="mod-card w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b mod-border">
          <h2 className="text-sm font-bold mod-text-primary">Editar Usuário: {user.name}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:mod-inner mod-text-secondary"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold mod-text-secondary mb-1">Nome Completo</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 mod-text-secondary" size={14} />
              <input className="mod-input w-full pl-9" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mod-text-secondary mb-1">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 mod-text-secondary" size={14} />
              <input className="mod-input w-full pl-9" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" checked={formData.is_platform_admin} onChange={e => setFormData({...formData, is_platform_admin: e.target.checked})} className="accent-indigo-600" id="is_admin" />
            <label htmlFor="is_admin" className="text-xs font-semibold mod-text-primary flex items-center gap-2">
              <Shield size={14} /> Administrador Plataforma
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold mod-text-secondary hover:mod-inner rounded-lg">Cancelar</button>
            <button type="submit" className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-md"><Save className="inline mr-2" size={12}/>Salvar</button>
          </div>
        </form>
      </div>
    </div>
  );
};
