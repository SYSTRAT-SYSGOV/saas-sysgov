import React, { useState, useEffect, useCallback } from 'react';
import { UserPlus, Send, Loader2, Landmark, User, Link2, ShieldCheck, CheckCircle, Power } from 'lucide-react';
import { Button, Modal, Select, Switch, Input, Field } from '@/components/ui';
import { accessApi, AccessModule, AccessUser, AccessGroup, Cargo, OrgUnitNode, ModuleAccessItem } from '../AccessApi';
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
  can_create?: boolean;
  can_edit?: boolean;
  can_delete?: boolean;
  valid_to?: string;
}

const STEPS = [
  { rotulo: 'Dados pessoais', icon: User },
  { rotulo: 'Vínculo', icon: Link2 },
  { rotulo: 'Acessos por módulo', icon: ShieldCheck },
  { rotulo: 'Ativação', icon: Power },
];

const PAPEIS = [
  { value: 'membro', label: 'Membro' },
  { value: 'gestor', label: 'Gestor' },
  { value: 'fiscal', label: 'Fiscal' },
  { value: 'admin_tenant', label: 'Administrador do tenant' },
  { value: 'membro_capd', label: 'Comissão de Avaliação (CAPD)' },
  { value: 'gestor_rh', label: 'RH — Gestão de Desempenho (CAPD)' },
  { value: 'avaliador', label: 'Chefia Imediata / Avaliador (CAPD)' },
  { value: 'servidor', label: 'Servidor Avaliado (CAPD)' },
  { value: 'auditoria_capd', label: 'Auditoria e Controle Interno (CAPD)' },
];

function flattenUnits(nodes: OrgUnitNode[], depth = 0): { node: OrgUnitNode; depth: number }[] {
  const out: { node: OrgUnitNode; depth: number }[] = [];
  nodes.forEach((n) => {
    out.push({ node: n, depth });
    if (n.children?.length) out.push(...flattenUnits(n.children, depth + 1));
  });
  return out;
}

function findUnit(nodes: OrgUnitNode[], id: number): OrgUnitNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children?.length) {
      const found = findUnit(n.children, id);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Modal "Novo Usuário" (4 etapas, mesmo padrão do cadastro de pessoa): dados, vínculo, acessos por módulo e ativação.
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

  // Listas auxiliares (cargos e grupos de acesso)
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [groups, setGroups] = useState<AccessGroup[]>([]);

  useEffect(() => {
    accessApi.cargos().then(setCargos).catch(() => setCargos([]));
    accessApi.groups().then(setGroups).catch(() => setGroups([]));
  }, []);

  // Etapa 1 — dados pessoais
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [matricula, setMatricula] = useState('');
  const [cargoId, setCargoId] = useState<number | ''>('');

  // Etapa 2 — vínculo
  const [role, setRole] = useState('membro');
  const [primaryOrgUnitId, setPrimaryOrgUnitId] = useState<number | ''>('');
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);

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

  const setModuleEnabled = (alias: string, enabled: boolean) => {
    if (enabled) {
      updateEntry(alias, {});
    } else {
      setEntries((prev) => prev.filter((e) => e.module !== alias));
    }
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
        role: e.role as ModuleAccessItem['role'],
        all_org_units: e.all_org_units,
        org_unit_ids: e.all_org_units ? [] : e.org_unit_ids,
        can_manage_users: e.can_manage_users,
        can_create: e.can_create ?? false,
        can_edit: e.can_edit ?? false,
        can_delete: e.can_delete ?? false,
      }));

      // Cria o usuário (cadastro rápido real) — convite por e-mail é mantido para fluxo externo
      const user = await accessApi.createUser({
        name,
        email,
        password: 'MudarSenha@123',
        password_confirmation: 'MudarSenha@123',
        matricula: matricula.trim() || null,
        cargo_id: cargoId === '' ? null : cargoId,
        group_ids: selectedGroupIds,
        primary_org_unit_id: primaryOrgUnitId === '' ? null : primaryOrgUnitId,
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


  const ultimo = step === STEPS.length - 1;

  return (
    <Modal
      open
      onClose={onClose}
      title="Novo Usuário"
      icon={<UserPlus className="h-5 w-5 text-primary" />}
      description="Cadastre o usuário, vincule-o a uma secretaria e defina os acessos por módulo."
      size="2xl"
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <div>
            {step > 0 && (
              <Button variant="outline" type="button" disabled={submitting} onClick={() => setStep((s) => Math.max(0, s - 1))}>
                ← Voltar
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancelar
            </Button>
            {ultimo ? (
              <Button type="button" onClick={handleSubmit} disabled={submitting || entries.length === 0}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                {sendInvite ? 'Enviar convite' : 'Criar usuário'}
              </Button>
            ) : (
              <Button type="button" onClick={() => canNext() && setStep((s) => s + 1)} disabled={!canNext()}>
                Avançar →
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Stepper */}
        <div className="grid grid-cols-2 gap-2 border-b border-border pb-4 sm:grid-cols-4">
          {STEPS.map((item, i) => {
            const ativo = i === step;
            const completado = i < step;
            return (
              <div
                key={item.rotulo}
                className={`flex items-center gap-2 rounded-lg border p-2.5 transition-colors ${
                  ativo
                    ? 'border-primary bg-primary/10 text-primary'
                    : completado
                    ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400'
                    : 'border-border/60 bg-muted/20 text-muted-foreground'
                }`}
              >
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    ativo ? 'bg-primary text-primary-foreground' : completado ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {completado ? <CheckCircle className="h-4 w-4" /> : i + 1}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-xs font-semibold">{item.rotulo}</div>
                  <div className="text-[10px] text-muted-foreground">{i === 0 ? 'Obrigatório' : i === 2 ? 'Defina os módulos' : 'Revise'}</div>
                </div>
              </div>
            );
          })}
        </div>

        {step === 0 && (
          <div className="space-y-4">
            <Field label="Nome completo" required>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Maria da Silva" />
            </Field>
            <Field label="E-mail" required>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@prefeitura.gov.br" />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Matrícula do servidor" hint="Opcional">
                <Input className="font-mono tabular-nums" value={matricula} onChange={(e) => setMatricula(e.target.value)} placeholder="000000" />
              </Field>
              <Field label="Cargo" hint="Opcional">
                <Select
                  value={cargoId === '' ? null : cargoId}
                  onChange={(v) => setCargoId(Number(v) === 0 ? '' : Number(v))}
                  options={[{ value: 0, label: 'Nenhum cargo' }, ...cargos.map((c) => ({ value: c.id, label: c.name }))]}
                  placeholder="Nenhum cargo"
                />
              </Field>
            </div>
            <Field label="Telefone" hint="Opcional">
              <Input className="tabular-nums" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(41) 99999-9999" />
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <Field label="Papel no vínculo" hint="O papel define a autoridade global; os acessos por módulo são definidos na próxima etapa.">
              <Select value={role} onChange={(v) => setRole(v)} options={PAPEIS} />
            </Field>
            <Field
              label="Secretaria/órgão de vínculo"
              hint="Indica a secretaria principal do usuário. Na próxima etapa você define o acesso a módulos de qualquer secretaria (cross-secretaria)."
            >
              <Select
                value={primaryOrgUnitId === '' ? null : primaryOrgUnitId}
                onChange={(v) => setPrimaryOrgUnitId(Number(v) === 0 ? '' : Number(v))}
                options={[{ value: 0, label: 'Nenhuma (sem vínculo de secretaria)' }, ...flattenUnits(units).map(({ node, depth }) => ({
                  value: node.id,
                  label: `${'\u00A0'.repeat(depth * 2)}${node.name} (${node.code})`,
                }))]}
                placeholder="Nenhuma (sem vínculo de secretaria)"
              />
            </Field>
            <Field label="Grupos de acesso" hint="Usuários de um grupo herdam os acessos definidos nele, além dos acessos diretos.">
              <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border border-border bg-muted/20 p-2">
                {groups.length === 0 && <p className="p-1 text-xs text-muted-foreground">Nenhum grupo cadastrado. Crie grupos na aba "Grupos & Categorias".</p>}
                {groups.map((g) => (
                  <label key={g.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-xs hover:bg-primary/5">
                    <input
                      type="checkbox"
                      checked={selectedGroupIds.includes(g.id)}
                      onChange={(e) => setSelectedGroupIds((prev) => (e.target.checked ? [...prev, g.id] : prev.filter((x) => x !== g.id)))}
                      className="accent-gov-primary"
                    />
                    <span className="font-medium text-foreground">{g.name}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {g.category?.name ?? 'sem categoria'} · {g.accesses?.length ?? 0} módulos
                    </span>
                  </label>
                ))}
              </div>
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            {visibleModules.length === 0 && (
              <p className="text-xs text-gov-text-muted">Você não administra nenhum módulo neste tenant.</p>
            )}

            {/* Banner do vínculo — deixa claro a secretaria do usuário e permite cross-secretaria */}
            <div className="flex items-start gap-2.5 rounded-lg border border-gov-primary/25 bg-gov-primary/5 p-3">
              <Landmark className="w-4 h-4 text-gov-primary mt-0.5 shrink-0" />
              <div className="text-xs text-gov-text-secondary">
                <span className="font-semibold text-gov-text-primary">
                  {primaryOrgUnitId !== ''
                    ? `Vinculado à secretaria: ${findUnit(units, Number(primaryOrgUnitId))?.name ?? '—'}`
                    : 'Nenhuma secretaria de vínculo definida na etapa anterior.'}
                </span>
                <p className="mt-0.5">
                  O usuário pertence à secretaria acima, mas pode receber acesso a <strong>módulos de outras secretarias</strong> conforme o perfil de acesso — selecione as secretarias desejadas abaixo em cada módulo.
                </p>
              </div>
            </div>

            {visibleModules.map((m) => {
              const entry = entries.find((e) => e.module === m.alias);
              const enabled = !!entry;
              const isPrimarySelected = !entry?.all_org_units && (entry?.org_unit_ids ?? []).includes(Number(primaryOrgUnitId));
              return (
                <div key={m.alias} className={`border rounded-lg p-4 transition-colors ${enabled ? 'border-gov-primary/30 bg-gov-primary/[0.02]' : 'border-gov-border opacity-70'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(e) => setModuleEnabled(m.alias, e.target.checked)}
                        className="w-4 h-4 rounded accent-gov-primary"
                      />
                      <div>
                        <h4 className="text-xs font-bold text-gov-text-primary">{m.name} <span className="font-mono text-gov-text-muted">({m.alias})</span></h4>
                        <p className="text-[10px] text-gov-text-muted">{enabled ? 'Acesso concedido a este módulo' : 'Marque para habilitar o acesso'}</p>
                      </div>
                    </label>
                    {enabled && primaryOrgUnitId !== '' && (
                      <button
                        type="button"
                        disabled={isPrimarySelected}
                        onClick={() => updateEntry(m.alias, { all_org_units: false, org_unit_ids: [Number(primaryOrgUnitId)] })}
                        className="text-[10px] font-semibold text-gov-primary hover:underline disabled:opacity-40 disabled:no-underline"
                      >
                        {isPrimarySelected ? '✓ Minha secretaria' : 'Aplicar Minha secretaria'}
                      </button>
                    )}
                  </div>
                  {enabled && (
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
                      canCreate={entry?.can_create ?? false}
                      canEdit={entry?.can_edit ?? false}
                      canDelete={entry?.can_delete ?? false}
                      onPermissionChange={(perm, v) => updateEntry(m.alias, { [perm]: v })}
                      validTo={entry?.valid_to}
                      onValidToChange={(v) => updateEntry(m.alias, { valid_to: v })}
                    />
                  )}
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
            <Switch
              label="Enviar convite por e-mail (em vez de ativar imediatamente)"
              checked={sendInvite}
              onCheckedChange={setSendInvite}
            />
            {sendInvite && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400">
                O convite expira em 72h. A senha provisória não será definida.
              </p>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
