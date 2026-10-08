import React, { useState } from 'react';
import { Leaf, FileCheck, Building2, Gavel, Landmark } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs } from '@/components/ui/Tabs';
import type { TabsItem } from '@/components/ui/Tabs';
import { EmpreendimentosView } from './views/EmpreendimentosView';
import { LicenciamentoView } from './views/LicenciamentoView';
import { FiscalizacaoAmbientalView } from './views/FiscalizacaoAmbientalView';
import { CompensacaoAmbientalView } from './views/CompensacaoAmbientalView';

type MeioAmbienteTab = 'empreendimentos' | 'licenciamento' | 'fiscalizacao' | 'compensacao';

/**
 * As abas das demais capacidades (Resíduos Sólidos, Áreas Protegidas, Queimadas,
 * Recursos Hídricos, Relatórios/Indicadores, Integrações, Auditoria) são adicionadas
 * incrementalmente a partir da Fase 6. Ver
 * openspec/changes/criar-modulo-meio-ambiente/tasks.md.
 */
export const MeioAmbienteModule: React.FC = () => {
  const [aba, setAba] = useState<MeioAmbienteTab>('empreendimentos');

  const tabs: TabsItem<MeioAmbienteTab>[] = [
    { key: 'empreendimentos', label: 'Empreendimentos', icon: <Building2 className="h-4 w-4" /> },
    { key: 'licenciamento', label: 'Licenciamento', icon: <FileCheck className="h-4 w-4" /> },
    { key: 'fiscalizacao', label: 'Fiscalização Ambiental', icon: <Gavel className="h-4 w-4" /> },
    { key: 'compensacao', label: 'Compensação Ambiental', icon: <Landmark className="h-4 w-4" /> },
  ];

  return (
    <div className="p-6">
      <PageHeader
        icon={<Leaf className="h-6 w-6" />}
        title="Meio Ambiente"
        subtitle="Licenciamento, fiscalização, compensação ambiental, resíduos sólidos, áreas protegidas, queimadas e recursos hídricos"
      />

      <div className="mt-6">
        <Tabs items={tabs} value={aba} onChange={setAba} />

        <div className="mt-6">
          {aba === 'empreendimentos' && <EmpreendimentosView />}
          {aba === 'licenciamento' && <LicenciamentoView />}
          {aba === 'fiscalizacao' && <FiscalizacaoAmbientalView />}
          {aba === 'compensacao' && <CompensacaoAmbientalView />}
        </div>
      </div>
    </div>
  );
};

export default MeioAmbienteModule;
