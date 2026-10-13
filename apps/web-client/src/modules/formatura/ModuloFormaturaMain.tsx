import React, { useState } from 'react';
import { BarChart3, CreditCard, GraduationCap, LayoutDashboard, School, Settings, Users } from 'lucide-react';
import { AlertCard, Card, CardContent, Select, Skeleton, Tabs, TabsContent, TabsList, TabsTrigger } from '@sysgov/ui';

import { useCan } from '@/core/rbac/useCan';
import { escolaApi } from '../escola/api';
import { useCarga } from '../escola/useCarga';
import { Avisos, useAvisos } from '../escola/components/Avisos';
import type { Toast } from '../escola/components/AdminModal';
import { anosLetivos, dadosDoAno } from './formato';
import { useFormatura, type DadosFormatura } from './useFormatura';
import { PainelFormatura } from './components/PainelFormatura';
import { ConfiguracaoFormatura } from './components/ConfiguracaoFormatura';
import { FormandosFormatura } from './components/FormandosFormatura';
import { PagamentosFormatura } from './components/PagamentosFormatura';
import { RelatorioFormatura } from './components/RelatorioFormatura';
import { TurmasConsulta } from './components/TurmasConsulta';
import { AlunosConsulta } from './components/AlunosConsulta';

export type Aba = 'painel' | 'formandos' | 'pagamentos' | 'alunos' | 'turmas' | 'relatorios' | 'configuracao';

/** Props comuns das abas: dados do ano letivo, recarga, avisos e permissões (conveniência — a regra é do servidor). */
export interface PropsAba {
  ano: number;
  dados: DadosFormatura;
  recarregar: () => Promise<void>;
  avisar: Toast;
  permissoes: { configurar: boolean; editarFormandos: boolean; pagar: boolean };
  irPara: (aba: Aba) => void;
}

const ABAS: { id: Aba; rotulo: string; icone: React.ElementType }[] = [
  { id: 'painel', rotulo: 'Visão Geral', icone: LayoutDashboard },
  { id: 'formandos', rotulo: 'Formandos & Fichas', icone: GraduationCap },
  { id: 'pagamentos', rotulo: 'Pagamentos', icone: CreditCard },
  { id: 'alunos', rotulo: 'Relação de Alunos', icone: Users },
  { id: 'turmas', rotulo: 'Turmas', icone: School },
  { id: 'relatorios', rotulo: 'Relatórios Financeiros', icone: BarChart3 },
  { id: 'configuracao', rotulo: 'Configuração', icone: Settings },
];

/** Formatura sobre o Cadastro Escolar: tudo lido e gravado pela API, por ano letivo (design D10–D15). */
export const ModuloFormaturaMain: React.FC = () => {
  const { can } = useCan();
  const anoAtual = new Date().getFullYear();
  const [ano, setAno] = useState(anoAtual);
  const [aba, setAba] = useState<Aba>('painel');
  const { avisos, avisar } = useAvisos();
  const anos = useCarga(async () => anosLetivos((await escolaApi.turmas()).map((t) => t.ano_letivo), anoAtual), []);
  const carga = useFormatura(ano);
  const { carregando, erro, recarregar } = carga;
  // Ao trocar de ano, os dados do ano anterior não são exibidos nem usados para gravar (Skeleton até chegar o novo).
  const dados = dadosDoAno(carga.dados, ano);

  const permissoes = {
    configurar: can('formatura.config.manage'),
    editarFormandos: can('formatura.formandos.manage'),
    pagar: can('formatura.pagamentos.manage'),
  };
  const semConfiguracao = dados !== null && dados.configuracao === null;
  const semTurmas = dados?.configuracao != null && (dados.configuracao.turmas_ids ?? []).length === 0;

  const conteudo = (id: Aba): React.ReactNode => {
    if (erro) {
      return <AlertCard priority="danger" title="Não foi possível carregar a Formatura" description={erro} actionLabel="Tentar novamente" onAction={() => void recarregar()} />;
    }
    if (!dados) {
      return <Skeleton className="h-64 w-full" />;
    }
    const props: PropsAba = { ano, dados, recarregar, avisar, permissoes, irPara: setAba };
    if (id === 'configuracao') return <ConfiguracaoFormatura key={ano} {...props} />;
    if (semConfiguracao || semTurmas) {
      return (
        <AlertCard
          priority="warning"
          title={semConfiguracao ? `Configure a formatura de ${ano}` : 'Selecione as turmas formandas'}
          description={semConfiguracao
            ? 'Ainda não há configuração da formatura para este ano letivo. Defina valores, formas de pagamento e turmas formandas.'
            : 'Marque na Configuração quais turmas do Cadastro Escolar se formam neste ano.'}
          actionLabel={permissoes.configurar ? 'Abrir Configuração' : undefined}
          onAction={permissoes.configurar ? () => setAba('configuracao') : undefined}
        />
      );
    }
    // key={ano}: filtros e seleções de cada aba recomeçam ao trocar o ano letivo.
    switch (id) {
      case 'painel': return <PainelFormatura key={ano} {...props} />;
      case 'formandos': return <FormandosFormatura key={ano} {...props} />;
      case 'pagamentos': return <PagamentosFormatura key={ano} {...props} />;
      case 'alunos': return <AlunosConsulta key={ano} {...props} />;
      case 'turmas': return <TurmasConsulta key={ano} {...props} />;
      case 'relatorios': return <RelatorioFormatura key={ano} {...props} />;
      default: return null;
    }
  };

  return (
    <div className="space-y-4 p-4">
      <Card className="print:hidden">
        <CardContent className="flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Formatura</h1>
              <p className="text-sm text-muted-foreground">
                {dados?.configuracao?.titulo ?? 'Arrecadação da formatura dos alunos do Cadastro Escolar'}
              </p>
            </div>
          </div>
          <Select
            label="Ano letivo"
            value={ano}
            onChange={(v) => setAno(Number(v))}
            options={(anos.dados ?? [anoAtual]).map((a) => ({ value: a, label: String(a) }))}
            loading={anos.carregando}
            className="w-40 font-mono tabular-nums"
          />
        </CardContent>
      </Card>

      <Tabs value={aba} onValueChange={(v) => setAba(v as Aba)}>
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
            {carregando && dados ? <div className="mb-2 text-xs text-muted-foreground print:hidden">Atualizando…</div> : null}
            {aba === id ? conteudo(id) : null}
          </TabsContent>
        ))}
      </Tabs>

      <Avisos avisos={avisos} />
    </div>
  );
};

export default ModuloFormaturaMain;
