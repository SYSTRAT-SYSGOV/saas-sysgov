import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BarChart3, CalendarDays, ClipboardList, Landmark, LayoutDashboard, MapPinned, Megaphone, Package, QrCode, Settings, UserCog, UserRound, Users, Wallet } from 'lucide-react';
import { AlertCard, Card, CardContent, Skeleton, Tabs, TabsContent, TabsList, TabsTrigger } from '@sysgov/ui';
import { useCan } from '@/core/rbac/useCan';
import { useCarga } from '../escola/useCarga';
import { Avisos, useAvisos } from '../escola/components/Avisos';
import type { Toast } from '../escola/components/AdminModal';
import { campanhaApi, type CampanhaAtual } from './api';
import type { ContextoCampanha } from './components/ComCampanha';
import { PainelCampanha } from './components/PainelCampanha';
import { MunicipiosCampanha } from './components/MunicipiosCampanha';
import { FichaMunicipioModal } from './components/FichaMunicipio';
import { CoordenadoresCampanha } from './components/CoordenadoresCampanha';
import { CabosCampanha } from './components/CabosCampanha';
import { PrefeitosCampanha } from './components/PrefeitosCampanha';
import { VereadoresCampanha } from './components/VereadoresCampanha';
import { ConfiguracaoCampanha } from './components/ConfiguracaoCampanha';
import { EleitoresCampanha } from './components/EleitoresCampanha';
import { CaptacaoCampanha } from './components/CaptacaoCampanha';
import { DemandasCampanha } from './components/DemandasCampanha';
import { MateriaisCampanha } from './components/MateriaisCampanha';
import { FinanceiroCampanha } from './components/FinanceiroCampanha';
import { AgendaCampanha } from './components/AgendaCampanha';
import { PesquisasCampanha } from './components/PesquisasCampanha';

export type Aba = 'painel' | 'municipios' | 'coordenadores' | 'cabos' | 'prefeitos' | 'vereadores' | 'eleitores' | 'captacao' | 'demandas' | 'agenda' | 'materiais' | 'financeiro' | 'pesquisas' | 'campanha';

export interface Permissoes {
  gestao: boolean; municipios: boolean; equipes: boolean; eleitoresVer: boolean; eleitoresGerir: boolean; demandas: boolean;
  materiais: boolean; financeiroVer: boolean; financeiroGerir: boolean; agenda: boolean; pesquisas: boolean;
}

/** Props das abas (permissões são conveniência — a regra é do servidor). */
export interface PropsAba {
  campanha: CampanhaAtual;
  recarregarCampanha: () => Promise<void>;
  avisar: Toast;
  permissoes: Permissoes;
  abrirMunicipio: (ibge: number) => void;
  /** Muda a cada alteração salva: quem mostra mapa/indicadores recarrega. */
  versao: number;
  alterou: () => void;
  contexto: ContextoCampanha;
}

const ABAS: { id: Aba; rotulo: string; icone: React.ElementType; visivel?: (p: Permissoes) => boolean }[] = [
  { id: 'painel', rotulo: 'Painel', icone: LayoutDashboard },
  { id: 'municipios', rotulo: 'Municípios', icone: MapPinned },
  { id: 'coordenadores', rotulo: 'Coordenadores', icone: UserCog },
  { id: 'cabos', rotulo: 'Cabos Eleitorais', icone: Megaphone },
  { id: 'prefeitos', rotulo: 'Prefeitos', icone: Landmark },
  { id: 'vereadores', rotulo: 'Vereadores', icone: Users },
  { id: 'eleitores', rotulo: 'Eleitores', icone: UserRound },
  { id: 'captacao', rotulo: 'Captação', icone: QrCode, visivel: (p) => p.eleitoresGerir },
  { id: 'demandas', rotulo: 'Demandas', icone: ClipboardList },
  { id: 'agenda', rotulo: 'Agenda', icone: CalendarDays },
  { id: 'materiais', rotulo: 'Materiais', icone: Package },
  { id: 'financeiro', rotulo: 'Financeiro', icone: Wallet, visivel: (p) => p.financeiroVer },
  { id: 'pesquisas', rotulo: 'Pesquisas', icone: BarChart3 },
  { id: 'campanha', rotulo: 'Campanha', icone: Settings },
];

/** Abas que o usuário vê (Captação e Financeiro dependem de permissão; a regra é do servidor). */
export function abasVisiveis(permissoes: Permissoes): typeof ABAS {
  return ABAS.filter((a) => !a.visivel || a.visivel(permissoes));
}

/** Campanha Política sobre a base pública do IBGE/TSE: tudo lido e gravado pela API (design D2, D6, D12). */
export const ModuloCampanhaMain: React.FC<{ contexto: ContextoCampanha }> = ({ contexto }) => {
  const { can } = useCan();
  const [parametros, setParametros] = useSearchParams();
  const { avisos, avisar } = useAvisos();
  const [versao, setVersao] = useState(0);
  const atual = useCarga(() => campanhaApi.atual(), [contexto.campanha.id]);
  const municipio = Number(parametros.get('municipio')) || null;

  const permissoes: Permissoes = {
    gestao: can('campanha.gestao.manage'),
    municipios: can('campanha.municipios.manage'),
    equipes: can('campanha.equipes.manage'),
    eleitoresVer: can('campanha.eleitores.view'),
    eleitoresGerir: can('campanha.eleitores.manage'),
    demandas: can('campanha.demandas.manage'),
    materiais: can('campanha.materiais.manage'),
    financeiroVer: can('campanha.financeiro.view'),
    financeiroGerir: can('campanha.financeiro.manage'),
    agenda: can('campanha.agenda.manage'),
    pesquisas: can('campanha.pesquisas.manage'),
  };
  const abas = abasVisiveis(permissoes);
  const aba = (abas.some((a) => a.id === parametros.get('aba')) ? parametros.get('aba') : 'painel') as Aba;

  const mudar = (chave: 'aba' | 'municipio', valor: string | null) => {
    const novos = new URLSearchParams(parametros);
    if (valor === null) novos.delete(chave);
    else novos.set(chave, valor);
    setParametros(novos, { replace: chave === 'aba' });
  };

  const conteudo = (id: Aba): React.ReactNode => {
    if (atual.erro) return <AlertCard priority="danger" title="Não foi possível carregar a campanha" description={atual.erro} actionLabel="Tentar novamente" onAction={() => void atual.recarregar()} />;
    if (!atual.dados) return <Skeleton className="h-96 w-full" />;
    const props: PropsAba = {
      campanha: atual.dados, recarregarCampanha: atual.recarregar, avisar, permissoes, versao, contexto,
      abrirMunicipio: (ibge) => mudar('municipio', String(ibge)),
      alterou: () => setVersao((v) => v + 1),
    };
    switch (id) {
      case 'painel': return <PainelCampanha {...props} />;
      case 'municipios': return <MunicipiosCampanha {...props} />;
      case 'coordenadores': return <CoordenadoresCampanha {...props} />;
      case 'cabos': return <CabosCampanha {...props} />;
      case 'prefeitos': return <PrefeitosCampanha {...props} />;
      case 'vereadores': return <VereadoresCampanha {...props} />;
      case 'eleitores': return <EleitoresCampanha {...props} />;
      case 'captacao': return <CaptacaoCampanha {...props} />;
      case 'demandas': return <DemandasCampanha {...props} />;
      case 'agenda': return <AgendaCampanha {...props} />;
      case 'materiais': return <MateriaisCampanha {...props} />;
      case 'financeiro': return <FinanceiroCampanha {...props} />;
      case 'pesquisas': return <PesquisasCampanha {...props} />;
      case 'campanha': return <ConfiguracaoCampanha {...props} />;
      default: return null;
    }
  };

  const c = atual.dados ?? contexto.campanha;

  return (
    <div className="space-y-4 p-4">
      <Card className="print:hidden">
        <CardContent className="flex flex-col gap-1 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground">{c.candidato?.nome_urna ?? c.nome}</h1>
            <p className="text-sm text-muted-foreground">
              {c.cargo} · <span className="font-mono tabular-nums">{c.ano}</span> · {c.uf}
              {c.candidato?.partido ? ` · ${c.candidato.partido}` : ''}{c.candidato?.numero ? <> · Nº <span className="font-mono tabular-nums">{c.candidato.numero}</span></> : null}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">{c.nome}</p>
        </CardContent>
      </Card>

      <Tabs value={aba} onValueChange={(v) => mudar('aba', v)}>
        <TabsList className="print:hidden">
          {abas.map(({ id, rotulo, icone: Icone }) => (
            <TabsTrigger key={id} value={id}><Icone />{rotulo}</TabsTrigger>
          ))}
        </TabsList>
        {abas.map(({ id }) => (
          <TabsContent key={id} value={id}>{aba === id ? conteudo(id) : null}</TabsContent>
        ))}
      </Tabs>

      {atual.dados && (
        <FichaMunicipioModal
          ibge={municipio}
          campanha={atual.dados}
          permissoes={permissoes}
          avisar={avisar}
          onFechar={() => mudar('municipio', null)}
          onSalvo={() => setVersao((v) => v + 1)}
        />
      )}
      <Avisos avisos={avisos} />
    </div>
  );
};

export default ModuloCampanhaMain;
