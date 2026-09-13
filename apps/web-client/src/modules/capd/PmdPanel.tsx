import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Card,
  Button,
  Input,
  Select,
  Modal,
} from '@sysgov/ui';
import {
  PageHeader,
  DataTable,
  EmptyState,
  SearchInput,
  StatusChip,
  ScreenState,
} from '@/components/ui';
import type { ColumnDef } from '@tanstack/react-table';
import {
  TrendingUp,
  Eye,
  Edit2,
  CheckCircle,
  AlertTriangle,
  ClipboardList,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';
import { SysgovApi } from '@sysgov/sdk';

const api = new SysgovApi();

interface PlanoMelhoria {
  id: number;
  servidor_id: number;
  ciclo_id: number;
  ciclo_verificacao_id?: number;
  nfc_gatilho: string;
  objetivos: string;
  acoes?: Array<{ descricao: string; prazo?: string; status?: string }>;
  prazo: string;
  status: 'pendente' | 'em_andamento' | 'concluido' | 'cancelado';
  concluido_em?: string;
  observacoes_verificacao?: string;
  ciclo?: { id: number; nome: string; ano_competencia: number };
  ciclo_verificacao?: { id: number; nome: string; ano_competencia: number };
}

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'primary' | 'neutral'> = {
  concluido: 'success',
  em_andamento: 'warning',
  pendente: 'primary',
  cancelado: 'neutral',
};

const STATUS_LABEL: Record<string, string> = {
  concluido: 'Concluído',
  em_andamento: 'Em Andamento',
  pendente: 'Pendente',
  cancelado: 'Cancelado',
};

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'pendente', label: 'Pendente' },
  { value: 'em_andamento', label: 'Em Andamento' },
  { value: 'concluido', label: 'Concluído' },
  { value: 'cancelado', label: 'Cancelado' },
];

export const PmdPanel: React.FC = () => {
  const [pmds, setPmds]                 = useState<PlanoMelhoria[]>([]);
  const [loading, setLoading]           = useState(false);
  const [filtroStatus, setFiltroStatus] = useState('');
  const [search, setSearch]             = useState('');
  const [erro, setErro]                 = useState<string | null>(null);
  const [sucesso, setSucesso]           = useState<string | null>(null);
  const [detalhePmd, setDetalhePmd]     = useState<PlanoMelhoria | null>(null);

  // Form verificação
  const [verModal, setVerModal]         = useState(false);
  const [nfcNova, setNfcNova]           = useState('');
  const [obsVerif, setObsVerif]         = useState('');
  const [pmdVerif, setPmdVerif]         = useState<PlanoMelhoria | null>(null);
  const [savingVerif, setSavingVerif]   = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const params = filtroStatus ? `?status=${filtroStatus}` : '';
      const resp = await api.get<PlanoMelhoria[]>(`/capd/pmd${params}`);
      setPmds(resp.data ?? []);
    } catch {
      setErro('Não foi possível carregar os Planos de Melhoria de Desempenho.');
    } finally {
      setLoading(false);
    }
  }, [filtroStatus]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const abrirVerificacao = (pmd: PlanoMelhoria) => {
    setPmdVerif(pmd);
    setNfcNova('');
    setObsVerif('');
    setVerModal(true);
  };

  const registrarVerificacao = async () => {
    if (!pmdVerif || !nfcNova || !obsVerif) return;
    setSavingVerif(true);
    try {
      await api.post(`/capd/pmd/${pmdVerif.id}/verificacao`, {
        nfc_novo_ciclo: parseFloat(nfcNova),
        observacoes: obsVerif,
      });
      setSucesso('Verificação de evolução registrada com sucesso!');
      setVerModal(false);
      carregar();
    } catch (e: any) {
      setErro(e?.response?.data?.message ?? 'Erro ao registrar verificação.');
    } finally {
      setSavingVerif(false);
    }
  };

  // Filtragem simples combinada
  const filteredPmds = useMemo(() => {
    if (!search.trim()) return pmds;
    const term = search.toLowerCase();
    return pmds.filter(p =>
      p.objetivos.toLowerCase().includes(term) ||
      String(p.servidor_id).includes(term) ||
      (p.ciclo?.nome ?? '').toLowerCase().includes(term)
    );
  }, [pmds, search]);

  const columns = useMemo<ColumnDef<PlanoMelhoria, any>[]>(() => [
    {
      id: 'id',
      header: 'ID',
      size: 70,
      meta: {
        sortValue: p => p.id,
        exportValue: p => `#${p.id}`,
      },
      cell: ({ row }) => (
        <span className="font-mono text-xs tabular-nums text-muted-foreground font-semibold">
          #{row.original.id}
        </span>
      ),
    },
    {
      id: 'ciclo',
      header: 'Ciclo de Origem',
      size: 200,
      meta: {
        sortValue: p => p.ciclo?.nome ?? '',
        exportValue: p => p.ciclo?.nome ?? `Ciclo #${p.ciclo_id}`,
      },
      cell: ({ row }) => (
        <span className="text-sm font-medium text-foreground">
          {row.original.ciclo?.nome ?? `Ciclo #${row.original.ciclo_id}`}
        </span>
      ),
    },
    {
      id: 'nfc_gatilho',
      header: 'NFC Gatilho',
      size: 130,
      meta: {
        sortValue: p => parseFloat(p.nfc_gatilho),
        exportValue: p => p.nfc_gatilho,
      },
      cell: ({ row }) => (
        <span className="font-mono font-bold text-sm tabular-nums text-destructive">
          {row.original.nfc_gatilho} pts
        </span>
      ),
    },
    {
      id: 'objetivos',
      header: 'Objetivos / Meta de Recuperação',
      size: 320,
      meta: {
        exportValue: p => p.objetivos,
      },
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground line-clamp-2" title={row.original.objetivos}>
          {row.original.objetivos}
        </span>
      ),
    },
    {
      id: 'prazo',
      header: 'Prazo',
      size: 120,
      meta: {
        sortValue: p => p.prazo,
        exportValue: p => new Date(p.prazo).toLocaleDateString('pt-BR'),
      },
      cell: ({ row }) => (
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {new Date(row.original.prazo).toLocaleDateString('pt-BR')}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      size: 140,
      meta: {
        sortValue: p => p.status,
        exportValue: p => STATUS_LABEL[p.status] ?? p.status,
      },
      cell: ({ row }) => {
        const s = row.original.status;
        return (
          <StatusChip
            label={STATUS_LABEL[s] ?? s}
            variant={STATUS_VARIANT[s] ?? 'neutral'}
          />
        );
      },
    },
    {
      id: 'acoes',
      header: '',
      size: 140,
      enableSorting: false,
      cell: ({ row }) => {
        const pmd = row.original;
        return (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              title="Ver Detalhes do Plano"
              onClick={() => setDetalhePmd(pmd)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            {pmd.status !== 'concluido' && pmd.status !== 'cancelado' && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 px-2"
                onClick={() => abrirVerificacao(pmd)}
              >
                <ArrowUpRight className="h-3 w-3 mr-1" />
                Evolução
              </Button>
            )}
          </div>
        );
      },
    },
  ], []);

  return (
    <div className="space-y-6">
      {/* PageHeader Canônico */}
      <PageHeader
        icon={<TrendingUp className="h-6 w-6" />}
        title="Planos de Melhoria de Desempenho (PMD)"
        subtitle="Instrumento de apoio funcional gerado automaticamente para servidores com NFC abaixo da nota de corte (RF-09)"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={carregar}
            disabled={loading}
            title="Recarregar"
          >
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        }
      />

      {/* Alertas */}
      {erro && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{erro}</span>
        </div>
      )}
      {sucesso && (
        <div className="rounded-lg border border-status-success-border bg-status-success-bg px-4 py-3 text-sm text-status-success flex items-center gap-2">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{sucesso}</span>
        </div>
      )}

      {loading ? (
        <ScreenState type="loading" title="Carregando Planos de Melhoria..." />
      ) : (
        <Card className="gap-0 py-0">
          {/* Barra de Filtros e Busca */}
          <div className="p-3 border-b border-border flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="w-full sm:w-80">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Buscar por objetivos ou ciclo..."
              />
            </div>
            <div className="w-full sm:w-52">
              <Select
                value={filtroStatus}
                onChange={v => setFiltroStatus(v)}
                options={STATUS_OPTIONS}
                placeholder="Todos os status"
              />
            </div>
          </div>

          <div className="p-3">
            {filteredPmds.length === 0 ? (
              <EmptyState
                icon={<ClipboardList className="h-10 w-10" />}
                title="Nenhum PMD encontrado"
                description={
                  filtroStatus
                    ? `Não há planos de melhoria com o status "${STATUS_LABEL[filtroStatus]}".`
                    : 'Servidores com NFC inferior à nota de corte do ciclo trienal geram PMDs automaticamente no processamento da consolidação.'
                }
              />
            ) : (
              <DataTable
                columns={columns}
                data={filteredPmds}
                emptyText="Nenhum plano encontrado."
                pageSize={10}
                fixedLayout
              />
            )}
          </div>
        </Card>
      )}

      {/* Modal: Detalhes do PMD */}
      <Modal
        open={Boolean(detalhePmd)}
        onClose={() => setDetalhePmd(null)}
        title={`Plano de Melhoria de Desempenho #${detalhePmd?.id}`}
        size="lg"
      >
        {detalhePmd && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm bg-muted/40 p-3 rounded-lg border border-border">
              <div>
                <span className="text-xs text-muted-foreground block">Ciclo Origem:</span>
                <span className="font-semibold text-foreground">{detalhePmd.ciclo?.nome ?? `#${detalhePmd.ciclo_id}`}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">NFC Gatilho:</span>
                <span className="font-mono font-bold text-destructive">{detalhePmd.nfc_gatilho} pts</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Prazo:</span>
                <span className="font-mono text-foreground">{new Date(detalhePmd.prazo).toLocaleDateString('pt-BR')}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Status:</span>
                <StatusChip
                  label={STATUS_LABEL[detalhePmd.status] ?? detalhePmd.status}
                  variant={STATUS_VARIANT[detalhePmd.status] ?? 'neutral'}
                />
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide mb-1">
                Objetivos Institucionais
              </h4>
              <p className="text-sm text-muted-foreground bg-background p-3 rounded-lg border border-border">
                {detalhePmd.objetivos}
              </p>
            </div>

            {detalhePmd.acoes && detalhePmd.acoes.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2">
                  Plano de Ações Acordadas
                </h4>
                <div className="space-y-2">
                  {detalhePmd.acoes.map((acao, i) => (
                    <div key={i} className="flex items-start justify-between bg-background p-2.5 rounded-lg border border-border text-xs">
                      <span className="text-foreground">{acao.descricao}</span>
                      {acao.prazo && <span className="font-mono text-muted-foreground">{acao.prazo}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {detalhePmd.observacoes_verificacao && (
              <div>
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide mb-1">
                  Parecer da Verificação de Evolução
                </h4>
                <p className="text-sm text-muted-foreground bg-muted/40 p-3 rounded-lg border border-border">
                  {detalhePmd.observacoes_verificacao}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal: Registrar Evolução */}
      <Modal
        open={verModal}
        onClose={() => setVerModal(false)}
        title="Registrar Verificação de Evolução"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Lançamento da nova nota avaliativa para conferir se o servidor superou o índice gatilho ({pmdVerif?.nfc_gatilho} pts).
          </p>
          <div>
            <label className="text-xs font-medium text-foreground block mb-1">Nova NFC Apurada *</label>
            <Input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={nfcNova}
              onChange={e => setNfcNova(e.target.value)}
              placeholder="Ex: 75.50"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground block mb-1">Parecer / Observações *</label>
            <textarea
              className="w-full text-xs rounded-lg border border-input bg-background p-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              rows={3}
              value={obsVerif}
              onChange={e => setObsVerif(e.target.value)}
              placeholder="Descreva o acompanhamento da chefia imediata e as evidências de evolução..."
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setVerModal(false)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={registrarVerificacao}
              disabled={savingVerif || !nfcNova || !obsVerif}
            >
              {savingVerif ? 'Salvando...' : 'Concluir Verificação'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PmdPanel;
