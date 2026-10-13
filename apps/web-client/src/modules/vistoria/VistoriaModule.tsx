import React, { useState } from 'react';
import { Tabs } from '@/components/ui/Tabs';
import type { TabsItem } from '@/components/ui/Tabs';
import { PageHeader } from '@/components/ui/PageHeader';
import { ClipboardCheck, ClipboardList, LayoutDashboard, MapPin, Smartphone } from 'lucide-react';
import { LocaisFiscalizaveisView } from './views/LocaisFiscalizaveisView';
import { OrdensServicoView } from './views/OrdensServicoView';
import { CampoHomeView } from './campo/CampoHomeView';
import { PainelGerencialView } from './painel/PainelGerencialView';

type VistoriaTab = 'locais' | 'ordens-servico' | 'campo' | 'painel';

export const VistoriaModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<VistoriaTab>('locais');

  const tabs: TabsItem<VistoriaTab>[] = [
    { key: 'locais', label: 'Locais Fiscalizáveis', icon: <MapPin className="h-4 w-4" /> },
    { key: 'ordens-servico', label: 'Ordens de Serviço', icon: <ClipboardList className="h-4 w-4" /> },
    { key: 'campo', label: 'Campo (Offline)', icon: <Smartphone className="h-4 w-4" /> },
    { key: 'painel', label: 'Painel Gerencial', icon: <LayoutDashboard className="h-4 w-4" /> },
  ];

  return (
    <div className="p-6">
      <PageHeader
        icon={<ClipboardCheck className="h-6 w-6" />}
        title="Vistoria e Inspeção"
        subtitle="Planejamento e cadastro da fiscalização de campo da Secretaria de Agricultura"
      />
      <div className="mt-6">
        <Tabs items={tabs} value={activeTab} onChange={setActiveTab} />
        <div className="mt-6">
          {activeTab === 'locais' && <LocaisFiscalizaveisView />}
          {activeTab === 'ordens-servico' && <OrdensServicoView />}
          {activeTab === 'campo' && <CampoHomeView />}
          {activeTab === 'painel' && <PainelGerencialView />}
        </div>
      </div>
    </div>
  );
};

export default VistoriaModule;
