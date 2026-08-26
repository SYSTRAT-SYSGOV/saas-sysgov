import React, { useState } from 'react';
import { X, Save, Tag, Hash, Link as LinkIcon, Command } from 'lucide-react';
import { MenuItem } from './types';

interface Props {
  item: MenuItem;
  onSave: (item: MenuItem) => void;
  onClose: () => void;
}

export const EditItemModal: React.FC<Props> = ({ item, onSave, onClose }) => {
  const [formData, setFormData] = useState<MenuItem>({ ...item });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="mod-card w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b mod-border">
          <h2 className="text-sm font-bold mod-text-primary">Editar Item: {item.label}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:mod-inner mod-text-secondary"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold mod-text-secondary mb-1">Rótulo (Label)</label>
            <input className="mod-input w-full" value={formData.label} onChange={e => setFormData({...formData, label: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mod-text-secondary mb-1">Rota</label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 mod-text-secondary" size={12} />
                <input className="mod-input w-full pl-8" value={formData.route} onChange={e => setFormData({...formData, route: e.target.value})} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold mod-text-secondary mb-1">Atalho (Shortcut)</label>
              <div className="relative">
                <Command className="absolute left-3 top-1/2 -translate-y-1/2 mod-text-secondary" size={12} />
                <input className="mod-input w-full pl-8" value={formData.shortcut || ''} onChange={e => setFormData({...formData, shortcut: e.target.value})} />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold mod-text-secondary hover:mod-inner rounded-lg">Cancelar</button>
            <button type="submit" className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-md"><Save className="inline mr-2" size={12}/>Salvar Alterações</button>
          </div>
        </form>
      </div>
    </div>
  );
};
