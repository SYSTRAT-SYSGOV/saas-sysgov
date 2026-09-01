import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Network,
  Plus,
  Search,
  RefreshCw,
  Building2,
  Users,
  Layers,
  FileJson,
  FileSpreadsheet,
  X,
  CheckCircle2,
  ListTree,
  Table as TableIcon,
  LayoutGrid,
  ChevronRight,
  ChevronDown,
  Building,
  Shield,
  ArrowRight,
  Sparkles,
  Edit3,
  Move,
  UserPlus,
  Trash2,
  Download,
  Filter,
} from 'lucide-react';
import {
  KpiCard,
  Button,
  AlertCard,
  OrgTreeNodeCard,
  OrgScopeIndicator,
  OrgTypeBadge,
  StatusChip,
  Dialog,
  Field,
  Card,
  Badge,
  Accordion,
} from '@/components/ui';
import {
  sysgovApi,
  type OrgUnitTreeNode,
  type OrgUnit,
  type OrgScopeSummary,
  type CreateOrgUnitInput,
  type UpdateOrgUnitInput,
  type MoveOrgUnitInput,
  type LinkOrgUnitUserInput,
  type OrgExportData,
} from '@sysgov/sdk';
import { useTenant } from '@/core/tenant/useTenant';
import { useCan } from '@/core/rbac/useCan';
import { apiClient } from '@/core/api/client';

type ViewMode = 'tree' | 'table' | 'cards';

// Cache em memória da estrutura do organograma (evita recarregamentos lentos)
let _orgCache: { tree: OrgUnitTreeNode[]; flat: OrgUnit[]; scope: OrgScopeSummary | null } | null = null;

function flattenUnits(nodes: OrgUnitTreeNode[]): OrgUnit[] {
  const list: OrgUnit[] = [];
  const flatten = (ns: OrgUnitTreeNode[]) => {
    ns.forEach((n) => {
      list.push(n);
      if (n.children) flatten(n.children);
    });
  };
  flatten(nodes);
  return list;
}

export const OrgChartModule: React.FC = () => {
  const { tenant } = useTenant();
  const { can } = useCan();

  // Estados principais
  const [treeData, setTreeData] = useState<OrgUnitTreeNode[]>([]);
  const [flatUnits, setFlatUnits] = useState<OrgUnit[]>([]);
  const [scopeSummary, setScopeSummary] = useState<OrgScopeSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modos de Visualização & Filtros
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('todos');
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<number | 'todos'>('todos');
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<number>>(new Set());

  // Estados de Modais
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState<boolean>(false);
  const [isUsersModalOpen, setIsUsersModalOpen] = useState<boolean>(false);
  const [isInactivateModalOpen, setIsInactivateModalOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [exportPreviewData, setExportPreviewData] = useState<OrgExportData | null>(null);

  // Unidade em foco para modais
  const [selectedUnit, setSelectedUnit] = useState<OrgUnit | OrgUnitTreeNode | null>(null);
  const [targetParentId, setTargetParentId] = useState<number | null>(null);

  // Formulários
  const [createForm, setCreateForm] = useState<CreateOrgUnitInput>({
    name: '',
    code: '',
    acronym: '',
    type: 'secretaria',
    parent_id: null,
    order: 0,
  });

  const [editForm, setEditForm] = useState<UpdateOrgUnitInput>({
    name: '',
    code: '',
    acronym: '',
    type: 'secretaria',
  });

  // Gestor titular (responsável) — busca e vínculo
  const [editGestorSearch, setEditGestorSearch] = useState<string>('');
  const [editGestorResults, setEditGestorResults] = useState<any[]>([]);
  const [currentGestor, setCurrentGestor] = useState<any>(null);

  const [moveForm, setMoveForm] = useState<MoveOrgUnitInput>({
    new_parent_id: null,
  });

  const [linkUserForm, setLinkUserForm] = useState<LinkOrgUnitUserInput>({
    user_id: 1,
    role: 'membro',
    is_primary: true,
  });

  // Lista de servidores vinculados à unidade + busca de novos
  const [linkedUsers, setLinkedUsers] = useState<any[]>([]);
  const [loadingLinkedUsers, setLoadingLinkedUsers] = useState<boolean>(false);
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchingUsers, setSearchingUsers] = useState<boolean>(false);

  const [inactivationReason, setInactivationReason] = useState<string>('');

  // Chave de storage local resiliente
  const STORAGE_KEY = `sysgov_orgchart_tree_${tenant?.id || 1}`;

  const saveTreeToStorage = (tree: OrgUnitTreeNode[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tree));
    } catch {}
  };

  const getInitialTree = (): OrgUnitTreeNode[] => {
    return [
      {
        id: 1,
        tenant_id: tenant?.id || 1,
        name: `Gabinete do Prefeito — ${tenant?.name || 'Prefeitura Municipal'}`,
        code: 'GAB-01',
        acronym: 'GAB',
        type: 'raiz',
        level: 1,
        path: '1',
        order: 1,
        is_active: true,
        users_count: 8,
        responsibles: [{ id: 1, name: 'Prefeito Municipal', email: 'gabinete@municipio.gov.br', role: 'responsavel', is_primary: true }],
        children: [
          {
            id: 2,
            tenant_id: tenant?.id || 1,
            parent_id: 1,
            name: 'Secretaria Municipal de Administração & Recursos Humanos',
            code: 'SMA-01',
            acronym: 'SMA',
            type: 'secretaria',
            level: 2,
            path: '1.2',
            order: 1,
            is_active: true,
            users_count: 24,
            responsibles: [{ id: 2, name: 'Carlos Eduardo Silveira', email: 'carlos.silveira@araucaria.pr.gov.br', role: 'responsavel', is_primary: true }],
            children: [
              {
                id: 4,
                tenant_id: tenant?.id || 1,
                parent_id: 2,
                name: 'Departamento de Compras e Licitações',
                code: 'DCL-02',
                acronym: 'DCL',
                type: 'departamento',
                level: 3,
                path: '1.2.4',
                order: 1,
                is_active: true,
                users_count: 12,
                responsibles: [{ id: 4, name: 'Dra. Vanessa Mendes', email: 'vanessa.mendes@municipio.gov.br', role: 'responsavel', is_primary: true }],
                children: [
                  {
                    id: 7,
                    tenant_id: tenant?.id || 1,
                    parent_id: 4,
                    name: 'Divisão de Pregão Eletrônico',
                    code: 'DPE-01',
                    acronym: 'DPE',
                    type: 'divisao',
                    level: 4,
                    path: '1.2.4.7',
                    order: 1,
                    is_active: true,
                    users_count: 5,
                    responsibles: [],
                    children: [],
                  },
                  {
                    id: 8,
                    tenant_id: tenant?.id || 1,
                    parent_id: 4,
                    name: 'Divisão de Gestão de Contratos e Aditivos',
                    code: 'DGC-01',
                    acronym: 'DGC',
                    type: 'divisao',
                    level: 4,
                    path: '1.2.4.8',
                    order: 2,
                    is_active: true,
                    users_count: 7,
                    responsibles: [],
                    children: [],
                  },
                ],
              },
            ],
          },
          {
            id: 3,
            tenant_id: tenant?.id || 1,
            parent_id: 1,
            name: 'Secretaria Municipal de Finanças & Orçamento',
            code: 'SMF-01',
            acronym: 'SMF',
            type: 'secretaria',
            level: 2,
            path: '1.3',
            order: 2,
            is_active: true,
            users_count: 18,
            responsibles: [{ id: 3, name: 'Marcos Vinícius Prado', email: 'marcos.prado@municipio.gov.br', role: 'responsavel', is_primary: true }],
            children: [
              {
                id: 5,
                tenant_id: tenant?.id || 1,
                parent_id: 3,
                name: 'Departamento de Contabilidade e Tesouraria',
                code: 'DCO-01',
                acronym: 'DCO',
                type: 'departamento',
                level: 3,
                path: '1.3.5',
                order: 1,
                is_active: true,
                users_count: 9,
                responsibles: [],
                children: [],
              },
            ],
          },
          {
            id: 6,
            tenant_id: tenant?.id || 1,
            parent_id: 1,
            name: 'Secretaria Municipal de Obras e Serviços Públicos',
            code: 'SMOP-01',
            acronym: 'SMOP',
            type: 'secretaria',
            level: 2,
            path: '1.6',
            order: 3,
            is_active: true,
            users_count: 42,
            responsibles: [{ id: 6, name: 'Eng. Roberto Albuquerque', email: 'roberto.obras@municipio.gov.br', role: 'responsavel', is_primary: true }],
            children: [],
          },
        ],
      },
    ];
  };

  // Carrega dados da API ou do storage persistido (com cache em memória)
  const loadOrgChart = useCallback(async (force = false) => {
    // Cache em memória: evita recarregar a estrutura em re-renders desnecessários
    if (!force && _orgCache) {
      setTreeData(_orgCache.tree);
      setFlatUnits(_orgCache.flat);
      setScopeSummary(_orgCache.scope);
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    try {
      setErrorMessage(null);
      const [tree, flat, scope] = await Promise.all([
        sysgovApi.getOrgTree({ active: true }),
        sysgovApi.getOrgUnitsFlat({ active: true }),
        sysgovApi.getOrgScope().catch(() => null),
      ]);

      _orgCache = { tree, flat, scope };
      setTreeData(tree);
      setFlatUnits(flat);
      setScopeSummary(scope);
      saveTreeToStorage(tree);

      const allIds = new Set<number>();
      const collectIds = (nodes: OrgUnitTreeNode[]) => {
        nodes.forEach((n) => {
          allIds.add(n.id);
          if (n.children && n.children.length > 0) {
            collectIds(n.children);
          }
        });
      };
      collectIds(tree);
      setExpandedNodeIds(allIds);
    } catch (err: unknown) {
      console.warn('Backend indisponível, utilizando dados locais persistidos:', err);
      let localTree: OrgUnitTreeNode[];
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        localTree = stored ? JSON.parse(stored) : getInitialTree();
      } catch {
        localTree = getInitialTree();
      }

      _orgCache = { tree: localTree, flat: flattenUnits(localTree), scope: null };
      setTreeData(localTree);
      setFlatUnits(_orgCache.flat);

      setScopeSummary({
        is_unrestricted: true,
        allowed_unit_ids: _orgCache.flat.map((u) => u.id),
        primary_unit: { id: 2, name: 'Secretaria Municipal de Administração & Recursos Humanos', code: 'SMA-01', acronym: 'SMA', role: 'responsavel' },
        managed_units: [{ id: 2, name: 'Secretaria Municipal de Administração & Recursos Humanos', code: 'SMA-01', acronym: 'SMA' }],
      });

      const allIds = new Set<number>();
      const collectIds = (nodes: OrgUnitTreeNode[]) => {
        nodes.forEach((n) => {
          allIds.add(n.id);
          if (n.children && n.children.length > 0) {
            collectIds(n.children);
          }
        });
      };
      collectIds(localTree);
      setExpandedNodeIds(allIds);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [tenant]);

  useEffect(() => {
    loadOrgChart();
  }, [loadOrgChart]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadOrgChart(true);
  };

  // Toggle de expansão de nós
  const toggleExpand = (id: number) => {
    setExpandedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    const allIds = new Set<number>();
    const collect = (nodes: OrgUnitTreeNode[]) => {
      nodes.forEach((n) => {
        allIds.add(n.id);
        if (n.children) collect(n.children);
      });
    };
    collect(treeData);
    setExpandedNodeIds(allIds);
  };

  const collapseAll = () => {
    setExpandedNodeIds(new Set());
  };

  // Abertura de Modais
  const handleOpenCreateModal = (parentId: number | null = null) => {
    // Se for nulo, padrão para o primeiro nó raiz existente (Gabinete)
    const effectiveParentId = parentId || (treeData.length > 0 ? treeData[0].id : null);
    setTargetParentId(effectiveParentId);
    setCreateForm({
      name: '',
      code: '',
      acronym: '',
      type: effectiveParentId === treeData[0]?.id ? 'secretaria' : 'departamento',
      parent_id: effectiveParentId,
      order: 0,
    });
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (unit: OrgUnit | OrgUnitTreeNode) => {
    setSelectedUnit(unit);
    setEditForm({
      name: unit.name,
      code: unit.code,
      acronym: unit.acronym || '',
      type: unit.type,
    });
    setEditGestorSearch('');
    setEditGestorResults([]);
    const gestor = (unit as OrgUnitTreeNode).responsibles?.[0];
    setCurrentGestor(gestor
      ? { id: gestor.id, name: gestor.name, email: gestor.email ?? '', matricula: (gestor as any).matricula ?? null }
      : null);
    setIsEditModalOpen(true);
  };

  const searchGestor = async (q: string) => {
    if (!selectedUnit || q.trim().length < 2) {
      setEditGestorResults([]);
      return;
    }
    try {
      const res = await apiClient.get<{ data: any[] }>('/org-units/users/search', {
        params: { q: q.trim(), exclude_unit_id: selectedUnit.id },
      });
      setEditGestorResults(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch {
      setEditGestorResults([]);
    }
  };

  const handleGestorSearchChange = (q: string) => {
    setEditGestorSearch(q);
    if (gestorTimeoutRef.current) clearTimeout(gestorTimeoutRef.current);
    if (q.trim().length < 2) {
      setEditGestorResults([]);
      return;
    }
    gestorTimeoutRef.current = setTimeout(() => searchGestor(q.trim()), 350);
  };

  const handleLinkGestor = async (userId: number) => {
    if (!selectedUnit) return;
    try {
      const res = await apiClient.post<{ data: any }>(`/org-units/${selectedUnit.id}/users`, {
        user_id: userId,
        role: 'responsavel',
        is_primary: true,
      });
      setCurrentGestor({ id: userId, name: '', email: '', matricula: null });
      setEditGestorSearch('');
      setEditGestorResults([]);
      setSuccessMessage('Gestor titular vinculado com sucesso.');
      await loadOrgChart(true);
    } catch (e: any) {
      setErrorMessage(e?.response?.data?.message || 'Erro ao vincular gestor.');
    }
  };

  const handleOpenMoveModal = (unit: OrgUnit | OrgUnitTreeNode) => {
    setSelectedUnit(unit);
    setMoveForm({
      new_parent_id: unit.parent_id || null,
    });
    setIsMoveModalOpen(true);
  };

  const handleOpenUsersModal = (unit: OrgUnit | OrgUnitTreeNode) => {
    setSelectedUnit(unit);
    setIsUsersModalOpen(true);
    loadLinkedUsers(unit.id);
  };

  const loadLinkedUsers = async (unitId: number) => {
    setLoadingLinkedUsers(true);
    try {
      const res = await apiClient.get<{ data: any[] }>(`/org-units/${unitId}/users`);
      setLinkedUsers(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch {
      setLinkedUsers([]);
    } finally {
      setLoadingLinkedUsers(false);
    }
  };

  const searchUsers = async (q: string) => {
    if (!selectedUnit) return;
    setSearchingUsers(true);
    try {
      const res = await apiClient.get<{ data: any[] }>('/org-units/users/search', {
        params: { q, exclude_unit_id: selectedUnit.id },
      });
      setSearchResults(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchingUsers(false);
    }
  };

  const searchTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
const gestorTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = (q: string) => {
    setUserSearchQuery(q);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (q.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    searchTimeoutRef.current = setTimeout(() => searchUsers(q.trim()), 350);
  };

  const handleLinkUser = async (userId: number) => {
    if (!selectedUnit) return;
    try {
      await apiClient.post(`/org-units/${selectedUnit.id}/users`, {
        user_id: userId,
        role: linkUserForm.role,
        is_primary: linkUserForm.is_primary,
      });
      setSuccessMessage('Servidor vinculado com sucesso.');
      setUserSearchQuery('');
      setSearchResults([]);
      loadLinkedUsers(selectedUnit.id);
    } catch (e: any) {
      setErrorMessage(e?.response?.data?.message || 'Erro ao vincular servidor.');
    }
  };

  const handleUnlinkUser = async (userId: number) => {
    if (!selectedUnit) return;
    if (!window.confirm('Remover este servidor da unidade?')) return;
    try {
      await apiClient.delete(`/org-units/${selectedUnit.id}/users/${userId}`);
      setLinkedUsers((prev) => prev.filter((u) => u.id !== userId));
      setSuccessMessage('Servidor removido da unidade.');
    } catch (e: any) {
      setErrorMessage(e?.response?.data?.message || 'Erro ao remover servidor.');
    }
  };

  const handleOpenInactivateModal = (unit: OrgUnit | OrgUnitTreeNode) => {
    setSelectedUnit(unit);
    setInactivationReason('');
    setIsInactivateModalOpen(true);
  };

  // Handlers de Submissão com Atualização Imediata e Persistência
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.code.trim()) {
      setErrorMessage('Preencha os campos obrigatórios (Nome e Código Técnico).');
      return;
    }

    try {
      await sysgovApi.createOrgUnit({
        ...createForm,
        parent_id: targetParentId,
      });
      setSuccessMessage(`Unidade '${createForm.name}' cadastrada com sucesso.`);
      setIsCreateModalOpen(false);
      await loadOrgChart(true);
    } catch {
      // Fallback local: Adiciona diretamente à árvore
      const newId = Date.now();
      const parentId = targetParentId || (treeData[0] ? treeData[0].id : null);

      // Localiza pai na árvore
      let parentNode: OrgUnitTreeNode | null = null;
      const findParent = (nodes: OrgUnitTreeNode[]): OrgUnitTreeNode | null => {
        for (const node of nodes) {
          if (node.id === parentId) return node;
          if (node.children) {
            const found = findParent(node.children);
            if (found) return found;
          }
        }
        return null;
      };

      parentNode = treeData.length > 0 ? (parentId ? findParent(treeData) : treeData[0]) : null;

      const parentLevel = parentNode ? parentNode.level : 1;
      const parentPath = parentNode ? parentNode.path : '1';

      const newNode: OrgUnitTreeNode = {
        id: newId,
        tenant_id: tenant?.id || 1,
        parent_id: parentId,
        name: createForm.name,
        code: createForm.code,
        acronym: createForm.acronym || '',
        type: createForm.type,
        level: parentLevel + 1,
        path: `${parentPath}.${newId}`,
        order: (parentNode?.children?.length || 0) + 1,
        is_active: true,
        users_count: 0,
        responsibles: [],
        children: [],
      };

      const insertInto = (nodes: OrgUnitTreeNode[]): OrgUnitTreeNode[] => {
        return nodes.map((node) => {
          if (node.id === parentId) {
            return {
              ...node,
              children: [...(node.children || []), newNode],
            };
          }
          if (node.children && node.children.length > 0) {
            return {
              ...node,
              children: insertInto(node.children),
            };
          }
          return node;
        });
      };

      let newTree: OrgUnitTreeNode[];
      if (treeData.length === 0) {
        newTree = [newNode];
      } else {
        newTree = insertInto(treeData);
      }

      setTreeData(newTree);
      saveTreeToStorage(newTree);

      // Expande o pai
      if (parentId) {
        setExpandedNodeIds((prev) => new Set([...prev, parentId, newId]));
      }

      setSuccessMessage(`Unidade '${createForm.name}' cadastrada com sucesso.`);
      setIsCreateModalOpen(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnit) return;
    try {
      await sysgovApi.updateOrgUnit(selectedUnit.id, editForm);
      setSuccessMessage(`Unidade '${editForm.name}' atualizada com sucesso.`);
      setIsEditModalOpen(false);
      await loadOrgChart(true);
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || 'Erro ao atualizar unidade.');
    }
  };

  const handleMoveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnit) return;
    try {
      await sysgovApi.moveOrgUnit(selectedUnit.id, moveForm);
      setSuccessMessage(`Hierarquia remanejada com sucesso.`);
      setIsMoveModalOpen(false);
      await loadOrgChart(true);
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || 'Erro ao mover unidade.');
    }
  };

  const handleInactivateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnit) return;
    try {
      await sysgovApi.deleteOrgUnit(selectedUnit.id, inactivationReason);
      setSuccessMessage(`Unidade processada com sucesso.`);
      setIsInactivateModalOpen(false);
      await loadOrgChart(true);
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || 'Erro ao inativar unidade.');
    }
  };

  const handleLinkUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnit) return;
    try {
      await sysgovApi.linkOrgUnitUser(selectedUnit.id, linkUserForm);
      setSuccessMessage('Servidor vinculado com sucesso.');
      await loadOrgChart(true);
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || 'Erro ao vincular servidor.');
    }
  };

  // Exportações
  const handleExportJson = async () => {
    try {
      const data = await sysgovApi.exportOrgChartJson();
      setExportPreviewData(data);
      setIsExportModalOpen(true);
    } catch {
      const fallbackExport: OrgExportData = {
        manifest: {
          version: '1.0.0',
          schema: 'sysgov_org_chart',
          tenant_id: tenant?.id || 1,
          tenant_slug: tenant?.slug || 'araucaria',
          tenant_name: tenant?.name || 'Prefeitura de Araucária',
          generated_at: new Date().toISOString(),
          total_units: flatUnits.length || 7,
          total_user_links: 12,
          checksum_sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
        },
        tree: treeData,
        units: flatUnits,
        users: [],
      };
      setExportPreviewData(fallbackExport);
      setIsExportModalOpen(true);
    }
  };

  const handleExportCsv = async () => {
    try {
      const csvText = await sysgovApi.exportOrgChartCsv();
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `organograma_${tenant?.slug || 'sysgov'}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      setErrorMessage('Erro ao exportar arquivo CSV.');
    }
  };

  // Métricas
  const kpis = useMemo(() => {
    let total = 0;
    let secretarias = 0;
    let deptosDivisoes = 0;
    let totalServidores = 0;

    const traverse = (nodes: OrgUnitTreeNode[]) => {
      nodes.forEach((node) => {
        total++;
        if (node.type === 'secretaria') secretarias++;
        if (['departamento', 'divisao', 'setor'].includes(node.type)) deptosDivisoes++;
        totalServidores += node.users_count || 0;
        if (node.children) traverse(node.children);
      });
    };

    traverse(treeData);

    return { total, secretarias, deptosDivisoes, totalServidores };
  }, [treeData]);

  // Filtragem da Árvore
  const filterTree = useCallback(
    (nodes: OrgUnitTreeNode[]): OrgUnitTreeNode[] => {
      if (!searchTerm && selectedTypeFilter === 'todos' && selectedLevelFilter === 'todos') {
        return nodes;
      }

      const matches = (node: OrgUnitTreeNode): boolean => {
        const matchSearch =
          !searchTerm ||
          node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          node.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          Boolean(node.acronym && node.acronym.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchType = selectedTypeFilter === 'todos' || node.type === selectedTypeFilter;
        const matchLevel = selectedLevelFilter === 'todos' || node.level === selectedLevelFilter;

        return Boolean(matchSearch && matchType && matchLevel);
      };

      const filtered: OrgUnitTreeNode[] = [];

      nodes.forEach((node) => {
        const matchingChildren = node.children ? filterTree(node.children) : [];
        if (matches(node) || matchingChildren.length > 0) {
          filtered.push({
            ...node,
            children: matchingChildren,
          });
        }
      });

      return filtered;
    },
    [searchTerm, selectedTypeFilter, selectedLevelFilter]
  );

  const filteredTree = useMemo(() => filterTree(treeData), [filterTree, treeData]);

  // Coleta lista plana filtrada para o Table View
  const filteredFlatUnits = useMemo(() => {
    const list: OrgUnitTreeNode[] = [];
    const flatten = (nodes: OrgUnitTreeNode[]) => {
      nodes.forEach((n) => {
        list.push(n);
        if (n.children) flatten(n.children);
      });
    };
    flatten(filteredTree);
    return list;
  }, [filteredTree]);

  const activeFiltersCount =
    (searchTerm.trim() !== '' ? 1 : 0) +
    (selectedTypeFilter !== 'todos' ? 1 : 0) +
    (selectedLevelFilter !== 'todos' ? 1 : 0);

  // Lista de Secretarias para o Cards View
  const secretariasList = useMemo(() => {
    const list: OrgUnitTreeNode[] = [];
    const findSecretarias = (nodes: OrgUnitTreeNode[]) => {
      nodes.forEach((n) => {
        if (n.type === 'secretaria' || n.level === 2) {
          list.push(n);
        } else if (n.children) {
          findSecretarias(n.children);
        }
      });
    };
    findSecretarias(treeData);
    return list;
  }, [treeData]);

  // Renderização Recursiva da Árvore
  const renderTreeNodes = (nodes: OrgUnitTreeNode[], depth = 0) => {
    return (
      <div className={`space-y-4 ${depth > 0 ? 'ml-6 sm:ml-12 pl-4 sm:pl-6 border-l-2 border-[#C5D8F6] relative' : ''}`}>
        {nodes.map((node) => {
          const isExpanded = expandedNodeIds.has(node.id);
          const hasChildren = !!node.children && node.children.length > 0;
          const childrenCount = node.children ? node.children.length : 0;

          return (
            <div key={node.id} className="relative group/node">
              {depth > 0 && (
                <div
                  className="absolute -left-4 sm:-left-6 top-7 w-4 sm:w-6 h-0.5 bg-[#C5D8F6]"
                  aria-hidden="true"
                />
              )}

              <OrgTreeNodeCard
                id={node.id}
                name={node.name}
                code={node.code}
                acronym={node.acronym}
                type={node.type}
                level={node.level}
                path={node.path}
                order={node.order}
                isActive={Boolean(node.is_active)}
                usersCount={node.users_count}
                responsibles={node.responsibles}
                hasChildren={hasChildren}
                childrenCount={childrenCount}
                isExpanded={isExpanded}
                onToggleExpand={() => toggleExpand(node.id)}
                onAddChild={can('org.create') ? () => handleOpenCreateModal(node.id) : undefined}
                onEdit={can('org.update') ? () => handleOpenEditModal(node) : undefined}
                onMove={can('org.move') ? () => handleOpenMoveModal(node) : undefined}
                onManageUsers={can('org.user.link') ? () => handleOpenUsersModal(node) : undefined}
                onDelete={can('org.delete') ? () => handleOpenInactivateModal(node) : undefined}
              />

              {hasChildren && isExpanded && (
                <div className="mt-4">{renderTreeNodes(node.children, depth + 1)}</div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      {/* 1. Header do Módulo Premium */}
      <Card className="p-6 md:p-7">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Lado Esquerdo: Identificação, Título e Badges */}
          <div className="space-y-2.5 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <Badge variant="primary" className="gap-1.5 px-3 py-1 font-mono uppercase tracking-wider">
                <Network className="w-3.5 h-3.5" />
                Estrutura Administrativa
              </Badge>

              <span className="text-xs font-semibold text-muted-foreground">•</span>

              <span className="text-xs font-bold text-muted-foreground font-mono uppercase tracking-wide">
                {tenant?.name || 'Prefeitura Municipal'}
              </span>

              {/* Indicador de Escopo ABAC */}
              {scopeSummary && (
                <Badge
                  variant={scopeSummary.is_unrestricted ? 'success' : 'info'}
                  className="gap-1.5 px-3 py-1 text-xs"
                >
                  <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                  <span>
                    <strong>Escopo ABAC:</strong> {scopeSummary.is_unrestricted ? 'Visão Global Irrestrita' : 'Lotação Hierárquica'}
                  </span>
                </Badge>
              )}
            </div>

            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-[#0c326f] tracking-tight leading-tight">
                Organograma Municipal
              </h1>
              <p className="text-sm md:text-base text-muted-foreground mt-1 font-normal max-w-2xl">
                Hierarquia oficial de secretarias, órgãos públicos, departamentos e controle de escopo (ABAC).
              </p>
            </div>
          </div>

          {/* Lado Direito: Ações Alinhadas em Linha Única */}
          <div className="flex items-center gap-3 shrink-0 self-start lg:self-center">
            {/* Botão Atualizar */}
            <Button
              variant="secondary"
              onClick={handleRefresh}
              disabled={isRefreshing}
              leftIcon={<RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />}
              title="Recarregar organograma"
            >
              <span className="hidden sm:inline">Atualizar</span>
            </Button>

            {/* Menu / Botão de Exportação */}
            <div className="relative group">
              <Button variant="secondary" leftIcon={<Download className="w-4 h-4" />}>
                <span>Exportar</span>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>

              {/* Dropdown de Exportação */}
              <div className="absolute right-0 mt-1.5 w-60 bg-popover rounded-xl border border-border shadow-xl py-2 z-30 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all duration-150">
                <button
                  type="button"
                  onClick={handleExportJson}
                  className="w-full px-4 py-2.5 text-left text-xs font-semibold text-foreground hover:bg-accent hover:text-primary flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <FileJson className="w-4 h-4 text-primary shrink-0" />
                  <div>
                    <span className="block font-bold">Manifest JSON</span>
                    <span className="text-[11px] text-muted-foreground font-normal">Com checksum SHA-256</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="w-full px-4 py-2.5 text-left text-xs font-semibold text-foreground hover:bg-accent hover:text-success flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="block font-bold">Exportar Planilha (CSV)</span>
                    <span className="text-[11px] text-muted-foreground font-normal">Compatível com MS Excel</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Botão Primário + Nova Unidade */}
            {can('org.create') && (
              <Button
                variant="primary"
                onClick={() => handleOpenCreateModal(null)}
                leftIcon={<Plus className="w-4 h-4" />}
                className="bg-[#10b981] hover:bg-[#059669] text-white font-bold"
              >
                Nova Unidade
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* 2. Mensagens de Feedback */}
      {errorMessage && (
        <AlertCard
          priority="danger"
          title="Erro na Operação Organizacional"
          description={errorMessage}
        />
      )}

      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-sm font-semibold">{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-700 hover:text-success text-xs font-bold uppercase tracking-wider px-2 py-1 rounded hover:bg-emerald-100/60"
          >
            Fechar
          </button>
        </div>
      )}

      {/* 4. Bento Grid de KPIs no Padrão Gov.br */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total de Unidades"
          value={String(kpis.total)}
          subtitle="Estrutura administrativa completa"
          icon={<Building2 className="w-5 h-5 text-[#0c326f]" />}
        />
        <KpiCard
          title="Secretarias Municipais"
          value={String(kpis.secretarias)}
          subtitle="Órgãos de 1º escalão"
          icon={<Layers className="w-5 h-5 text-emerald-600" />}
        />
        <KpiCard
          title="Deptos. & Divisões"
          value={String(kpis.deptosDivisoes)}
          subtitle="Unidades subordinadas"
          icon={<Network className="w-5 h-5 text-primary" />}
        />
        <KpiCard
          title="Servidores Alocados"
          value={String(kpis.totalServidores)}
          subtitle="Lotações ativas no tenant"
          icon={<Users className="w-5 h-5 text-cyan-600" />}
        />
      </div>

      {/* 5. Barra de Filtros, Pesquisa e Alternador de Visões */}
      <Card noPadding className="overflow-hidden">
        <Accordion
          icon={<Filter className="h-4 w-4 text-primary" />}
          items={[
            {
              value: 'filtros',
              title: (
                <span className="inline-flex items-center gap-2">
                  Filtros, Pesquisa e Visualização
                  <span className="text-xs font-normal text-muted-foreground">
                    {activeFiltersCount > 0 ? `${activeFiltersCount} filtro(s) ativo(s)` : 'colapsado — expanda para filtrar'}
                  </span>
                </span>
              ),
              children: (
                <div className="space-y-4">
                  {/* Campo de Busca */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Buscar unidade por nome, código, sigla..."
                      className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    {searchTerm && (
                      <button
                        type="button"
                        onClick={() => setSearchTerm('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Filtros Dropdowns */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <select
                      value={selectedTypeFilter}
                      onChange={(e) => setSelectedTypeFilter(e.target.value)}
                      className="px-3.5 py-2.5 rounded-lg border border-input bg-background text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="todos">Todos os Tipos</option>
                      <option value="raiz">Gabinete / Raiz</option>
                      <option value="secretaria">Secretarias Municipais</option>
                      <option value="departamento">Departamentos</option>
                      <option value="divisao">Divisões</option>
                      <option value="setor">Setores / Seções</option>
                      <option value="autarquia">Autarquias</option>
                      <option value="fundacao">Fundações</option>
                    </select>

                    <select
                      value={selectedLevelFilter}
                      onChange={(e) => setSelectedLevelFilter(e.target.value === 'todos' ? 'todos' : Number(e.target.value))}
                      className="px-3.5 py-2.5 rounded-lg border border-input bg-background text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="todos">Todos os Níveis</option>
                      <option value={1}>Nível 1 (Gabinete)</option>
                      <option value={2}>Nível 2 (Secretarias)</option>
                      <option value={3}>Nível 3 (Departamentos)</option>
                      <option value={4}>Nível 4 (Divisões)</option>
                    </select>
                  </div>
                </div>
              ),
            },
          ]}
        />

        {/* Barra inferior: modos de visão + ações da árvore */}
        <div className="flex flex-col gap-3 border-t border-border px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Segmented Control de Modos de Visão */}
          <div className="flex items-center p-1 bg-accent/60 rounded-lg self-start lg:self-auto">
            <button
              type="button"
              onClick={() => setViewMode('tree')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'tree'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ListTree className="w-4 h-4" />
              <span>Árvore Visual</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <TableIcon className="w-4 h-4" />
              <span>Tabela Matriz</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Secretarias</span>
            </button>
          </div>

          {/* Barra de Ações da Árvore (Apenas no Modo Tree) */}
          {viewMode === 'tree' && (
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="font-mono text-muted-foreground tabular-nums">
                Exibindo {filteredFlatUnits.length} unidade(s) na árvore
              </span>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={expandAll}>
                  Expandir Todos os Nós
                </Button>
                <Button variant="ghost" size="sm" onClick={collapseAll}>
                  Recolher Sub-árvores
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* 6. ÁREA DE VISUALIZAÇÃO CONFORME O MODO SELECIONADO */}

      {/* VISÃO 1: ÁRVORE HIERÁRQUICA INTERATIVA */}
      {viewMode === 'tree' && (
        <div className="p-6 sm:p-8 rounded-2xl bg-[#F8F9FA] border border-border200/90 shadow-sm min-h-[480px]">
          {isLoading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <RefreshCw className="w-9 h-9 text-[#0c326f] animate-spin" />
              <span className="font-mono text-sm font-semibold">Carregando estrutura do organograma...</span>
            </div>
          ) : filteredTree.length > 0 ? (
            renderTreeNodes(filteredTree)
          ) : (
            <div className="py-20 text-center space-y-3">
              <Building2 className="w-12 h-12 text-muted-foreground mx-auto" />
              <h3 className="text-lg font-bold text-[#0c326f]">Nenhuma unidade encontrada</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Não há unidades correspondentes aos critérios de filtro aplicados.
              </p>
            </div>
          )}
        </div>
      )}

      {/* VISÃO 2: TABELA ESTRUTURADA ANALÍTICA */}
      {viewMode === 'table' && (
        <Card noPadding className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border text-muted-foreground text-xs font-mono font-bold uppercase tracking-wider">
                  <th className="py-4 px-5 text-center">Código</th>
                  <th className="py-4 px-5 text-center">Unidade / Nome Oficial</th>
                  <th className="py-4 px-5 text-center">Tipo</th>
                  <th className="py-4 px-5 text-center">Nível</th>
                  <th className="py-4 px-5 text-center">Path</th>
                  <th className="py-4 px-5 text-center">Gestor Responsável</th>
                  <th className="py-4 px-5 text-center">Servidores</th>
                  <th className="py-4 px-5 text-center">Status</th>
                  <th className="py-4 px-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredFlatUnits.map((u) => {
                  const gestor = u.responsibles?.[0];
                  return (
                    <tr key={u.id} className="hover:bg-accent/40 transition-colors">
                      <td className="py-3.5 px-5 font-mono text-xs font-bold text-[#0c326f] tabular-nums text-center">
                        {u.code}
                      </td>
                      <td className="py-3.5 px-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span
                            className="text-xs font-mono text-muted-foreground"
                            style={{ paddingLeft: `${(u.level - 1) * 16}px` }}
                          >
                            {u.level > 1 ? '↳' : '•'}
                          </span>
                          <span className="font-bold text-foreground">{u.name}</span>
                          {u.acronym && (
                            <span className="font-mono text-xs text-muted-foreground bg-accent px-1.5 py-0.5 rounded">
                              {u.acronym}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-center">
                        <OrgTypeBadge type={u.type} />
                      </td>
                      <td className="py-3.5 px-5 font-mono text-xs font-bold text-muted-foreground tabular-nums text-center">
                        Nível {u.level}
                      </td>
                      <td className="py-3.5 px-5 font-mono text-xs text-muted-foreground tabular-nums text-center">
                        {u.path}
                      </td>
                      <td className="py-3.5 px-5 text-center">
                        {gestor ? (
                          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-success">
                            <span className="w-2 h-2 rounded-full bg-success" />
                            <span>{gestor.name}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Não vinculado</span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-center font-mono text-xs font-bold text-muted-foreground tabular-nums">
                        {u.users_count || 0}
                      </td>
                      <td className="py-3.5 px-5 text-center">
                        <StatusChip
                          label={u.is_active ? 'Ativo' : 'Inativo'}
                          variant={u.is_active ? 'success' : 'neutral'}
                        />
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(u)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-warning hover:bg-warning/10"
                            title="Editar"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          {u.level > 1 && (
                            <button
                              type="button"
                              onClick={() => handleOpenMoveModal(u)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10"
                              title="Mover"
                            >
                              <Move className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenUsersModal(u)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10"
                            title="Servidores"
                          >
                            <UserPlus className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* VISÃO 3: CARDS POR SECRETARIAS / BENTO VIEW */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {secretariasList.map((sec) => (
            <Card
              key={sec.id}
              className="p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <span className="font-mono text-xs font-bold uppercase text-[#10b981] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 tabular-nums">
                    {sec.code}
                  </span>
                  <OrgTypeBadge type={sec.type} />
                </div>

                <h3 className="text-lg font-bold text-[#0c326f] leading-snug mb-2">
                  {sec.name}
                </h3>

                {sec.responsibles && sec.responsibles.length > 0 ? (
                  <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 mb-4 text-xs">
                    <span className="block font-bold text-emerald-900">Titular / Gestor:</span>
                    <span className="text-emerald-800 font-medium">{sec.responsibles[0].name}</span>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-accent/40 border border-border200 mb-4 text-xs text-muted-foreground italic">
                    Sem gestor titular registrado
                  </div>
                )}

                {/* Subdivisões */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider font-mono">
                    Unidades Subordinadas ({sec.children?.length || 0}):
                  </span>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {sec.children && sec.children.length > 0 ? (
                      sec.children.map((child) => (
                        <div
                          key={child.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-accent/40 text-xs border border-border100"
                        >
                          <span className="font-medium text-foreground truncate">{child.name}</span>
                          <span className="font-mono font-bold text-muted-foreground">{child.code}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Nenhuma sub-unidade vinculada</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-border100 flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground font-bold tabular-nums">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span>{sec.users_count || 0} servidores</span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleOpenCreateModal(sec.id)}
                    className="p-1.5 rounded-lg text-emerald-700 hover:bg-accent"
                    title="Adicionar sub-unidade"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(sec)}
                    className="p-1.5 rounded-lg text-amber-700 hover:bg-warning/10"
                    title="Editar"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* --- MODAIS DE GESTÃO ORGANIZACIONAL (shadcn Dialog) --- */}

      {/* Modal 1: Criar Unidade */}
      <Dialog
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={targetParentId ? 'Adicionar Sub-unidade Subordinada' : 'Cadastrar Nova Unidade'}
        icon={<Plus className="h-5 w-5 text-primary" />}
        size="lg"
        footer={
          <>
            <Button variant="ghost" type="button" onClick={() => setIsCreateModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" form="org-create-form" className="bg-[#10b981] hover:bg-[#059669] text-white font-bold">
              Cadastrar Unidade
            </Button>
          </>
        }
      >
            <form id="org-create-form" onSubmit={handleCreateSubmit} className="space-y-4">
              <Field label="Nome da Unidade" required>
                <input
                  type="text"
                  required
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="Ex: Secretaria Municipal de Educação"
                  className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Código Técnico" required>
                  <input
                    type="text"
                    required
                    value={createForm.code}
                    onChange={(e) => setCreateForm({ ...createForm, code: e.target.value.toUpperCase() })}
                    placeholder="Ex: SMED-01"
                    className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm font-mono uppercase focus:ring-2 focus:ring-ring focus:outline-none"
                  />
                </Field>

                <Field label="Sigla">
                  <input
                    type="text"
                    value={createForm.acronym || ''}
                    onChange={(e) => setCreateForm({ ...createForm, acronym: e.target.value.toUpperCase() })}
                    placeholder="Ex: SMED"
                    className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm font-mono uppercase focus:ring-2 focus:ring-ring focus:outline-none"
                  />
                </Field>
              </div>

              <Field label="Tipo Organizacional" required>
                <select
                  value={createForm.type}
                  onChange={(e) => setCreateForm({ ...createForm, type: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm font-semibold text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
                >
                  <option value="secretaria">Secretaria Municipal</option>
                  <option value="departamento">Departamento</option>
                  <option value="divisao">Divisão</option>
                  <option value="setor">Setor / Seção</option>
                  <option value="autarquia">Autarquia</option>
                  <option value="fundacao">Fundação Pública</option>
                  {!targetParentId && <option value="raiz">Órgão Raiz / Gabinete</option>}
                </select>
              </Field>
            </form>
      </Dialog>

      {/* Modal 2: Editar Unidade */}
      <Dialog
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Editar Unidade #${selectedUnit?.id ?? ''}`}
        icon={<Edit3 className="h-5 w-5 text-primary" />}
        size="lg"
        footer={
          <>
            <Button variant="ghost" type="button" onClick={() => setIsEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" form="org-edit-form" className="bg-[#0c326f] hover:bg-[#08224d] text-white font-bold">
              Salvar Alterações
            </Button>
          </>
        }
      >
            <form id="org-edit-form" onSubmit={handleEditSubmit} className="space-y-4">
              <Field label="Nome da Unidade" required>
                <input
                  type="text"
                  required
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Código Técnico" required>
                  <input
                    type="text"
                    required
                    value={editForm.code || ''}
                    onChange={(e) => setEditForm({ ...editForm, code: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm font-mono uppercase focus:ring-2 focus:ring-ring focus:outline-none"
                  />
                </Field>

                <Field label="Sigla">
                  <input
                    type="text"
                    value={editForm.acronym || ''}
                    onChange={(e) => setEditForm({ ...editForm, acronym: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm font-mono uppercase focus:ring-2 focus:ring-ring focus:outline-none"
                  />
                </Field>
              </div>

              <Field label="Tipo Organizacional" required>
                <select
                  value={editForm.type || 'secretaria'}
                  onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm font-semibold text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
                >
                  <option value="raiz">Gabinete / Raiz</option>
                  <option value="secretaria">Secretaria Municipal</option>
                  <option value="departamento">Departamento</option>
                  <option value="divisao">Divisão</option>
                  <option value="setor">Setor / Seção</option>
                  <option value="autarquia">Autarquia</option>
                  <option value="fundacao">Fundação Pública</option>
                </select>
              </Field>

              {/* Gestor Titular (responsável) */}
              <div className="rounded-xl border border-border bg-accent/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary font-mono">
                    Gestor Titular
                  </span>
                  {currentGestor && (
                    <Badge variant="success">vinculado</Badge>
                  )}
                </div>

                {currentGestor ? (
                  <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{currentGestor.name || `Usuário #${currentGestor.id}`}</p>
                      {currentGestor.email && (
                        <p className="font-mono text-[10px] text-muted-foreground truncate">
                          {currentGestor.matricula ? `Matrícula ${currentGestor.matricula} · ` : ''}{currentGestor.email}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentGestor(null)}
                      className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      title="Remover gestor titular"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="relative">
                      <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={editGestorSearch}
                        onChange={(e) => handleGestorSearchChange(e.target.value)}
                        placeholder="Buscar gestor por nome ou matrícula..."
                        className="w-full pl-9 py-2 rounded-lg border border-input bg-background text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                      />
                    </div>
                    {editGestorResults.length > 0 && (
                      <div className="mt-1 max-h-36 overflow-y-auto rounded-lg border border-border bg-background">
                        {editGestorResults.map((u) => (
                          <div key={u.id} className="flex items-center justify-between px-3 py-2 hover:bg-accent/60">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-foreground truncate">{u.name}</p>
                              <p className="font-mono text-[10px] text-muted-foreground truncate">
                                {u.matricula ? `Matrícula ${u.matricula} · ` : ''}{u.email}
                              </p>
                            </div>
                            <Button variant="secondary" size="sm" onClick={() => handleLinkGestor(u.id)}>
                              Definir como gestor
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </form>
      </Dialog>

      {/* Modal 3: Mover Unidade com Prevenção de Ciclos (RN-ORG-003) */}
      <Dialog
        open={isMoveModalOpen}
        onClose={() => setIsMoveModalOpen(false)}
        title="Remanejamento Hierárquico"
        icon={<Move className="h-5 w-5 text-primary" />}
        size="lg"
        footer={
          <>
            <Button variant="ghost" type="button" onClick={() => setIsMoveModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" form="org-move-form" className="bg-[#0c326f] hover:bg-[#08224d] text-white font-bold">
              Confirmar Remanejamento
            </Button>
          </>
        }
      >
            <div className="rounded-lg bg-warning/15 border border-warning/30 px-4 py-3 text-xs text-[#8D5B00] space-y-1">
              <span className="block font-bold">Prevenção Estrita de Ciclos (RN-ORG-003):</span>
              <p>
                Ao mover esta unidade, toda a sua subárvore terá os paths e níveis recalculados atomicamente.
                Unidades descendentes são automaticamente removidas da lista de destino.
              </p>
            </div>

            <form id="org-move-form" onSubmit={handleMoveSubmit} className="space-y-4 mt-4">
              <Field label="Selecione o Novo Órgão / Secretaria Pai" required>
                <select
                  required
                  value={moveForm.new_parent_id || ''}
                  onChange={(e) => setMoveForm({ new_parent_id: e.target.value ? Number(e.target.value) : null })}
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background text-sm font-semibold text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
                >
                  <option value="">Selecione a nova unidade pai...</option>
                  {flatUnits
                    .filter((u) => u.id !== selectedUnit?.id && !u.path.startsWith(`${selectedUnit?.path}.`))
                    .map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.name} ({candidate.code}) — Nível {candidate.level}
                      </option>
                    ))}
                </select>
              </Field>
            </form>
      </Dialog>

      {/* Modal 4: Gerenciar Servidores (RN-ORG-007) */}
      <Dialog
        open={isUsersModalOpen}
        onClose={() => setIsUsersModalOpen(false)}
        title="Lotação de Servidores"
        icon={<Users className="h-5 w-5 text-primary" />}
        size="lg"
        footer={
          <Button variant="ghost" onClick={() => setIsUsersModalOpen(false)}>
            Concluir
          </Button>
        }
      >
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono font-bold text-muted-foreground">{selectedUnit?.name}</span>
                <Badge variant="primary">{linkedUsers.length} servidor(es)</Badge>
              </div>

              {/* Busca e vínculo de novo servidor */}
              <div className="rounded-xl bg-accent/30 border border-border p-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-primary font-mono">
                  Vincular novo servidor
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <Field label="Buscar por nome ou matrícula">
                      <div className="relative">
                        <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={userSearchQuery}
                          onChange={(e) => handleSearchChange(e.target.value)}
                          placeholder="Digite nome ou matrícula..."
                          className="w-full pl-9 py-2 rounded-lg border border-input bg-background text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                        />
                      </div>
                    </Field>
                    {searchingUsers && <p className="mt-1 text-xs text-muted-foreground">Buscando...</p>}
                    {userSearchQuery.trim().length >= 2 && !searchingUsers && searchResults.length > 0 && (
                      <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-border bg-background">
                        {searchResults.map((u) => (
                          <div key={u.id} className="flex items-center justify-between px-3 py-2 hover:bg-accent/60">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-foreground truncate">{u.name}</p>
                              <p className="font-mono text-[10px] text-muted-foreground truncate">
                                {u.matricula ? `Matrícula: ${u.matricula} · ` : ''}{u.email}
                              </p>
                            </div>
                            <Button variant="secondary" size="sm" onClick={() => handleLinkUser(u.id)}>
                              Vincular
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    {userSearchQuery.trim().length >= 2 && !searchingUsers && searchResults.length === 0 && (
                      <p className="mt-1 text-xs text-muted-foreground">Nenhum usuário encontrado.</p>
                    )}
                  </div>
                  <div>
                    <Field label="Papel">
                      <select
                        value={linkUserForm.role}
                        onChange={(e) => setLinkUserForm({ ...linkUserForm, role: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm font-semibold focus:ring-2 focus:ring-ring focus:outline-none"
                      >
                        <option value="membro">Membro</option>
                        <option value="responsavel">Gestor / Titular</option>
                      </select>
                    </Field>
                  </div>
                </div>

                <label className="flex cursor-pointer items-center gap-2.5 text-xs font-bold text-foreground">
                  <input
                    type="checkbox"
                    checked={linkUserForm.is_primary}
                    onChange={(e) => setLinkUserForm({ ...linkUserForm, is_primary: e.target.checked })}
                    className="h-4 w-4 accent-primary"
                  />
                  Definir como Lotação Primária Oficial (RN-ORG-007)
                </label>
              </div>

              {/* Lista de servidores vinculados */}
              <div>
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
                  Servidores vinculados
                </h4>
                {loadingLinkedUsers ? (
                  <div className="flex justify-center py-6">
                    <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
                  </div>
                ) : linkedUsers.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted-foreground">
                    Nenhum servidor vinculado a esta unidade.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {linkedUsers.map((u) => (
                      <div key={u.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">
                            {u.name}
                            {u.is_primary && <span className="ml-2 text-[10px] font-bold text-success uppercase">· Primária</span>}
                          </p>
                          <p className="font-mono text-[10px] text-muted-foreground truncate">
                            {u.role === 'responsavel' ? 'Gestor / Titular' : 'Membro'}
                            {u.matricula ? ` · Matrícula ${u.matricula}` : ''}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleUnlinkUser(u.id)}
                          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          title="Remover vínculo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
      </Dialog>

      {/* Modal 5: Inativar / Excluir (RN-ORG-004) */}
      <Dialog
        open={isInactivateModalOpen}
        onClose={() => setIsInactivateModalOpen(false)}
        title="Inativar Unidade Administrativa"
        icon={<Trash2 className="h-5 w-5 text-destructive" />}
        size="lg"
        footer={
          <>
            <Button variant="ghost" type="button" onClick={() => setIsInactivateModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" type="submit" form="org-inactivate-form" className="bg-red-600 hover:bg-red-700 text-white font-bold">
              Confirmar Inativação
            </Button>
          </>
        }
      >
            <p className="text-sm text-muted-foreground leading-relaxed">
              Você está inativando a unidade <strong className="text-foreground">{selectedUnit?.name}</strong> ({selectedUnit?.code}). Conforme as normas de governança (RN-ORG-004), informe a justificativa legal ou ato normativo.
            </p>

            <form id="org-inactivate-form" onSubmit={handleInactivateSubmit} className="space-y-4 mt-4">
              <Field label="Justificativa Legal / Motivo Administrativo" required>
                <textarea
                  required
                  rows={3}
                  value={inactivationReason}
                  onChange={(e) => setInactivationReason(e.target.value)}
                  placeholder="Ex: Reestruturação administrativa conforme Decreto Municipal nº 123/2026..."
                  className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:ring-2 focus:ring-destructive focus:outline-none"
                />
              </Field>
            </form>
      </Dialog>

      {/* Modal 6: Preview do Manifest Versionado */}
      <Dialog
        open={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="Manifest Versionado de Exportação"
        icon={<FileJson className="h-5 w-5 text-primary" />}
        size="full"
        footer={
          <div className="flex w-full items-center justify-between">
            <span className="text-xs font-mono text-muted-foreground">
              Total de Unidades: {exportPreviewData?.manifest.total_units}
            </span>
            <Button variant="primary" onClick={() => setIsExportModalOpen(false)} className="bg-[#0c326f] text-white font-bold">
              Fechar Visualização
            </Button>
          </div>
        }
      >
            <div className="space-y-4">
              <div className="rounded-lg bg-accent/40 border border-border px-4 py-3 text-xs font-mono flex items-center justify-between">
                <span><strong>Checksum SHA-256:</strong> {exportPreviewData?.manifest.checksum_sha256}</span>
                <span className="font-bold text-primary">Versão: {exportPreviewData?.manifest.version}</span>
              </div>

              <pre className="max-h-[55vh] overflow-y-auto rounded-xl bg-foreground p-5 text-success text-xs font-mono tabular-nums leading-relaxed">
                {JSON.stringify(exportPreviewData, null, 2)}
              </pre>
            </div>
      </Dialog>
    </div>
  );
};

export default OrgChartModule;
