import React, { useState } from 'react';
import { Loader2, Save, UserCog, KeyRound, ShieldCheck } from 'lucide-react';
import { accessApi, AccessUser, AccessModule, OrgUnitNode, Cargo, AccessGroup, ModuleAccessItem, ModuleAccessRole } from '../AccessApi';
import { ModuleAccessPicker } from './ModuleAccessPicker';
import { Modal } from '@/components/ui/Modal';
import { Field } from '@/components/ui/Field';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

interface UserEditModalProps {
  user: AccessUser;
  modules: AccessModule[];
  units: OrgUnitNode[];
  cargos: Cargo[];
  groups: AccessGroup[];
  onClose: () => void;
  onSaved: (u: AccessUser) => void;
  notify: (t: { type: 'success' | 'error' | 'info' | 'warning'; title: string; message: string }) => void;
}

function flattenUnits(nodes: OrgUnitNode[], depth = 0): { node: OrgUnitNode; depth: number }[] {
  const out: { node: OrgUnitNode; depth: number }[] = [];
  nodes.forEach((n) => {
    out.push({ node: n, depth });
    if (n.children?.length) out.push(...flattenUnits(n.children, depth + 1));
  });
  return out;
}

interface AccessEntry extends ModuleAccessItem {
  enabled: boolean;
}

const inputCls = 'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring';

/**
 * Formulário completo de edição de usuário — redesenhado com shadcn/GOV.BR.
 */
export const UserEditModal: React.FC<UserEditModalProps> = ({ user, modules, units, cargos, groups, onClose, onSaved, notify }) => {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [matricula, setMatricula] = useState(user.matricula ?? '');
  const [cargoId, setCargoId] = useState<number | ''>(user.cargo_id ?? '');
  const [primaryOrgUnitId, setPrimaryOrgUnitId] = useState<number | ''>(user.primary_org_unit_id ?? '');
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>(user.group_ids ?? []);
  const [resetPassword, setResetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState('');
  const [entries, setEntries] = useState<AccessEntry[]>(() =>
    modules.map((m) => {
      const a = user.accesses.find((x) => x.module === m.alias);
      return a
        ? { ...a, module: m.alias, enabled: true }
        : { module: m.alias, role: 'viewer' as ModuleAccessRole, all_org_units: false, org_unit_ids: [], can_manage_users: false, enabled: false };
    })
  );
  const [saving, setSaving] = useState(false);

  const updateEntry = (alias: string, patch: Partial<AccessEntry>) => {
    setEntries((prev) => prev.map((e) => (e.module === alias ? { ...e, ...patch } : e)));
  };

  const toggleEnabled = (alias: string, enabled: boolean) => {
    setEntries((prev) => prev.map((e) => (e.module === alias ? { ...e, enabled } : e)));
  };

  const handleSave = async () => {
    if (!name.trim() || !email.trim()) {
      notify({ type: 'warning', title: 'Campos obrigatórios', message: 'Nome e e-mail são obrigatórios.' });
      return;
    }
    if (resetPassword) {
      if (!newPassword || newPassword.length < 8) {
        notify({ type: 'warning', title: 'Senha fraca', message: 'A senha deve ter pelo menos 8 caracteres.' });
        return;
      }
      if (newPassword !== newPasswordConfirmation) {
        notify({ type: 'warning', title: 'Senhas diferentes', message: 'A senha e a confirmação não coincidem.' });
        return;
      }
    }
    setSaving(true);
    try {
      if (resetPassword && newPassword) {
        await accessApi.resetPassword(user.id, newPassword, newPasswordConfirmation);
      }

      const accesses: ModuleAccessItem[] = entries
        .filter((e) => e.enabled)
        .map((e) => ({
          module: e.module,
          role: e.role,
          all_org_units: e.all_org_units,
          org_unit_ids: e.all_org_units ? [] : e.org_unit_ids,
          can_manage_users: e.can_manage_users,
          can_create: e.can_create,
          can_edit: e.can_edit,
          can_delete: e.can_delete,
        }));

      const updated = await accessApi.updateUser(user.id, {
        name: name.trim(),
        email: email.trim(),
        matricula: matricula.trim() || null,
        cargo_id: cargoId === '' ? null : cargoId,
        primary_org_unit_id: primaryOrgUnitId === '' ? null : primaryOrgUnitId,
        group_ids: selectedGroupIds,
        accesses,
      });
      notify({ type: 'success', title: 'Usuário atualizado', message: resetPassword ? 'Senha redefinida e dados atualizados.' : 'Dados e acessos salvos com sucesso.' });
      onSaved(updated);
      onClose();
    } catch (e: any) {
      notify({ type: 'error', title: 'Falha ao salvar', message: e?.response?.data?.message || e?.message || 'Erro ao salvar.' });
    } finally {
      setSaving(false);
    }
  };

  const footer = (
    <>
      <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
        Cancelar
      </button>
      <button
        onClick={handleSave}
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar alterações
      </button>
    </>
  );

  return (
    <Modal open onClose={onClose} title="Editar Usuário" icon={<UserCog className="h-5 w-5 text-primary" />} size="xl" footer={footer}>
      <div className="space-y-6">
        {/* Dados pessoais */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="primary"><ShieldCheck className="h-3 w-3" /> Dados pessoais</Badge>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nome completo" required>
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Nome do usuário" />
            </Field>
            <Field label="E-mail" required>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={cn(inputCls, 'font-mono')} placeholder="email@dominio.gov.br" />
            </Field>
            <Field label="Matrícula" hint="Código funcional (opcional)">
              <input value={matricula} onChange={(e) => setMatricula(e.target.value)} className={cn(inputCls, 'font-mono')} placeholder="000000" />
            </Field>
            <Field label="Cargo">
              <select value={cargoId} onChange={(e) => setCargoId(e.target.value === '' ? '' : Number(e.target.value))} className={inputCls}>
                <option value="">Nenhum cargo</option>
                {cargos.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
          </div>
        </section>

        {/* Reset de senha */}
        <section className="space-y-3 rounded-xl border border-border p-4">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-foreground/70">
            <KeyRound className="h-3.5 w-3.5 text-primary" /> Redefinir senha
          </div>
          <label className="flex cursor-pointer items-center gap-2.5">
            <input type="checkbox" checked={resetPassword} onChange={(e) => { setResetPassword(e.target.checked); if (!e.target.checked) { setNewPassword(''); setNewPasswordConfirmation(''); } }} className="h-4 w-4 accent-primary" />
            <span className="text-xs font-semibold text-foreground">Redefinir senha deste usuário</span>
          </label>
          {resetPassword && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Nova senha">
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mín. 8 caracteres" className={cn(inputCls, 'bg-muted/30')} />
              </Field>
              <Field label="Confirmar senha">
                <input type="password" value={newPasswordConfirmation} onChange={(e) => setNewPasswordConfirmation(e.target.value)} placeholder="Repita a senha" className={cn(inputCls, 'bg-muted/30')} />
              </Field>
            </div>
          )}
        </section>

        {/* Vínculo */}
        <section className="space-y-4">
          <Badge variant="info">Vínculo e grupos</Badge>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Secretaria/órgão de vínculo">
              <select value={primaryOrgUnitId} onChange={(e) => setPrimaryOrgUnitId(e.target.value === '' ? '' : Number(e.target.value))} className={inputCls}>
                <option value="">Nenhuma</option>
                {flattenUnits(units).map(({ node, depth }) => (
                  <option key={node.id} value={node.id}>{'\u00A0'.repeat(depth * 2)}{node.name} ({node.code})</option>
                ))}
              </select>
            </Field>
            <Field label="Grupos de acesso" hint={selectedGroupIds.length > 0 ? `${selectedGroupIds.length} selecionado(s)` : undefined}>
              <div className="max-h-32 overflow-y-auto rounded-lg border border-input p-2 space-y-1">
                {groups.length === 0 && <p className="p-1 text-xs text-muted-foreground">Nenhum grupo cadastrado.</p>}
                {groups.map((g) => (
                  <label key={g.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-xs transition-colors hover:bg-accent">
                    <input type="checkbox" checked={selectedGroupIds.includes(g.id)} onChange={(e) => setSelectedGroupIds((prev) => (e.target.checked ? [...prev, g.id] : prev.filter((x) => x !== g.id)))} className="accent-primary" />
                    <span className="font-medium text-foreground">{g.name}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">{g.category?.name ?? 'sem categoria'}</span>
                  </label>
                ))}
              </div>
            </Field>
          </div>
        </section>

        {/* Acessos por módulo */}
        <section className="space-y-3">
          <Badge variant="warning">Acessos por módulo</Badge>
          <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
            {entries.map((entry) => (
              <div key={entry.module} className={cn('rounded-xl border p-3 transition-colors', entry.enabled ? 'border-primary/30 bg-accent/20' : 'border-border opacity-70')}>
                <div className="mb-2 flex items-center justify-between">
                  <label className="flex cursor-pointer items-center gap-2.5">
                    <input type="checkbox" checked={entry.enabled} onChange={(e) => toggleEnabled(entry.module, e.target.checked)} className="h-4 w-4 accent-primary" />
                    <span className="text-xs font-bold text-foreground">
                      {modules.find((m) => m.alias === entry.module)?.name ?? entry.module}
                    </span>
                  </label>
                  {entry.enabled && <Badge variant="success">ativo</Badge>}
                </div>
                {entry.enabled && (
                  <ModuleAccessPicker
                    units={units}
                    selectedIds={entry.org_unit_ids}
                    onChange={(ids) => updateEntry(entry.module, { org_unit_ids: ids, all_org_units: false })}
                    allSelected={entry.all_org_units}
                    onToggleAll={() => updateEntry(entry.module, { all_org_units: !entry.all_org_units, org_unit_ids: entry.all_org_units ? [] : entry.org_unit_ids })}
                    canManageUsers={entry.can_manage_users}
                    onToggleManageUsers={(v) => updateEntry(entry.module, { can_manage_users: v })}
                    role={entry.role}
                    onRoleChange={(r) => updateEntry(entry.module, { role: r as ModuleAccessRole })}
                    canCreate={entry.can_create}
                    canEdit={entry.can_edit}
                    canDelete={entry.can_delete}
                    onPermissionChange={(perm, v) => updateEntry(entry.module, { [perm]: v })}
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </Modal>
  );
};