import React, { useState } from 'react';
import { Tabs } from '@/components/ui/Tabs';
import type { TabsItem } from '@/components/ui/Tabs';
import { PageHeader } from '@/components/ui/PageHeader';
import { ClipboardCheck, MapPin } from 'lucide-react';
import { LocaisFiscalizaveisView } from './views/LocaisFiscalizaveisView';

type VistoriaTab = 'locais';

export const VistoriaModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<VistoriaTab>('locais');

  const tabs: TabsItem<VistoriaTab>[] = [
    { key: 'locais', label: 'Locais Fiscalizáveis', icon: <MapPin className="h-4 w-4" /> },
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
        </div>
      </div>
    </div>
  );
};

export default VistoriaModule;
