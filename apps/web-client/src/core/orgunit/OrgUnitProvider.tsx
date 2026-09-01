import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useTenant } from '@/core/tenant/useTenant';
import { apiClient } from '@/core/api/client';

interface OrgScopeInfo {
  primary_unit: { id: number; name: string; code: string; acronym?: string | null; role: string } | null;
  managed_units: { id: number; name: string; code: string; acronym?: string | null }[];
  is_unrestricted: boolean;
}

interface OrgTreeNode {
  id: number; name: string; code: string; type: string; level: number; path: string;
  children: OrgTreeNode[];
}

export interface OrgUnitFlat {
  id: number; name: string; code: string; type: string; level: number; depth: number;
}

interface OrgUnitContextType {
  scopeInfo: OrgScopeInfo | null;
  orgTree: OrgTreeNode[];
  unitList: OrgUnitFlat[];
  activeUnit: OrgUnitFlat | null;
  setActiveUnitId: (id: number) => void;
  loading: boolean;
  hasMultipleUnits: boolean;
}

const ORG_UNIT_KEY = 'sysgov:active_org_unit_id';

const OrgUnitContext = createContext<OrgUnitContextType | undefined>(undefined);

function buildUnitList(nodes: OrgTreeNode[], allowedIds: Set<number>, depth = 0): OrgUnitFlat[] {
  if (allowedIds.size === 0) return [];
  const out: OrgUnitFlat[] = [];
  for (const n of nodes) {
    if (allowedIds.has(n.id)) {
      out.push({ id: n.id, name: n.name, code: n.code, type: n.type, level: n.level, depth });
    }
    if (n.children?.length) out.push(...buildUnitList(n.children, allowedIds, depth + 1));
  }
  return out;
}

export const OrgUnitProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { tenant } = useTenant();
  const [scopeInfo, setScopeInfo] = useState<OrgScopeInfo | null>(null);
  const [orgTree, setOrgTree] = useState<OrgTreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeUnitId, setActiveUnitId] = useState<number | null>(() => {
    const v = localStorage.getItem(ORG_UNIT_KEY);
    return v ? Number(v) : null;
  });

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiClient.get<{ data: OrgScopeInfo }>('/org-units/scope'),
      apiClient.get<{ data: OrgTreeNode[] }>('/org-units'),
    ])
      .then(([scopeRes, treeRes]) => {
        setScopeInfo(scopeRes.data?.data ?? null);
        setOrgTree(Array.isArray(treeRes.data?.data) ? treeRes.data.data : []);
      })
      .catch(() => { setScopeInfo(null); setOrgTree([]); })
      .finally(() => setLoading(false));
  }, [tenant?.id]);

  const updateActiveUnitId = useCallback((id: number) => {
    setActiveUnitId(id);
    localStorage.setItem(ORG_UNIT_KEY, String(id));
  }, []);

const allowedIds = new Set(scopeInfo
    ? scopeInfo.is_unrestricted
      ? flattenTreeIds(orgTree)
      : [
          ...(scopeInfo.primary_unit ? [scopeInfo.primary_unit.id] : []),
          ...scopeInfo.managed_units.map((u) => u.id),
        ]
    : []);

function flattenTreeIds(nodes: OrgTreeNode[]): number[] {
  const ids: number[] = [];
  for (const n of nodes) {
    ids.push(n.id);
    if (n.children?.length) ids.push(...flattenTreeIds(n.children));
  }
  return ids;
}

const unitList = buildUnitList(orgTree, allowedIds);
  const activeUnit = unitList.find((u) => u.id === activeUnitId) ?? unitList[0] ?? null;
  const hasMultipleUnits = unitList.length > 1;

  const value: OrgUnitContextType = {
    scopeInfo, orgTree, unitList, activeUnit,
    setActiveUnitId: updateActiveUnitId,
    loading, hasMultipleUnits,
  };

  return <OrgUnitContext.Provider value={value}>{children}</OrgUnitContext.Provider>;
};

export const useOrgUnit = (): OrgUnitContextType => {
  const context = useContext(OrgUnitContext);
  if (!context) throw new Error('useOrgUnit must be used within an OrgUnitProvider');
  return context;
};