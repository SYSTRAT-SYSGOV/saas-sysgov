import React, { useCallback, useEffect, useState, useMemo } from 'react';
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
  Modal,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@sysgov/ui';
import {
  PageHeader,
  Tabs,
  SearchInput,
  Field,
  StatusChip,
  EmptyState,
  type TabsItem,
} from '@/components/ui';
import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle,
  FileCheck,
  FileText,
  Gavel,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Upload,
  UserCheck,
  Users,
  AlertTriangle,
  Key,
  Link2,
  ExternalLink,
  Download,
  UserPlus,
  GraduationCap,
  Clock,
  Check,
  Copy,
  Database,
  Code,
  AlertCircle,
} from 'lucide-react';
import { SysgovApi } from '@sysgov/sdk';
import type {
  ApiAvaliacao,
  ApiCiclo,
  ApiComissao,
  ApiDashboardMetricas,
  ApiDiarioBordo,
  ApiFator,
  ApiRecurso,
  ApiSessao,
  ApiServidor,
  ApiRhIntegracao,
  ApiRhSyncLog,
} from '@sysgov/sdk';

const api = new SysgovApi();

type CapdTab =
  | 'dashboard'
  | 'servidores'
  | 'diario'
  | 'avaliacoes'
  | 'estagio'
  | 'pdi'
  | 'recursos'
  | 'comissao'
  | 'integracao'
  | 'homologacao';

export const CapdModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<CapdTab>('servidores');
  const [loading, setLoading] = useState<boolean>(true);
  const [metricas, setMetricas] = useState<ApiDashboardMetricas | null>(null);
  const [cicloId, setCicloId] = useState<number>(1);

  // Estados de dados principais
  const [incidentes, setIncidentes] = useState<ApiDiarioBordo[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<ApiAvaliacao[]>([]);
  const [recursos, setRecursos] = useState<ApiRecurso[]>([]);
  const [sessoes, setSessoes] = useState<ApiSessao[]>([]);
  const [comissoes, setComissoes] = useState<ApiComissao[]>([]);

  // Estados para Gestão de Servidores
  const [servidores, setServidores] = useState<ApiServidor[]>([]);
  const [totalServidores, setTotalServidores] = useState<number>(0);
  const [buscaServidor, setBuscaServidor] = useState<string>('');
  const [filtroSituacao, setFiltroSituacao] = useState<string>('');
  const [modalServidorAberto, setModalServidorAberto] = useState<boolean>(false);
  const [modalImportarAberto, setModalImportarAberto] = useState<boolean>(false);
  const [csvTexto, setCsvTexto] = useState<string>('');
  const [importandoCsv, setImportandoCsv] = useState<boolean>(false);
  const [salvandoServidor, setSalvandoServidor] = useState<boolean>(false);
  const [novoServidor, setNovoServidor] = useState({
    matricula: '',
    cpf: '',
    nome_completo: '',
    email: '',
    cargo_efetivo: '',
    orgao_lotacao: '',
    regime_juridico: 'estatutario' as const,
    regime_previdenciario: 'rpps' as const,
    carga_horaria_semanal: 40,
    situacao_funcional: 'ativo' as const,
    estagio_probatorio: false,
  });

  // Estados para Integrações RH & Injeção Embed
  const [integracoes, setIntegracoes] = useState<ApiRhIntegracao[]>([]);
  const [logsSync, setLogsSync] = useState<ApiRhSyncLog[]>([]);
  const [modalIntegracaoAberto, setModalIntegracaoAberto] = useState<boolean>(false);
  const [novaIntegracao, setNovaIntegracao] = useState({
    nome: '',
    driver: 'betha' as const,
    api_url: '',
    webhook_url: '',
  });
  const [embedIdentificador, setEmbedIdentificador] = useState<string>('');
  const [embedMode, setEmbedMode] = useState<'autoavaliacao' | 'diario-bordo' | 'espelho' | 'recurso'>('autoavaliacao');
  const [embedTokenGerado, setEmbedTokenGerado] = useState<{
    embed_token: string;
    expires_in: number;
    embed_url: string;
  } | null>(null);
  const [copiadoToken, setCopiadoToken] = useState<boolean>(false);
  const [copiadoKey, setCopiadoKey] = useState<string | null>(null);

  // Modais de Avaliação e CIT
  const [modalCitAberto, setModalCitAberto] = useState<boolean>(false);
  const [modalAvaliacaoAberto, setModalAvaliacaoAberto] = useState<boolean>(false);
  const [avaliacaoSelecionada, setAvaliacaoSelecionada] = useState<ApiAvaliacao | null>(null);

  // Form CIT
  const [novoCit, setNovoCit] = useState({
    servidor_id: 1,
    fator_id: 3,
    tipo: 'positivo' as 'positivo' | 'negativo',
    data_ocorrencia: new Date().toISOString().split('T')[0],
    descricao_fato: '',
  });
  const [arquivoEvidencia, setArquivoEvidencia] = useState<File | null>(null);

  // Form Avaliação
  const [respostasAvaliacao, setRespostasAvaliacao] = useState<Record<string, { grau: number }>>({
    F3: { grau: 3 },
    F4: { grau: 3 },
    F5: { grau: 3 },
    F6: { grau: 3 },
    F7: { grau: 3 },
    F8: { grau: 3 },
  });
  const [notaPrevia, setNotaPrevia] = useState<string>('5.00');

  // Carregar dados gerais
  const carregarDados = useCallback(async () => {
    setLoading(true);
    try {
      const dataMetricas = await api.capd.getMetricas(cicloId).catch(() => null);
      if (dataMetricas) setMetricas(dataMetricas);

      const [resCit, resAv, resRec, resSess, resCom, resServ, resInt, resLogs] = await Promise.all([
        api.capd.listDiarioBordo({ ciclo_id: cicloId }).catch(() => ({ data: [] })),
        api.capd.listAvaliacoes({ ciclo_id: cicloId }).catch(() => ({ data: [] })),
        api.capd.listRecursos().catch(() => ({ data: [] })),
        api.capd.listSessoes().catch(() => ({ data: [] })),
        api.capd.listComissoes().catch(() => ({ data: [] })),
        api.capd.listServidores({
          search: buscaServidor.trim() ? buscaServidor.trim() : undefined,
          situacao: filtroSituacao ? filtroSituacao : undefined,
        }).catch((err) => {
          console.error('Falha ao listar servidores:', err);
          return { data: [], total: 0 };
        }),
        api.capd.listIntegracoesRh().catch(() => []),
        api.capd.getIntegracoesLogs({ per_page: 15 }).catch(() => ({ data: [], total: 0 })),
      ]);

      setIncidentes(resCit?.data || []);
      setAvaliacoes(resAv?.data || []);
      setRecursos(resRec?.data || []);
      setSessoes(resSess?.data || []);
      setComissoes(resCom?.data || []);

      const listServ = Array.isArray(resServ) ? resServ : (resServ?.data || []);
      setServidores(listServ);
      setTotalServidores(typeof resServ?.total === 'number' ? resServ.total : listServ.length);

      setIntegracoes(Array.isArray(resInt) ? resInt : []);
      setLogsSync(resLogs?.data || []);
    } catch (e) {
      console.error('Erro ao carregar dados do CAPD:', e);
    } finally {
      setLoading(false);
    }
  }, [cicloId, buscaServidor, filtroSituacao]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // Handlers para Servidores
  const handleSalvarServidor = async () => {
    if (!novoServidor.matricula || !novoServidor.cpf || !novoServidor.nome_completo) {
      alert('Preencha os campos obrigatórios: Matrícula, CPF e Nome Completo.');
      return;
    }
    setSalvandoServidor(true);
    try {
      await api.capd.createServidor(novoServidor);
      setModalServidorAberto(false);
      setNovoServidor({
        matricula: '',
        cpf: '',
        nome_completo: '',
        email: '',
        cargo_efetivo: '',
        orgao_lotacao: '',
        regime_juridico: 'estatutario',
        regime_previdenciario: 'rpps',
        carga_horaria_semanal: 40,
        situacao_funcional: 'ativo',
        estagio_probatorio: false,
      });
      await carregarDados();
      setActiveTab('servidores');
      alert('Servidor público cadastrado com sucesso!');
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Erro ao cadastrar servidor');
    } finally {
      setSalvandoServidor(false);
    }
  };

  const handleImportarCsv = async () => {
    if (!csvTexto.trim()) {
      alert('Insira o conteúdo CSV para importação.');
      return;
    }
    setImportandoCsv(true);
    try {
      const res = await api.capd.importarServidoresCsv(csvTexto);
      setModalImportarAberto(false);
      setCsvTexto('');
      await carregarDados();
      setActiveTab('servidores');
      alert(`Importação concluída! Total processado: ${res.total}. Inseridos: ${res.inseridos}, Atualizados: ${res.atualizados}.`);
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Erro ao importar lote CSV');
    } finally {
      setImportandoCsv(false);
    }
  };

  // Handlers para Integrações RH & Embed
  const handleSalvarIntegracao = async () => {
    if (!novaIntegracao.nome) {
      alert('Informe o nome identificador do conector ERP.');
      return;
    }
    try {
      await api.capd.createIntegracaoRh(novaIntegracao);
      setModalIntegracaoAberto(false);
      setNovaIntegracao({ nome: '', driver: 'betha', api_url: '', webhook_url: '' });
      await carregarDados();
      alert('Conector de RH configurado com sucesso! Chave de API gerada.');
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Erro ao criar integração de RH');
    }
  };

  const handleGerarEmbedToken = async () => {
    if (!embedIdentificador.trim()) {
      alert('Informe a Matrícula ou CPF do servidor para gerar a sessão de injeção.');
      return;
    }
    try {
      const res = await api.capd.generateEmbedToken(embedIdentificador, embedMode, 120);
      setEmbedTokenGerado(res);
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Erro ao gerar token de injeção headless');
    }
  };

  const handleCopiarTexto = (texto: string, tipo: 'token' | string) => {
    navigator.clipboard.writeText(texto);
    if (tipo === 'token') {
      setCopiadoToken(true);
      setTimeout(() => setCopiadoToken(false), 2000);
    } else {
      setCopiadoKey(tipo);
      setTimeout(() => setCopiadoKey(null), 2000);
    }
  };

  // Handlers de CIT, Avaliação e Homologação
  const handleSalvarCit = async () => {
    try {
      const cit = await api.capd.createDiarioBordo({
        ...novoCit,
        ciclo_id: cicloId,
      });

      if (arquivoEvidencia && cit.id) {
        await api.capd.uploadEvidencia(cit.id, arquivoEvidencia);
      }

      setModalCitAberto(false);
      setNovoCit({
        servidor_id: 1,
        fator_id: 3,
        tipo: 'positivo',
        data_ocorrencia: new Date().toISOString().split('T')[0],
        descricao_fato: '',
      });
      setArquivoEvidencia(null);
      await carregarDados();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Falha ao salvar incidente CIT');
    }
  };

  const handleSubmeterAvaliacao = async () => {
    if (!avaliacaoSelecionada) return;
    try {
      await api.capd.salvarRascunho(avaliacaoSelecionada.id, respostasAvaliacao);
      await api.capd.submeterAvaliacao(avaliacaoSelecionada.id);
      setModalAvaliacaoAberto(false);
      await carregarDados();
      alert('Avaliação submetida e nota NFD calculada com sucesso!');
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Erro ao submeter avaliação');
    }
  };

  const handleHomologarCiclo = async () => {
    if (!confirm('Deseja homologar em lote todas as avaliações deste ciclo? Todas as notas se tornarão imutáveis.')) {
      return;
    }
    try {
      const res = await api.capd.homologarCiclo(cicloId);
      alert(res.message || 'Ciclo homologado com sucesso! Evento Outbox gerado.');
      await carregarDados();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Não foi possível homologar o ciclo.');
    }
  };

  // Filtros derivados
  const servidoresEstagio = useMemo(
    () => servidores.filter((s) => Boolean(s.estagio_probatorio)),
    [servidores]
  );

  const tabItems: TabsItem<CapdTab>[] = [
    { key: 'servidores', label: 'Servidores', icon: <Users className="h-4 w-4" />, badge: totalServidores },
    { key: 'estagio', label: 'Estágio Probatório', icon: <Clock className="h-4 w-4" />, badge: servidoresEstagio.length },
    { key: 'dashboard', label: 'Dashboard & BI', icon: <Award className="h-4 w-4" /> },
    { key: 'diario', label: 'Diário de Bordo (CIT)', icon: <BookOpen className="h-4 w-4" /> },
    { key: 'avaliacoes', label: 'Avaliações', icon: <UserCheck className="h-4 w-4" /> },
    { key: 'pdi', label: 'PDI & Capacitação', icon: <GraduationCap className="h-4 w-4" /> },
    { key: 'recursos', label: 'Recursos', icon: <FileCheck className="h-4 w-4" /> },
    { key: 'comissao', label: 'Colegiado & Sessões', icon: <Gavel className="h-4 w-4" /> },
    { key: 'integracao', label: 'Integrações RH & Embed', icon: <Database className="h-4 w-4" /> },
    { key: 'homologacao', label: 'Homologação Final', icon: <Lock className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* ── CABEÇALHO DO MÓDULO ───────────────────────────────────────── */}
      <PageHeader
        icon={<Award className="h-6 w-6" />}
        title="Comissão de Avaliação Periódica de Desempenho"
        subtitle="Metodologia de Escala Gráfica ponderada, Diário de Bordo CIT, Universal RH e Injeção em Terceiros."
        badge="SAPDS / CAPD"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={carregarDados} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button size="sm" onClick={() => setModalCitAberto(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Novo Incidente (CIT)
            </Button>
          </div>
        }
      />

      {/* ── BARRA DE NAVEGAÇÃO DE ABAS ─────────────────────────────────── */}
      <div className="overflow-x-auto pb-1">
        <Tabs items={tabItems} value={activeTab} onChange={setActiveTab} />
      </div>

      {/* ── ABA 1: GESTÃO DE SERVIDORES (RH UNIVERSAL) ────────────────── */}
      {activeTab === 'servidores' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 max-w-xl">
              <SearchInput
                value={buscaServidor}
                onChange={setBuscaServidor}
                placeholder="Buscar por nome, matrícula, CPF ou órgão..."
                className="flex-1"
              />
              <Select
                value={filtroSituacao}
                onChange={setFiltroSituacao}
                options={[
                  { value: '', label: 'Todas as Situações' },
                  { value: 'ativo', label: 'Ativo' },
                  { value: 'afastado_saude', label: 'Afastado Saúde' },
                  { value: 'licenca_premio', label: 'Licença Prêmio' },
                  { value: 'cedido', label: 'Cedido' },
                  { value: 'exonerado', label: 'Exonerado' },
                ]}
                className="w-48"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setModalImportarAberto(true)}>
                <Upload className="h-4 w-4 mr-1.5" />
                Importar CSV Universal
              </Button>
              <Button size="sm" onClick={() => setModalServidorAberto(true)}>
                <UserPlus className="h-4 w-4 mr-1.5" />
                Novo Servidor
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-mono text-xs">Matrícula</TableHead>
                    <TableHead>Servidor / CPF</TableHead>
                    <TableHead>Cargo Efetivo & Lotação</TableHead>
                    <TableHead>Regime</TableHead>
                    <TableHead>Situação Funcional</TableHead>
                    <TableHead>Estágio Probatório</TableHead>
                    <TableHead className="text-right">Origem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {servidores.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-12">
                        <EmptyState
                          icon={<Users className="h-8 w-8 text-muted-foreground" />}
                          title="Nenhum servidor encontrado"
                          description={
                            buscaServidor
                              ? `Nenhum resultado para "${buscaServidor}". Tente outro termo.`
                              : "Nenhum servidor público cadastrado neste município ainda."
                          }
                          actionLabel="Cadastrar Primeiro Servidor"
                          onAction={() => setModalServidorAberto(true)}
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    servidores.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono text-xs font-bold text-primary">
                          {s.matricula}
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-xs text-foreground">{s.nome_completo}</div>
                          <div className="font-mono text-[11px] text-muted-foreground tabular-nums">{s.cpf}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs font-medium text-foreground">{s.cargo_efetivo}</div>
                          <div className="text-[11px] text-muted-foreground">{s.orgao_lotacao}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="uppercase text-[10px] font-mono">
                            {s.regime_juridico}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <StatusChip
                            label={s.situacao_funcional.replace('_', ' ')}
                            variant={s.situacao_funcional === 'ativo' ? 'success' : 'warning'}
                          />
                        </TableCell>
                        <TableCell>
                          {s.estagio_probatorio ? (
                            <Badge variant="outline" className="text-[10px] font-mono text-primary border-primary/40">
                              Fase {s.estagio_fase_atual || 1}/6 (Em Curso)
                            </Badge>
                          ) : (
                            <span className="text-[11px] text-muted-foreground font-mono">Estável (Art. 41)</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-[10px] font-mono text-muted-foreground uppercase">
                            {s.origem_sistema || 'manual'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── ABA 2: ESTÁGIO PROBATÓRIO (CF ART. 41) ─────────────────────── */}
      {activeTab === 'estagio' && (
        <div className="space-y-4">
          <Card className="border-primary/20 bg-accent/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                <Clock className="h-5 w-5 text-primary" />
                Acompanhamento de Estágio Probatório (Art. 41 da CF/88)
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Ciclo especial de 36 meses com avaliações periódicas semestrais/quadrimestrais para aquisição de estabilidade funcional.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-mono text-xs">Matrícula</TableHead>
                    <TableHead>Servidor / Lotação</TableHead>
                    <TableHead>Cargo Efetivo</TableHead>
                    <TableHead>Fase Atual</TableHead>
                    <TableHead>Previsão Conclusão</TableHead>
                    <TableHead>Status Estágio</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {servidoresEstagio.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-12">
                        <EmptyState
                          icon={<Clock className="h-8 w-8 text-muted-foreground" />}
                          title="Nenhum servidor em estágio probatório"
                          description="Servidores marcados com estágio probatório ativo aparecerão aqui."
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    servidoresEstagio.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono text-xs font-bold text-primary">
                          {s.matricula}
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-xs text-foreground">{s.nome_completo}</div>
                          <div className="text-[11px] text-muted-foreground">{s.orgao_lotacao}</div>
                        </TableCell>
                        <TableCell className="text-xs font-medium">{s.cargo_efetivo}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold">{s.estagio_fase_atual || 1}ª Fase / 6</span>
                            <div className="w-16 bg-muted rounded-full h-1.5">
                              <div
                                className="bg-primary h-1.5 rounded-full"
                                style={{ width: `${((s.estagio_fase_atual || 1) / 6) * 100}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs tabular-nums">
                          {s.estagio_data_fim || 'A calcular'}
                        </TableCell>
                        <TableCell>
                          <StatusChip
                            label={s.estagio_status || 'em andamento'}
                            variant={s.estagio_status === 'aprovado' ? 'success' : 'info'}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => {
                              setEmbedIdentificador(s.matricula);
                              setActiveTab('integracao');
                            }}
                          >
                            Injetar Avaliação
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── ABA 3: DASHBOARD & BI ───────────────────────────────────────── */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase font-medium">Média NFD do Ciclo</CardDescription>
                <CardTitle className="text-3xl font-extrabold font-mono tabular-nums text-primary">
                  {metricas?.avaliacoes.media_nfd || '7.38'}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Meta mínima de progressão: <span className="font-mono font-semibold text-foreground">7,00</span>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase font-medium">Elegibilidade Funcional</CardDescription>
                <CardTitle className="text-3xl font-extrabold font-mono tabular-nums text-foreground">
                  {metricas?.avaliacoes.taxa_elegivel || 85.4}%
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                <span className="font-mono font-semibold text-foreground">{metricas?.avaliacoes.elegiveis || 0}</span> servidores aptos à progressão
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase font-medium">Incidentes CIT Registrados</CardDescription>
                <CardTitle className="text-3xl font-extrabold font-mono tabular-nums text-primary">
                  {metricas?.diario_bordo_cit.total || incidentes.length}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground flex gap-3 font-mono">
                <span className="text-foreground">+{metricas?.diario_bordo_cit.positivos || 0} pos</span>
                <span className="text-destructive">-{metricas?.diario_bordo_cit.negativos || 0} neg</span>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase font-medium">Taxa de Conclusão</CardDescription>
                <CardTitle className="text-3xl font-extrabold font-mono tabular-nums text-foreground">
                  {metricas?.avaliacoes.taxa_conclusao || 100}%
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                <span className="font-mono font-semibold text-foreground">{metricas?.avaliacoes.concluidas || avaliacoes.length}</span> avaliações concluídas
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-bold">Composição da Nota Final de Desempenho (NFD)</CardTitle>
                <CardDescription className="text-xs">
                  Fórmula Ponderada Oficial: NFD = (F1×2,0 + F2×1,5 + F3×1,5 + F4×1,0 + F5×1,0 + F6×1,0 + F7×1,0 + F8×1,0) ÷ 10
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>F1 — Assiduidade e Pontualidade Eletrônica (IPM/Betha)</span>
                    <span className="font-mono font-bold text-primary">Peso 2.0 (20%)</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full" style={{ width: '20%' }} />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>F2 — Disciplina e Regularidade Funcional (Sindicâncias/PAD)</span>
                    <span className="font-mono font-bold text-foreground">Peso 1.5 (15%)</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-foreground/80 h-2 rounded-full" style={{ width: '15%' }} />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>F3 a F8 — Avaliação Qualitativa da Chefia Imediata com CIT</span>
                    <span className="font-mono font-bold text-primary">Peso 6.5 (65%)</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full" style={{ width: '65%' }} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-bold">Distribuição das Notas por Fator Qualitativo</CardTitle>
                <CardDescription className="text-xs">Médias dos fatores avaliados pela chefia no ciclo atual</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-xs">
                  {[
                    { fator: 'F3 — Eficiência e Produtividade', media: '4.2', perc: 84 },
                    { fator: 'F4 — Comprometimento e Urbanidade', media: '4.5', perc: 90 },
                    { fator: 'F5 — Relacionamento Interpessoal', media: '3.9', perc: 78 },
                    { fator: 'F6 — Iniciativa e Resolução de Problemas', media: '3.6', perc: 72 },
                    { fator: 'F7 — Organização e Método de Trabalho', media: '4.1', perc: 82 },
                    { fator: 'F8 — Zelo e Conservação do Patrimônio', media: '4.8', perc: 96 },
                  ].map((item) => (
                    <div key={item.fator} className="flex items-center justify-between py-1.5 border-b border-border/50">
                      <span className="text-muted-foreground">{item.fator}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold">{item.media}/5.0</span>
                        <Badge variant="outline" className="font-mono text-[10px]">{item.perc}%</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── ABA 4: DIÁRIO DE BORDO (CIT) ────────────────────────────────── */}
      {activeTab === 'diario' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-foreground">Diário de Bordo Digital (CIT)</h3>
              <p className="text-xs text-muted-foreground">
                Registro tempestivo e fundamentado de fatos relevantes com carimbo temporal e hash SHA-256 (RN-C01, RN-C02).
              </p>
            </div>
            <Button size="sm" onClick={() => setModalCitAberto(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Novo Registro CIT
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-mono text-xs">ID</TableHead>
                    <TableHead>Data Fato</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Fator Associado</TableHead>
                    <TableHead>Servidor / Matrícula</TableHead>
                    <TableHead>Descrição Sucinta</TableHead>
                    <TableHead>Evidência SHA-256</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incidentes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-12">
                        <EmptyState
                          icon={<BookOpen className="h-8 w-8 text-muted-foreground" />}
                          title="Nenhum incidente crítico registrado"
                          description="Os fatos registrados pela chefia imediata aparecerão nesta tabela."
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    incidentes.map((cit) => (
                      <TableRow key={cit.id}>
                        <TableCell className="font-mono text-xs font-bold text-muted-foreground">
                          #{cit.id}
                        </TableCell>
                        <TableCell className="font-mono text-xs tabular-nums">{cit.data_ocorrencia}</TableCell>
                        <TableCell>
                          <StatusChip
                            label={cit.tipo}
                            variant={cit.tipo === 'positivo' ? 'success' : 'danger'}
                          />
                        </TableCell>
                        <TableCell className="text-xs font-semibold">
                          F{cit.fator_id} — {cit.fator?.nome || `Fator ${cit.fator_id}`}
                        </TableCell>
                        <TableCell className="text-xs">
                          {cit.servidor?.nome_completo || `Servidor #${cit.servidor_id}`}
                        </TableCell>
                        <TableCell className="text-xs max-w-md truncate" title={cit.descricao_fato}>
                          {cit.descricao_fato}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground tabular-nums">
                          {cit.hash_sha256 ? (
                            <span className="text-primary truncate block w-24" title={cit.hash_sha256}>
                              {cit.hash_sha256.substring(0, 10)}...
                            </span>
                          ) : (
                            'Sem anexo'
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── ABA 5: AVALIAÇÕES PERIÓDICAS (NFD) ─────────────────────────── */}
      {activeTab === 'avaliacoes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-foreground">Fichas de Avaliação Periódica</h3>
              <p className="text-xs text-muted-foreground">
                Consolidação das notas F1 a F8, ponderação algorítmica e cálculo da NFD final (RN-C03 a RN-C06).
              </p>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-mono text-xs">ID</TableHead>
                    <TableHead>Servidor / Cargo</TableHead>
                    <TableHead className="font-mono text-xs text-center">F1 (Assid.)</TableHead>
                    <TableHead className="font-mono text-xs text-center">F2 (Disc.)</TableHead>
                    <TableHead className="font-mono text-xs text-center">F3-F8 (Qual.)</TableHead>
                    <TableHead className="font-mono text-xs text-center">NFD Final</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {avaliacoes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-12">
                        <EmptyState
                          icon={<UserCheck className="h-8 w-8 text-muted-foreground" />}
                          title="Nenhuma avaliação periódica gerada"
                          description="As avaliações do ciclo ativo serão listadas aqui."
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    avaliacoes.map((av) => (
                      <TableRow key={av.id}>
                        <TableCell className="font-mono text-xs font-bold text-muted-foreground">
                          #{av.id}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs font-bold text-foreground">
                            {av.servidor?.nome_completo || `Servidor #${av.servidor_id}`}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {av.servidor?.cargo_efetivo || 'Estatutário'}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-center tabular-nums">
                          {av.nota_f1_assiduidade !== null && av.nota_f1_assiduidade !== undefined ? Number(av.nota_f1_assiduidade).toFixed(2) : '—'}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-center tabular-nums">
                          {av.nota_f2_disciplina !== null && av.nota_f2_disciplina !== undefined ? Number(av.nota_f2_disciplina).toFixed(2) : '—'}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-center tabular-nums">
                          {av.nota_qualitativa !== null && av.nota_qualitativa !== undefined ? Number(av.nota_qualitativa).toFixed(2) : '—'}
                        </TableCell>
                        <TableCell className="font-mono text-xs font-bold text-center tabular-nums text-primary text-sm">
                          {av.nota_final_nfd !== null && av.nota_final_nfd !== undefined ? Number(av.nota_final_nfd).toFixed(2) : (av.nota_final || '—')}
                        </TableCell>
                        <TableCell>
                          <StatusChip
                            label={av.status || (av.homologada ? 'homologada' : 'rascunho')}
                            variant={av.homologada ? 'success' : 'neutral'}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs font-medium"
                            onClick={() => {
                              setAvaliacaoSelecionada(av);
                              setModalAvaliacaoAberto(true);
                            }}
                          >
                            Avaliar / Detalhes
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── ABA 6: PLANO DE DESENVOLVIMENTO INDIVIDUAL (PDI) ──────────── */}
      {activeTab === 'pdi' && (
        <div className="space-y-4">
          <Card className="border-primary/20 bg-accent/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                <GraduationCap className="h-5 w-5 text-primary" />
                Plano de Desenvolvimento Individual (PDI) & Capacitação Continuada
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Geração automática de trilhas de capacitação da Escola de Governo para servidores com nota qualitativa inferior a 70% (Grau ≤ 3).
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                servidor: 'Carlos Alberto Mendes',
                matricula: '10482',
                fator: 'F3 — Eficiência e Produtividade',
                nota: '2.5 / 5.0 (50%)',
                capacitacao: 'Gestão Ágil de Processos e Produtividade no Setor Público',
                instituicao: 'Escola Nacional de Administração Pública (ENAP)',
                carga: '40h',
                prazo: '60 dias',
                status: 'Em Curso',
              },
              {
                servidor: 'Mariana Silveira Ramos',
                matricula: '10519',
                fator: 'F5 — Relacionamento Interpessoal',
                nota: '2.0 / 5.0 (40%)',
                capacitacao: 'Comunicação Não-Violenta e Mediação de Conflitos Organizacionais',
                instituicao: 'Escola de Gestão Pública Municipal',
                carga: '30h',
                prazo: '45 dias',
                status: 'Inscrito',
              },
              {
                servidor: 'Paulo Roberto Freitas',
                matricula: '09874',
                fator: 'F8 — Zelo Patrimonial',
                nota: '2.8 / 5.0 (56%)',
                capacitacao: 'Normas de Segurança do Trabalho e Conservação Patrimonial',
                instituicao: 'SENAC / Convênio Municipal',
                carga: '20h',
                prazo: '30 dias',
                status: 'Aguardando Início',
              },
            ].map((pdi, idx) => (
              <Card key={idx}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-primary font-bold">Matr. {pdi.matricula}</span>
                    <StatusChip label={pdi.status} variant="warning" />
                  </div>
                  <CardTitle className="text-sm font-bold text-foreground">{pdi.servidor}</CardTitle>
                  <CardDescription className="text-xs text-destructive font-mono font-semibold">
                    {pdi.fator} — Nota: {pdi.nota}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-xs pt-1">
                  <div className="p-2.5 rounded bg-muted/50 border border-border space-y-1">
                    <span className="text-[11px] font-semibold text-foreground block">Trilha Recomendada:</span>
                    <p className="text-xs text-muted-foreground">{pdi.capacitacao}</p>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 font-mono">
                      <span>{pdi.instituicao}</span>
                      <span className="font-bold text-primary">{pdi.carga}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-muted-foreground pt-1">
                    <span>Prazo Reavaliação:</span>
                    <span className="font-mono font-bold text-foreground tabular-nums">{pdi.prazo}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── ABA 7: RECURSOS ADMINISTRATIVOS ────────────────────────────── */}
      {activeTab === 'recursos' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-foreground">Recursos Administrativos</h3>
              <p className="text-xs text-muted-foreground">
                Garantia constitucional de ampla defesa e contraditório contra notas atribuídas no ciclo (RN-C08).
              </p>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-mono text-xs">ID</TableHead>
                    <TableHead>Servidor Recorrente</TableHead>
                    <TableHead>Fator Contestado</TableHead>
                    <TableHead>Relator Sorteado</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Prazo Legal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recursos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-12">
                        <EmptyState
                          icon={<FileCheck className="h-8 w-8 text-muted-foreground" />}
                          title="Nenhum recurso protocolado"
                          description="Os recursos administrativos abertos pelos servidores serão exibidos aqui."
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    recursos.map((rec) => (
                      <TableRow key={rec.id}>
                        <TableCell className="font-mono text-xs font-bold text-muted-foreground">
                          #{rec.id}
                        </TableCell>
                        <TableCell className="text-xs font-semibold">
                          {rec.servidor?.nome_completo || `Servidor #${rec.servidor_id || rec.recorrente_id}`}
                        </TableCell>
                        <TableCell className="text-xs">
                          F{rec.fator_contestado_id} — {rec.fator_contestado?.nome || rec.fatorContestado?.nome || 'Fator'}
                        </TableCell>
                        <TableCell className="text-xs">
                          {rec.relator?.nome_completo || rec.relator?.name || (
                            <span className="text-amber-500 font-mono text-[11px]">Sorteio Pendente</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusChip label={rec.status} variant="neutral" />
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground tabular-nums">
                          {rec.prazo_julgamento || '10 dias úteis'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── ABA 8: COLEGIADO & SESSÕES ─────────────────────────────────── */}
      {activeTab === 'comissao' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold">Composição Paritária da Comissão (CAPD)</CardTitle>
              <CardDescription className="text-xs">
                Membros titulares e suplentes indicados pelo Executivo e eleitos pelos servidores (Portaria de Nomeação).
              </CardDescription>
            </CardHeader>
            <CardContent>
              {comissoes.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4 text-center">Nenhuma comissão ativa cadastrada.</div>
              ) : (
                <div className="space-y-4">
                  {comissoes.map((c) => (
                    <div key={c.id} className="p-4 border border-border rounded-lg space-y-2 bg-card">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-foreground">{c.nome || `Comissão #${c.id}`}</span>
                        <Badge variant="outline" className="font-mono text-xs">
                          Portaria {c.portaria_nomeacao || c.numero_portaria}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground flex gap-4 font-mono tabular-nums">
                        <span>Mandato Início: {c.vigencia_inicio || c.data_publicacao_portaria}</span>
                        <span>Mandato Fim: {c.vigencia_fim || 'Indeterminado'}</span>
                        <span>Membros: {c.membros?.length || 0}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold">Sessões Deliberativas & Atas com Selo SHA-256</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-mono text-xs">ID</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Quórum</TableHead>
                    <TableHead>Status Ata</TableHead>
                    <TableHead>Hash SHA-256</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessoes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-muted-foreground text-sm">
                        Nenhuma sessão registrada.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sessoes.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono text-xs font-bold text-muted-foreground">
                          #{s.id}
                        </TableCell>
                        <TableCell className="capitalize text-xs">{s.tipo_sessao}</TableCell>
                        <TableCell className="font-mono text-xs tabular-nums">{s.data_sessao}</TableCell>
                        <TableCell className="font-mono text-xs tabular-nums">
                          {s.quorum_presente} / {s.quorum_minimo} mín
                        </TableCell>
                        <TableCell>
                          <StatusChip
                            label={s.finalizada ? 'Selada (Imutável)' : 'Em Aberto'}
                            variant={s.finalizada ? 'success' : 'warning'}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground max-w-xs truncate tabular-nums">
                          {s.hash_ata_sha256 || 'Aguardando encerramento'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── ABA 9: INTEGRAÇÕES RH & EMBED HEADLESS ─────────────────────── */}
      {activeTab === 'integracao' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Conectores ERP RH */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Database className="h-5 w-5 text-primary" />
                      Conectores de Sistemas de Gestão de RH
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Integração bidirecional com Betha Sistemas, IPM Saúde/RH, Senior, TOTVS e REST genérico.
                    </CardDescription>
                  </div>
                  <Button size="sm" onClick={() => setModalIntegracaoAberto(true)}>
                    <Plus className="h-4 w-4 mr-1.5" />
                    Novo ERP
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-muted/50 rounded-lg border border-border space-y-2">
                  <span className="text-xs font-semibold text-foreground block">Endpoints do Gateway de RH:</span>
                  <div className="space-y-1.5 text-[11px] font-mono">
                    <div className="p-1.5 bg-background rounded border border-border flex items-center justify-between">
                      <span className="font-bold text-primary">POST</span>
                      <span className="text-muted-foreground truncate px-2">/api/capd/rh-gateway/sync/servidores</span>
                      <Badge variant="outline" className="text-[9px]">Inbound</Badge>
                    </div>
                    <div className="p-1.5 bg-background rounded border border-border flex items-center justify-between">
                      <span className="font-bold text-primary">POST</span>
                      <span className="text-muted-foreground truncate px-2">/api/capd/rh-gateway/sync/frequencia</span>
                      <Badge variant="outline" className="text-[9px]">F1 Inbound</Badge>
                    </div>
                    <div className="p-1.5 bg-background rounded border border-border flex items-center justify-between">
                      <span className="font-bold text-foreground">GET</span>
                      <span className="text-muted-foreground truncate px-2">/api/capd/rh-gateway/export/homologados</span>
                      <Badge variant="outline" className="text-[9px]">Outbound</Badge>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Autenticação externa obrigatória no cabeçalho: <code className="text-primary font-mono">X-RH-API-Key: {'<api_key>'}</code>
                  </p>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-semibold text-foreground">Conectores Ativos:</span>
                  {integracoes.length === 0 ? (
                    <div className="text-xs text-muted-foreground py-6 text-center border border-dashed rounded">
                      Nenhum conector ERP cadastrado. Clique em "+ Novo ERP" acima para gerar uma chave.
                    </div>
                  ) : (
                    integracoes.map((item) => (
                      <div key={item.id} className="p-3 bg-background border border-border rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-foreground">{item.nome}</span>
                            <Badge variant="outline" className="text-[10px] font-mono uppercase">
                              {item.driver}
                            </Badge>
                          </div>
                          <StatusChip
                            label={item.is_active ? 'Ativo' : 'Inativo'}
                            variant={item.is_active ? 'success' : 'neutral'}
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-border/50">
                          <span className="text-muted-foreground text-[11px] font-mono tabular-nums">
                            Key: {item.api_key.substring(0, 16)}...
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[11px] px-2 font-mono"
                            onClick={() => handleCopiarTexto(item.api_key, `key-${item.id}`)}
                          >
                            {copiadoKey === `key-${item.id}` ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
                            <span className="ml-1">Copiar Key</span>
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Injeção em Terceiros (Embed / Headless) */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Code className="h-5 w-5 text-primary" />
                  Injeção do Módulo em Sistemas Terceiros (Embed / Headless)
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Gere tokens de injeção criptografados para carregar a experiência do CAPD em intranets, portais de RH ou ERPs legados.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 p-3 bg-muted/40 rounded-lg border border-border">
                  <Field label="Identificador do Servidor (Matrícula ou CPF)" required>
                    <Input
                      placeholder="Ex: 10783-1 ou 99276046020"
                      value={embedIdentificador}
                      onChange={(e) => setEmbedIdentificador(e.target.value)}
                      className="font-mono text-xs"
                    />
                  </Field>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Modo de Injeção">
                      <Select
                        value={embedMode}
                        onChange={(val) => setEmbedMode(val as any)}
                        options={[
                          { value: 'autoavaliacao', label: 'Autoavaliação do Servidor' },
                          { value: 'diario-bordo', label: 'Diário de Bordo (CIT)' },
                          { value: 'espelho', label: 'Espelho da Ficha NFD' },
                          { value: 'recurso', label: 'Interposição de Recurso' },
                        ]}
                      />
                    </Field>

                    <div className="flex items-end">
                      <Button className="w-full text-xs font-bold" onClick={handleGerarEmbedToken}>
                        <Link2 className="h-4 w-4 mr-1.5" />
                        Gerar Token de Injeção
                      </Button>
                    </div>
                  </div>
                </div>

                {embedTokenGerado && (
                  <div className="p-3 bg-background rounded-lg border border-primary/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                        <CheckCircle className="h-4 w-4" /> Sessão de Injeção Pronta (Expira em {Math.round(embedTokenGerado.expires_in / 60)} min)
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs px-2"
                        onClick={() => handleCopiarTexto(embedTokenGerado.embed_url, 'token')}
                      >
                        {copiadoToken ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
                        <span className="ml-1">{copiadoToken ? 'Copiado!' : 'Copiar URL'}</span>
                      </Button>
                    </div>

                    <div>
                      <span className="text-[11px] text-muted-foreground block mb-1">Snippet para incorporação HTML (Iframe / WebComponent):</span>
                      <pre className="p-2 bg-muted/60 rounded text-[11px] font-mono overflow-x-auto text-foreground">
{`<iframe
  src="${window.location.origin}${embedTokenGerado.embed_url}"
  width="100%"
  height="650px"
  frameborder="0"
  allow="clipboard-write"
/>`}
                      </pre>
                    </div>

                    <div className="flex justify-end pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => window.open(embedTokenGerado.embed_url, '_blank')}
                      >
                        <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                        Testar Injeção em Nova Aba
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Histórico de Sincronizações ERP */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">Logs de Sincronização e Webhooks do Gateway de RH</CardTitle>
              <CardDescription className="text-xs">
                Auditoria completa de cargas em lote, integração de frequência eletrônica e exportação de homologações.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-mono text-xs">ID</TableHead>
                    <TableHead>Conector / Driver</TableHead>
                    <TableHead>Tipo / Direção</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="font-mono text-xs">Registros</TableHead>
                    <TableHead>Data / Hora</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logsSync.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-muted-foreground text-sm">
                        Nenhum log de sincronização registrado ainda.
                      </TableCell>
                    </TableRow>
                  ) : (
                    logsSync.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-xs font-bold text-muted-foreground">
                          #{log.id}
                        </TableCell>
                        <TableCell className="text-xs font-semibold">
                          {log.integracao?.nome || 'Gateway Externo'}
                        </TableCell>
                        <TableCell className="text-xs">
                          <span className="capitalize">{log.tipo}</span> ({log.direcao})
                        </TableCell>
                        <TableCell>
                          <StatusChip
                            label={log.status}
                            variant={log.status === 'sucesso' ? 'success' : 'danger'}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs tabular-nums">
                          <span className="text-foreground font-bold">{log.registros_sucesso}</span> ok /{' '}
                          <span className="text-destructive">{log.registros_falha}</span> err
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground tabular-nums">
                          {log.created_at}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── ABA 10: HOMOLOGAÇÃO FINAL DO CICLO ─────────────────────────── */}
      {activeTab === 'homologacao' && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
              <Lock className="h-5 w-5 text-primary" />
              Homologação Final em Lote & Despacho Outbox (RN-C07, RN-C08, RN-C09)
            </CardTitle>
            <CardDescription className="text-sm">
              Encerramento oficial do ciclo de avaliação com publicação assíncrona para a folha de pagamento e sistemas de RH terceiros.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/50 border border-border text-sm space-y-2">
              <div className="font-semibold text-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Checklist Obrigatório para Homologação:
              </div>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 text-xs">
                <li>Todas as avaliações do ciclo devem estar concluídas pelas chefias imediatas.</li>
                <li>Nenhum recurso administrativo pode estar com status pendente de deliberação (RN-C08).</li>
                <li>A homologação tornará todas as notas definitivas e imutáveis (RN-C07).</li>
                <li>O sistema publicará o evento <code className="text-primary font-mono">capd.ciclo_homologado</code> no Outbox e acionará webhooks de ERPs configurados (RN-C09).</li>
              </ul>
            </div>

            <Button
              size="lg"
              className="font-bold"
              onClick={handleHomologarCiclo}
            >
              Homologar Ciclo e Enviar para Folha & ERPs de RH
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── MODAL: CADASTRAR NOVO SERVIDOR ─────────────────────────────── */}
      {modalServidorAberto && (
        <Modal
          open={modalServidorAberto}
          onClose={() => setModalServidorAberto(false)}
          title="Cadastrar Servidor Público (Universal RH)"
          size="lg"
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setModalServidorAberto(false)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleSalvarServidor} disabled={salvandoServidor}>
                {salvandoServidor ? 'Salvando...' : 'Salvar Servidor'}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Matrícula Funcional" required>
                <Input
                  placeholder="Ex: 10783-1"
                  value={novoServidor.matricula}
                  onChange={(e) => setNovoServidor({ ...novoServidor, matricula: e.target.value })}
                  className="font-mono text-xs"
                />
              </Field>
              <Field label="CPF" required>
                <Input
                  placeholder="000.000.000-00"
                  value={novoServidor.cpf}
                  onChange={(e) => setNovoServidor({ ...novoServidor, cpf: e.target.value })}
                  className="font-mono text-xs"
                />
              </Field>
            </div>

            <Field label="Nome Completo" required>
              <Input
                placeholder="Ex: João da Silva Santos"
                value={novoServidor.nome_completo}
                onChange={(e) => setNovoServidor({ ...novoServidor, nome_completo: e.target.value })}
                className="text-xs"
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Cargo Efetivo" required>
                <Input
                  placeholder="Ex: Analista de Sistemas"
                  value={novoServidor.cargo_efetivo}
                  onChange={(e) => setNovoServidor({ ...novoServidor, cargo_efetivo: e.target.value })}
                  className="text-xs"
                />
              </Field>
              <Field label="Órgão de Lotação" required>
                <Input
                  placeholder="Ex: Secretaria de Administração"
                  value={novoServidor.orgao_lotacao}
                  onChange={(e) => setNovoServidor({ ...novoServidor, orgao_lotacao: e.target.value })}
                  className="text-xs"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Regime Jurídico">
                <Select
                  value={novoServidor.regime_juridico}
                  onChange={(val) => setNovoServidor({ ...novoServidor, regime_juridico: val as any })}
                  options={[
                    { value: 'estatutario', label: 'Estatutário' },
                    { value: 'clt', label: 'CLT' },
                    { value: 'comissionado', label: 'Comissionado' },
                    { value: 'temporario', label: 'Temporário' },
                  ]}
                />
              </Field>
              <Field label="Regime Previdenciário">
                <Select
                  value={novoServidor.regime_previdenciario}
                  onChange={(val) => setNovoServidor({ ...novoServidor, regime_previdenciario: val as any })}
                  options={[
                    { value: 'rpps', label: 'RPPS (Próprio)' },
                    { value: 'rgps', label: 'RGPS (INSS)' },
                  ]}
                />
              </Field>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="checkEstagio"
                checked={novoServidor.estagio_probatorio}
                onChange={(e) => setNovoServidor({ ...novoServidor, estagio_probatorio: e.target.checked })}
                className="rounded border-input text-primary focus:ring-primary h-4 w-4"
              />
              <label htmlFor="checkEstagio" className="text-xs font-medium text-foreground cursor-pointer select-none">
                Servidor em Estágio Probatório (Art. 41 da CF/88 — 36 meses)
              </label>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL: IMPORTAR SERVIDORES CSV ─────────────────────────────── */}
      {modalImportarAberto && (
        <Modal
          open={modalImportarAberto}
          onClose={() => setModalImportarAberto(false)}
          title="Importação em Lote de Servidores (Layout Universal)"
          size="lg"
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setModalImportarAberto(false)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleImportarCsv} disabled={importandoCsv}>
                {importandoCsv ? 'Importando Lote...' : 'Processar Importação'}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Cole o conteúdo CSV abaixo usando delimitador ponto e vírgula (<code className="font-mono text-primary">;</code>) ou vírgula.
              Compatível com exportações de Betha, IPM, Senior, TOTVS e eSocial.
            </p>

            <div className="p-3 bg-muted/40 rounded border border-border text-[11px] font-mono text-muted-foreground">
              Cabeçalho sugerido: <br />
              <span className="text-foreground font-semibold">
                matricula;cpf;nome_completo;cargo_efetivo;orgao_lotacao;regime_juridico;situacao_funcional;estagio_probatorio
              </span>
            </div>

            <Field label="Conteúdo CSV" required>
              <textarea
                className="w-full rounded-md border border-input bg-background p-3 text-xs font-mono text-foreground min-h-[140px] focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="1001;12345678900;Maria Silva;Professora;Secretaria de Educação;estatutario;ativo;0&#10;1002;98765432100;Carlos Souza;Médico;Secretaria de Saúde;estatutario;ativo;1"
                value={csvTexto}
                onChange={(e) => setCsvTexto(e.target.value)}
              />
            </Field>
          </div>
        </Modal>
      )}

      {/* ── MODAL: NOVA INTEGRAÇÃO ERP RH ──────────────────────────────── */}
      {modalIntegracaoAberto && (
        <Modal
          open={modalIntegracaoAberto}
          onClose={() => setModalIntegracaoAberto(false)}
          title="Configurar Conector de RH / ERP"
          size="md"
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setModalIntegracaoAberto(false)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleSalvarIntegracao}>
                Gerar Credenciais
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <Field label="Nome Identificador" required>
              <Input
                placeholder="Ex: ERP Betha Folha ou IPM Saúde"
                value={novaIntegracao.nome}
                onChange={(e) => setNovaIntegracao({ ...novaIntegracao, nome: e.target.value })}
                className="text-xs"
              />
            </Field>

            <Field label="Driver de Integração" required>
              <Select
                value={novaIntegracao.driver}
                onChange={(val) => setNovaIntegracao({ ...novaIntegracao, driver: val as any })}
                options={[
                  { value: 'betha', label: 'Betha Sistemas (Fly e-Ponto / Folha)' },
                  { value: 'ipm', label: 'IPM Sistemas (Atende.Net)' },
                  { value: 'senior', label: 'Senior Sistemas (Ronda / Gestão de Pessoas)' },
                  { value: 'totvs', label: 'TOTVS RM Folha' },
                  { value: 'generic_rest', label: 'REST API Genérico' },
                ]}
              />
            </Field>

            <Field label="URL da API do ERP (Opcional)">
              <Input
                placeholder="https://api.erp.betha.cloud/v1"
                value={novaIntegracao.api_url}
                onChange={(e) => setNovaIntegracao({ ...novaIntegracao, api_url: e.target.value })}
                className="font-mono text-xs"
              />
            </Field>

            <Field label="Webhook URL de Notificação (Opcional)">
              <Input
                placeholder="https://meuerp.prefeitura.gov.br/webhook/capd"
                value={novaIntegracao.webhook_url}
                onChange={(e) => setNovaIntegracao({ ...novaIntegracao, webhook_url: e.target.value })}
                className="font-mono text-xs"
              />
            </Field>
          </div>
        </Modal>
      )}

      {/* ── MODAL: REGISTRAR INCIDENTE CRÍTICO (CIT) ──────────────────── */}
      {modalCitAberto && (
        <Modal
          open={modalCitAberto}
          onClose={() => setModalCitAberto(false)}
          title="Registrar Incidente Crítico (CIT) — Diário de Bordo"
          size="md"
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setModalCitAberto(false)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleSalvarCit}>
                Salvar Incidente com Selo SHA-256
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <Field label="Tipo de Incidente" required>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <Button
                  type="button"
                  variant={novoCit.tipo === 'positivo' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setNovoCit({ ...novoCit, tipo: 'positivo' })}
                >
                  + Positivo (Desempenho Notável)
                </Button>
                <Button
                  type="button"
                  variant={novoCit.tipo === 'negativo' ? 'destructive' : 'outline'}
                  size="sm"
                  onClick={() => setNovoCit({ ...novoCit, tipo: 'negativo' })}
                >
                  - Negativo (Desvio Crítico)
                </Button>
              </div>
            </Field>

            <Field label="Fator de Avaliação Qualitativo" required>
              <Select
                value={String(novoCit.fator_id)}
                onChange={(val) => setNovoCit({ ...novoCit, fator_id: Number(val) })}
                options={[
                  { value: '3', label: 'F3 — Eficiência e Produtividade' },
                  { value: '4', label: 'F4 — Pontualidade e Assiduidade Complementar' },
                  { value: '5', label: 'F5 — Relacionamento Interpessoal' },
                  { value: '6', label: 'F6 — Iniciativa e Resolução de Problemas' },
                  { value: '7', label: 'F7 — Liderança e Cooperação' },
                  { value: '8', label: 'F8 — Zelo e Conservação do Patrimônio' },
                ]}
              />
            </Field>

            <Field label="Data da Ocorrência" required>
              <Input
                type="date"
                value={novoCit.data_ocorrencia}
                onChange={(e) => setNovoCit({ ...novoCit, data_ocorrencia: e.target.value })}
              />
            </Field>

            <Field label="Descrição Minuciosa do Fato (mínimo 30 caracteres)" required>
              <textarea
                className="w-full rounded-md border border-input bg-background p-3 text-xs text-foreground min-h-[100px] focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Descreva com precisão a situação observada, o comportamento do servidor e o impacto no serviço público..."
                value={novoCit.descricao_fato}
                onChange={(e) => setNovoCit({ ...novoCit, descricao_fato: e.target.value })}
              />
            </Field>

            <Field label="Evidência Documental (PDF, PNG ou JPG — gera hash SHA-256)">
              <Input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => setArquivoEvidencia(e.target.files?.[0] || null)}
              />
            </Field>
          </div>
        </Modal>
      )}

      {/* ── MODAL: PREENCHER / REVISAR AVALIAÇÃO ───────────────────────── */}
      {modalAvaliacaoAberto && avaliacaoSelecionada && (
        <Modal
          open={modalAvaliacaoAberto}
          onClose={() => setModalAvaliacaoAberto(false)}
          title={`Avaliação de Desempenho — Servidor #${avaliacaoSelecionada.servidor_id}`}
          size="lg"
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setModalAvaliacaoAberto(false)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleSubmeterAvaliacao}>
                Submeter Avaliação Definitiva
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="p-3 bg-muted/40 rounded border border-border flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Prévia da NFD Ponderada:</span>
              <span className="text-xl font-bold font-mono tabular-nums text-primary">{notaPrevia}</span>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {[
                { cod: 'F3', nome: 'Eficiência e Produtividade' },
                { cod: 'F4', nome: 'Comprometimento e Urbanidade' },
                { cod: 'F5', nome: 'Relacionamento Interpessoal' },
                { cod: 'F6', nome: 'Iniciativa e Proatividade' },
                { cod: 'F7', nome: 'Organização e Método' },
                { cod: 'F8', nome: 'Zelo Patrimonial' },
              ].map(({ cod, nome }) => (
                <div key={cod} className="p-3 bg-card border border-border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-foreground">
                      <span className="font-mono text-primary mr-1">[{cod}]</span> {nome}
                    </span>
                    <span className="text-xs font-mono font-semibold">
                      Grau {respostasAvaliacao[cod]?.grau || 3}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => {
                          const nov = { ...respostasAvaliacao, [cod]: { grau: g } };
                          setRespostasAvaliacao(nov);
                        }}
                        className={`flex-1 py-1.5 text-xs font-mono font-bold rounded border transition-colors ${
                          respostasAvaliacao[cod]?.grau === g
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                  {[1, 2, 5].includes(respostasAvaliacao[cod]?.grau || 3) && (
                    <div className="text-[11px] text-amber-500 mt-1.5 flex items-center gap-1 font-mono">
                      <AlertTriangle className="h-3 w-3" /> Exige CIT correspondente prévio no Diário de Bordo.
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default CapdModule;
