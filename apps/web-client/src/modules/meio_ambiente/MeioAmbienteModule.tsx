import React from 'react';
import { Leaf } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@sysgov/ui';

/**
 * Skeleton da Fase 1 do módulo de Meio Ambiente — as abas de cada capacidade
 * (Empreendimentos, Licenciamento, Fiscalização Ambiental, Compensação, Resíduos
 * Sólidos, Áreas Protegidas, Queimadas, Recursos Hídricos, Relatórios/Indicadores,
 * Integrações, Auditoria) são adicionadas incrementalmente a partir da Fase 2.
 * Ver openspec/changes/criar-modulo-meio-ambiente/tasks.md.
 */
export const MeioAmbienteModule: React.FC = () => (
  <div className="p-6">
    <PageHeader
      icon={<Leaf className="h-6 w-6" />}
      title="Meio Ambiente"
      subtitle="Licenciamento, fiscalização, compensação ambiental, resíduos sólidos, áreas protegidas, queimadas e recursos hídricos"
    />

    <div className="mt-6">
      <Card className="p-6 text-sm text-muted-foreground">
        Módulo em implantação. As telas de cada capacidade serão habilitadas progressivamente.
      </Card>
    </div>
  </div>
);

export default MeioAmbienteModule;
