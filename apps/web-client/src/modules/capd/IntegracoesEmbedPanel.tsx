import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  Input,
  Select,
  Switch,
  Modal,
  StatCard,
} from '@sysgov/ui';
import {
  DataTable,
  ConfirmDialog,
  EmptyState,
} from '@/components/ui';
import type { ColumnDef } from '@tanstack/react-table';
import {
  Database,
  RefreshCw,
  Plus,
  Key,
  ExternalLink,
  Code2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Eye,
  Sliders,
  Play,
  Layers,
  Activity,
  Globe,
  Radio,
} from 'lucide-react';
import { SysgovApi } from '@sysgov/sdk';
import {
  type RhConector,
  type RhSyncLogItem,
  type EmbedConfig,
  type EmbedGenerated,
  maskApiKey,
  calculateKpis,
  generateIframeSnippet,
  getDriverLabel,
  formatIsoDate,
} from './IntegracoesEmbedPanel.utils';

const api = new SysgovApi();

// Dados semente para demonstração e resiliência offline
const INITIAL_CONECTORES: RhConector[] = [
  {
    id: 1,
    nome: 'Betha Sistemas - Folha & Lotação',
    driver: 'betha',
    api_key: 'rh_live_b37f198c42a0e8d71234567890abcdef',
    api_url: 'https://api.betha.cloud/service-layer/v1/rh',
    webhook_url: 'https://sysgov.municipio.gov.br/api/capd/integracoes-rh/webhook/betha',
    webhook_secret: 'whsec_7890abcdef123456',
    is_active: true,
    ultima_sincronizacao_em: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    logs_count: 142,
  },
  {
    id: 2,
    nome: 'IPM Atende.net - Frequência e Afastamentos',
    driver: 'ipm',
    api_key: 'rh_live_9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d',
    api_url: 'https://atende.net/ws/rh/v2',
    webhook_url: 'https://sysgov.municipio.gov.br/api/capd/integracoes-rh/webhook/ipm',
    webhook_secret: 'whsec_fedcba0987654321',
    is_active: true,
    ultima_sincronizacao_em: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    logs_count: 89,
  },
  {
    id: 3,
    nome: 'Senior Ronda - Catracas & Ponto Eletrônico',
    driver: 'senior',
    api_key: 'rh_live_554433221100aabbccddeeff00112233',
    api_url: 'https://senior.municipio.gov.br:8181/g5-senior-services',
    webhook_url: null,
    webhook_secret: null,
    is_active: false,
    ultima_sincronizacao_em: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    logs_count: 14,
  },
];

const INITIAL_LOGS: RhSyncLogItem[] = [
  {
    id: 501,
    integracao_id: 1,
    integracao: { id: 1, nome: 'Betha Sistemas - Folha', driver: 'betha' },
    tipo: 'servidores',
    direcao: 'inbound',
    status: 'sucesso',
    registros_processados: 342,
    registros_sucesso: 342,
    registros_falha: 0,
    detalhes: {
      mensagem: 'Sincronização cadastral de servidores efetivos concluída com sucesso.',
      lotacoes_atualizadas: 18,
      novos_admitidos: 3,
    },
    created_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
  },
  {
    id: 502,
    integracao_id: 2,
    integracao: { id: 2, nome: 'IPM Atende.net', driver: 'ipm' },
    tipo: 'afastamentos',
    direcao: 'inbound',
    status: 'sucesso',
    registros_processados: 12,
    registros_sucesso: 12,
    registros_falha: 0,
    detalhes: {
      mensagem: 'Afastamentos e licenças médicas processados para a cadência do ciclo.',
      tipos: ['Licença Médica', 'Maternidade', 'Capacitação'],
    },
    created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
  },
  {
    id: 503,
    integracao_id: 1,
    integracao: { id: 1, nome: 'Betha Sistemas - Folha', driver: 'betha' },
    tipo: 'homologacao',
    direcao: 'outbound',
    status: 'sucesso',
    registros_processados: 85,
    registros_sucesso: 85,
    registros_falha: 0,
    detalhes: {
      mensagem: 'Exportação de homologações da cadência trienal enviada para a folha (+10%).',
      protocolo_recebimento: 'BTH-2026-09-9941',
    },
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
  },
  {
    id: 504,
    integracao_id: 2,
    integracao: { id: 2, nome: 'IPM Atende.net', driver: 'ipm' },
    tipo: 'frequencia',
    direcao: 'inbound',
    status: 'parcial',
    registros_processados: 310,
    registros_sucesso: 304,
    registros_falha: 6,
    detalhes: {
      mensagem: 'Importação parcial: 6 registros continham matrículas inconsistentes no espelho de ponto.',
      erros: ['Matrícula 90112 não localizada', 'Matrícula 88204 com duplicidade de período'],
    },
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
  },
  {
    id: 505,
    integracao_id: 3,
    integracao: { id: 3, nome: 'Senior Ronda', driver: 'senior' },
    tipo: 'webhook',
    direcao: 'inbound',
    status: 'erro',
    registros_processados: 0,
    registros_sucesso: 0,
    registros_falha: 1,
    detalhes: {
      mensagem: 'Falha de handshake TLS com o gateway local do município.',
      codigo_http: 504,
      erro: 'Gateway Timeout ao consultar endpoint /g5-senior-services',
    },
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
];

export const IntegracoesEmbedPanel: React.FC = () => {
  // Estado das sub-abas internas
  const [activeSubTab, setActiveSubTab] = useState<'conectores' | 'logs' | 'embed'>('conectores');

  // Estados dos Conectores e Logs
  const [conectores, setConectores] = useState<RhConector[]>(INITIAL_CONECTORES);
  const [logs, setLogs] = useState<RhSyncLogItem[]>(INITIAL_LOGS);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  // Estados para Filtro de Logs
  const [logSearch, setLogSearch] = useState<string>('');
  const [logTipoFilter, setLogTipoFilter] = useState<string>('todos');
  const [logStatusFilter, setLogStatusFilter] = useState<string>('todos');

  // Estados dos Modais
  const [isConectorModalOpen, setIsConectorModalOpen] = useState<boolean>(false);
  const [editingConector, setEditingConector] = useState<RhConector | null>(null);
  const [conectorFormData, setConectorFormData] = useState<{
    nome: string;
    driver: 'betha' | 'ipm' | 'senior' | 'totvs' | 'generic_rest';
    api_url: string;
    webhook_url: string;
    is_active: boolean;
  }>({
    nome: '',
    driver: 'betha',
    api_url: '',
    webhook_url: '',
    is_active: true,
  });

  // Modal de Regeneração de Chave
  const [isRegenerateModalOpen, setIsRegenerateModalOpen] = useState<boolean>(false);
  const [targetConectorForRegen, setTargetConectorForRegen] = useState<RhConector | null>(null);

  // Modal de Inspeção de Log
  const [selectedLog, setSelectedLog] = useState<RhSyncLogItem | null>(null);

  // Toast / Feedback de Cópia
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  // Estados do Gerador de Embed
  const [embedConfig, setEmbedConfig] = useState<EmbedConfig>({
    identificador: 'MAT-2026-0042',
    mode: 'autoavaliacao',
    ttlMinutes: 60,
  });
  const [generatedEmbed, setGeneratedEmbed] = useState<EmbedGenerated | null>(null);
  const [isGeneratingEmbed, setIsGeneratingEmbed] = useState<boolean>(false);

  // Carregamento de dados (tenta API remota, fallback seguro para mocks)
  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [resConectores, resLogs] = await Promise.allSettled([
          api.capd.listIntegracoesRh(),
          api.capd.getIntegracoesLogs({ per_page: 50 }),
        ]);

        if (isMounted) {
          if (resConectores.status === 'fulfilled' && Array.isArray(resConectores.value) && resConectores.value.length > 0) {
            setConectores(resConectores.value);
          }
          if (resLogs.status === 'fulfilled' && resLogs.value?.data && Array.isArray(resLogs.value.data) && resLogs.value.data.length > 0) {
            setLogs(resLogs.value.data);
          }
        }
      } catch (err) {
        console.warn('Utilizando cache semente de integrações RH:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  // Cálculo reativo dos KPIs
  const kpis = useMemo(() => {
    return calculateKpis(conectores, logs, generatedEmbed ? 1 : 0);
  }, [conectores, logs, generatedEmbed]);

  // Filtro de Logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchSearch =
        !logSearch ||
        log.integracao?.nome.toLowerCase().includes(logSearch.toLowerCase()) ||
        log.tipo.toLowerCase().includes(logSearch.toLowerCase()) ||
        JSON.stringify(log.detalhes || {}).toLowerCase().includes(logSearch.toLowerCase());

      const matchTipo = logTipoFilter === 'todos' || log.tipo === logTipoFilter;
      const matchStatus = logStatusFilter === 'todos' || log.status === logStatusFilter;

      return matchSearch && matchTipo && matchStatus;
    });
  }, [logs, logSearch, logTipoFilter, logStatusFilter]);

  // Handler para copiar texto com feedback
  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(label);
    setTimeout(() => setCopySuccess(null), 2500);
  };

  // Handler para salvar conector (novo ou edição)
  const handleSalvarConector = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conectorFormData.nome.trim()) return;

    if (editingConector) {
      const updatedList = conectores.map((c) =>
        c.id === editingConector.id
          ? {
              ...c,
              nome: conectorFormData.nome,
              driver: conectorFormData.driver,
              api_url: conectorFormData.api_url || null,
              webhook_url: conectorFormData.webhook_url || null,
              is_active: conectorFormData.is_active,
            }
          : c
      );
      setConectores(updatedList);
    } else {
      const novo: RhConector = {
        id: Date.now(),
        nome: conectorFormData.nome,
        driver: conectorFormData.driver,
        api_key: `rh_live_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`,
        api_url: conectorFormData.api_url || null,
        webhook_url: conectorFormData.webhook_url || null,
        webhook_secret: `whsec_${Math.random().toString(36).substring(2, 12)}`,
        is_active: conectorFormData.is_active,
        ultima_sincronizacao_em: null,
        logs_count: 0,
      };
      setConectores([novo, ...conectores]);
    }

    setIsConectorModalOpen(false);
    setEditingConector(null);
  };

  // Handler para regenerar API Key
  const handleConfirmRegenerateKey = () => {
    if (!targetConectorForRegen) return;

    const novaChave = `rh_live_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    setConectores((prev) =>
      prev.map((c) => (c.id === targetConectorForRegen.id ? { ...c, api_key: novaChave } : c))
    );
    setIsRegenerateModalOpen(false);
    setTargetConectorForRegen(null);
    setCopySuccess('Chave de API regenerada com sucesso!');
    setTimeout(() => setCopySuccess(null), 3000);
  };

  // Handler para gerar token de embed
  const handleGerarEmbed = async () => {
    setIsGeneratingEmbed(true);
    try {
      let token = '';
      let url = '';
      try {
        const resp = await api.capd.generateEmbedToken(
          embedConfig.identificador,
          embedConfig.mode,
          embedConfig.ttlMinutes
        );
        token = resp.embed_token;
        const separator = resp.embed_url?.includes('?') ? '&' : '?';
        url = resp.embed_url
          ? `${resp.embed_url}${separator}sandbox=1&matricula=${encodeURIComponent(embedConfig.identificador)}`
          : `${window.location.origin}/capd/embed?token=${token}&mode=${embedConfig.mode}&sandbox=1&matricula=${encodeURIComponent(embedConfig.identificador)}`;
      } catch {
        token = `emb_${Math.random().toString(36).substring(2, 12)}_${Date.now()}`;
        url = `${window.location.origin}/capd/embed?token=${token}&mode=${embedConfig.mode}&sandbox=1&matricula=${encodeURIComponent(embedConfig.identificador)}`;
      }

      const snippet = generateIframeSnippet(url, `SYSGOV CAPD - ${embedConfig.mode.toUpperCase()}`);
      setGeneratedEmbed({
        token,
        url,
        expiresInMinutes: embedConfig.ttlMinutes,
        iframeSnippet: snippet,
        generatedAt: new Date().toISOString(),
      });
    } finally {
      setIsGeneratingEmbed(false);
    }
  };

  // Definição das colunas do DataTable de Logs
  const logColumns: ColumnDef<RhSyncLogItem>[] = [
    {
      accessorKey: 'created_at',
      header: 'Data / Hora',
      cell: ({ row }) => (
        <span className="font-mono tabular-nums text-xs text-foreground">
          {formatIsoDate(row.original.created_at)}
        </span>
      ),
    },
    {
      accessorKey: 'integracao',
      header: 'Conector ERP',
      cell: ({ row }) => {
        const int = row.original.integracao;
        return (
          <div className="flex flex-col">
            <span className="font-medium text-xs text-foreground">{int?.nome || 'Sistema Externo'}</span>
            <span className="text-[10px] text-muted-foreground">{getDriverLabel(int?.driver)}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'tipo',
      header: 'Tipo de Payload',
      cell: ({ row }) => {
        const tipo = row.original.tipo;
        const colorMap: Record<string, string> = {
          servidores: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
          frequencia: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300',
          afastamentos: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
          homologacao: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
          webhook: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
        };
        return (
          <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${colorMap[tipo] || 'bg-muted text-muted-foreground'}`}>
            {tipo.toUpperCase()}
          </span>
        );
      },
    },
    {
      accessorKey: 'direcao',
      header: 'Direção',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground uppercase font-mono">
          {row.original.direcao === 'inbound' ? '📥 Inbound' : '📤 Outbound'}
        </span>
      ),
    },
    {
      accessorKey: 'registros_processados',
      header: 'Registros (Sucesso/Total)',
      cell: ({ row }) => {
        const { registros_sucesso, registros_processados, registros_falha } = row.original;
        return (
          <div className="flex items-center gap-1 font-mono tabular-nums text-xs">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{registros_sucesso}</span>
            <span className="text-muted-foreground">/</span>
            <span>{registros_processados}</span>
            {registros_falha > 0 && (
              <span className="text-rose-600 dark:text-rose-400 text-[11px] ml-1">
                ({registros_falha} falha{registros_falha > 1 ? 's' : ''})
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status;
        if (status === 'sucesso') {
          return (
            <Badge variant="success" className="text-[10px] gap-1">
              <CheckCircle2 className="h-3 w-3" /> Sucesso
            </Badge>
          );
        }
        if (status === 'parcial') {
          return (
            <Badge variant="warning" className="text-[10px] gap-1">
              <AlertTriangle className="h-3 w-3" /> Parcial
            </Badge>
          );
        }
        return (
          <Badge variant="destructive" className="text-[10px] gap-1">
            <XCircle className="h-3 w-3" /> Erro
          </Badge>
        );
      },
    },
    {
      id: 'acoes',
      header: 'Ações',
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => setSelectedLog(row.original)}
        >
          <Eye className="h-3 w-3" /> Detalhes
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Alerta de Cópia / Notificação Flutuante */}
      {copySuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-200 rounded-lg text-sm flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>{copySuccess}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setCopySuccess(null)} className="h-6 w-6 p-0">
            ×
          </Button>
        </div>
      )}

      {/* ── PAINEL EXECUTIVO: KPIS DE INTEGRAÇÃO & EMBED ─────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Conectores ERP"
          value={`${kpis.conectoresAtivos} / ${kpis.totalConectores}`}
          caption="Conectores ativos no tenant"
          accentClassName="border-l-emerald-500"
          valueClassName="text-emerald-600 dark:text-emerald-400 font-mono tabular-nums"
        />
        <StatCard
          label="Total de Sincronizações"
          value={String(kpis.totalSincronizacoes)}
          caption="Cargas registradas na trilha"
          accentClassName="border-l-indigo-500"
          valueClassName="text-indigo-600 dark:text-indigo-400 font-mono tabular-nums"
        />
        <StatCard
          label="Taxa de Sucesso Operacional"
          value={`${kpis.taxaSucesso}%`}
          caption="Eficácia das rotinas de sincronia"
          accentClassName="border-l-cyan-500"
          valueClassName="text-cyan-600 dark:text-cyan-400 font-mono tabular-nums"
        />
        <StatCard
          label="Sessões Embed Ativas"
          value={String(kpis.totalEmbedAtivos)}
          caption="Widgets embutidos em portais"
          accentClassName="border-l-amber-500"
          valueClassName="text-amber-600 dark:text-amber-400 font-mono tabular-nums"
        />
      </div>

      {/* ── BARRA DE SUB-ABAS E AÇÕES RÁPIDAS ──────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Button
            variant={activeSubTab === 'conectores' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setActiveSubTab('conectores')}
            className="gap-2"
          >
            <Database className="h-4 w-4" />
            Conectores ERP & REST
            <Badge variant="secondary" className="ml-1 text-[10px] font-mono">
              {conectores.length}
            </Badge>
          </Button>

          <Button
            variant={activeSubTab === 'logs' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setActiveSubTab('logs')}
            className="gap-2"
          >
            <Layers className="h-4 w-4" />
            Trilha de Logs & Auditoria
            <Badge variant="secondary" className="ml-1 text-[10px] font-mono">
              {logs.length}
            </Badge>
          </Button>

          <Button
            variant={activeSubTab === 'embed' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setActiveSubTab('embed')}
            className="gap-2"
          >
            <Code2 className="h-4 w-4" />
            Gerador & Simulador Embed
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {activeSubTab === 'conectores' && (
            <Button
              variant="primary"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                setEditingConector(null);
                setConectorFormData({
                  nome: '',
                  driver: 'betha',
                  api_url: '',
                  webhook_url: '',
                  is_active: true,
                });
                setIsConectorModalOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> Novo Conector
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setRefreshKey((k) => k + 1)}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* ── CONTEÚDO SUB-ABA 1: CONECTORES ERP & REST ─────────────────── */}
      {activeSubTab === 'conectores' && (
        <div className="space-y-4">
          {conectores.length === 0 ? (
            <EmptyState
              title="Nenhum conector ERP cadastrado"
              description="Configure conectores para sincronizar servidores, afastamentos e ocorrências funcionais com sistemas de folha de pagamento municipais."
              actionLabel="Cadastrar Primeiro Conector"
              onAction={() => setIsConectorModalOpen(true)}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {conectores.map((conector) => (
                <Card key={conector.id} className="flex flex-col justify-between border-border hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Badge variant={conector.is_active ? 'success' : 'secondary'} className="mb-2">
                          {conector.is_active ? 'Conector Ativo' : 'Desativado'}
                        </Badge>
                        <CardTitle className="text-base font-semibold text-foreground">
                          {conector.nome}
                        </CardTitle>
                        <CardDescription className="text-xs text-muted-foreground">
                          {getDriverLabel(conector.driver)}
                        </CardDescription>
                      </div>
                      <Radio className={`h-4 w-4 ${conector.is_active ? 'text-emerald-500 animate-pulse' : 'text-muted-foreground'}`} />
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 text-xs pt-0">
                    {/* URL do Endpoint */}
                    <div className="space-y-1">
                      <span className="text-muted-foreground font-medium flex items-center gap-1">
                        <Globe className="h-3.5 w-3.5" /> URL Base da API:
                      </span>
                      <div className="p-1.5 bg-muted/50 rounded font-mono text-[11px] truncate text-foreground border border-border/50">
                        {conector.api_url || '— Endpoint não configurado —'}
                      </div>
                    </div>

                    {/* Chave de API Mascarada */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground font-medium flex items-center gap-1">
                          <Key className="h-3.5 w-3.5" /> Chave de Autenticação:
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 px-1.5 text-[10px] text-primary"
                          onClick={() => handleCopyText(conector.api_key, `Chave do conector ${conector.nome} copiada!`)}
                        >
                          <Copy className="h-3 w-3 mr-1" /> Copiar
                        </Button>
                      </div>
                      <div className="p-1.5 bg-muted/50 rounded font-mono text-[11px] text-foreground border border-border/50">
                        {maskApiKey(conector.api_key)}
                      </div>
                    </div>

                    {/* Metadados de Auditoria */}
                    <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Última sincronia:</span>
                      <span className="font-mono tabular-nums font-medium text-foreground">
                        {formatIsoDate(conector.ultima_sincronizacao_em)}
                      </span>
                    </div>

                    {/* Botões de Ação */}
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs gap-1"
                        onClick={() => {
                          setTargetConectorForRegen(conector);
                          setIsRegenerateModalOpen(true);
                        }}
                      >
                        <RefreshCw className="h-3 w-3" /> Regenerar Key
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs gap-1"
                        onClick={() => {
                          setEditingConector(conector);
                          setConectorFormData({
                            nome: conector.nome,
                            driver: conector.driver,
                            api_url: conector.api_url || '',
                            webhook_url: conector.webhook_url || '',
                            is_active: conector.is_active,
                          });
                          setIsConectorModalOpen(true);
                        }}
                      >
                        <Sliders className="h-3 w-3" /> Editar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── CONTEÚDO SUB-ABA 2: TRILHA DE AUDITORIA & LOGS ────────────── */}
      {activeSubTab === 'logs' && (
        <Card className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-foreground">Logs de Sincronização & Trilha de Auditoria</h3>
              <p className="text-xs text-muted-foreground">
                Auditoria de tráfego de dados de pessoal, movimentações funcionais e devoluções homologadas.
              </p>
            </div>

            {/* Filtros de Logs */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <Input
                placeholder="Pesquisar logs..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="h-8 text-xs w-48"
              />
              <div className="w-36">
                <Select
                  value={logTipoFilter}
                  onChange={(val) => setLogTipoFilter(val)}
                  options={[
                    { value: 'todos', label: 'Todos os Tipos' },
                    { value: 'servidores', label: 'Servidores' },
                    { value: 'frequencia', label: 'Frequência' },
                    { value: 'afastamentos', label: 'Afastamentos' },
                    { value: 'homologacao', label: 'Homologação' },
                    { value: 'webhook', label: 'Webhooks' },
                  ]}
                />
              </div>
              <div className="w-32">
                <Select
                  value={logStatusFilter}
                  onChange={(val) => setLogStatusFilter(val)}
                  options={[
                    { value: 'todos', label: 'Todos Status' },
                    { value: 'sucesso', label: 'Sucesso' },
                    { value: 'parcial', label: 'Parcial' },
                    { value: 'erro', label: 'Erro' },
                  ]}
                />
              </div>
            </div>
          </div>

          <DataTable
            columns={logColumns}
            data={filteredLogs}
            pagination={true}
            pageSize={10}
            pageSizeSelector={true}
            pageSizeOptions={[10, 25, 50]}
          />
        </Card>
      )}

      {/* ── CONTEÚDO SUB-ABA 3: GERADOR & SIMULADOR DE EMBED ──────────── */}
      {activeSubTab === 'embed' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Coluna Esquerda: Parâmetros e Snippet */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="p-4 space-y-4">
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <Code2 className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="text-sm font-bold text-foreground">Emissor de Token de Embed</h3>
                  <p className="text-xs text-muted-foreground">Injeção headless segura para Intranet ou Portal do Servidor.</p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                {/* Seleção do Módulo */}
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Módulo da Interface Embed:</label>
                  <Select
                    value={embedConfig.mode}
                    onChange={(val) =>
                      setEmbedConfig({ ...embedConfig, mode: val as EmbedConfig['mode'] })
                    }
                    options={[
                      { value: 'autoavaliacao', label: 'Autoavaliação do Servidor (Graus 1 a 5)' },
                      { value: 'diario-bordo', label: 'Diário de Bordo (Incidente Crítico - CIT)' },
                      { value: 'espelho', label: 'Espelho Avaliativo do Servidor' },
                      { value: 'recurso', label: 'Interposição de Recurso (Arts. 30 e 31)' },
                    ]}
                  />
                </div>

                {/* Identificador do Servidor */}
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Identificador / Matrícula Alvo:</label>
                  <Input
                    placeholder="Ex: MAT-2026-0042 ou CPF"
                    value={embedConfig.identificador}
                    onChange={(e) => setEmbedConfig({ ...embedConfig, identificador: e.target.value })}
                    className="font-mono text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground">Identificador do servidor associado ao token.</p>
                </div>

                {/* TTL de Expiração */}
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Tempo de Expiração (TTL):</label>
                  <Select
                    value={String(embedConfig.ttlMinutes)}
                    onChange={(val) =>
                      setEmbedConfig({ ...embedConfig, ttlMinutes: Number(val) })
                    }
                    options={[
                      { value: '30', label: '30 minutos (Sessão Rápida)' },
                      { value: '60', label: '1 hora (Padrão Recomendado)' },
                      { value: '120', label: '2 horas' },
                      { value: '1440', label: '24 horas (Ciclo Intensivo)' },
                    ]}
                  />
                </div>

                <Button
                  variant="primary"
                  className="w-full gap-2 mt-2"
                  onClick={handleGerarEmbed}
                  disabled={isGeneratingEmbed || !embedConfig.identificador.trim()}
                >
                  <Play className="h-4 w-4" />
                  {isGeneratingEmbed ? 'Gerando Token...' : 'Gerar Token & Snippet de Embed'}
                </Button>
              </div>
            </Card>

            {/* Bloco de Código Gerado */}
            {generatedEmbed && (
              <Card className="p-4 space-y-3 bg-muted/20 border-border">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Key className="h-4 w-4 text-emerald-500" /> Token Gerado
                  </span>
                  <Badge variant="success" className="text-[10px]">
                    Ativo por {generatedEmbed.expiresInMinutes} min
                  </Badge>
                </div>

                <div className="p-2 bg-background rounded border border-border font-mono text-[11px] truncate text-foreground flex items-center justify-between">
                  <span className="truncate">{maskApiKey(generatedEmbed.token)}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1.5 text-[10px]"
                    onClick={() => handleCopyText(generatedEmbed.token, 'Token copiado para a área de transferência!')}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">Snippet de Incorporação (HTML):</label>
                    <Button
                      variant="primary"
                      size="sm"
                      className="h-6 text-[11px] gap-1"
                      onClick={() => handleCopyText(generatedEmbed.iframeSnippet, 'Código HTML do iframe copiado!')}
                    >
                      <Copy className="h-3 w-3" /> Copiar HTML
                    </Button>
                  </div>
                  <pre className="p-2.5 bg-slate-900 text-slate-100 rounded text-[11px] font-mono overflow-x-auto border border-slate-800">
                    {generatedEmbed.iframeSnippet}
                  </pre>
                </div>
              </Card>
            )}
          </div>

          {/* Coluna Direita: Simulador Sandbox */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="p-4 flex flex-col h-full border-border">
              <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-indigo-500" />
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Simulador Sandbox do Embed</h3>
                    <p className="text-xs text-muted-foreground">Pré-visualização em tempo real da interface embutida.</p>
                  </div>
                </div>

                {generatedEmbed && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => window.open(generatedEmbed.url, '_blank')}
                  >
                    <ExternalLink className="h-3 w-3" /> Abrir em Nova Aba
                  </Button>
                )}
              </div>

              {/* Moldura do Simulador */}
              <div className="flex-1 min-h-[480px] bg-muted/40 rounded-lg border border-dashed border-border flex flex-col overflow-hidden">
                <div className="bg-muted px-4 py-2 border-b border-border flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-2 font-mono">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" />
                    <span>https://intranet.municipio.gov.br/portal-servidor/capd-widget</span>
                  </div>
                  <span className="text-[10px] bg-background px-2 py-0.5 rounded border border-border">
                    Sandbox Seguro
                  </span>
                </div>

                <div className="flex-1 p-4 flex items-center justify-center">
                  {generatedEmbed ? (
                    <iframe
                      src={generatedEmbed.url}
                      title="SYSGOV - Sandbox Preview"
                      className="w-full h-full min-h-[440px] border border-border rounded bg-background shadow-sm"
                      sandbox="allow-scripts allow-forms allow-same-origin"
                    />
                  ) : (
                    <div className="text-center p-8 space-y-2">
                      <Code2 className="h-10 w-10 text-muted-foreground mx-auto stroke-1" />
                      <div className="font-semibold text-sm text-foreground">Aguardando geração do token</div>
                      <p className="text-xs text-muted-foreground max-w-sm">
                        Selecione os parâmetros desejados no painel à esquerda e clique em &quot;Gerar Token & Snippet&quot; para visualizar a tela interativa do servidor.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ── MODAL: NOVO / EDIÇÃO DE CONECTOR ERP ──────────────────────── */}
      {isConectorModalOpen && (
        <Modal
          open={isConectorModalOpen}
          onClose={() => {
            setIsConectorModalOpen(false);
            setEditingConector(null);
          }}
          title={editingConector ? 'Editar Conector ERP' : 'Cadastrar Novo Conector ERP'}
        >
          <form onSubmit={handleSalvarConector} className="space-y-4 pt-2 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-foreground">Nome Identificador:</label>
              <Input
                placeholder="Ex: Betha Sistemas - Folha de Pessoal"
                value={conectorFormData.nome}
                onChange={(e) => setConectorFormData({ ...conectorFormData, nome: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-foreground">Driver do Sistema ERP:</label>
              <Select
                value={conectorFormData.driver}
                onChange={(val) =>
                  setConectorFormData({
                    ...conectorFormData,
                    driver: val as RhConector['driver'],
                  })
                }
                options={[
                  { value: 'betha', label: 'Betha Sistemas (Fly)' },
                  { value: 'ipm', label: 'IPM Atende.net' },
                  { value: 'senior', label: 'Senior Ronda / Gestão de Pessoas' },
                  { value: 'totvs', label: 'TOTVS Protheus RH' },
                  { value: 'generic_rest', label: 'REST API Genérico' },
                ]}
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-foreground">URL Base do Endpoint:</label>
              <Input
                placeholder="https://api.erp.municipio.gov.br/v1"
                value={conectorFormData.api_url}
                onChange={(e) => setConectorFormData({ ...conectorFormData, api_url: e.target.value })}
              />
              <p className="text-[11px] text-muted-foreground">URL base para requisições síncronas de servidores e afastamentos.</p>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-foreground">Webhook Inbound (Opcional):</label>
              <Input
                placeholder="https://sysgov.municipio.gov.br/api/capd/integracoes-rh/webhook/..."
                value={conectorFormData.webhook_url}
                onChange={(e) => setConectorFormData({ ...conectorFormData, webhook_url: e.target.value })}
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Switch
                checked={conectorFormData.is_active}
                onCheckedChange={(val) => setConectorFormData({ ...conectorFormData, is_active: val })}
              />
              <span className="font-medium text-foreground">Conector Ativo para Sincronizações</span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsConectorModalOpen(false);
                  setEditingConector(null);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" variant="primary">
                Salvar Conector
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── MODAL: CONFIRMAÇÃO DE REGENERAÇÃO DE CHAVE ─────────────────── */}
      {isRegenerateModalOpen && targetConectorForRegen && (
        <ConfirmDialog
          open={isRegenerateModalOpen}
          title="Regenerar Chave de API?"
          description={`Atenção: A chave atual do conector "${targetConectorForRegen.nome}" será invalidada imediatamente. Qualquer integração em execução que utilize a credencial antiga deixará de autenticar até que a nova chave seja aplicada no sistema de folha.`}
          confirmLabel="Sim, Regenerar Chave"
          cancelLabel="Cancelar"
          destructive={true}
          requireReason={false}
          onConfirm={handleConfirmRegenerateKey}
          onClose={() => {
            setIsRegenerateModalOpen(false);
            setTargetConectorForRegen(null);
          }}
        />
      )}

      {/* ── MODAL: DETALHES DO LOG DE SINCRONIZAÇÃO ───────────────────── */}
      {selectedLog && (
        <Modal
          open={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title="Detalhes do Log de Sincronização"
        >
          <div className="space-y-4 pt-2 text-xs">
            <div className="grid grid-cols-2 gap-2 bg-muted/40 p-3 rounded border border-border">
              <div>
                <span className="text-muted-foreground block text-[11px]">Conector:</span>
                <span className="font-semibold text-foreground">{selectedLog.integracao?.nome}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Data / Hora:</span>
                <span className="font-mono tabular-nums text-foreground">{formatIsoDate(selectedLog.created_at)}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Tipo de Operação:</span>
                <span className="font-mono text-foreground uppercase">{selectedLog.tipo} ({selectedLog.direcao})</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Resultado:</span>
                <span className="font-semibold text-foreground uppercase">{selectedLog.status}</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-foreground">Carga de Registros Processados:</label>
              <div className="flex items-center gap-4 font-mono tabular-nums text-xs p-2 bg-background rounded border border-border">
                <span>Total: <b>{selectedLog.registros_processados}</b></span>
                <span className="text-emerald-600">Sucessos: <b>{selectedLog.registros_sucesso}</b></span>
                <span className="text-rose-600">Falhas: <b>{selectedLog.registros_falha}</b></span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-foreground">Payload de Resposta / Metadados:</label>
              <pre className="p-3 bg-slate-950 text-emerald-400 rounded text-[11px] font-mono overflow-x-auto max-h-60 border border-slate-800">
                {JSON.stringify(selectedLog.detalhes || {}, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setSelectedLog(null)}>
                Fechar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
