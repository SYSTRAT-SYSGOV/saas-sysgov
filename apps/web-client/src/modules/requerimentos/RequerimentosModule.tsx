import React, { useEffect, useState } from 'react';
import { Tabs } from '@/components/ui/Tabs';
import type { TabsItem } from '@/components/ui/Tabs';
import { PageHeader } from '@/components/ui/PageHeader';
import { requerimentosApi } from './api';
import { FileText, Bell, ArrowLeftRight, BarChart3 } from 'lucide-react';
import { ProposicoesView } from './views/ProposicoesView';
import { MinhasProposicoesView } from './views/MinhasProposicoesView';
import { TramitacoesView } from './views/TramitacoesView';
import { NotificacoesView } from './views/NotificacoesView';
import { RelatoriosView } from './views/RelatoriosView';

type RequerimentosTab = 'proposicoes' | 'minhas' | 'tramitacoes' | 'notificacoes' | 'relatorios';

export const RequerimentosModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<RequerimentosTab>('proposicoes');
  const [naoLidas, setNaoLidas] = useState(0);

  useEffect(() => {
    requerimentosApi.getNotificacoes({ nao_lidas: true, per_page: 1 })
      .then((res) => setNaoLidas(res.data.total))
      .catch(() => {});
  }, []);

  const tabs: TabsItem<RequerimentosTab>[] = [
    { key: 'proposicoes',   label: 'Proposições',          icon: <FileText className="h-4 w-4" /> },
    { key: 'minhas',        label: 'Minhas Proposições',   icon: <FileText className="h-4 w-4" /> },
    { key: 'tramitacoes',   label: 'Tramitações',          icon: <ArrowLeftRight className="h-4 w-4" /> },
    {
      key: 'notificacoes',
      label: 'Notificações',
      icon: <Bell className="h-4 w-4" />,
      badge: naoLidas > 0 ? naoLidas : undefined,
    },
    { key: 'relatorios',    label: 'Relatórios',           icon: <BarChart3 className="h-4 w-4" /> },
  ];

  return (
    <div className="p-6">
      <PageHeader
        icon={<FileText className="h-6 w-6" />}
        title="Módulo de Requerimentos"
        subtitle="Digitalização do fluxo de tramitação de proposições legislativas entre os Poderes"
      />

      <div className="mt-6">
        <Tabs items={tabs} value={activeTab} onChange={setActiveTab} />

        <div className="mt-6">
          {activeTab === 'proposicoes' && <ProposicoesView />}
          {activeTab === 'minhas' && <MinhasProposicoesView />}
          {activeTab === 'tramitacoes' && <TramitacoesView />}
          {activeTab === 'notificacoes' && <NotificacoesView />}
          {activeTab === 'relatorios' && <RelatoriosView />}
        </div>
      </div>
    </div>
  );
};

export default RequerimentosModule;