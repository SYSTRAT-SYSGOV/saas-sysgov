import React, { useState } from 'react';
import { Tabs, type TabsItem } from '@/components/ui';
import { RelatorioCapacitacaoView } from './RelatorioCapacitacaoView';
import { RelatorioCursosView } from './RelatorioCursosView';

type Visao = 'periodo' | 'capacitacao';

const VISOES: TabsItem<Visao>[] = [
  { key: 'periodo', label: 'Cursos por período' },
  { key: 'capacitacao', label: 'Capacitação por servidor' },
];

/** Aba Relatórios da `GestaoCursosPage` (D9): as duas visões — cursos por período e capacitação por servidor. */
export const RelatoriosTab: React.FC = () => {
  const [visao, setVisao] = useState<Visao>('periodo');

  return (
    <div className="space-y-4">
      <Tabs items={VISOES} value={visao} onChange={setVisao} />
      {visao === 'periodo' && <RelatorioCursosView />}
      {visao === 'capacitacao' && <RelatorioCapacitacaoView />}
    </div>
  );
};

export default RelatoriosTab;
