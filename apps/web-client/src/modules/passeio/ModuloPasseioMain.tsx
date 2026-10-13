import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bus, ClipboardCheck, Compass, FileText, LayoutDashboard, School } from 'lucide-react';
import { AlertCard, Card, CardContent, Select, Skeleton, Tabs, TabsContent, TabsList, TabsTrigger } from '@sysgov/ui';

import { useCan } from '@/core/rbac/useCan';
import { formatarData } from '@/lib/formatacao';
import { obterEscolaAtiva } from '@/core/escola/escolaAtiva';
import { Avisos, useAvisos } from '../escola/components/Avisos';
import type { Toast } from '../escola/components/AdminModal';
import type { Indicadores, Passeio } from './api';
import { usePasseioAtivo, usePasseios, type DadosPasseioAtivo } from './usePasseio';
import { PainelPasseio } from './components/PainelPasseio';
import { PasseiosLista } from './components/PasseiosLista';
import { InscricoesTermos } from './components/InscricoesTermos';
import { TurmasPasseio } from './components/TurmasPasseio';
import { OnibusAssentos } from './components/OnibusAssentos';
import { RelatoriosPasseio, type InicialRelatorio } from './components/RelatoriosPasseio';

export type Aba = 'painel' | 'passeios' | 'inscricoes' | 'turmas' | 'onibus' | 'relatorios';

/** Props das abas que dependem do passeio ativo (permissões são conveniência — a regra é do servidor). */
export interface PropsAba {
  ativo: Passeio;
  dados: DadosPasseioAtivo;
  /** Recarrega o passeio ativo e a lista (contagens e indicadores gerais). */
  recarregar: () => Promise<void>;
  avisar: Toast;
  permissoes: Permissoes;
  escola: string;
  /** Troca de aba; `extras` vão para a URL (ex.: relatório e ônibus já escolhidos). */
  irPara: (aba: Aba, extras?: Record<string, string>) => void;
}

export interface Permissoes { passeios: boolean; frota: boolean }

const ABAS: { id: Aba; rotulo: string; icone: React.ElementType }[] = [
  { id: 'painel', rotulo: 'Painel', icone: LayoutDashboard },
  { id: 'passeios', rotulo: 'Passeios', icone: Compass },
  { id: 'inscricoes', rotulo: 'Inscrições e Termos', icone: ClipboardCheck },
  { id: 'turmas', rotulo: 'Turmas', icone: School },
  { id: 'onibus', rotulo: 'Ônibus e Assentos', icone: Bus },
  { id: 'relatorios', rotulo: 'Relatórios', icone: FileText },
];

/** Relatório e ônibus vindos da URL (botão "Imprimir lista" do ônibus). */
function relatorioInicial(parametros: URLSearchParams): InicialRelatorio | undefined {
  if (parametros.get('relatorio') !== 'manifesto') return undefined;
  return { relatorio: 'manifesto', veiculoId: Number(parametros.get('onibus')) || 'todos' };
}

/** Passeio ativo: o da URL, senão o próximo agendado, senão o mais recente. */
export function escolherAtivo(passeios: Passeio[], daUrl: number | null): Passeio | null {
  return passeios.find((p) => p.id === daUrl)
    ?? [...passeios].filter((p) => p.status === 'agendado' || p.status === 'em_andamento').sort((a, b) => a.data_passeio.localeCompare(b.data_passeio))[0]
    ?? passeios[0]
    ?? null;
}

/** Passeio & Transporte Escolar sobre o Cadastro Escolar: tudo lido e gravado pela API (design D18–D20). */
export const ModuloPasseioMain: React.FC = () => {
  const { can } = useCan();
  const [parametros, setParametros] = useSearchParams();
  const { avisos, avisar } = useAvisos();
  const lista = usePasseios();
  const passeios = lista.dados?.passeios ?? [];
  const daUrl = Number(parametros.get('passeio')) || null;
  const ativo = escolherAtivo(passeios, daUrl);
  const carga = usePasseioAtivo(ativo);
  const aba = (ABAS.some((a) => a.id === parametros.get('aba')) ? parametros.get('aba') : 'painel') as Aba;
  const escola = lista.dados?.escolas.find((e) => e.id === obterEscolaAtiva())?.nome ?? '';

  const permissoes: Permissoes = { passeios: can('passeio.passeios.manage'), frota: can('passeio.frota.manage') };

  const mudar = (chave: 'aba' | 'passeio', valor: string) => {
    const novos = new URLSearchParams(parametros);
    novos.set(chave, valor);
    setParametros(novos, { replace: true });
  };
  const irPara = (id: Aba, extras: Record<string, string> = {}) => {
    const novos = new URLSearchParams(parametros);
    novos.set('aba', id);
    for (const [chave, valor] of Object.entries(extras)) novos.set(chave, valor);
    setParametros(novos, { replace: true });
  };
  const recarregar = async () => {
    await Promise.all([lista.recarregar(), carga.recarregar()]);
  };

  const indicadoresGerais: Indicadores | null = lista.dados?.indicadores ?? null;
  // Dados de outro passeio (troca em andamento) não são exibidos nem usados para gravar.
  const dados = carga.dados && ativo && carga.dados.passeio.id === ativo.id ? carga.dados : null;

  const conteudo = (id: Aba): React.ReactNode => {
    const erro = lista.erro ?? carga.erro;
    if (erro) {
      return <AlertCard priority="danger" title="Não foi possível carregar o Passeio" description={erro} actionLabel="Tentar novamente" onAction={() => void recarregar()} />;
    }
    if (!lista.dados) return <Skeleton className="h-64 w-full" />;
    if (id === 'passeios') {
      return <PasseiosLista passeios={passeios} ativoId={ativo?.id ?? null} permissoes={permissoes} avisar={avisar} recarregar={recarregar} selecionar={(p) => mudar('passeio', String(p.id))} />;
    }
    if (!ativo) {
      return (
        <AlertCard
          priority="info"
          title="Nenhum passeio cadastrado"
          description="Cadastre o primeiro passeio da escola para inscrever alunos, organizar os ônibus e imprimir os termos."
          actionLabel={permissoes.passeios ? 'Cadastrar passeio' : undefined}
          onAction={permissoes.passeios ? () => irPara('passeios') : undefined}
        />
      );
    }
    if (!dados) return <Skeleton className="h-64 w-full" />;
    const props: PropsAba = { ativo, dados, recarregar, avisar, permissoes, escola, irPara };
    // key: filtros e seleções de cada aba recomeçam ao trocar de passeio.
    switch (id) {
      case 'painel': return <PainelPasseio key={ativo.id} {...props} indicadoresGerais={indicadoresGerais} />;
      case 'inscricoes': return <InscricoesTermos key={ativo.id} {...props} />;
      case 'turmas': return <TurmasPasseio key={ativo.id} {...props} />;
      case 'onibus': return <OnibusAssentos key={ativo.id} {...props} />;
      case 'relatorios': return <RelatoriosPasseio key={ativo.id} {...props} inicial={relatorioInicial(parametros)} />;
      default: return null;
    }
  };

  return (
    <div className="space-y-4 p-4">
      <Card className="print:hidden">
        <CardContent className="flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Bus className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Passeio & Transporte Escolar</h1>
              <p className="text-sm text-muted-foreground">
                {ativo ? `${ativo.destino} — ${ativo.cidade} · ${formatarData(ativo.data_passeio)}` : 'Passeios dos alunos do Cadastro Escolar'}
              </p>
            </div>
          </div>
          <Select
            label="Passeio"
            value={ativo?.id ?? null}
            placeholder="Nenhum passeio"
            onChange={(v) => mudar('passeio', v)}
            options={passeios.map((p) => ({ value: p.id, label: `${p.nome} (${formatarData(p.data_passeio)})` }))}
            loading={lista.carregando && !lista.dados}
            className="w-full md:w-96"
          />
        </CardContent>
      </Card>

      <Tabs value={aba} onValueChange={(v) => irPara(v as Aba)}>
        <TabsList className="print:hidden">
          {ABAS.map(({ id, rotulo, icone: Icone }) => (
            <TabsTrigger key={id} value={id}>
              <Icone />
              {rotulo}
            </TabsTrigger>
          ))}
        </TabsList>
        {ABAS.map(({ id }) => (
          <TabsContent key={id} value={id}>
            {(lista.carregando || carga.carregando) && lista.dados ? <div className="mb-2 text-xs text-muted-foreground print:hidden">Atualizando…</div> : null}
            {aba === id ? conteudo(id) : null}
          </TabsContent>
        ))}
      </Tabs>

      <Avisos avisos={avisos} />
    </div>
  );
};

export default ModuloPasseioMain;
