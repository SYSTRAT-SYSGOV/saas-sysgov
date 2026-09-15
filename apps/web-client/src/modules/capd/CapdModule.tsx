import React, { useState, useMemo, useEffect } from 'react';
import { Select } from '@sysgov/ui';
import { useAuth } from '@/core/auth/useAuth';
import { PortalServidorView } from './views/PortalServidorView';
import { PortalAvaliadorView } from './views/PortalAvaliadorView';
import { PortalCadView } from './views/PortalCadView';
import { PortalRhView } from './views/PortalRhView';
import { PortalAuditoriaView } from './views/PortalAuditoriaView';

export type CapdPortalTab =
  | 'portal-servidor'
  | 'portal-avaliador'
  | 'portal-cad'
  | 'portal-rh'
  | 'portal-auditoria';

export const CapdModule: React.FC = () => {
  const { user } = useAuth();

  // Papéis reais detectados na sessão
  const rolesReais = useMemo(() => user?.roles || [], [user?.roles]);
  const isPlatformAdmin = Boolean(user?.is_platform_admin);
  const isAdminReal = isPlatformAdmin || rolesReais.some((r) => ['admin_tenant', 'admin', 'root'].includes(r));
  const isRhReal = isAdminReal || rolesReais.some((r) => ['gestor_rh', 'rh', 'recursos_humanos', 'smgp'].includes(r));
  const isCadReal = isAdminReal || rolesReais.some((r) => ['membro_comissao', 'comissao_cad', 'cad', 'presidente_cad'].includes(r));
  const isAvaliadorReal = isAdminReal || isRhReal || rolesReais.some((r) => ['avaliador', 'chefia', 'gestor_unidade', 'diretor'].includes(r));
  const isAuditoriaReal = isAdminReal || rolesReais.some((r) => ['auditoria', 'controle_interno', 'ouvidoria', 'cgm'].includes(r));

  // Permissões efetivas baseadas nos papéis reais (Admin tem acesso a todos os portais)
  const permissoes = useMemo(() => {
    if (isAdminReal) {
      return {
        servidor: true,
        avaliador: true,
        cad: true,
        rh: true,
        auditoria: true,
        nomePerfil: 'Administrador Geral do Município',
      };
    }
    if (isRhReal) {
      return {
        servidor: true,
        avaliador: true,
        cad: false,
        rh: true,
        auditoria: false,
        nomePerfil: 'Gestor de Recursos Humanos',
      };
    }
    if (isCadReal) {
      return {
        servidor: true,
        avaliador: false,
        cad: true,
        rh: false,
        auditoria: false,
        nomePerfil: 'Membro da Comissão CAD',
      };
    }
    if (isAvaliadorReal) {
      return {
        servidor: true,
        avaliador: true,
        cad: false,
        rh: false,
        auditoria: false,
        nomePerfil: 'Chefia Imediata (Avaliador)',
      };
    }
    if (isAuditoriaReal) {
      return {
        servidor: true,
        avaliador: false,
        cad: false,
        rh: false,
        auditoria: true,
        nomePerfil: 'Auditor do Controle Interno',
      };
    }

    // Padrão: Servidor comum
    return {
      servidor: true,
      avaliador: false,
      cad: false,
      rh: false,
      auditoria: false,
      nomePerfil: 'Servidor Público Municipal',
    };
  }, [isAdminReal, isRhReal, isCadReal, isAvaliadorReal, isAuditoriaReal]);

  // Construção dinâmica dos portais autorizados
  const tabItems = useMemo(() => {
    const tabs: { key: CapdPortalTab; label: string }[] = [];

    if (permissoes.servidor) {
      tabs.push({
        key: 'portal-servidor',
        label: 'Portal do Servidor',
      });
    }

    if (permissoes.avaliador) {
      tabs.push({
        key: 'portal-avaliador',
        label: 'Portal da Chefia Imediata',
      });
    }

    if (permissoes.cad) {
      tabs.push({
        key: 'portal-cad',
        label: 'Portal da CAD (Comissão)',
      });
    }

    if (permissoes.rh) {
      tabs.push({
        key: 'portal-rh',
        label: 'Portal de RH / SMGP',
      });
    }

    if (permissoes.auditoria) {
      tabs.push({
        key: 'portal-auditoria',
        label: 'Portal de Auditoria',
      });
    }

    return tabs;
  }, [permissoes]);

  // Aba ativa inicial (privilegia o portal mais relevante do perfil)
  const [activeTab, setActiveTab] = useState<CapdPortalTab>(() => {
    if (isAdminReal || isCadReal) return 'portal-cad';
    if (isRhReal) return 'portal-rh';
    if (isAvaliadorReal) return 'portal-avaliador';
    return 'portal-servidor';
  });

  // Manter controle de abas já visitadas para manter cache em memória (troca instantânea de abas)
  const [visitedTabs, setVisitedTabs] = useState<Set<CapdPortalTab>>(() => new Set([activeTab]));

  useEffect(() => {
    setVisitedTabs((prev) => {
      if (prev.has(activeTab)) return prev;
      const next = new Set(prev);
      next.add(activeTab);
      return next;
    });
  }, [activeTab]);

  // Garantir que a aba ativa pertença sempre às abas autorizadas para o papel atual
  useEffect(() => {
    if (tabItems.length > 0 && !tabItems.some((t) => t.key === activeTab)) {
      setActiveTab(tabItems[0].key);
    }
  }, [tabItems, activeTab]);

  // Seletor Dropdown Único de Portais (sem dropdown de simulação redundante/conflitante)
  const portalSelectorNode = useMemo(() => {
    if (tabItems.length <= 1) {
      return null;
    }

    const portalOptions = tabItems.map((t) => ({
      value: t.key,
      label: t.label,
    }));

    return (
      <div className="flex items-center gap-1.5 bg-muted/60 px-2.5 py-1 rounded-lg border border-border">
        <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
          Portal:
        </span>
        <Select
          value={activeTab}
          onChange={(val) => setActiveTab(val as CapdPortalTab)}
          options={portalOptions}
          className="w-56 text-xs h-8"
        />
      </div>
    );
  }, [tabItems, activeTab]);

  return (
    <div className="p-6">
      {/* ── RENDERIZAÇÃO COM CACHE EM MEMÓRIA (TROCA INSTANTÂNEA E SEM RECARREGAMENTO) ── */}
      <main className="transition-all duration-150">
        {visitedTabs.has('portal-servidor') && permissoes.servidor && (
          <div style={{ display: activeTab === 'portal-servidor' ? 'block' : 'none' }}>
            <PortalServidorView portalSelector={portalSelectorNode} />
          </div>
        )}
        {visitedTabs.has('portal-avaliador') && permissoes.avaliador && (
          <div style={{ display: activeTab === 'portal-avaliador' ? 'block' : 'none' }}>
            <PortalAvaliadorView portalSelector={portalSelectorNode} />
          </div>
        )}
        {visitedTabs.has('portal-cad') && permissoes.cad && (
          <div style={{ display: activeTab === 'portal-cad' ? 'block' : 'none' }}>
            <PortalCadView portalSelector={portalSelectorNode} />
          </div>
        )}
        {visitedTabs.has('portal-rh') && permissoes.rh && (
          <div style={{ display: activeTab === 'portal-rh' ? 'block' : 'none' }}>
            <PortalRhView portalSelector={portalSelectorNode} />
          </div>
        )}
        {visitedTabs.has('portal-auditoria') && permissoes.auditoria && (
          <div style={{ display: activeTab === 'portal-auditoria' ? 'block' : 'none' }}>
            <PortalAuditoriaView portalSelector={portalSelectorNode} />
          </div>
        )}
      </main>
    </div>
  );
};

export default CapdModule;
