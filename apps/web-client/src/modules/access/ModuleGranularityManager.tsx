import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/core/auth/useAuth';
import { ChevronRight, ChevronDown, Building2, Shield, RefreshCw, Network, Layers } from 'lucide-react';
import { apiClient } from '@/core/api/client';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Select, SelectOption } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';

interface Module { id: number; alias: string; name: string; }
interface OrgUnitNode {
  id: number;
  name: string;
  path: string;
  type: string;
  level: number;
  enabled: boolean;
  inherited: boolean;
  inherited_from: number | null;
  inherited_from_name: string | null;
}

interface Toast { type: 'success' | 'info' | 'warning' | 'error'; title: string; message: string; }

const ToastContainer: React.FC<{ toasts: Toast[]; onRemove: (t: Toast) => void }> = ({ toasts, onRemove }) => (
  <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
    {toasts.map((t, i) => (
      <div key={i} className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm font-medium border',
        t.type === 'success' && 'bg-success/10 border-success/30 text-success',
        t.type === 'error' && 'bg-destructive/10 border-destructive/30 text-destructive',
        t.type === 'warning' && 'bg-warning/15 border-warning/40 text-[#8D5B00]',
        t.type === 'info' && 'bg-status-info-bg border-status-info-border text-status-info'
      )}>
        <span className="font-semibold">{t.title}:</span> {t.message}
        <button onClick={() => onRemove(t)} className="ml-auto hover:opacity-70 rounded p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span aria-hidden>✕</span></button>
      </div>
    ))}
  </div>
);

const ModuleGranularityManager: React.FC = () => {
  const { tenant } = useAuth();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const notify = useCallback((t: Toast) => {
    setToasts((prev) => [...prev, t]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x !== t)), 5000);
  }, []);

  const [modules, setModules] = useState<Module[]>([]);
  const [orgUnits, setOrgUnits] = useState<OrgUnitNode[]>([]);
  const [selectedModule, setSelectedModule] = useState<number | null>(null);
  const [loadingModules, setLoadingModules] = useState(true);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [saving, setSaving] = useState<number | null>(null);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  const loadModules = useCallback(async () => {
    setLoadingModules(true);
    try {
      const res = await apiClient.get<{ data: Module[] }>('/client/granularity/modules');
      setModules(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch {
      notify({ type: 'error', title: 'Erro', message: 'Não foi possível carregar os módulos.' });
    } finally {
      setLoadingModules(false);
    }
  }, [notify]);

  const loadOrgUnits = useCallback(async (moduleId: number) => {
    setLoadingUnits(true);
    try {
      const res = await apiClient.get<{
        module: { id: number; alias: string; name: string };
        units: OrgUnitNode[];
      }>(`/client/granularity/${moduleId}/units`);
      setOrgUnits(Array.isArray(res.data?.units) ? res.data.units : []);
    } catch (e: any) {
      notify({ type: 'error', title: 'Erro', message: e?.response?.data?.message || 'Não foi possível carregar as unidades.' });
    } finally {
      setLoadingUnits(false);
    }
  }, [notify]);

  useEffect(() => { loadModules(); }, [loadModules]);

  useEffect(() => {
    if (selectedModule) {
      setExpandedPaths(new Set());
      loadOrgUnits(selectedModule);
    } else {
      setOrgUnits([]);
    }
  }, [selectedModule, loadOrgUnits]);

  const toggleUnit = async (unit: OrgUnitNode, currentEnabled: boolean) => {
    if (!selectedModule) return;
    setSaving(unit.id);
    try {
      await apiClient.put(`/client/granularity/${selectedModule}/units/${unit.id}`, { enabled: !currentEnabled });
      notify({
        type: 'success',
        title: currentEnabled ? 'Desabilitado' : 'Habilitado',
        message: `${unit.name} ${currentEnabled ? 'perdeu acesso' : 'ganhou acesso'} a este módulo.`,
      });
      loadOrgUnits(selectedModule);
    } catch (e: any) {
      notify({ type: 'error', title: 'Erro', message: e?.response?.data?.message || 'Não foi possível atualizar.' });
    } finally {
      setSaving(null);
    }
  };

  const toggleExpand = (path: string) => setExpandedPaths((p) => { const n = new Set(p); n.has(path) ? n.delete(path) : n.add(path); return n; });

  const stats = useMemo(() => {
    const enabled = orgUnits.filter((u) => u.enabled).length;
    const explicit = orgUnits.filter((u) => u.enabled && !u.inherited).length;
    const inherited = orgUnits.filter((u) => u.enabled && u.inherited).length;
    const denied = orgUnits.filter((u) => !u.enabled).length;
    return { total: orgUnits.length, enabled, explicit, inherited, denied };
  }, [orgUnits]);

  const moduleOptions: SelectOption[] = modules.map((m) => ({
    value: m.id,
    label: m.name,
    icon: <Network className="h-4 w-4" />,
  }));

  const renderNode = (unit: OrgUnitNode, depth: number, childrenMap: Map<string, OrgUnitNode[]>): React.ReactNode => {
    const children = childrenMap.get(unit.path) || [];
    const hasChildren = children.length > 0;
    const isExpanded = expandedPaths.has(unit.path);
    const isLoading = saving === unit.id;

    return (
      <div key={unit.id}>
        <div
          className={cn(
            'group flex items-center gap-2 py-2.5 px-3 rounded-lg transition-colors',
            'hover:bg-accent/50 focus-within:bg-accent/40',
            unit.enabled ? 'border-l-2 border-l-success/60' : 'border-l-2 border-l-border'
          )}
          style={{ paddingLeft: `${depth * 22 + 14}px` }}
        >
          {hasChildren ? (
            <button
              onClick={() => toggleExpand(unit.path)}
              className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={isExpanded ? 'Recolher' : 'Expandir'}
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          ) : (
            <span className="w-5 shrink-0" />
          )}

          <Building2 className={cn('h-4 w-4 shrink-0', unit.enabled ? 'text-primary' : 'text-muted-foreground')} />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold text-foreground">{unit.name}</span>
              <span className="shrink-0 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">• {unit.path}</span>
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
              {unit.inherited && unit.inherited_from_name ? (
                <Badge variant="info" icon={<Layers className="h-3 w-3" />}>herdado de {unit.inherited_from_name}</Badge>
              ) : unit.enabled ? (
                <Badge variant="success">liberação explícita</Badge>
              ) : null}
              {!unit.enabled && (
                <Badge variant="danger">acesso negado</Badge>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span className={cn('hidden text-xs font-semibold sm:inline', unit.enabled ? 'text-success' : 'text-muted-foreground')}>
              {unit.enabled ? 'Liberado' : 'Negado'}
            </span>
            {isLoading ? (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary" />
            ) : (
              <Switch
                checked={unit.enabled}
                onCheckedChange={() => toggleUnit(unit, unit.enabled)}
                size="sm"
                label={`Alternar acesso para ${unit.name}`}
              />
            )}
          </div>
        </div>

        {hasChildren && isExpanded && children.map((child) => renderNode(child, depth + 1, childrenMap))}
      </div>
    );
  };

  const buildTree = (units: OrgUnitNode[]): React.ReactNode[] => {
    const rootUnits = units.filter((u) => u.level <= 1);
    const childrenMap = new Map<string, OrgUnitNode[]>();
    for (const u of units) {
      const parentPath = u.path.substring(0, u.path.lastIndexOf('.'));
      if (!childrenMap.has(parentPath)) childrenMap.set(parentPath, []);
      childrenMap.get(parentPath)!.push(u);
    }
    return rootUnits.map((root) => renderNode(root, 0, childrenMap));
  };

  if (!tenant) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <span className="mr-2 inline-block h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" /> Carregando sessão...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Shield className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Granularidade de Módulos</h1>
              <p className="text-sm text-muted-foreground">
                Habilite ou desabilite módulos por unidade organizacional em <strong className="text-foreground">{tenant.name}</strong>.
                A herança flui da secretaria para os departamentos.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-5 flex flex-col gap-4 lg:flex-row">
          <div className="flex-1">
            <Select
              label="Módulo"
              value={selectedModule}
              onChange={(v) => setSelectedModule(v ? Number(v) : null)}
              options={moduleOptions}
              loading={loadingModules}
              placeholder="Selecione um módulo..."
              emptyText="Nenhum módulo ativo no tenant"
            />
          </div>
          {selectedModule && (
            <div className="flex items-end">
              <button
                onClick={() => loadOrgUnits(selectedModule)}
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <RefreshCw className="h-4 w-4" /> Atualizar
              </button>
            </div>
          )}
        </div>

        {selectedModule ? (
          <>
            {orgUnits.length > 0 && (
              <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Card className="p-3.5">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Unidades</p>
                  <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-foreground">{stats.total}</p>
                </Card>
                <Card className="p-3.5">
                  <p className="text-xs font-bold uppercase tracking-wide text-success">Liberadas</p>
                  <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-success">{stats.enabled}</p>
                </Card>
                <Card className="p-3.5">
                  <p className="text-xs font-bold uppercase tracking-wide text-status-info">Herdadas</p>
                  <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-status-info">{stats.inherited}</p>
                </Card>
                <Card className="p-3.5">
                  <p className="text-xs font-bold uppercase tracking-wide text-destructive">Negadas</p>
                  <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-destructive">{stats.denied}</p>
                </Card>
              </div>
            )}

            <Card noPadding>
              <div className="flex items-center gap-2 border-b border-border bg-card px-4 py-3">
                <Shield className="h-4 w-4 text-primary" />
                <span className="text-sm font-bold text-foreground">
                  Unidades Organizacionais — {modules.find((m) => m.id === selectedModule)?.name}
                </span>
                <span className="ml-auto rounded-full bg-accent px-2.5 py-0.5 font-mono text-xs font-semibold text-muted-foreground">
                  {stats.explicit} explícitas
                </span>
              </div>

              {loadingUnits ? (
                <div className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
                  <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
                  Carregando unidades...
                </div>
              ) : orgUnits.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Building2 className="mb-3 h-12 w-12 text-border" />
                  <p className="text-sm">Nenhuma unidade organizacional encontrada.</p>
                </div>
              ) : (
                <div className="max-h-[620px] overflow-y-auto p-2">
                  {buildTree(orgUnits)}
                </div>
              )}
            </Card>
          </>
        ) : (
          <Card className="flex flex-col items-center justify-center py-20 text-center">
            <Network className="mb-3 h-14 w-14 text-border" />
            <p className="text-lg font-semibold text-foreground">Selecione um módulo</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Escolha um módulo acima para visualizar e gerenciar o acesso por secretaria e departamento.
            </p>
          </Card>
        )}
      </div>
      <ToastContainer toasts={toasts} onRemove={(t) => setToasts((p) => p.filter((x) => x !== t))} />
    </div>
  );
};

export default ModuleGranularityManager;
