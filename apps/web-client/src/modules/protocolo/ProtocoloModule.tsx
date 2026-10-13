import React, { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs } from '@/components/ui/Tabs';
import type { TabsItem } from '@/components/ui/Tabs';
import { FolderOpen, BarChart3, Settings2, Plus, ArrowUpRight } from 'lucide-react';
import { ProcessosListView } from './views/ProcessosListView';
import { DashboardView } from './views/DashboardView';
import { TiposTramitacaoView } from './views/TiposTramitacaoView';
import { NovoProcessoWizardModal } from './views/NovoProcessoWizardModal';
import { PromoverRequerimentoModal } from './views/PromoverRequerimentoModal';
import { ProcessoDetailModal } from './views/ProcessoDetailModal';
import type { ProtocoloSdk } from '@sysgov/sdk';

type ProtocoloTab = 'processos' | 'dashboard' | 'tipos';

export const ProtocoloModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ProtocoloTab>('processos');

  // Modais
  const [wizardOpen, setWizardOpen] = useState(false);
  const [promoverOpen, setPromoverOpen] = useState(false);
  const [detalheProcessoId, setDetalheProcessoId] = useState<number | null>(null);

  const tabs: TabsItem<ProtocoloTab>[] = [
    {
      key: 'processos',
      label: 'Processos Administrativos',
      icon: <FolderOpen className="h-4 w-4" />,
    },
    {
      key: 'dashboard',
      label: 'Dashboard & Indicadores',
      icon: <BarChart3 className="h-4 w-4" />,
    },
    {
      key: 'tipos',
      label: 'Tipos de Tramitação',
      icon: <Settings2 className="h-4 w-4" />,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        icon={<FolderOpen className="h-6 w-6 text-gov-primary" />}
        title="Protocolo & Processos Administrativos"
        subtitle="Autuação digital, tramitação entre secretarias, controle de prazos regimentais e histórico imutável"
      />

      <div>
        <Tabs items={tabs} value={activeTab} onChange={setActiveTab} />

        <div className="mt-6">
          {activeTab === 'processos' && (
            <ProcessosListView
              onVerDetalhes={(id) => setDetalheProcessoId(id)}
              onNovoProcesso={() => setWizardOpen(true)}
              onPromoverRequerimento={() => setPromoverOpen(true)}
            />
          )}

          {activeTab === 'dashboard' && <DashboardView />}

          {activeTab === 'tipos' && <TiposTramitacaoView />}
        </div>
      </div>

      {/* Modais Globais do Módulo */}
      <NovoProcessoWizardModal
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSuccess={(novo) => {
          setDetalheProcessoId(novo.id);
        }}
      />

      <PromoverRequerimentoModal
        open={promoverOpen}
        onClose={() => setPromoverOpen(false)}
        onSuccess={(novo) => {
          setDetalheProcessoId(novo.id);
        }}
      />

      <ProcessoDetailModal
        open={detalheProcessoId !== null}
        processoId={detalheProcessoId}
        onClose={() => setDetalheProcessoId(null)}
      />
    </div>
  );
};

export default ProtocoloModule;
