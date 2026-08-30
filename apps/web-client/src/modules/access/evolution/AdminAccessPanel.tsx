import React, { useEffect, useState, useCallback } from 'react';
import { LayoutGrid, Building2, Clock, Users, MailWarning, Loader2, RotateCcw, XCircle, Briefcase, Layers, ShieldCheck } from 'lucide-react';
import { accessApi, AccessMatrixRow, AccessModuleGroup, ExpiringAccess, AccessModule, OrgUnitNode } from '../AccessApi';
import { AccessBadge, formatDate } from './AccessBadge';
import { CargosManagement } from './CargosManagement';
import { GroupsManagement } from './GroupsManagement';
import { RolesManagement } from './RolesManagement';

type Tab = 'matrix' | 'byModule' | 'expiring' | 'pending' | 'cargos' | 'groups' | 'roles';

interface AdminAccessPanelProps {
  modules: AccessModule[];
  units: OrgUnitNode[];
  notify: (t: { type: 'success' | 'error' | 'info' | 'warning'; title: string; message: string }) => void;
}

/**
 * Painel do Administrador Geral: visões por módulo, por secretaria, expirando, pendentes,
 * cargos e grupos/categorias de acesso.
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

  useEffect(() => {
    load();
  }, [load]);

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

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'matrix', label: 'Matriz de Acessos', icon: <LayoutGrid className="w-4 h-4" /> },
    { key: 'byModule', label: 'Por Módulo', icon: <Users className="w-4 h-4" /> },
    { key: 'expiring', label: `Expirando (${expiring.length})`, icon: <Clock className="w-4 h-4" /> },
    { key: 'pending', label: 'Pendentes', icon: <MailWarning className="w-4 h-4" /> },
    { key: 'cargos', label: 'Cargos', icon: <Briefcase className="w-4 h-4" /> },
    { key: 'groups', label: 'Grupos & Categorias', icon: <Layers className="w-4 h-4" /> },
    { key: 'roles', label: 'Roles & Permissões', icon: <ShieldCheck className="w-4 h-4" /> },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-gov-border shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gov-border flex flex-wrap gap-1.5">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              tab === t.key ? 'bg-gov-primary text-white' : 'text-gov-text-secondary hover:bg-gov-primary/10'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-5">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-gov-primary" /></div>
        ) : (
          <>
            {tab === 'matrix' && (
              <MatrixTable rows={matrix} onRevoke={handleRevoke} onRenew={handleRenew} />
            )}
            {tab === 'byModule' && (
              <div className="space-y-5">
                {byModule.length === 0 && <Empty text="Nenhum acesso configurado por módulo." />}
                {byModule.map((g) => (
                  <div key={g.module} className="border border-gov-border rounded-lg p-4">
                    <h4 className="text-xs font-bold text-gov-text-primary mb-2">{g.module}</h4>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-gov-text-muted uppercase tracking-wider text-[10px] border-b border-gov-border">
                          <th className="py-1.5">Usuário</th><th>Papel</th><th>Escopo</th><th>Admin do módulo</th><th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {g.users.map((u, i) => (
                          <tr key={i} className="border-b border-gov-border/60">
                            <td className="py-2 text-gov-text-primary">{u.user_name}</td>
                            <td className="font-mono text-gov-text-secondary">{u.role}</td>
                            <td>{u.all_org_units ? 'Todas' : 'Restrito'}</td>
                            <td>{u.can_manage_users ? 'Sim' : 'Não'}</td>
                            <td><AccessBadge status={u.status} validTo={u.valid_to} /></td>
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
                      <tr className="text-left text-gov-text-muted uppercase tracking-wider text-[10px] border-b border-gov-border">
                        <th className="py-1.5">Usuário</th><th>Módulo</th><th>Expira em</th><th>Dias restantes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expiring.map((e) => (
                        <tr key={e.id} className="border-b border-gov-border/60">
                          <td className="py-2 text-gov-text-primary">{e.user_name}</td>
                          <td className="font-mono">{e.module}</td>
                          <td className="text-amber-600 dark:text-amber-400 font-semibold">{formatDate(e.valid_to)}</td>
                          <td>{e.days_left} dia(s)</td>
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
    </div>
  );
};

const MatrixTable: React.FC<{
  rows: AccessMatrixRow[];
  onRevoke: (r: AccessMatrixRow) => void;
  onRenew: (r: AccessMatrixRow) => void;
}> = ({ rows, onRevoke, onRenew }) => {
  if (rows.length === 0) return <Empty text="Nenhum acesso configurado." />;
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-left text-gov-text-muted uppercase tracking-wider text-[10px] border-b border-gov-border">
          <th className="py-2">Usuário</th><th>Módulo</th><th>Papel</th><th>Secretarias</th><th>Admin</th><th>Status</th><th>Vigência</th><th>Concedido por</th><th>Ações</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-b border-gov-border/60 hover:bg-gov-primary/5">
            <td className="py-2 text-gov-text-primary font-medium">{r.user_name}</td>
            <td className="font-mono">{r.module}</td>
            <td className="font-mono text-gov-text-secondary">{r.role}</td>
            <td>{r.all_org_units ? 'Todas' : `${r.org_unit_ids.length} un.`}</td>
            <td>{r.can_manage_users ? 'Sim' : 'Não'}</td>
            <td><AccessBadge status={r.status} expiring={r.expiring} validTo={r.valid_to} /></td>
            <td>{formatDate(r.valid_to)}</td>
            <td className="text-gov-text-muted">{r.granted_by ?? '—'}</td>
            <td>
              <div className="flex gap-1">
                {(r.status === 'revoked' || r.status === 'expired') && (
                  <button onClick={() => onRenew(r)} title="Renovar" className="p-1 text-gov-text-secondary hover:text-emerald-600"><RotateCcw className="w-4 h-4" /></button>
                )}
                {r.status === 'active' && (
                  <button onClick={() => onRevoke(r)} title="Revogar" className="p-1 text-gov-text-secondary hover:text-rose-600"><XCircle className="w-4 h-4" /></button>
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const Empty: React.FC<{ text: string }> = ({ text }) => (
  <div className="py-16 text-center text-gov-text-muted flex flex-col items-center gap-2">
    <Building2 className="w-8 h-8 opacity-40" />
    <p className="text-sm">{text}</p>
  </div>
);
