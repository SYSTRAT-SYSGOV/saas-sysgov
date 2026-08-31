import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/core/auth/useAuth';
import { Loader2, ChevronRight, ChevronDown, Building2, Check, X, RefreshCw, Shield } from 'lucide-react';
import { apiClient } from '@/core/api/client';

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
      <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm font-medium border ${
        t.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
        t.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
        t.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' :
        'bg-blue-50 border-blue-200 text-blue-800'
      }`}>
        {t.type === 'success' && <Check className="w-4 h-4 text-green-600" />}
        {t.type === 'error' && <X className="w-4 h-4 text-red-600" />}
        <span className="font-semibold">{t.title}:</span> {t.message}
        <button onClick={() => onRemove(t)} className="ml-2 hover:opacity-70"><X className="w-3 h-3" /></button>
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
      loadOrgUnits(selectedModule);
    } else {
      setOrgUnits([]);
    }
  }, [selectedModule, loadOrgUnits]);

  const toggleUnit = async (unit: OrgUnitNode, currentEnabled: boolean) => {
    if (!selectedModule) return;
    setSaving(unit.id);
    try {
      // PUT {enabled: false} cria negação explícita (não apenas limpa herança),
      // permitindo desabilitar um departamento mesmo que o ancestral esteja liberado.
      await apiClient.put(`/client/granularity/${selectedModule}/units/${unit.id}`, { enabled: !currentEnabled });
      notify({ type: 'success', title: currentEnabled ? 'Desabilitado' : 'Habilitado', message: `${unit.name} ${currentEnabled ? 'perdeu acesso' : 'ganhou acesso'} a este módulo.` });
      loadOrgUnits(selectedModule);
    } catch (e: any) {
      notify({ type: 'error', title: 'Erro', message: e?.response?.data?.message || 'Não foi possível atualizar.' });
    } finally {
      setSaving(null);
    }
  };

  const toggleExpand = (path: string) => setExpandedPaths((p) => { const n = new Set(p); n.has(path) ? n.delete(path) : n.add(path); return n; });

  const buildTree = (units: OrgUnitNode[]): React.ReactNode[] => {
    const rootUnits = units.filter((u) => u.level <= 1);
    const childrenMap = new Map<string, OrgUnitNode[]>();
    for (const u of units) {
      const parentPath = u.path.substring(0, u.path.lastIndexOf('.'));
      if (!childrenMap.has(parentPath)) childrenMap.set(parentPath, []);
      childrenMap.get(parentPath)!.push(u);
    }

    const renderNode = (unit: OrgUnitNode, depth: number): React.ReactNode => {
      const children = childrenMap.get(unit.path) || [];
      const hasChildren = children.length > 0;
      const isExpanded = expandedPaths.has(unit.path);

      return (
        <div key={unit.id}>
          <div className="flex items-center gap-2 py-2 px-3 hover:bg-slate-50 rounded-lg group" style={{ paddingLeft: `${depth * 24 + 12}px` }}>
            {hasChildren ? (
              <button onClick={() => toggleExpand(unit.path)} className="p-0.5 hover:bg-slate-200 rounded">
                {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
              </button>
            ) : <div className="w-5" />}
            <div className="flex-1 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="min-w-0">
                <span className="text-sm font-semibold text-slate-800 block truncate">{unit.name}</span>
                <span className="text-xs text-slate-400 font-mono">{unit.path}</span>
              </div>
              {unit.inherited && unit.inherited_from_name && (
                <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded border border-indigo-100 shrink-0">
                  herdado de {unit.inherited_from_name}
                </span>
              )}
              {unit.enabled && !unit.inherited && (
                <span className="text-xs bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded border border-emerald-100 shrink-0">explícito</span>
              )}
            </div>
            <button
              onClick={() => toggleUnit(unit, unit.enabled)}
              disabled={saving === unit.id}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 shrink-0 ${
                unit.enabled ? 'bg-emerald-500' : 'bg-slate-200'
              }`}
            >
              {saving === unit.id ? (
                <Loader2 className="w-4 h-4 animate-spin text-white mx-auto" />
              ) : unit.enabled ? (
                <Check className="w-4 h-4 text-white mx-auto" />
              ) : (
                <div className="w-4 h-4 mx-auto" />
              )}
            </button>
          </div>
          {hasChildren && isExpanded && children.map((child) => renderNode(child, depth + 1))}
        </div>
      );
    };

    return rootUnits.map((root) => renderNode(root, 0));
  };

  if (!tenant) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Carregando sessão...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-7 h-7 text-indigo-600" />
          <h1 className="text-2xl font-bold text-slate-900">Granularidade de Módulos</h1>
        </div>
        <p className="text-sm text-slate-500 mb-6">
          Habilite ou desabilite módulos para unidades organizacionais específicas de <strong>{tenant.name}</strong>.
          A herança flui da secretaria para os departamentos descendentes.
        </p>

        <div className="flex gap-4 mb-6">
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Módulo</label>
            {loadingModules ? (
              <div className="flex items-center gap-2 text-slate-400 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Carregando...</div>
            ) : (
              <select
                value={selectedModule ?? ''}
                onChange={(e) => setSelectedModule(e.target.value ? Number(e.target.value) : null)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Selecione um módulo...</option>
                {modules.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            )}
          </div>
          {selectedModule && (
            <div className="flex items-end">
              <button
                onClick={() => loadOrgUnits(selectedModule)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-sm font-medium transition"
              >
                <RefreshCw className="w-4 h-4" /> Atualizar
              </button>
            </div>
          )}
        </div>

        {selectedModule && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-500" />
              <span className="text-sm font-bold text-slate-700">
                Unidades Organizacionais — {modules.find((m) => m.id === selectedModule)?.name}
              </span>
              <span className="ml-auto text-xs text-slate-400">{orgUnits.length} unidades</span>
            </div>
            {loadingUnits ? (
              <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin" /> Carregando unidades...
              </div>
            ) : orgUnits.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Building2 className="w-12 h-12 mb-3 text-slate-200" />
                <p className="text-sm">Nenhuma unidade organizacional encontrada.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 py-2 max-h-[600px] overflow-y-auto">
                {buildTree(orgUnits)}
              </div>
            )}
          </div>
        )}
      </div>
      <ToastContainer toasts={toasts} onRemove={(t) => setToasts((p) => p.filter((x) => x !== t))} />
    </div>
  );
};

export default ModuleGranularityManager;
