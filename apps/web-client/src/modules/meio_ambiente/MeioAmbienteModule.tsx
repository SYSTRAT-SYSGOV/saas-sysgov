import React, { useState } from 'react';
import { Leaf, FileCheck, Building2, Gavel, Landmark, Recycle, TreePine, Flame, Droplets, LayoutDashboard, FileBarChart, PlugZap, History } from 'lucide-react';
import { useCan } from '@/core/rbac/useCan';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs } from '@/components/ui/Tabs';
import type { TabsItem } from '@/components/ui/Tabs';
import { EmpreendimentosView } from './views/EmpreendimentosView';
import { LicenciamentoView } from './views/LicenciamentoView';
import { FiscalizacaoAmbientalView } from './views/FiscalizacaoAmbientalView';
import { CompensacaoAmbientalView } from './views/CompensacaoAmbientalView';
import { ResiduosSolidosView } from './views/ResiduosSolidosView';
import { AreasProtegidasView } from './views/AreasProtegidasView';
import { QueimadasView } from './views/QueimadasView';
import { RecursosHidricosView } from './views/RecursosHidricosView';
import { PainelIndicadoresView } from './views/PainelIndicadoresView';
import { RelatoriosAmbientaisView } from './views/RelatoriosAmbientaisView';
import { IntegracoesView } from './views/IntegracoesView';
import { AuditoriaView } from './views/AuditoriaView';

type MeioAmbienteTab =
  | 'empreendimentos'
  | 'licenciamento'
  | 'fiscalizacao'
  | 'compensacao'
  | 'residuos'
  | 'areas-protegidas'
  | 'queimadas'
  | 'recursos-hidricos'
  | 'painel'
  | 'relatorios'
  | 'integracoes'
  | 'auditoria';

export const MeioAmbienteModule: React.FC = () => {
  const [aba, setAba] = useState<MeioAmbienteTab>('empreendimentos');
  const { can } = useCan();
  // Só esconde as abas — o backend responde 403 sem `meio_ambiente.chefia` de qualquer forma.
  const ehChefia = can('meio_ambiente.chefia');
  const gereIntegracoes = can('meio_ambiente.integracoes.manage');
  const consultaAuditoria = can('meio_ambiente.auditoria.view');

  const tabs: TabsItem<MeioAmbienteTab>[] = [
    { key: 'empreendimentos', label: 'Empreendimentos', icon: <Building2 className="h-4 w-4" /> },
    { key: 'licenciamento', label: 'Licenciamento', icon: <FileCheck className="h-4 w-4" /> },
    { key: 'fiscalizacao', label: 'Fiscalização Ambiental', icon: <Gavel className="h-4 w-4" /> },
    { key: 'compensacao', label: 'Compensação Ambiental', icon: <Landmark className="h-4 w-4" /> },
    { key: 'residuos', label: 'Resíduos Sólidos', icon: <Recycle className="h-4 w-4" /> },
    { key: 'areas-protegidas', label: 'Áreas Protegidas', icon: <TreePine className="h-4 w-4" /> },
    { key: 'queimadas', label: 'Queimadas', icon: <Flame className="h-4 w-4" /> },
    { key: 'recursos-hidricos', label: 'Recursos Hídricos', icon: <Droplets className="h-4 w-4" /> },
    ...(ehChefia
      ? ([
          { key: 'painel', label: 'Painel de Indicadores', icon: <LayoutDashboard className="h-4 w-4" /> },
          { key: 'relatorios', label: 'Relatórios Obrigatórios', icon: <FileBarChart className="h-4 w-4" /> },
        ] satisfies TabsItem<MeioAmbienteTab>[])
      : []),
    ...(gereIntegracoes
      ? ([{ key: 'integracoes', label: 'Integrações', icon: <PlugZap className="h-4 w-4" /> }] satisfies TabsItem<MeioAmbienteTab>[])
      : []),
    ...(consultaAuditoria
      ? ([{ key: 'auditoria', label: 'Auditoria', icon: <History className="h-4 w-4" /> }] satisfies TabsItem<MeioAmbienteTab>[])
      : []),
  ];

  return (
    <div className="p-6">
      <PageHeader
        icon={<Leaf className="h-6 w-6" />}
        title="Meio Ambiente"
        subtitle="Licenciamento, fiscalização, compensação ambiental, resíduos sólidos, áreas protegidas, queimadas, recursos hídricos e indicadores"
      />

      <div className="mt-6">
        <Tabs items={tabs} value={aba} onChange={setAba} />

        <div className="mt-6">
          {aba === 'empreendimentos' && <EmpreendimentosView />}
          {aba === 'licenciamento' && <LicenciamentoView />}
          {aba === 'fiscalizacao' && <FiscalizacaoAmbientalView />}
          {aba === 'compensacao' && <CompensacaoAmbientalView />}
          {aba === 'residuos' && <ResiduosSolidosView />}
          {aba === 'areas-protegidas' && <AreasProtegidasView />}
          {aba === 'queimadas' && <QueimadasView />}
          {aba === 'recursos-hidricos' && <RecursosHidricosView />}
          {aba === 'painel' && ehChefia && <PainelIndicadoresView />}
          {aba === 'relatorios' && ehChefia && <RelatoriosAmbientaisView />}
          {aba === 'integracoes' && gereIntegracoes && <IntegracoesView />}
          {aba === 'auditoria' && consultaAuditoria && <AuditoriaView />}
        </div>
      </div>
    </div>
  );
};

export default MeioAmbienteModule;
