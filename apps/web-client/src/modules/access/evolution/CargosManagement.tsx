import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Plus, Pencil, Trash2, Loader2, Save, Briefcase } from 'lucide-react';
import { accessApi, Cargo } from '../AccessApi';
import { Modal } from '@/components/ui/Modal';
import { Field } from '@/components/ui/Field';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import type { ColumnDef } from '@tanstack/react-table';

const inputCls = 'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring';

export const CargosManagement: React.FC<{ notify: (t: any) => void }> = ({ notify }) => {
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ edit?: Cargo } | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { const d = await accessApi.cargos(); setCargos(d); }
    catch { notify({ type: 'error', title: 'Erro', message: 'Falha ao carregar cargos.' }); }
    finally { setLoading(false); }
  }, [notify]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setName(''); setDescription(''); setModal({}); };
  const openEdit = (c: Cargo) => { setName(c.name); setDescription(c.description ?? ''); setModal({ edit: c }); };

  const handleSave = async () => {
    if (!name.trim()) return;
    try {
      if (modal?.edit) {
        await accessApi.updateCargo(modal.edit.id, { name: name.trim(), description: description.trim() || null });
        notify({ type: 'success', title: 'Atualizado', message: 'Cargo atualizado.' });
      } else {
        await accessApi.createCargo({ name: name.trim(), description: description.trim() || null });
        notify({ type: 'success', title: 'Criado', message: 'Cargo criado.' });
      }
      setModal(null); load();
    } catch (e: any) { notify({ type: 'error', title: 'Erro', message: e?.response?.data?.message || e?.message }); }
  };

  const handleDelete = async (c: Cargo) => {
    if (!window.confirm(`Excluir cargo "${c.name}"?`)) return;
    try { await accessApi.deleteCargo(c.id); notify({ type: 'success', title: 'Excluído', message: 'Cargo removido.' }); load(); }
    catch (e: any) { notify({ type: 'error', title: 'Erro', message: e?.response?.data?.message || e?.message }); }
  };

  const cargoColumns: ColumnDef<Cargo, any>[] = [
    { id: 'name', header: 'Nome', accessorKey: 'name', cell: ({ row }) => <span className="font-medium text-foreground">{row.original.name}</span> },
    { id: 'description', header: 'Descrição', cell: ({ row }) => <span className="text-muted-foreground">{row.original.description ?? '—'}</span> },
    {
      id: 'actions', header: 'Ações', enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <button onClick={() => openEdit(row.original)} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Pencil className="h-4 w-4" /></button>
          <button onClick={() => handleDelete(row.original)} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Trash2 className="h-4 w-4" /></button>
        </div>
      ),
    },
  ];

  return (
    <Card noPadding className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
          <Briefcase className="h-4 w-4 text-primary" /> Cargos
        </h3>
        <button onClick={openCreate} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Plus className="h-3.5 w-3.5" /> Novo Cargo
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="p-3">
          <DataTable columns={cargoColumns} data={cargos} loading={loading} emptyText="Nenhum cargo cadastrado." pageSize={10} />
        </div>
      )}

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.edit ? 'Editar Cargo' : 'Novo Cargo'}
        icon={<Briefcase className="h-5 w-5 text-primary" />}
        size="sm"
        footer={
          <>
            <button onClick={() => setModal(null)} className="rounded-lg border border-border px-4 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">Cancelar</button>
            <button onClick={handleSave} disabled={!name.trim()} className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Save className="h-3.5 w-3.5" /> Salvar
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Nome" required>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Ex.: Gestor de Contratos" />
          </Field>
          <Field label="Descrição">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputCls} placeholder="Descrição opcional do cargo" />
          </Field>
          <div className="flex items-center gap-2">
            <Badge variant="info">Dica</Badge>
            <span className="text-xs text-muted-foreground">Cargos aparecem nos filtros e no perfil do usuário.</span>
          </div>
        </div>
      </Modal>
    </Card>
  );
};