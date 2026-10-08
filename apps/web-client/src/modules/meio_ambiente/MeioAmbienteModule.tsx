import React from 'react';
import { Leaf } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmpreendimentosView } from './views/EmpreendimentosView';

/**
 * As abas das demais capacidades (Licenciamento, Fiscalização Ambiental,
 * Compensação, Resíduos Sólidos, Áreas Protegidas, Queimadas, Recursos
 * Hídricos, Relatórios/Indicadores, Integrações, Auditoria) são adicionadas
 * incrementalmente a partir da Fase 3. Ver
 * openspec/changes/criar-modulo-meio-ambiente/tasks.md.
 */
export const MeioAmbienteModule: React.FC = () => (
  <div className="p-6">
    <PageHeader
      icon={<Leaf className="h-6 w-6" />}
      title="Meio Ambiente"
      subtitle="Licenciamento, fiscalização, compensação ambiental, resíduos sólidos, áreas protegidas, queimadas e recursos hídricos"
    />

    <div className="mt-6">
      <EmpreendimentosView />
    </div>
  </div>
);

export default MeioAmbienteModule;
