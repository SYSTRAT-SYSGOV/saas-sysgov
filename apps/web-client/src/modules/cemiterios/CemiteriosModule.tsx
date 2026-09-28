import React, { useMemo } from 'react';
import { Cross, FileSignature, HardHat, LayoutGrid, Map, Receipt, Camera, ClipboardList, Scale, Users } from 'lucide-react';
import { PageHeader, Tabs } from '@/components/ui';
import { useCan } from '@/core/rbac/useCan';
import { InventarioView } from './views/InventarioView';
import { MapaView } from './views/MapaView';
import { OperacoesView } from './views/OperacoesView';
import { ConcessoesView } from './views/ConcessoesView';
import { SucessaoView } from './views/SucessaoView';
import { OperadoresView } from './views/OperadoresView';
import { FinanceiroView } from './views/FinanceiroView';
import { EmpreiteirosView } from './views/EmpreiteirosView';
import { VistoriaView } from './views/VistoriaView';
import { SelecaoNecropoleView } from './views/SelecaoNecropoleView';
import { AdministracaoGeralView } from './views/AdministracaoGeralView';
import { NecropoleHeaderBar } from './views/NecropoleHeaderBar';

import { useContext } from 'react';
import { CemiteriosNavigationProvider, useCemiteriosContext, CemiteriosContext } from './CemiteriosContext';
import type { ModoVisaoCemiterios } from './CemiteriosContext';
import type { Parque } from './api';

export interface CemiteriosModuleProps {
  cemiteriosIniciais?: Parque[];
  isGestorMunicipal?: boolean;
  modoVisaoInicial?: ModoVisaoCemiterios;
  cemiterioAtivoIdInicial?: number | null;
}

/** Espelha `module.json#menu.children` (mesma ordem e permissões). */
const ABAS = [
  { key: 'inventario', label: 'Inventário', icon: LayoutGrid, permissao: 'cemiterios.view', Componente: InventarioView },
  { key: 'mapa', label: 'Mapa GIS', icon: Map, permissao: 'cemiterios.view', Componente: MapaView },
  { key: 'operacoes', label: 'Operações', icon: ClipboardList, permissao: 'cemiterios.view', Componente: OperacoesView },
  { key: 'concessoes', label: 'Concessões', icon: FileSignature, permissao: 'cemiterios.concessoes.manage', Componente: ConcessoesView },
  { key: 'sucessao', label: 'Sucessão Hereditária', icon: Scale, permissao: 'cemiterios.concessoes.manage', Componente: SucessaoView },
  { key: 'operadores', label: 'Coveiros e Pedreiros', icon: Users, permissao: 'cemiterios.view', Componente: OperadoresView },
  { key: 'financeiro', label: 'Financeiro', icon: Receipt, permissao: 'cemiterios.financeiro.manage', Componente: FinanceiroView },
  { key: 'empreiteiros', label: 'Empreiteiros', icon: HardHat, permissao: 'cemiterios.empreiteiros.manage', Componente: EmpreiteirosView },
  { key: 'vistorias', label: 'Vistoria e Abandono', icon: Camera, permissao: 'cemiterios.vistoria.create', Componente: VistoriaView },
] as const;

/** Conteúdo interno com controle de fluxo: Seleção -> Administração Geral -> Gestão de Necrópole. */
const CemiteriosModuleConteudo: React.FC = () => {
  const { can } = useCan();
  const abasVisiveis = useMemo(() => ABAS.filter((a) => can(a.permissao)), [can]);
  const {
    abaAtiva,
    setAbaAtiva,
    modoVisao,
    cemiterioAtivoId,
  } = useCemiteriosContext();

  const atual = abasVisiveis.find((a) => a.key === abaAtiva) ?? abasVisiveis[0];

  // 1. Modo de Seleção Inicial de Necrópole
  if (modoVisao === 'selecao') {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Gestão de Cemitérios Municipais"
          subtitle="Selecione uma necrópole para gerenciar ou acesse o painel unificado municipal."
          icon={<Cross className="h-6 w-6" />}
        />
        <SelecaoNecropoleView />
      </div>
    );
  }

  // 2. Modo de Administração Geral Municipal
  if (modoVisao === 'administracao_geral') {
    return (
      <div className="space-y-6">
        <AdministracaoGeralView />
      </div>
    );
  }

  // 3. Modo de Gestão da Necrópole Selecionada
  return (
    <div className="space-y-6" key={cemiterioAtivoId ?? 'sem-cemiterio'}>
      {/* Barra de identificação da necrópole e alternador de contexto */}
      <NecropoleHeaderBar />

      {/* Navegação de Abas do Cemitério Ativo */}
      <Tabs
        items={abasVisiveis.map((a) => ({ key: a.key, label: a.label }))}
        value={atual?.key ?? ''}
        onChange={setAbaAtiva}
      />

      {/* View da Aba Ativa */}
      {atual ? (
        <atual.Componente />
      ) : (
        <p className="text-sm text-muted-foreground">Sem permissão para nenhuma área deste cemitério.</p>
      )}
    </div>
  );
};

/** Shell do módulo de Gestão de Cemitérios (SIGCM): triagem inicial, switcher e abas internas com isolamento de contexto. */
export const CemiteriosModule: React.FC<CemiteriosModuleProps> = (props) => {
  const contextExistente = useContext(CemiteriosContext);
  if (contextExistente) {
    return <CemiteriosModuleConteudo />;
  }

  return (
    <CemiteriosNavigationProvider {...props}>
      <CemiteriosModuleConteudo />
    </CemiteriosNavigationProvider>
  );
};

export default CemiteriosModule;
