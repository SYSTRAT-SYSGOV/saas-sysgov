import React, { useState, Suspense } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent, Card, CardContent } from '@sysgov/ui';
import {
  GraduationCap,
  Calendar,
  Users,
  BookOpen,
  UserCheck,
  ShieldCheck,
  Bus,
  MessageSquare,
  Clock,
  UtensilsCrossed,
  Loader2,
  UserPlus,
  Accessibility,
  ClipboardList,
} from 'lucide-react';
import { useCan } from '@/core/rbac/useCan';
import { EducaProvider } from './context/EducaContext';
import { EducaHeader } from './components/EducaHeader';

// Lazy loading das Views
const CoreView = React.lazy(() =>
  import('./views/CoreView').then((m) => ({ default: m.CoreView }))
);
const SecretariaView = React.lazy(() =>
  import('./views/SecretariaView').then((m) => ({ default: m.SecretariaView }))
);
const GestaoVagasView = React.lazy(() =>
  import('./views/GestaoVagasView').then((m) => ({ default: m.GestaoVagasView }))
);
const EducacaoEspecialAeeView = React.lazy(() =>
  import('./views/EducacaoEspecialAeeView').then((m) => ({ default: m.EducacaoEspecialAeeView }))
);
const ConselhoClasseView = React.lazy(() =>
  import('./views/ConselhoClasseView').then((m) => ({ default: m.ConselhoClasseView }))
);
const PedagogicoView = React.lazy(() =>
  import('./views/PedagogicoView').then((m) => ({ default: m.PedagogicoView }))
);
const ServidoresView = React.lazy(() =>
  import('./views/ServidoresView').then((m) => ({ default: m.ServidoresView }))
);
const EducacensoView = React.lazy(() =>
  import('./views/EducacensoView').then((m) => ({ default: m.EducacensoView }))
);
const TransporteView = React.lazy(() =>
  import('./views/TransporteView').then((m) => ({ default: m.TransporteView }))
);
const ComunicacaoView = React.lazy(() =>
  import('./views/ComunicacaoView').then((m) => ({ default: m.ComunicacaoView }))
);
const QuadroHorarioView = React.lazy(() =>
  import('./views/QuadroHorarioView').then((m) => ({ default: m.QuadroHorarioView }))
);
const AlimentacaoEscolarView = React.lazy(() =>
  import('./views/AlimentacaoEscolarView').then((m) => ({ default: m.AlimentacaoEscolarView }))
);


const TabLoadingFallback: React.FC = () => (
  <div className="flex flex-col items-center justify-center p-12 text-center">
    <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
    <span className="text-xs font-mono text-gov-text-muted">Carregando submódulo educacional...</span>
  </div>
);

export const EducaModuleContent: React.FC = () => {
  const { hasModule } = useCan();
  const [tabAtiva, setTabAtiva] = useState<string>('core');

  // Checa licenças dos submódulos conforme module-access
  const temSecretaria = hasModule('educa-secretaria');
  const temPedagogico = hasModule('educa-pedagogico');
  const temServidores = hasModule('educa-servidores');
  const temEducacenso = hasModule('educa-educacenso');
  const temTransporte = hasModule('educa-transporte');
  const temComunicacao = hasModule('educa-comunicacao');
  const temMerenda = hasModule('educa-merenda');

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Cabeçalho de Contexto e Seletores */}
      <EducaHeader />

      {/* Navegação de Abas do Módulo */}
      <Tabs value={tabAtiva} onValueChange={setTabAtiva} className="w-full space-y-6">
        <div className="border-b border-gov-border bg-white rounded-t-lg px-2 pt-2">
          <TabsList className="bg-transparent flex flex-wrap gap-1 border-none p-0">
            <TabsTrigger
              value="core"
              className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-800 data-[state=active]:border-b-2 data-[state=active]:border-blue-700 text-xs py-2.5 px-3 rounded-none font-medium flex items-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5" />
              Gestão Acadêmica
            </TabsTrigger>

            <TabsTrigger
              value="quadro"
              className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-800 data-[state=active]:border-b-2 data-[state=active]:border-blue-700 text-xs py-2.5 px-3 rounded-none font-medium flex items-center gap-1.5"
            >
              <Clock className="w-3.5 h-3.5" />
              Quadro de Horários
            </TabsTrigger>

            {temSecretaria && (
              <TabsTrigger
                value="secretaria"
                className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-800 data-[state=active]:border-b-2 data-[state=active]:border-blue-700 text-xs py-2.5 px-3 rounded-none font-medium flex items-center gap-1.5"
              >
                <UserCheck className="w-3.5 h-3.5" />
                Secretaria
              </TabsTrigger>
            )}

            {temSecretaria && (
              <TabsTrigger
                value="vagas"
                className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-800 data-[state=active]:border-b-2 data-[state=active]:border-blue-700 text-xs py-2.5 px-3 rounded-none font-medium flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Gestão de Vagas
              </TabsTrigger>
            )}

            <TabsTrigger
              value="aee"
              className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-800 data-[state=active]:border-b-2 data-[state=active]:border-blue-700 text-xs py-2.5 px-3 rounded-none font-medium flex items-center gap-1.5"
            >
              <Accessibility className="w-3.5 h-3.5" />
              Educação Especial (AEE)
            </TabsTrigger>

            {temPedagogico && (
              <TabsTrigger
                value="pedagogico"
                className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-800 data-[state=active]:border-b-2 data-[state=active]:border-blue-700 text-xs py-2.5 px-3 rounded-none font-medium flex items-center gap-1.5"
              >
                <BookOpen className="w-3.5 h-3.5" />
                Pedagógico & Diário
              </TabsTrigger>
            )}

            <TabsTrigger
              value="conselho"
              className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-800 data-[state=active]:border-b-2 data-[state=active]:border-blue-700 text-xs py-2.5 px-3 rounded-none font-medium flex items-center gap-1.5"
            >
              <ClipboardList className="w-3.5 h-3.5" />
              Conselho de Classe
            </TabsTrigger>

            {temServidores && (
              <TabsTrigger
                value="servidores"
                className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-800 data-[state=active]:border-b-2 data-[state=active]:border-blue-700 text-xs py-2.5 px-3 rounded-none font-medium flex items-center gap-1.5"
              >
                <Users className="w-3.5 h-3.5" />
                Docentes & Piso
              </TabsTrigger>
            )}

            {temEducacenso && (
              <TabsTrigger
                value="educacenso"
                className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-800 data-[state=active]:border-b-2 data-[state=active]:border-blue-700 text-xs py-2.5 px-3 rounded-none font-medium flex items-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Educacenso (INEP)
              </TabsTrigger>
            )}

            {temTransporte && (
              <TabsTrigger
                value="transporte"
                className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-800 data-[state=active]:border-b-2 data-[state=active]:border-blue-700 text-xs py-2.5 px-3 rounded-none font-medium flex items-center gap-1.5"
              >
                <Bus className="w-3.5 h-3.5" />
                Transporte
              </TabsTrigger>
            )}

            {temComunicacao && (
              <TabsTrigger
                value="comunicacao"
                className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-800 data-[state=active]:border-b-2 data-[state=active]:border-blue-700 text-xs py-2.5 px-3 rounded-none font-medium flex items-center gap-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Comunicação
              </TabsTrigger>
            )}

            {temMerenda && (
              <TabsTrigger
                value="merenda"
                className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-800 data-[state=active]:border-b-2 data-[state=active]:border-blue-700 text-xs py-2.5 px-3 rounded-none font-medium flex items-center gap-1.5"
              >
                <UtensilsCrossed className="w-3.5 h-3.5" />
                Alimentação Escolar (PNAE)
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        {/* Painéis */}
        <TabsContent value="core" className="mt-0 focus-visible:outline-hidden">
          <Suspense fallback={<TabLoadingFallback />}>
            <CoreView />
          </Suspense>
        </TabsContent>

        <TabsContent value="quadro" className="mt-0 focus-visible:outline-hidden">
          <Suspense fallback={<TabLoadingFallback />}>
            <QuadroHorarioView />
          </Suspense>
        </TabsContent>

        {temSecretaria && (
          <TabsContent value="secretaria" className="mt-0 focus-visible:outline-hidden">
            <Suspense fallback={<TabLoadingFallback />}>
              <SecretariaView />
            </Suspense>
          </TabsContent>
        )}

        {temSecretaria && (
          <TabsContent value="vagas" className="mt-0 focus-visible:outline-hidden">
            <Suspense fallback={<TabLoadingFallback />}>
              <GestaoVagasView />
            </Suspense>
          </TabsContent>
        )}

        <TabsContent value="aee" className="mt-0 focus-visible:outline-hidden">
          <Suspense fallback={<TabLoadingFallback />}>
            <EducacaoEspecialAeeView />
          </Suspense>
        </TabsContent>

        {temPedagogico && (
          <TabsContent value="pedagogico" className="mt-0 focus-visible:outline-hidden">
            <Suspense fallback={<TabLoadingFallback />}>
              <PedagogicoView />
            </Suspense>
          </TabsContent>
        )}

        <TabsContent value="conselho" className="mt-0 focus-visible:outline-hidden">
          <Suspense fallback={<TabLoadingFallback />}>
            <ConselhoClasseView />
          </Suspense>
        </TabsContent>

        {temServidores && (
          <TabsContent value="servidores" className="mt-0 focus-visible:outline-hidden">
            <Suspense fallback={<TabLoadingFallback />}>
              <ServidoresView />
            </Suspense>
          </TabsContent>
        )}

        {temEducacenso && (
          <TabsContent value="educacenso" className="mt-0 focus-visible:outline-hidden">
            <Suspense fallback={<TabLoadingFallback />}>
              <EducacensoView />
            </Suspense>
          </TabsContent>
        )}

        {temTransporte && (
          <TabsContent value="transporte" className="mt-0 focus-visible:outline-hidden">
            <Suspense fallback={<TabLoadingFallback />}>
              <TransporteView />
            </Suspense>
          </TabsContent>
        )}

        {temComunicacao && (
          <TabsContent value="comunicacao" className="mt-0 focus-visible:outline-hidden">
            <Suspense fallback={<TabLoadingFallback />}>
              <ComunicacaoView />
            </Suspense>
          </TabsContent>
        )}

        {temMerenda && (
          <TabsContent value="merenda" className="mt-0 focus-visible:outline-hidden">
            <Suspense fallback={<TabLoadingFallback />}>
              <AlimentacaoEscolarView />
            </Suspense>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export const EducaModule: React.FC = () => {
  return (
    <EducaProvider>
      <EducaModuleContent />
    </EducaProvider>
  );
};

export default EducaModule;
