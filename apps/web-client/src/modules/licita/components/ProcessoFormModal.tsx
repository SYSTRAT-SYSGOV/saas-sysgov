import React, { useState } from 'react';
import { Modal, Button } from '@sysgov/ui';
import { FolderPlus } from 'lucide-react';
import { sysgovApi, type Processo } from '@sysgov/sdk';

interface ProcessoFormModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (processo: Processo) => void;
}

export const ProcessoFormModal: React.FC<ProcessoFormModalProps> = ({ open, onClose, onCreated }) => {
  const [objeto, setObjeto] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      // Número e ano são gerados pelo backend (ano corrente, sequencial) —
      // o usuário só informa o objeto preliminar.
      const processo = await sysgovApi.licita.createProcesso({ objeto: objeto || null });
      onCreated(processo);
      setObjeto('');
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Erro ao criar processo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Novo Processo Licitatório" icon={<FolderPlus className="h-5 w-5" />} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Objeto (preliminar)</label>
          <textarea
            autoFocus
            value={objeto}
            onChange={(e) => setObjeto(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="Pode ser refinado depois, no DFD."
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" isLoading={saving}>
            Criar Processo
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ProcessoFormModal;
