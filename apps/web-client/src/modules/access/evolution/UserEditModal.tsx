import React, { useState } from 'react';
import { X, Loader2, Save, UserCog, KeyRound } from 'lucide-react';
import { accessApi, AccessUser, AccessModule, OrgUnitNode, Cargo, AccessGroup, ModuleAccessItem, ModuleAccessRole } from '../AccessApi';
import { ModuleAccessPicker } from './ModuleAccessPicker';

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

/**
 * Formulário completo de edição de usuário: dados pessoais (nome, e-mail, matrícula, cargo),
 * vínculo (secretaria principal, grupos de acesso) e acessos por módulo (permissões granulares).
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-3xl shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gov-border sticky top-0 bg-white dark:bg-slate-900 z-10">
          <h2 className="text-lg font-bold text-[#0c326f] dark:text-white flex items-center gap-2">
            <UserCog className="w-5 h-5 text-gov-primary" /> Editar Usuário
          </h2>
          <button onClick={onClose} className="text-gov-text-muted hover:text-gov-text-primary"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-6">
          {/* Dados pessoais */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gov-text-secondary mb-3">Dados pessoais</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gov-text-secondary mb-1">Nome completo *</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border border-gov-border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gov-text-secondary mb-1">E-mail *</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 border border-gov-border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gov-text-secondary mb-1">Matrícula</label>
                <input value={matricula} onChange={(e) => setMatricula(e.target.value)} className="w-full px-3 py-2 border border-gov-border rounded-lg text-sm font-mono" placeholder="000000" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gov-text-secondary mb-1">Cargo</label>
                <select value={cargoId} onChange={(e) => setCargoId(e.target.value === '' ? '' : Number(e.target.value))} className="w-full px-3 py-2 border border-gov-border rounded-lg text-sm">
                  <option value="">Nenhum cargo</option>
                  {cargos.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
          </section>

          {/* Reset de senha */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gov-text-secondary mb-3 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5" /> Redefinir senha
            </h3>
            <div className="border border-gov-border rounded-xl p-4 space-y-3">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={resetPassword} onChange={(e) => { setResetPassword(e.target.checked); if (!e.target.checked) { setNewPassword(''); setNewPasswordConfirmation(''); } }} className="w-4 h-4 accent-gov-primary" />
                <span className="text-xs font-semibold text-gov-text-primary">Redefinir senha deste usuário</span>
              </label>
              {resetPassword && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gov-text-secondary mb-1">Nova senha</label>
                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mín. 8 caracteres" className="w-full px-3 py-2 border border-gov-border rounded-lg text-sm bg-slate-50 dark:bg-slate-800" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gov-text-secondary mb-1">Confirmar senha</label>
                    <input type="password" value={newPasswordConfirmation} onChange={(e) => setNewPasswordConfirmation(e.target.value)} placeholder="Repita a senha" className="w-full px-3 py-2 border border-gov-border rounded-lg text-sm bg-slate-50 dark:bg-slate-800" />
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Vínculo */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gov-text-secondary mb-3">Vínculo e grupos</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gov-text-secondary mb-1">Secretaria/órgão de vínculo</label>
                <select value={primaryOrgUnitId} onChange={(e) => setPrimaryOrgUnitId(e.target.value === '' ? '' : Number(e.target.value))} className="w-full px-3 py-2 border border-gov-border rounded-lg text-sm">
                  <option value="">Nenhuma</option>
                  {flattenUnits(units).map(({ node, depth }) => (
                    <option key={node.id} value={node.id}>{'\u00A0'.repeat(depth * 2)}{node.name} ({node.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gov-text-secondary mb-1">Grupos de acesso</label>
                <div className="max-h-32 overflow-y-auto border border-gov-border rounded-lg p-2 space-y-1">
                  {groups.length === 0 && <p className="text-xs text-gov-text-muted p-1">Nenhum grupo cadastrado.</p>}
                  {groups.map((g) => (
                    <label key={g.id} className="flex items-center gap-2 py-1 px-1 text-xs cursor-pointer hover:bg-gov-primary/5 rounded">
                      <input type="checkbox" checked={selectedGroupIds.includes(g.id)} onChange={(e) => setSelectedGroupIds((prev) => (e.target.checked ? [...prev, g.id] : prev.filter((x) => x !== g.id)))} className="accent-gov-primary" />
                      <span className="font-medium text-gov-text-primary">{g.name}</span>
                      <span className="text-[10px] text-gov-text-muted font-mono">{g.category?.name ?? 'sem categoria'}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Acessos por módulo */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gov-text-secondary mb-3">Acessos por módulo</h3>
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {entries.map((entry) => (
                <div key={entry.module} className={`border rounded-lg p-3 transition-colors ${entry.enabled ? 'border-gov-primary/30 bg-gov-primary/[0.02]' : 'border-gov-border opacity-70'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input type="checkbox" checked={entry.enabled} onChange={(e) => toggleEnabled(entry.module, e.target.checked)} className="w-4 h-4 accent-gov-primary" />
                      <span className="text-xs font-bold text-gov-text-primary">
                        {modules.find((m) => m.alias === entry.module)?.name ?? entry.module}
                      </span>
                    </label>
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

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gov-border sticky bottom-0 bg-white dark:bg-slate-900">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gov-border rounded-lg text-gov-text-secondary">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 px-5 py-2 text-sm bg-gov-primary text-white rounded-lg disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar alterações
          </button>
        </div>
      </div>
    </div>
  );
};