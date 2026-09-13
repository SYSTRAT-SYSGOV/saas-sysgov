import React, { useState, useMemo, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  Select,
} from '@sysgov/ui';
import {
  PageHeader,
  Tabs,
  type TabsItem,
  StatusChip,
} from '@/components/ui';
import {
  Award,
  User,
  Briefcase,
  Scale,
  Building2,
  ShieldAlert,
  SlidersHorizontal,
  Info,
  CheckCircle2,
  ShieldCheck,
  Eye,
} from 'lucide-react';
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

type PerfilSimulado = 'auto' | 'todos' | 'servidor' | 'avaliador' | 'cad' | 'rh' | 'auditoria';

export const CapdModule: React.FC = () => {
  const { user, tenant } = useAuth();

  // Papéis reais detectados na sessão
  const rolesReais = useMemo(() => user?.roles || [], [user?.roles]);
  const isPlatformAdmin = Boolean(user?.is_platform_admin);
  const isAdminReal = isPlatformAdmin || rolesReais.some((r) => ['admin_tenant', 'admin', 'root'].includes(r));
  const isRhReal = isAdminReal || rolesReais.some((r) => ['gestor_rh', 'rh', 'recursos_humanos', 'smgp'].includes(r));
  const isCadReal = isAdminReal || rolesReais.some((r) => ['membro_comissao', 'comissao_cad', 'cad', 'presidente_cad'].includes(r));
  const isAvaliadorReal = isAdminReal || isRhReal || rolesReais.some((r) => ['avaliador', 'chefia', 'gestor_unidade', 'diretor'].includes(r));
  const isAuditoriaReal = isAdminReal || rolesReais.some((r) => ['auditoria', 'controle_interno', 'ouvidoria', 'cgm'].includes(r));

  // Estado de simulação de perfil (para Administradores e testes)
  const [perfilSimulado, setPerfilSimulado] = useState<PerfilSimulado>('auto');

  // Permissões efetivas considerando a simulação
  const permissoes = useMemo(() => {
    if (perfilSimulado === 'todos') {
      return {
        servidor: true,
        avaliador: true,
        cad: true,
        rh: true,
        auditoria: true,
        nomePerfil: 'Visão Completa (Todos os Portais)',
      };
    }
    if (perfilSimulado === 'servidor') {
      return {
        servidor: true,
        avaliador: false,
        cad: false,
        rh: false,
        auditoria: false,
        nomePerfil: 'Servidor Público Avaliado',
      };
    }
    if (perfilSimulado === 'avaliador') {
      return {
        servidor: true,
        avaliador: true,
        cad: false,
        rh: false,
        auditoria: false,
        nomePerfil: 'Chefia Imediata / Avaliador',
      };
    }
    if (perfilSimulado === 'cad') {
      return {
        servidor: true,
        avaliador: false,
        cad: true,
        rh: false,
        auditoria: false,
        nomePerfil: 'Comissão Especial de Avaliação (CAD)',
      };
    }
    if (perfilSimulado === 'rh') {
      return {
        servidor: true,
        avaliador: true,
        cad: false,
        rh: true,
        auditoria: false,
        nomePerfil: 'Gestão de Pessoas / RH (SMGP)',
      };
    }
    if (perfilSimulado === 'auditoria') {
      return {
        servidor: true,
        avaliador: false,
        cad: false,
        rh: false,
        auditoria: true,
        nomePerfil: 'Controle Interno & Auditoria',
      };
    }

    // Modo 'auto' (baseado nas roles reais)
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
  }, [perfilSimulado, isAdminReal, isRhReal, isCadReal, isAvaliadorReal, isAuditoriaReal]);

  // Construção dinâmica das abas com base nos acessos autorizados
  const tabItems = useMemo<TabsItem<CapdPortalTab>[]>(() => {
    const tabs: TabsItem<CapdPortalTab>[] = [];

    if (permissoes.servidor) {
      tabs.push({
        key: 'portal-servidor',
        label: 'Portal do Servidor',
        icon: <User className="h-4 w-4 text-primary" />,
      });
    }

    if (permissoes.avaliador) {
      tabs.push({
        key: 'portal-avaliador',
        label: 'Portal da Chefia Imediata',
        icon: <Briefcase className="h-4 w-4 text-amber-500" />,
      });
    }

    if (permissoes.cad) {
      tabs.push({
        key: 'portal-cad',
        label: 'Portal da Comissão (CAD)',
        icon: <Scale className="h-4 w-4 text-indigo-500" />,
      });
    }

    if (permissoes.rh) {
      tabs.push({
        key: 'portal-rh',
        label: 'Portal de RH / SMGP',
        icon: <Building2 className="h-4 w-4 text-emerald-500" />,
      });
    }

    if (permissoes.auditoria) {
      tabs.push({
        key: 'portal-auditoria',
        label: 'Portal de Auditoria',
        icon: <ShieldAlert className="h-4 w-4 text-rose-500" />,
      });
    }

    return tabs;
  }, [permissoes]);

  // Aba ativa inicial (privilegia a primeira aba visível do papel)
  const [activeTab, setActiveTab] = useState<CapdPortalTab>(() => {
    if (isAdminReal || isCadReal) return 'portal-cad';
    if (isRhReal) return 'portal-rh';
    if (isAvaliadorReal) return 'portal-avaliador';
    return 'portal-servidor';
  });

  // Garantir que a aba ativa pertença sempre às abas autorizadas para o papel atual
  useEffect(() => {
    if (tabItems.length > 0 && !tabItems.some((t) => t.key === activeTab)) {
      setActiveTab(tabItems[0].key);
    }
  }, [tabItems, activeTab]);

  return (
    <div className="space-y-6 p-6">
      {/* ── CABEÇALHO INSTITUCIONAL DO MÓDULO ───────────────────────── */}
      <PageHeader
        icon={<Award className="h-6 w-6 text-primary" />}
        title="Comissão de Avaliação Periódica de Desempenho (CAPD)"
        subtitle="Sistema de Avaliação Periódica de Desempenho e Estágio Probatório — Lei Municipal nº 1.704/2006."
        badge="SAPDS / CAPD"
        actions={
          <div className="flex items-center gap-3">
            {/* Seletor de Simulação de Papel para Administradores e Desenvolvedores */}
            {isAdminReal && (
              <div className="flex items-center gap-2 bg-muted/60 px-3 py-1.5 rounded-lg border border-border">
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                  Simular Visão:
                </span>
                <Select
                  value={perfilSimulado}
                  onChange={(val) => setPerfilSimulado(val as PerfilSimulado)}
                  options={[
                    { value: 'auto', label: 'Automático (Papéis Reais)' },
                    { value: 'todos', label: 'Todos os Portais (Admin)' },
                    { value: 'cad', label: 'Comissão CAD (Configurações do Módulo)' },
                    { value: 'rh', label: 'Gestão RH (Configurações de RH)' },
                    { value: 'avaliador', label: 'Chefia Imediata / Avaliador' },
                    { value: 'servidor', label: 'Servidor Público Avaliado' },
                    { value: 'auditoria', label: 'Controle Interno / Auditoria' },
                  ]}
                  className="w-56 text-xs h-8"
                />
              </div>
            )}
          </div>
        }
      />

      {/* ── FAIXA INFORMATIVA DE RBAC & ORGANIZAÇÃO ESTRUTURAL ─────────── */}
      <div className="bg-card border border-border rounded-xl p-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-foreground">
                Nível de Acesso Ativo:
              </span>
              <Badge variant="outline" className="font-mono text-[11px] bg-background">
                {permissoes.nomePerfil}
              </Badge>
              {perfilSimulado !== 'auto' && (
                <Badge variant="secondary" className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800">
                  Modo Simulação Ativo
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Visualização restrita e organizada conforme competências legais (art. 20 a 30 da Lei nº 1.704/2006).
            </p>
          </div>
        </div>

        {/* Guia Rápido de Onde Ficam as Configurações */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-md border border-border/60">
          <Info className="h-4 w-4 text-primary shrink-0" />
          <span>
            <strong>Configurações do Módulo:</strong> Portal da CAD &bull;{' '}
            <strong>Configurações de RH:</strong> Portal de RH / SMGP
          </span>
        </div>
      </div>

      {/* ── NAVEGAÇÃO DE NÍVEL SUPERIOR: PORTAIS FUNCIONAIS ────────────── */}
      <div className="overflow-x-auto pb-1 border-b border-border">
        <Tabs items={tabItems} value={activeTab} onChange={setActiveTab} />
      </div>

      {/* ── RENDERIZAÇÃO DO PORTAL SELECIONADO ────────────────────────── */}
      <main className="transition-all duration-150">
        {activeTab === 'portal-servidor' && permissoes.servidor && <PortalServidorView />}
        {activeTab === 'portal-avaliador' && permissoes.avaliador && <PortalAvaliadorView />}
        {activeTab === 'portal-cad' && permissoes.cad && <PortalCadView />}
        {activeTab === 'portal-rh' && permissoes.rh && <PortalRhView />}
        {activeTab === 'portal-auditoria' && permissoes.auditoria && <PortalAuditoriaView />}
      </main>
    </div>
  );
};

export default CapdModule;
