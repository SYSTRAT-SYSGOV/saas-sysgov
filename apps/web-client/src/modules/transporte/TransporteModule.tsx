import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Building2, FileSpreadsheet, History, LayoutDashboard, MapPin, Route, Truck, UserRound } from 'lucide-react';
import { Card, CardContent, Tabs, TabsContent, TabsList, TabsTrigger } from '@sysgov/ui';
import { Avisos, useAvisos } from '../escola/components/Avisos';
import { EstadoCarga } from '../escola/components/AdminModal';
import { useCarga } from '../escola/useCarga';
import { transporteApi } from './api';
import { Empresas } from './components/Empresas';
import { Censo } from './components/Censo';
import { Motoristas } from './components/Motoristas';
import { Painel } from './components/Painel';
import { Paradas } from './components/Paradas';
import { Rotas } from './components/Rotas';
import { Veiculos } from './components/Veiculos';
import { AuditoriaTransporte } from './components/Auditoria';

type Aba = 'visao' | 'censo' | 'rotas' | 'paradas' | 'empresas' | 'motoristas' | 'veiculos' | 'auditoria';

/** Módulo Transporte Escolar (Fases 1 a 4): painel, rotas com itinerário, mapa e alunos, paradas, frota, Censo e auditoria. */
export const TransporteModule: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const { avisos, avisar } = useAvisos();
  const opcoes = useCarga(() => transporteApi.opcoes(), []);

  if (!opcoes.dados) {
    return <div className="p-4"><EstadoCarga carregando={opcoes.carregando} erro={opcoes.erro} onTentar={() => void opcoes.recarregar()} /></div>;
  }
  const o = opcoes.dados;
  const recarregar = () => { void opcoes.recarregar(); };

  const abas: { id: Aba; rotulo: string; icone: React.ElementType; visivel: boolean }[] = [
    { id: 'visao', rotulo: 'Painel', icone: LayoutDashboard, visivel: true },
    { id: 'rotas', rotulo: 'Rotas', icone: Route, visivel: true },
    { id: 'paradas', rotulo: 'Paradas', icone: MapPin, visivel: true },
    { id: 'veiculos', rotulo: 'Veículos', icone: Truck, visivel: true },
    { id: 'motoristas', rotulo: 'Motoristas', icone: UserRound, visivel: true },
    { id: 'empresas', rotulo: 'Empresas', icone: Building2, visivel: true },
    { id: 'censo', rotulo: 'Censo', icone: FileSpreadsheet, visivel: o.permissoes.exportar_censo },
    { id: 'auditoria', rotulo: 'Auditoria', icone: History, visivel: o.permissoes.auditar },
  ];
  const visiveis = abas.filter((a) => a.visivel);
  const pedida = params.get('aba');
  const aba = (visiveis.some((a) => a.id === pedida) ? pedida : 'visao') as Aba;

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardContent className="p-4">
          <h1 className="text-xl font-bold text-gov-text-primary">Transporte Escolar</h1>
          <p className="text-sm text-muted-foreground">Frota, motoristas, empresas, rotas, alunos transportados e Censo, com alertas de documentos vencidos.</p>
        </CardContent>
      </Card>

      <Tabs value={aba} onValueChange={(v) => setParams({ aba: v })}>
        <TabsList>
          {visiveis.map((a) => (
            <TabsTrigger key={a.id} value={a.id}><a.icone className="mr-1.5 h-4 w-4" />{a.rotulo}</TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="visao"><Painel opcoes={o} /></TabsContent>
        {o.permissoes.exportar_censo && <TabsContent value="censo"><Censo opcoes={o} avisar={avisar} /></TabsContent>}
        <TabsContent value="rotas"><Rotas opcoes={o} avisar={avisar} /></TabsContent>
        <TabsContent value="paradas"><Paradas opcoes={o} avisar={avisar} /></TabsContent>
        <TabsContent value="veiculos"><Veiculos opcoes={o} avisar={avisar} aoMudar={recarregar} /></TabsContent>
        <TabsContent value="motoristas"><Motoristas opcoes={o} avisar={avisar} aoMudar={recarregar} /></TabsContent>
        <TabsContent value="empresas"><Empresas opcoes={o} avisar={avisar} aoMudar={recarregar} /></TabsContent>
        {o.permissoes.auditar && <TabsContent value="auditoria"><AuditoriaTransporte /></TabsContent>}
      </Tabs>
      <Avisos avisos={avisos} />
    </div>
  );
};

export default TransporteModule;
