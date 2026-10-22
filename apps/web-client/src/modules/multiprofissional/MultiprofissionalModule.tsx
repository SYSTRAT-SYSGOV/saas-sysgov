import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarCheck, ClipboardList, History, HeartHandshake, Settings2, UserRound, Users } from 'lucide-react';
import { Card, CardContent, KpiCard, Tabs, TabsContent, TabsList, TabsTrigger } from '@sysgov/ui';
import { Avisos, useAvisos } from '../escola/components/Avisos';
import { EstadoCarga } from '../escola/components/AdminModal';
import { useCarga } from '../escola/useCarga';
import { multiApi } from './api';
import { Atendimentos } from './components/Atendimentos';
import { Acompanhados } from './components/Acompanhados';
import { Equipes } from './components/Equipes';
import { Profissionais } from './components/Profissionais';
import { Cadastros } from './components/Cadastros';
import { AuditoriaMulti } from './components/Auditoria';

type Aba = 'atendimentos' | 'acompanhados' | 'equipes' | 'profissionais' | 'cadastros' | 'auditoria';

/** Módulo Multiprofissional: indicadores, atendimentos, estudantes acompanhados, equipes, profissionais e cadastros. */
export const MultiprofissionalModule: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const { avisos, avisar } = useAvisos();
  const opcoes = useCarga(() => multiApi.opcoes(), []);
  const indicadores = useCarga(() => multiApi.indicadores(), []);

  if (!opcoes.dados) {
    return <div className="p-4"><EstadoCarga carregando={opcoes.carregando} erro={opcoes.erro} onTentar={() => void opcoes.recarregar()} /></div>;
  }
  const o = opcoes.dados;
  const recarregar = () => { void opcoes.recarregar(); void indicadores.recarregar(); };

  const abas: { id: Aba; rotulo: string; icone: React.ElementType; visivel: boolean }[] = [
    { id: 'atendimentos', rotulo: 'Atendimentos', icone: ClipboardList, visivel: true },
    { id: 'acompanhados', rotulo: 'Estudantes acompanhados', icone: HeartHandshake, visivel: true },
    { id: 'equipes', rotulo: 'Equipes', icone: Users, visivel: true },
    { id: 'profissionais', rotulo: 'Profissionais', icone: UserRound, visivel: true },
    { id: 'cadastros', rotulo: 'Cadastros', icone: Settings2, visivel: o.permissoes.gerenciar },
    { id: 'auditoria', rotulo: 'Auditoria', icone: History, visivel: o.permissoes.auditar },
  ];
  const visiveis = abas.filter((a) => a.visivel);
  const pedida = params.get('aba');
  const aba = (visiveis.some((a) => a.id === pedida) ? pedida : 'atendimentos') as Aba;
  const i = indicadores.dados;

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardContent className="p-4">
          <h1 className="text-xl font-bold text-gov-text-primary">Equipe Multiprofissional</h1>
          <p className="text-sm text-muted-foreground">Atendimentos da equipe multiprofissional às escolas da rede e acompanhamento dos estudantes.</p>
        </CardContent>
      </Card>

      {i && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard title="Atendimentos no mês" value={i.atendimentos_mes} icon={<CalendarCheck className="h-5 w-5" />} />
          <KpiCard title="Atendimentos no ano" value={i.atendimentos_ano} icon={<ClipboardList className="h-5 w-5" />} />
          <KpiCard title="Estudantes atendidos no mês" value={i.estudantes_atendidos_mes} icon={<UserRound className="h-5 w-5" />} />
          <KpiCard title="Acompanhamentos ativos" value={i.acompanhados_ativos} icon={<HeartHandshake className="h-5 w-5" />} />
        </div>
      )}

      <Tabs value={aba} onValueChange={(v) => setParams({ aba: v })}>
        <TabsList>
          {visiveis.map((a) => (
            <TabsTrigger key={a.id} value={a.id}><a.icone className="mr-1.5 h-4 w-4" />{a.rotulo}</TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="atendimentos"><Atendimentos opcoes={o} avisar={avisar} aoMudar={() => void indicadores.recarregar()} /></TabsContent>
        <TabsContent value="acompanhados"><Acompanhados opcoes={o} avisar={avisar} /></TabsContent>
        <TabsContent value="equipes"><Equipes opcoes={o} avisar={avisar} aoMudar={recarregar} /></TabsContent>
        <TabsContent value="profissionais"><Profissionais opcoes={o} avisar={avisar} aoMudar={recarregar} /></TabsContent>
        {o.permissoes.gerenciar && <TabsContent value="cadastros"><Cadastros avisar={avisar} aoMudar={recarregar} /></TabsContent>}
        {o.permissoes.auditar && <TabsContent value="auditoria"><AuditoriaMulti /></TabsContent>}
      </Tabs>
      <Avisos avisos={avisos} />
    </div>
  );
};

export default MultiprofissionalModule;
