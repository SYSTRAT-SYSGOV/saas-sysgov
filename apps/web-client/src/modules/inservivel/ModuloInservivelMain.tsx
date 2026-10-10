import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeftRight, Building2, ClipboardCheck, LayoutDashboard, Package, Settings, SlidersHorizontal, Ticket } from 'lucide-react';
import { Card, CardContent, Tabs, TabsContent, TabsList, TabsTrigger } from '@sysgov/ui';
import { useCan } from '@/core/rbac/useCan';
import { Avisos, useAvisos } from '../escola/components/Avisos';
import type { Toast } from '../escola/components/AdminModal';
import { DashboardInservivel } from './components/DashboardInservivel';
import { BensInserviveis } from './components/BensInserviveis';
import { LotesSorteio } from './components/LotesSorteio';
import { EntidadesInservivel } from './components/EntidadesInservivel';
import { TransferenciaInterna } from './components/TransferenciaInterna';
import { SolicitacoesTransferencia } from './components/SolicitacoesTransferencia';
import { ParametrosInservivel } from './components/ParametrosInservivel';
import { ConfiguracoesInservivel } from './components/ConfiguracoesInservivel';
import { PortalEntidade } from './portal/PortalEntidade';

export type Aba = 'dashboard' | 'bens' | 'lotes' | 'entidades' | 'transferencias' | 'solicitacoes' | 'parametros' | 'configuracoes';

export interface Permissoes {
  ver: boolean; bens: boolean; lotes: boolean; lotesGestao: boolean; entidades: boolean;
  transferencias: boolean; aprovar: boolean; configuracao: boolean; portal: boolean;
}

/** Props das abas (permissões são conveniência — a regra é do servidor). */
export interface PropsAba {
  permissoes: Permissoes;
  avisar: Toast;
  /** Abre outra aba, com um parâmetro opcional (ex.: a ficha de uma entidade). */
  irPara: (aba: Aba, parametro?: Record<string, string>) => void;
  parametro: (chave: string) => string | null;
  limparParametro: (chave: string) => void;
}

const ABAS: { id: Aba; rotulo: string; icone: React.ElementType; visivel: (p: Permissoes) => boolean }[] = [
  { id: 'dashboard', rotulo: 'Dashboard', icone: LayoutDashboard, visivel: (p) => p.ver },
  { id: 'bens', rotulo: 'Bens Inservíveis', icone: Package, visivel: (p) => p.ver },
  { id: 'lotes', rotulo: 'Lotes e Sorteio', icone: Ticket, visivel: (p) => p.lotes || p.lotesGestao },
  { id: 'entidades', rotulo: 'Entidades', icone: Building2, visivel: (p) => p.entidades },
  { id: 'transferencias', rotulo: 'Transferência Interna', icone: ArrowLeftRight, visivel: (p) => p.transferencias || p.aprovar },
  { id: 'solicitacoes', rotulo: 'Solicitações (Aprovar)', icone: ClipboardCheck, visivel: (p) => p.aprovar },
  { id: 'parametros', rotulo: 'Parâmetros', icone: SlidersHorizontal, visivel: (p) => p.configuracao },
  { id: 'configuracoes', rotulo: 'Configurações', icone: Settings, visivel: (p) => p.configuracao },
];

/** Abas que o usuário vê (a regra é do servidor; aqui só se escondem atalhos). */
export function abasVisiveis(permissoes: Permissoes): typeof ABAS {
  return ABAS.filter((a) => a.visivel(permissoes));
}

/** Inservível & Doações: área interna por abas; quem só tem o perfil Entidade vê o Portal da Entidade (design D14). */
export const ModuloInservivelMain: React.FC = () => {
  const { can } = useCan();
  const [params, setParams] = useSearchParams();
  const { avisos, avisar } = useAvisos();

  const permissoes: Permissoes = {
    ver: can('inservivel.view'),
    bens: can('inservivel.bens.manage'),
    lotes: can('inservivel.lotes.manage'),
    lotesGestao: can('inservivel.lotes.gestao'),
    entidades: can('inservivel.entidades.manage'),
    transferencias: can('inservivel.transferencias.manage'),
    aprovar: can('inservivel.transferencias.aprovar'),
    configuracao: can('inservivel.configuracao.manage'),
    portal: can('inservivel.portal'),
  };

  if (!permissoes.ver && permissoes.portal) {
    return (
      <div className="space-y-4 p-4">
        <PortalEntidade avisar={avisar} />
        <Avisos avisos={avisos} />
      </div>
    );
  }

  const abas = abasVisiveis(permissoes);
  const pedida = params.get('aba');
  const aba = (abas.some((a) => a.id === pedida) ? pedida : abas[0]?.id ?? 'dashboard') as Aba;

  const props: PropsAba = {
    permissoes,
    avisar,
    irPara: (destino, extra) => {
      const novos = new URLSearchParams({ aba: destino, ...(extra ?? {}) });
      setParams(novos);
    },
    parametro: (chave) => params.get(chave),
    limparParametro: (chave) => {
      const novos = new URLSearchParams(params);
      novos.delete(chave);
      setParams(novos, { replace: true });
    },
  };

  const conteudo = (id: Aba): React.ReactNode => {
    switch (id) {
      case 'dashboard': return <DashboardInservivel {...props} />;
      case 'bens': return <BensInserviveis {...props} />;
      case 'lotes': return <LotesSorteio {...props} />;
      case 'entidades': return <EntidadesInservivel {...props} />;
      case 'transferencias': return <TransferenciaInterna {...props} />;
      case 'solicitacoes': return <SolicitacoesTransferencia {...props} />;
      case 'parametros': return <ParametrosInservivel {...props} />;
      case 'configuracoes': return <ConfiguracoesInservivel {...props} />;
      default: return null;
    }
  };

  return (
    <div className="space-y-4 p-4">
      <Card className="print:hidden">
        <CardContent className="py-4">
          <h1 className="text-lg font-bold text-foreground">Inservível &amp; Doações</h1>
          <p className="text-sm text-muted-foreground">Bens inservíveis, lotes e sorteio para entidades sem fins lucrativos e transferência interna entre secretarias.</p>
        </CardContent>
      </Card>

      <Tabs value={aba} onValueChange={(v) => setParams(new URLSearchParams({ aba: v }), { replace: true })}>
        <TabsList className="print:hidden">
          {abas.map(({ id, rotulo, icone: Icone }) => (
            <TabsTrigger key={id} value={id}><Icone />{rotulo}</TabsTrigger>
          ))}
        </TabsList>
        {abas.map(({ id }) => (
          <TabsContent key={id} value={id}>{aba === id ? conteudo(id) : null}</TabsContent>
        ))}
      </Tabs>
      <Avisos avisos={avisos} />
    </div>
  );
};

export default ModuloInservivelMain;
