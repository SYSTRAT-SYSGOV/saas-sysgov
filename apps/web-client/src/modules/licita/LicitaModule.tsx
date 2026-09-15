import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTenant } from '@/core/tenant/useTenant';
import { useAuth } from '@/core/auth/useAuth';
import { Plus, Gavel, Search, BookOpen, Settings2, FileDown, Pencil, SlidersHorizontal } from 'lucide-react';
import { Accordion, ActionsMenu, Button, Card, type ActionsMenuItem } from '@sysgov/ui';
import { PageHeader, DataTable, EmptyState, SearchInput, StatusChip, ScreenState } from '@/components/ui';
import { sysgovApi, type FaseLicita, type LegalDocumento, type Processo, type StatusDfd } from '@sysgov/sdk';
import type { ColumnDef } from '@tanstack/react-table';
import { ProcessoFormModal } from './components/ProcessoFormModal';
import { BuscaAvancadaProcessos, aplicarFiltrosAvancados, type FiltroAvancado } from './components/BuscaAvancadaProcessos';
import { DfdDetailPage } from './pages/DfdDetailPage';
import { EtpDetailPage } from './pages/EtpDetailPage';
import { MapaRiscoDetailPage } from './pages/MapaRiscoDetailPage';
import { PesquisaPrecoDetailPage } from './pages/PesquisaPrecoDetailPage';
import { AprovacaoOrdenadorPage } from './pages/AprovacaoOrdenadorPage';
import { FasesLicitaStepper, type FaseLicitaImplementada } from './components/FasesLicitaStepper';
import { LegislacaoPage } from './pages/LegislacaoPage';
import { LegislacaoDetailPage } from './pages/LegislacaoDetailPage';
import { CamposConfiguracaoPage } from './pages/CamposConfiguracaoPage';
import { abrirJanelaPdf, gerarDfdPdf } from './utils/gerarDfdPdf';
import { gerarEtpPdf } from './utils/gerarEtpPdf';
import { gerarMapaRiscoPdf } from './utils/gerarMapaRiscoPdf';
import { gerarPesquisaPrecoPdf } from './utils/gerarPesquisaPrecoPdf';

const FASE_LABEL: Record<FaseLicita, string> = {
  dfd: 'DFD',
  em_elaboracao: 'Em Elaboração',
  aprovacao_ordenador: 'Aprovação do Ordenador',
  etp: 'ETP',
  mapa_riscos: 'Mapa de Riscos',
  pesquisa_precos: 'Pesquisa de Preços',
  tr: 'Termo de Referência',
  edital: 'Edital',
  concluido: 'Concluído',
};

const DFD_STATUS_LABEL: Record<StatusDfd, string> = {
  rascunho: 'Rascunho',
  em_revisao: 'Em Revisão',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
};

const DFD_STATUS_VARIANT: Record<StatusDfd, 'neutral' | 'warning' | 'success' | 'danger'> = {
  rascunho: 'neutral',
  em_revisao: 'warning',
  aprovado: 'success',
  rejeitado: 'danger',
};

/** ETP/Mapa de Riscos/Pesquisa de Preços não têm mais aprovação individual — só rascunho (editável) e aprovado (travado pela aprovação final do Ordenador). */
const DOC_STATUS_LABEL: Record<'rascunho' | 'aprovado', string> = {
  rascunho: 'Rascunho',
  aprovado: 'Aprovado',
};

const DOC_STATUS_VARIANT: Record<'rascunho' | 'aprovado', 'neutral' | 'success'> = {
  rascunho: 'neutral',
  aprovado: 'success',
};

type Tab = 'processos' | 'legislacao' | 'campos';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'processos', label: 'Processos', icon: <Gavel className="h-4 w-4" /> },
  { id: 'legislacao', label: 'Legislação', icon: <BookOpen className="h-4 w-4" /> },
  { id: 'campos', label: 'Campos por Tipo de Documento', icon: <Settings2 className="h-4 w-4" /> },
];

const ProcessosTab: React.FC<{
  onOpenProcesso: (id: number) => void;
}> = ({ onOpenProcesso }) => {
  const { tenant } = useTenant();
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filtrosAvancados, setFiltrosAvancados] = useState<FiltroAvancado[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  // Guarda "processoId:tipo" — dois botões (DFD/ETP) podem existir na mesma
  // linha, então só o id do processo não bastaria para saber qual está
  // carregando.
  const [gerandoPdfId, setGerandoPdfId] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const handleGerarPdf = useCallback(
    async (processoId: number, tipo: 'dfd' | 'etp' | 'mapa_riscos' | 'pesquisa_precos') => {
      // Precisa abrir a janela AQUI, síncrono, ainda dentro do clique — se
      // abrirmos só depois do await abaixo, o navegador já não reconhece
      // como resposta direta a um gesto do usuário e bloqueia o popup
      // silenciosamente (fica só uma aba em branco, sem aviso nenhum).
      const janela = abrirJanelaPdf();
      if (!janela) {
        setPdfError('O navegador bloqueou a aba do PDF. Permita pop-ups para este site e tente novamente.');
        return;
      }

      if (!tenant) {
        janela.close();
        setPdfError('Não foi possível identificar o órgão para gerar o PDF.');
        return;
      }

      setGerandoPdfId(`${processoId}:${tipo}`);
      setPdfError(null);
      try {
        const [processoCompleto, config] = await Promise.all([
          sysgovApi.licita.getProcesso(processoId),
          sysgovApi.licita.getCamposConfiguracao(tipo).catch(() => null),
        ]);
        if (tipo === 'dfd') {
          gerarDfdPdf(janela, processoCompleto, tenant, config?.campos ?? []);
        } else if (tipo === 'etp') {
          gerarEtpPdf(janela, processoCompleto, tenant, config?.campos ?? []);
        } else if (tipo === 'mapa_riscos') {
          gerarMapaRiscoPdf(janela, processoCompleto, tenant, config?.campos ?? []);
        } else {
          gerarPesquisaPrecoPdf(janela, processoCompleto, tenant, config?.campos ?? []);
        }
      } catch (err: any) {
        janela.close();
        setPdfError(err?.response?.data?.error || err?.message || `Erro ao gerar o PDF do ${tipo.toUpperCase()}.`);
      } finally {
        setGerandoPdfId(null);
      }
    },
    [tenant],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await sysgovApi.licita.listProcessos({ per_page: 50 });
      setProcessos(res.data ?? []);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Erro ao carregar processos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const porBuscaSimples = processos.filter((p) =>
      [p.numero, p.objeto].some((t) => t?.toLowerCase().includes(search.toLowerCase())),
    );
    return aplicarFiltrosAvancados(porBuscaSimples, filtrosAvancados);
  }, [processos, search, filtrosAvancados]);

  const filtrosAvancadosAtivos = filtrosAvancados.filter((f) => f.valor !== '').length;

  const columns = useMemo<ColumnDef<Processo, any>[]>(
    () => [
      {
        id: 'acoes',
        header: '',
        size: 56,
        enableSorting: false,
        cell: ({ row }) => {
          const dfd = row.original.dfd;
          const etp = row.original.etp;
          const mapaRisco = row.original.mapa_risco;
          const pesquisaPreco = row.original.pesquisa_preco;
          const gerandoDfd = gerandoPdfId === `${row.original.id}:dfd`;
          const gerandoEtp = gerandoPdfId === `${row.original.id}:etp`;
          const gerandoMapaRisco = gerandoPdfId === `${row.original.id}:mapa_riscos`;
          const gerandoPesquisaPreco = gerandoPdfId === `${row.original.id}:pesquisa_precos`;

          const items: ActionsMenuItem[] = [
            {
              key: 'editar',
              label: 'Editar',
              icon: <Pencil className="h-3.5 w-3.5" />,
              onSelect: () => onOpenProcesso(row.original.id),
            },
          ];
          if (dfd) {
            items.push({
              key: 'pdf-dfd',
              label: 'Baixar PDF do DFD',
              icon: <FileDown className="h-3.5 w-3.5" />,
              loading: gerandoDfd,
              onSelect: () => handleGerarPdf(row.original.id, 'dfd'),
            });
          }
          if (etp) {
            items.push({
              key: 'pdf-etp',
              label: 'Baixar PDF do ETP',
              icon: <FileDown className="h-3.5 w-3.5" />,
              loading: gerandoEtp,
              onSelect: () => handleGerarPdf(row.original.id, 'etp'),
            });
          }
          if (mapaRisco) {
            items.push({
              key: 'pdf-mapa-riscos',
              label: 'Baixar PDF do Mapa de Riscos',
              icon: <FileDown className="h-3.5 w-3.5" />,
              loading: gerandoMapaRisco,
              onSelect: () => handleGerarPdf(row.original.id, 'mapa_riscos'),
            });
          }
          if (pesquisaPreco) {
            items.push({
              key: 'pdf-pesquisa-precos',
              label: 'Baixar PDF da Pesquisa de Preços',
              icon: <FileDown className="h-3.5 w-3.5" />,
              loading: gerandoPesquisaPreco,
              onSelect: () => handleGerarPdf(row.original.id, 'pesquisa_precos'),
            });
          }

          return (
            <div className="flex justify-center">
              <ActionsMenu items={items} triggerLabel="Ações do processo" />
            </div>
          );
        },
      },
      {
        id: 'numero',
        header: 'Processo',
        size: 140,
        meta: {
          exportValue: (p) => `${p.numero}/${p.ano}`,
        },
        cell: ({ row }) => (
          <span className="font-mono font-bold tabular-nums text-foreground">
            {row.original.numero}/{row.original.ano}
          </span>
        ),
      },
      {
        id: 'objeto',
        header: 'Objeto',
        size: 420,
        meta: {
          exportValue: (p) => p.objeto ?? '',
        },
        cell: ({ row }) => (
          <span className="block truncate text-left text-muted-foreground" title={row.original.objeto ?? undefined}>
            {row.original.objeto || 'Objeto ainda não definido'}
          </span>
        ),
      },
      {
        id: 'fase_atual',
        header: 'Fase Atual',
        size: 130,
        meta: {
          exportValue: (p) => FASE_LABEL[p.fase_atual],
        },
        cell: ({ row }) => <StatusChip label={FASE_LABEL[row.original.fase_atual]} variant="primary" />,
      },
      {
        id: 'dfd_status',
        header: 'Status do DFD',
        size: 150,
        meta: {
          exportValue: (p) => (p.dfd ? DFD_STATUS_LABEL[p.dfd.status] : 'Não iniciado'),
        },
        cell: ({ row }) => {
          const dfd = row.original.dfd;
          if (!dfd) return <span className="text-xs text-muted-foreground italic">Não iniciado</span>;
          return <StatusChip label={DFD_STATUS_LABEL[dfd.status]} variant={DFD_STATUS_VARIANT[dfd.status]} />;
        },
      },
      {
        id: 'etp_status',
        header: 'Status do ETP',
        size: 150,
        meta: {
          exportValue: (p) => (p.etp ? DOC_STATUS_LABEL[p.etp.status] : 'Não iniciado'),
        },
        cell: ({ row }) => {
          const etp = row.original.etp;
          if (!etp) return <span className="text-xs text-muted-foreground italic">Não iniciado</span>;
          return <StatusChip label={DOC_STATUS_LABEL[etp.status]} variant={DOC_STATUS_VARIANT[etp.status]} />;
        },
      },
      {
        id: 'mapa_riscos_status',
        header: 'Status do Mapa de Riscos',
        size: 170,
        meta: {
          exportValue: (p) => (p.mapa_risco ? DOC_STATUS_LABEL[p.mapa_risco.status] : 'Não iniciado'),
        },
        cell: ({ row }) => {
          const mapaRisco = row.original.mapa_risco;
          if (!mapaRisco) return <span className="text-xs text-muted-foreground italic">Não iniciado</span>;
          return <StatusChip label={DOC_STATUS_LABEL[mapaRisco.status]} variant={DOC_STATUS_VARIANT[mapaRisco.status]} />;
        },
      },
      {
        id: 'pesquisa_precos_status',
        header: 'Status da Pesquisa de Preços',
        size: 190,
        meta: {
          exportValue: (p) => (p.pesquisa_preco ? DOC_STATUS_LABEL[p.pesquisa_preco.status] : 'Não iniciado'),
        },
        cell: ({ row }) => {
          const pesquisaPreco = row.original.pesquisa_preco;
          if (!pesquisaPreco) return <span className="text-xs text-muted-foreground italic">Não iniciado</span>;
          return <StatusChip label={DOC_STATUS_LABEL[pesquisaPreco.status]} variant={DOC_STATUS_VARIANT[pesquisaPreco.status]} />;
        },
      },
      {
        id: 'created_at',
        header: 'Criado em',
        size: 110,
        meta: {
          exportValue: (p) => new Date(p.created_at).toLocaleDateString('pt-BR'),
        },
        cell: ({ row }) => (
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            {new Date(row.original.created_at).toLocaleDateString('pt-BR')}
          </span>
        ),
      },
    ],
    [gerandoPdfId, handleGerarPdf, onOpenProcesso],
  );

  if (loading) return <ScreenState type="loading" title="Carregando processos..." />;
  if (error && processos.length === 0) {
    return <ScreenState type="error" title="Erro ao carregar" description={error} actionLabel="Tentar novamente" onAction={load} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowCreate(true)}>
          Novo Processo
        </Button>
      </div>

      {pdfError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {pdfError}
        </div>
      )}

      <Card className="gap-0 py-0">
        <div className="p-3 border-b border-border">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar por número ou objeto..." />
        </div>
        <Accordion
          className="border-b border-border"
          icon={<SlidersHorizontal className="h-4 w-4 text-primary" />}
          items={[
            {
              value: 'busca-avancada',
              title: (
                <span>
                  Busca Avançada
                  {filtrosAvancadosAtivos > 0 && (
                    <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                      {filtrosAvancadosAtivos} ativo{filtrosAvancadosAtivos > 1 ? 's' : ''}
                    </span>
                  )}
                </span>
              ),
              children: <BuscaAvancadaProcessos filtros={filtrosAvancados} onChange={setFiltrosAvancados} />,
            },
          ]}
        />
        <div className="p-3">
          {filtered.length === 0 ? (
            <EmptyState
              icon={<Search className="h-10 w-10" />}
              title="Nenhum processo encontrado"
              description="Crie um novo processo para iniciar a instrução (DFD)."
              actionLabel="Novo Processo"
              onAction={() => setShowCreate(true)}
            />
          ) : (
            <DataTable
              columns={columns}
              data={filtered}
              emptyText="Nenhum processo encontrado."
              pageSize={10}
              onRowClick={(row) => onOpenProcesso(row.id)}
              fixedLayout
              resizableColumns
              pageSizeSelector
              exportable
              exportFileName="processos-licita"
              exportTitle="Licita — Processos"
            />
          )}
        </div>
      </Card>

      <ProcessoFormModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(processo) => {
          setProcessos((prev) => [processo, ...prev]);
          setShowCreate(false);
          onOpenProcesso(processo.id);
        }}
      />
    </div>
  );
};

interface ProcessoDocumentoPageProps {
  processoId: number;
  onBack: () => void;
  onChanged: (processo: Processo) => void;
}

type DocumentoAtivo = FaseLicitaImplementada;

/**
 * Decide qual tela abrir ao clicar num processo: DFD enquanto ele não
 * estiver aprovado; a partir daí, ETP/Mapa de Riscos/Pesquisa de Preços já
 * não se bloqueiam mais em cadeia (equipe de planejamento edita qualquer um
 * a qualquer momento — sem aprovação individual por fase), então abre a
 * Aprovação do Ordenador quando o processo já está nessa etapa (ou
 * concluído), senão cai no ETP por padrão — o usuário navega livremente
 * pelos outros documentos pelo passo a passo (FasesLicitaStepper). Faz uma
 * busca leve própria só para decidir — cada DetailPage busca os dados
 * completos de novo ao montar, igual ao padrão já usado no resto do módulo
 * (sem cache client-side de Processo).
 */
const documentoPorFase = (processo: Processo): DocumentoAtivo => {
  if (processo.fase_atual === 'aprovacao_ordenador' || processo.fase_atual === 'concluido') return 'aprovacao_ordenador';
  if (processo.dfd?.status === 'aprovado') return 'etp';
  return 'dfd';
};

const ProcessoDocumentoPage: React.FC<ProcessoDocumentoPageProps> = ({ processoId, onBack, onChanged }) => {
  const [loading, setLoading] = useState(true);
  const [processo, setProcesso] = useState<Processo | null>(null);
  // Fase cuja tela está aberta — inicializada a partir do processo carregado,
  // mas o usuário pode navegar pra uma fase anterior já aprovada pelo passo
  // a passo (FasesLicitaStepper) sem isso mudar a fase_atual real dele.
  const [documento, setDocumento] = useState<DocumentoAtivo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    sysgovApi.licita
      .getProcesso(processoId)
      .then((res) => {
        if (cancelado) return;
        setProcesso(res);
        setDocumento(documentoPorFase(res));
      })
      .catch((err: any) => {
        if (!cancelado) setError(err?.response?.data?.error || err?.message || 'Erro ao carregar o processo.');
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });
    return () => {
      cancelado = true;
    };
  }, [processoId]);

  // Mantém o `processo` local (usado pelo stepper) em dia sempre que uma
  // ação em qualquer tela de documento muda seu status — sem isso o passo a
  // passo só refletiria uma aprovação depois de reabrir a tela.
  const handleChanged = (atualizado: Processo) => {
    setProcesso(atualizado);
    onChanged(atualizado);
  };

  if (loading || !processo || !documento) return <ScreenState type="loading" title="Carregando processo..." />;
  if (error) {
    return <ScreenState type="error" title="Erro ao carregar" description={error} actionLabel="Voltar" onAction={onBack} />;
  }

  return (
    <div className="space-y-4">
      <FasesLicitaStepper processo={processo} faseAtiva={documento} onSelecionar={setDocumento} />
      {documento === 'aprovacao_ordenador' && <AprovacaoOrdenadorPage processoId={processoId} onBack={onBack} onChanged={handleChanged} />}
      {documento === 'pesquisa_precos' && <PesquisaPrecoDetailPage processoId={processoId} onBack={onBack} onChanged={handleChanged} />}
      {documento === 'mapa_riscos' && <MapaRiscoDetailPage processoId={processoId} onBack={onBack} onChanged={handleChanged} />}
      {documento === 'etp' && <EtpDetailPage processoId={processoId} onBack={onBack} onChanged={handleChanged} />}
      {documento === 'dfd' && <DfdDetailPage processoId={processoId} onBack={onBack} onChanged={handleChanged} />}
    </div>
  );
};

export const LicitaModule: React.FC = () => {
  const { tenant } = useTenant();
  const [searchParams, setSearchParams] = useSearchParams();

  const tab = (searchParams.get('tab') as Tab | null) ?? 'processos';
  const processoId = searchParams.get('processo');
  const documentoId = searchParams.get('documento');

  const openProcesso = (id: number) => {
    setSearchParams({ tab: 'processos', processo: String(id) });
  };

  const closeProcesso = () => {
    setSearchParams({ tab: 'processos' });
  };

  const openNovoDocumento = () => {
    setSearchParams({ tab: 'legislacao', documento: 'novo' });
  };

  const openDocumento = (documento: LegalDocumento) => {
    setSearchParams({ tab: 'legislacao', documento: String(documento.id) });
  };

  const closeDocumento = () => {
    setSearchParams({ tab: 'legislacao' });
  };

  const changeTab = (next: Tab) => {
    setSearchParams(next === 'processos' ? {} : { tab: next });
  };

  if (processoId) {
    return (
      <ProcessoDocumentoPage
        processoId={Number(processoId)}
        onBack={closeProcesso}
        onChanged={() => {
          /* a lista é recarregada ao voltar */
        }}
      />
    );
  }

  if (documentoId) {
    return (
      <LegislacaoDetailPage
        documentoId={documentoId === 'novo' ? null : Number(documentoId)}
        onBack={closeDocumento}
        onSaved={closeDocumento}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Gavel className="h-6 w-6" />}
        title="Licita — Instrução Processual"
        badge="Lei 14.133/2021"
        subtitle={`${tenant?.name} — DFD, ETP, Mapa de Riscos, Pesquisa de Preços, TR e Edital`}
      />

      <div className="flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => changeTab(t.id)}
            className={`flex shrink-0 items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'processos' && <ProcessosTab onOpenProcesso={openProcesso} />}
      {tab === 'legislacao' && <LegislacaoPage onNovoDocumento={openNovoDocumento} onEditarDocumento={openDocumento} />}
      {tab === 'campos' && <CamposConfiguracaoPage />}
    </div>
  );
};

export default LicitaModule;
