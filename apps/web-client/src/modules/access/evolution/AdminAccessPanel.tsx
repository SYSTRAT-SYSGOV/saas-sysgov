import React, { useEffect, useState, useCallback } from 'react';
import { LayoutGrid, Users, Clock, MailWarning, RotateCcw, XCircle, Briefcase, Layers, ShieldCheck, Building2 } from 'lucide-react';
import { accessApi, AccessMatrixRow, AccessModuleGroup, ExpiringAccess, AccessModule, OrgUnitNode } from '../AccessApi';
import { AccessBadge, formatDate } from './AccessBadge';
import { CargosManagement } from './CargosManagement';
import { GroupsManagement } from './GroupsManagement';
import { RolesManagement } from './RolesManagement';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { cn } from '@/lib/utils';

type Tab = 'matrix' | 'byModule' | 'expiring' | 'pending' | 'cargos' | 'groups' | 'roles';

interface AdminAccessPanelProps {
  modules: AccessModule[];
  units: OrgUnitNode[];
  notify: (t: { type: 'success' | 'error' | 'info' | 'warning'; title: string; message: string }) => void;
}

/**
 * Painel do Administrador Geral: visões por módulo, por secretaria, expirando, pendentes,
 * cargos e grupos/categorias de acesso. Redesenhado com componentes shadcn/GOV.BR.
 */
export const AdminAccessPanel: React.FC<AdminAccessPanelProps> = ({ modules, units, notify }) => {
  const [tab, setTab] = useState<Tab>('matrix');
  const [matrix, setMatrix] = useState<AccessMatrixRow[]>([]);
  const [byModule, setByModule] = useState<AccessModuleGroup[]>([]);
  const [expiring, setExpiring] = useState<ExpiringAccess[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, mod, ex] = await Promise.all([accessApi.matrix(), accessApi.byModule(), accessApi.expiring()]);
      setMatrix(m);
      setByModule(mod);
      setExpiring(ex);
    } catch (e: any) {
      notify({ type: 'error', title: 'Erro ao carregar acessos', message: e?.response?.data?.message || e?.message || 'Falha ao carregar.' });
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => { load(); }, [load]);

  const handleRevoke = async (row: AccessMatrixRow) => {
    if (!window.confirm(`Revogar o acesso de ${row.user_name} ao módulo ${row.module}?`)) return;
    try {
      await accessApi.revokeAccess(row.id);
      notify({ type: 'success', title: 'Acesso revogado', message: 'O acesso foi revogado (histórico preservado).' });
      load();
    } catch (e: any) {
      notify({ type: 'error', title: 'Falha', message: e?.response?.data?.message || e?.message || 'Erro ao revogar.' });
    }
  };

  const handleRenew = async (row: AccessMatrixRow) => {
    try {
      await accessApi.renewAccess(row.id);
      notify({ type: 'success', title: 'Acesso renovado', message: 'Vigência estendida por 30 dias.' });
      load();
    } catch (e: any) {
      notify({ type: 'error', title: 'Falha', message: e?.response?.data?.message || e?.message || 'Erro ao renovar.' });
    }
  };

  const tabs: { key: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: 'matrix', label: 'Matriz de Acessos', icon: <LayoutGrid className="h-4 w-4" /> },
    { key: 'byModule', label: 'Por Módulo', icon: <Users className="h-4 w-4" /> },
    { key: 'expiring', label: 'Expirando', icon: <Clock className="h-4 w-4" />, badge: expiring.length },
    { key: 'pending', label: 'Pendentes', icon: <MailWarning className="h-4 w-4" /> },
    { key: 'cargos', label: 'Cargos', icon: <Briefcase className="h-4 w-4" /> },
    { key: 'groups', label: 'Grupos & Categorias', icon: <Layers className="h-4 w-4" /> },
    { key: 'roles', label: 'Roles & Permissões', icon: <ShieldCheck className="h-4 w-4" /> },
  ];

  return (
    <Card noPadding className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border bg-card px-4 py-3">
        <Tabs items={tabs} value={tab} onChange={setTab} />
      </div>

      <div className="p-5">
        {loading ? (
          <div className="flex justify-center py-16">
            <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
          </div>
        ) : (
          <>
            {tab === 'matrix' && <MatrixTable rows={matrix} units={units} onRevoke={handleRevoke} onRenew={handleRenew} />}
            {tab === 'byModule' && (
              <div className="space-y-5">
                {byModule.length === 0 && <Empty text="Nenhum acesso configurado por módulo." />}
                {byModule.map((g) => (
                  <div key={g.module} className="overflow-hidden rounded-xl border border-border">
                    <div className="flex items-center gap-2 border-b border-border bg-accent/40 px-4 py-2.5">
                      <Badge variant="primary">{g.module}</Badge>
                      <span className="text-xs font-semibold text-muted-foreground">{g.users.length} usuário(s)</span>
                    </div>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left uppercase tracking-wider text-[10px] text-muted-foreground">
                          <th className="py-2 pl-4 font-semibold">Usuário</th>
                          <th className="py-2 font-semibold">Papel</th>
                          <th className="py-2 font-semibold">Escopo</th>
                          <th className="py-2 font-semibold">Admin do módulo</th>
                          <th className="py-2 pr-4 text-right font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {g.users.map((u, i) => (
                          <tr key={i} className="transition-colors hover:bg-accent/40">
                            <td className="py-2.5 pl-4 font-medium text-foreground">{u.user_name}</td>
                            <td className="font-mono text-muted-foreground">{u.role}</td>
                            <td>{u.all_org_units ? <Badge variant="success">Todas</Badge> : <Badge variant="neutral">Restrito</Badge>}</td>
                            <td>{u.can_manage_users ? <Badge variant="warning">Sim</Badge> : <span className="text-muted-foreground">Não</span>}</td>
                            <td className="pr-4 text-right"><AccessBadge status={u.status} validTo={u.valid_to} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}
            {tab === 'expiring' && (
              <div>
                {expiring.length === 0 ? <Empty text="Nenhum acesso expirando nos próximos 30 dias." /> : (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left uppercase tracking-wider text-[10px] text-muted-foreground">
                        <th className="py-2 font-semibold">Usuário</th>
                        <th className="py-2 font-semibold">Módulo</th>
                        <th className="py-2 font-semibold">Expira em</th>
                        <th className="py-2 text-right font-semibold">Dias restantes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {expiring.map((e) => (
                        <tr key={e.id} className="transition-colors hover:bg-accent/40">
                          <td className="py-2.5 font-medium text-foreground">{e.user_name}</td>
                          <td className="font-mono">{e.module}</td>
                          <td className="font-semibold text-warning">{formatDate(e.valid_to)}</td>
                          <td className="text-right font-mono tabular-nums">{e.days_left} dia(s)</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
            {tab === 'pending' && <Empty text="Convites pendentes aparecem aqui. (Fluxo de convite por e-mail é mantido.)" />}
            {tab === 'cargos' && <CargosManagement notify={notify} />}
            {tab === 'groups' && <GroupsManagement modules={modules} units={units} notify={notify} />}
            {tab === 'roles' && <RolesManagement notify={notify} />}
          </>
        )}
      </div>
    </Card>
  );
};

const MatrixTable: React.FC<{
  rows: AccessMatrixRow[];
  units: OrgUnitNode[];
  onRevoke: (r: AccessMatrixRow) => void;
  onRenew: (r: AccessMatrixRow) => void;
}> = ({ rows, units, onRevoke, onRenew }) => {
  const flatUnits: OrgUnitNode[] = [];
  const buildFlat = (nodes: OrgUnitNode[]) => { nodes.forEach((n) => { flatUnits.push(n); if (n.children?.length) buildFlat(n.children); }); };
  buildFlat(units);
  const unitName = (id: number) => flatUnits.find((u) => u.id === id)?.name ?? `#${id}`;
  const scopeDisplay = (r: AccessMatrixRow) => r.all_org_units ? 'Todas' : r.org_unit_ids.length === 0 ? '—' : r.org_unit_ids.map(unitName).join(', ');

  if (rows.length === 0) return <Empty text="Nenhum acesso configurado." />;
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border text-left uppercase tracking-wider text-[10px] text-muted-foreground">
            <th className="py-2.5 pl-4 font-semibold">Usuário</th>
            <th className="py-2.5 font-semibold">Módulo</th>
            <th className="py-2.5 font-semibold">Papel</th>
            <th className="py-2.5 font-semibold">Secretarias</th>
            <th className="py-2.5 font-semibold">Admin</th>
            <th className="py-2.5 font-semibold">Status</th>
            <th className="py-2.5 font-semibold">Vigência</th>
            <th className="py-2.5 font-semibold">Concedido por</th>
            <th className="py-2.5 pr-4 text-right font-semibold">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => (
            <tr key={r.id} className="transition-colors hover:bg-accent/40">
              <td className="py-2.5 pl-4 font-medium text-foreground">{r.user_name}</td>
              <td className="font-mono">{r.module}</td>
              <td className="font-mono text-muted-foreground">{r.role}</td>
              <td className="max-w-[160px] truncate" title={scopeDisplay(r)}>{scopeDisplay(r)}</td>
              <td>{r.can_manage_users ? <Badge variant="warning">Sim</Badge> : <span className="text-muted-foreground">Não</span>}</td>
              <td><AccessBadge status={r.status} expiring={r.expiring} validTo={r.valid_to} /></td>
              <td className="font-mono text-muted-foreground">{formatDate(r.valid_to)}</td>
              <td className="text-muted-foreground">{r.granted_by ?? '—'}</td>
              <td className="pr-4">
                <div className="flex justify-end gap-1">
                  {(r.status === 'revoked' || r.status === 'expired') && (
                    <button onClick={() => onRenew(r)} title="Renovar" className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-success/10 hover:text-success focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <RotateCcw className="h-4 w-4" />
                    </button>
                  )}
                  {r.status === 'active' && (
                    <button onClick={() => onRevoke(r)} title="Revogar" className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <XCircle className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const Empty: React.FC<{ text: string }> = ({ text }) => (
  <div className={cn('flex flex-col items-center gap-2 py-16 text-center text-muted-foreground')}>
    <Building2 className="h-8 w-8 opacity-40" />
    <p className="text-sm">{text}</p>
  </div>
);
