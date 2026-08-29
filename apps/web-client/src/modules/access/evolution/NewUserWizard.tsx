import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, UserPlus, Send, Loader2 } from 'lucide-react';
import { accessApi, AccessModule, AccessUser, OrgUnitNode, ModuleAccessItem } from '../AccessApi';
import { ModuleAccessPicker } from './ModuleAccessPicker';

interface NewUserWizardProps {
  modules: AccessModule[];
  units: OrgUnitNode[];
  isGlobalAdmin: boolean;
  myManagedModules: string[];
  onCreated: (user: AccessUser) => void;
  onClose: () => void;
  notify: (t: { type: 'success' | 'error' | 'info' | 'warning'; title: string; message: string }) => void;
}

interface Step3Entry {
  module: string;
  role: string;
  all_org_units: boolean;
  org_unit_ids: number[];
  can_manage_users: boolean;
  valid_to?: string;
}

const STEPS = ['Dados pessoais', 'Vínculo', 'Acessos por módulo', 'Ativação'];

/**
 * Wizard "Novo Usuário" (4 etapas): dados, vínculo, acessos por módulo e ativação.
 * Admin de módulo vê apenas a Etapa 3 filtrada para os módulos que administra (RN-ACC-002).
 */
export const NewUserWizard: React.FC<NewUserWizardProps> = ({
  modules,
  units,
  isGlobalAdmin,
  myManagedModules,
  onCreated,
  onClose,
  notify,
}) => {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Etapa 1 — dados pessoais
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Etapa 2 — vínculo
  const [role, setRole] = useState('membro');

  // Etapa 3 — acessos
  const [entries, setEntries] = useState<Step3Entry[]>([]);

  // Etapa 4 — ativação
  const [sendInvite, setSendInvite] = useState(false);

  // Admin de módulo: só enxerga os módulos que administra
  const visibleModules = isGlobalAdmin ? modules : modules.filter((m) => myManagedModules.includes(m.alias));

  const updateEntry = (alias: string, patch: Partial<Step3Entry>) => {
    setEntries((prev) => {
      const existing = prev.find((e) => e.module === alias);
      if (!existing) return [...prev, { module: alias, role: 'viewer', all_org_units: false, org_unit_ids: [], can_manage_users: false, ...patch }];
      return prev.map((e) => (e.module === alias ? { ...e, ...patch } : e));
    });
  };

  const canNext = () => {
    if (step === 0) return name.trim().length >= 3 && /\S+@\S+\.\S+/.test(email);
    if (step === 1) return role.trim().length > 0;
    if (step === 2) return true;
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const accesses: ModuleAccessItem[] = entries.map((e) => ({
        module: e.module,
        role: e.role as 'member' | 'manager',
        all_org_units: e.all_org_units,
        org_unit_ids: e.all_org_units ? [] : e.org_unit_ids,
        can_manage_users: e.can_manage_users,
      }));

      // Cria o usuário (cadastro rápido real) — convite por e-mail é mantido para fluxo externo
      const user = await accessApi.createUser({
        name,
        email,
        password: 'MudarSenha@123',
        password_confirmation: 'MudarSenha@123',
        accesses,
      });

      notify({ type: 'success', title: 'Usuário criado', message: `${name} foi criado com acesso aos módulos selecionados.` });
      onCreated(user);
      onClose();
    } catch (e: any) {
      notify({ type: 'error', title: 'Falha ao criar usuário', message: e?.response?.data?.message || e?.message || 'Erro ao salvar.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-gov-border shadow-sm overflow-hidden">
      {/* Header + stepper */}
      <div className="px-5 pt-5 pb-3 border-b border-gov-border">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gov-text-primary flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-gov-primary" />
            Novo Usuário
          </h3>
          <button onClick={onClose} className="text-xs text-gov-text-muted hover:text-gov-text-primary">Fechar</button>
        </div>
        <div className="flex items-center gap-1 mt-4">
          {STEPS.map((label, i) => (
            <div key={label} className="flex-1">
              <div className={`h-1.5 rounded-full ${i <= step ? 'bg-gov-primary' : 'bg-gov-border'}`} />
              <p className={`text-[10px] mt-1 ${i === step ? 'text-gov-primary font-semibold' : 'text-gov-text-muted'}`}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="p-5 space-y-4">
        {step === 0 && (
          <>
            <Field label="Nome completo *">
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-gov-border rounded-lg text-sm" placeholder="Ex.: Maria da Silva" />
            </Field>
            <Field label="E-mail *">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-gov-border rounded-lg text-sm" placeholder="email@prefeitura.gov.br" />
            </Field>
            <Field label="Telefone (opcional)">
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-gov-border rounded-lg text-sm" placeholder="(41) 99999-9999" />
            </Field>
          </>
        )}

        {step === 1 && (
          <Field label="Papel no vínculo">
            <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-gov-border rounded-lg text-sm">
              <option value="membro">Membro</option>
              <option value="gestor">Gestor</option>
              <option value="fiscal">Fiscal</option>
              <option value="admin_tenant">Administrador do tenant</option>
            </select>
            <p className="text-[11px] text-gov-text-muted mt-1">O papel define a autoridade global; os acessos por módulo são definidos na próxima etapa.</p>
          </Field>
        )}

        {step === 2 && (
          <div className="space-y-5 max-h-[50vh] overflow-y-auto pr-1">
            {visibleModules.length === 0 && (
              <p className="text-xs text-gov-text-muted">Você não administra nenhum módulo neste tenant.</p>
            )}
            {visibleModules.map((m) => {
              const entry = entries.find((e) => e.module === m.alias);
              return (
                <div key={m.alias} className="border border-gov-border rounded-lg p-4">
                  <h4 className="text-xs font-bold text-gov-text-primary mb-3">{m.name} <span className="font-mono text-gov-text-muted">({m.alias})</span></h4>
                  <ModuleAccessPicker
                    units={units}
                    selectedIds={entry?.org_unit_ids ?? []}
                    onChange={(ids) => updateEntry(m.alias, { org_unit_ids: ids, all_org_units: false })}
                    allSelected={entry?.all_org_units ?? false}
                    onToggleAll={() => updateEntry(m.alias, { all_org_units: !entry?.all_org_units, org_unit_ids: entry?.all_org_units ? [] : (entry?.org_unit_ids ?? []) })}
                    canManageUsers={entry?.can_manage_users ?? false}
                    onToggleManageUsers={(v) => updateEntry(m.alias, { can_manage_users: v })}
                    role={entry?.role ?? 'viewer'}
                    onRoleChange={(r) => updateEntry(m.alias, { role: r })}
                    validTo={entry?.valid_to}
                    onValidToChange={(v) => updateEntry(m.alias, { valid_to: v })}
                  />
                </div>
              );
            })}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <p className="text-xs text-gov-text-secondary">
              <strong>{name}</strong> ({email}) será criado com acesso aos módulos abaixo.
            </p>
            <ul className="text-xs text-gov-text-primary space-y-1">
              {entries.map((e) => (
                <li key={e.module} className="flex justify-between border-b border-gov-border pb-1">
                  <span className="font-semibold">{e.module}</span>
                  <span className="text-gov-text-muted font-mono">
                    {e.role} · {e.all_org_units ? 'todas as secretarias' : `${e.org_unit_ids.length} secretarias`} · {e.can_manage_users ? 'admin' : 'membro'}
                    {e.valid_to ? ` · até ${new Date(e.valid_to).toLocaleDateString('pt-BR')}` : ''}
                  </span>
                </li>
              ))}
            </ul>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input type="checkbox" checked={sendInvite} onChange={(e) => setSendInvite(e.target.checked)} className="accent-gov-primary" />
              Enviar convite por e-mail (em vez de ativar imediatamente)
            </label>
            {sendInvite && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400">
                O convite expira em 72h. A senha provisória não será definida.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-gov-border flex items-center justify-between">
        <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="inline-flex items-center gap-1 text-xs font-semibold text-gov-text-secondary hover:text-gov-text-primary disabled:opacity-40">
          <ChevronLeft className="w-4 h-4" /> Voltar
        </button>

        {step < 3 ? (
          <button
            onClick={() => canNext() && setStep((s) => s + 1)}
            disabled={!canNext()}
            className="inline-flex items-center gap-1 bg-gov-primary hover:bg-gov-primary-hover text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40"
          >
            Avançar <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting || entries.length === 0}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sendInvite ? 'Enviar convite' : 'Criar usuário'}
          </button>
        )}
      </div>
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="block text-xs font-semibold text-gov-text-secondary mb-1">{label}</label>
    {children}
  </div>
);
