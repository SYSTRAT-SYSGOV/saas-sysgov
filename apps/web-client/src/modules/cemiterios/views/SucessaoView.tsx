import React, { useState } from 'react';
import { Scale } from 'lucide-react';
import { Button, Tabs } from '@/components/ui';
import { useCan } from '@/core/rbac/useCan';
import { cemiteriosApi } from '../api';
import type { Sucessao } from '../api';
import { ErroBox, useDados } from '../views/comum';
import { useCemiteriosNavigation } from '../CemiteriosContext';
import DashboardPendentesComponent from '../components/DashboardPendentes';
import DashboardRegularizacaoComponent from '../components/DashboardRegularizacao';
import SucessaoList from '../components/SucessaoList';
import SucessaoWizard from '../components/SucessaoWizard';
import SucessaoDetail from '../components/SucessaoDetail';
import SucessaoKpis from './SucessaoKpis';
import SucessaoFiltros, { SUCESSAO_FILTROS_INICIAIS, type SucessaoFiltrosState } from '../components/SucessaoFiltros';

export const SucessaoView: React.FC = () => {
  const { can } = useCan();
  const { cemiterioAtivoId } = useCemiteriosNavigation();
  const podeAutuar = can('cemiterios.sucessao.manage');

  const [subAba, setSubAba] = useState<'pendencias' | 'processos' | 'regularizacao'>('pendencias');
  const [modalWizardAberto, setModalWizardAberto] = useState(false);
  const [modalDetalheAberto, setModalDetalheAberto] = useState<Sucessao | null>(null);
  const [filtros, setFiltros] = useState<SucessaoFiltrosState>(SUCESSAO_FILTROS_INICIAIS);

  const pendentes = useDados(
    () => cemiteriosApi.pendentes(cemiterioAtivoId ?? undefined),
    [cemiterioAtivoId]
  );

  const regularizacao = useDados(
    () => cemiteriosApi.regularizacao(cemiterioAtivoId ?? undefined),
    [cemiterioAtivoId]
  );

  const processos = useDados(
    () =>
      cemiteriosApi.sucessoes({
        park_id: cemiterioAtivoId ?? undefined,
        estado: filtros.estado !== 'todos' ? filtros.estado : undefined,
        via: filtros.via !== 'todas' ? filtros.via : undefined,
        data_falecimento_inicio: filtros.dataFalecimentoInicio || undefined,
        data_falecimento_fim: filtros.dataFalecimentoFim || undefined,
        q: filtros.busca.trim() || undefined,
        per_page: 50,
      }),
    [cemiterioAtivoId, filtros]
  );

  const sucedidasQuery = useDados(
    () => cemiteriosApi.sucessoes({ park_id: cemiterioAtivoId ?? undefined, estado: 'sucedida', per_page: 1 }),
    [cemiterioAtivoId]
  );

  return (
    <div className="space-y-6">
      <SucessaoKpis
        resumoPendentes={pendentes.dados?.resumo}
        regularizacao={regularizacao.dados}
        sucedidas={sucedidasQuery.dados?.total ?? 0}
      />

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
        <div className="space-y-4">
          <SucessaoFiltros
            filtros={filtros}
            onFiltrosChange={(novos) => setFiltros((f) => ({ ...f, ...novos }))}
            onLimparFiltros={() => setFiltros(SUCESSAO_FILTROS_INICIAIS)}
            totalRegistros={processos.dados?.total ?? 0}
            carregando={processos.carregando}
          />
          <SucessaoList
            dados={processos.dados}
            carregando={processos.carregando}
            onDetalhar={(p) => setModalDetalheAberto(p)}
          />
        </div>
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
          sucedidasQuery.recarregar();
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
            sucedidasQuery.recarregar();
          }}
        />
      )}
    </div>
  );
};

export default SucessaoView;
