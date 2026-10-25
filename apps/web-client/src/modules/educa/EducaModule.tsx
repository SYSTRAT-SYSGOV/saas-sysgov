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
  Loader2,
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

            {temSecretaria && (
              <TabsTrigger
                value="secretaria"
                className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-800 data-[state=active]:border-b-2 data-[state=active]:border-blue-700 text-xs py-2.5 px-3 rounded-none font-medium flex items-center gap-1.5"
              >
                <UserCheck className="w-3.5 h-3.5" />
                Secretaria
              </TabsTrigger>
            )}

            {temPedagogico && (
              <TabsTrigger
                value="pedagogico"
                className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-800 data-[state=active]:border-b-2 data-[state=active]:border-blue-700 text-xs py-2.5 px-3 rounded-none font-medium flex items-center gap-1.5"
              >
                <BookOpen className="w-3.5 h-3.5" />
                Pedagógico & Diário
              </TabsTrigger>
            )}

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
          </TabsList>
        </div>

        {/* Painéis */}
        <TabsContent value="core" className="mt-0 focus-visible:outline-hidden">
          <Suspense fallback={<TabLoadingFallback />}>
            <CoreView />
          </Suspense>
        </TabsContent>

        {temSecretaria && (
          <TabsContent value="secretaria" className="mt-0 focus-visible:outline-hidden">
            <Suspense fallback={<TabLoadingFallback />}>
              <SecretariaView />
            </Suspense>
          </TabsContent>
        )}

        {temPedagogico && (
          <TabsContent value="pedagogico" className="mt-0 focus-visible:outline-hidden">
            <Suspense fallback={<TabLoadingFallback />}>
              <PedagogicoView />
            </Suspense>
          </TabsContent>
        )}

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
