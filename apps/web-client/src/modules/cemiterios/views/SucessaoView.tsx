import React, { useMemo, useState } from 'react';
import { AlertCircle, Clock, FileCheck2, Scale } from 'lucide-react';
import { Button, KpiCard, StatusChip, Tabs } from '@/components/ui';
import { useCan } from '@/core/rbac/useCan';
import { cemiteriosApi } from '../api';
import type { Sucessao, SucessaoPaginado, DashboardPendentes, DashboardRegularizacao, DashboardPendentesProcesso, DashboardRegularizacaoProcesso } from '../api';
import { ErroBox, Mono, useDados } from '../views/comum';
import { useCemiteriosNavigation } from '../CemiteriosContext';
import {
  transicoesValidas,
  ESTADO_LABELS,
  ESTADO_BADGE_VARIANT,
} from '../hooks/useSucessaoTransicoes';
import DashboardPendentesComponent from '../components/DashboardPendentes';
import DashboardRegularizacaoComponent from '../components/DashboardRegularizacao';
import SucessaoList from '../components/SucessaoList';
import SucessaoWizard from '../components/SucessaoWizard';
import SucessaoDetail from '../components/SucessaoDetail';

export const SucessaoView: React.FC = () => {
  const { can } = useCan();
  const { cemiterioAtivoId } = useCemiteriosNavigation();
  const podeAutuar = can('cemiterios.sucessao.manage');

  const [subAba, setSubAba] = useState<'pendencias' | 'processos' | 'regularizacao'>('pendencias');
  const [modalWizardAberto, setModalWizardAberto] = useState(false);
  const [modalDetalheAberto, setModalDetalheAberto] = useState<Sucessao | null>(null);

  const pendentes = useDados(
    () => cemiteriosApi.pendentes(cemiterioAtivoId ?? undefined),
    [cemiterioAtivoId]
  );

  const regularizacao = useDados(
    () => cemiteriosApi.regularizacao(cemiterioAtivoId ?? undefined),
    [cemiterioAtivoId]
  );

  const processos = useDados(
    () => cemiteriosApi.sucessoes({ park_id: cemiterioAtivoId ?? undefined, per_page: 50 }),
    [cemiterioAtivoId]
  );

  const sucedidas = useMemo(
    () => processos.dados?.data?.filter((p) => p.estado === 'sucedida').length ?? 0,
    [processos.dados?.data]
  );

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          title="Pendentes de Análise"
          value={pendentes.dados?.resumo?.total ?? '—'}
          icon={<AlertCircle className="h-5 w-5" />}
          iconBgColor="bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
          subtitle="Processos aguardando análise"
        />
        <KpiCard
          title="Em Análise"
          value={pendentes.dados?.resumo?.em_analise ?? '—'}
          icon={<Clock className="h-5 w-5" />}
          iconBgColor="bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
          subtitle="Aguardando qualificação ou decisão"
        />
        <KpiCard
          title="Sucessões Concluídas"
          value={sucedidas || '—'}
          icon={<FileCheck2 className="h-5 w-5" />}
          iconBgColor="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
          subtitle="Titular sucedido e concessão transferida"
        />
      </div>

      <ErroBox erro={pendentes.erro ?? regularizacao.erro ?? processos.erro ?? null} />

      {/* Botão de Abertura de Processo */}
      {podeAutuar && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setModalWizardAberto(true)}>
            <Scale className="h-4 w-4 mr-2" />
            Abrir Processo de Sucessão
          </Button>
        </div>
      )}

      {/* Navegação entre abas */}
      <Tabs
        items={[
          { key: 'pendencias', label: `Pendências (${pendentes.dados?.resumo?.total ?? 0})` },
          { key: 'processos', label: `Processos (${processos.dados?.total ?? 0})` },
          { key: 'regularizacao', label: `Regularização (${regularizacao.dados?.total ?? 0})` },
        ]}
        value={subAba}
        onChange={(k) => setSubAba(k as typeof subAba)}
      />

      {subAba === 'pendencias' && (
        <DashboardPendentesComponent
          dados={pendentes.dados}
          carregando={pendentes.carregando}
          onSelectProcesso={async (p) => {
            const s = await cemiteriosApi.sucessao(p.id);
            setModalDetalheAberto(s);
          }}
        />
      )}

      {subAba === 'processos' && (
        <SucessaoList
          dados={processos.dados}
          carregando={processos.carregando}
          onDetalhar={(p) => setModalDetalheAberto(p)}
          onAutuar={podeAutuar ? () => setModalWizardAberto(true) : undefined}
          podeAutuar={podeAutuar}
        />
      )}

      {subAba === 'regularizacao' && (
        <DashboardRegularizacaoComponent
          dados={regularizacao.dados}
          carregando={regularizacao.carregando}
          onSelectProcesso={async (p) => {
            const s = await cemiteriosApi.sucessao(p.id);
            setModalDetalheAberto(s);
          }}
        />
      )}

      {/* Wizard de abertura de processo */}
      <SucessaoWizard
        aberto={modalWizardAberto}
        parkId={cemiterioAtivoId}
        onFechar={() => setModalWizardAberto(false)}
        onSucesso={() => {
          processos.recarregar();
          pendentes.recarregar();
          regularizacao.recarregar();
        }}
      />

      {/* Detalhe do processo */}
      {modalDetalheAberto && (
        <SucessaoDetail
          sucessao={modalDetalheAberto}
          aberto={true}
          onFechar={() => setModalDetalheAberto(null)}
          onSucesso={() => {
            processos.recarregar();
            pendentes.recarregar();
            regularizacao.recarregar();
          }}
        />
      )}
    </div>
  );
};

export default SucessaoView;
