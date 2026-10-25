import React, { useState, useMemo } from 'react';
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
  Textarea,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Modal,
  KpiCard,
} from '@sysgov/ui';
import {
  Calendar,
  ClipboardList,
  FileCheck,
  Users,
  PlusCircle,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Lock,
  Award,
  AlertTriangle,
} from 'lucide-react';

export interface CronogramaItem {
  id: string;
  ano_letivo: number;
  periodo: string;
  periodo_rotulo: string;
  escola_nome: string;
  data_inicio_pre_conselho: string;
  data_fim_pre_conselho: string;
  data_reuniao_conselho: string;
  status: 'agendado' | 'em_andamento' | 'concluido' | 'cancelado';
}

export interface PreConselhoItem {
  id: string;
  cronograma_id: string;
  turma_nome: string;
  componente_nome: string;
  professor_nome: string;
  periodo: string;
  desempenho_geral: 'excelente' | 'bom' | 'regular' | 'insatisfatorio';
  objetivos_atingidos_percentual: number;
  alunos_sinalizados_count: number;
}

export interface AtaItem {
  id: string;
  numero_ata: string;
  turma_nome: string;
  periodo_rotulo: string;
  data_reuniao: string;
  horario: string;
  total_alunos: number;
  progressao_plena: number;
  progressao_dependencia: number;
  recuperacao_intensiva: number;
  retencao: number;
  status: 'rascunho' | 'em_revisao' | 'finalizada' | 'homologada';
}

export const ConselhoClasseView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('cronogramas');
  const [busca, setBusca] = useState<string>('');

  // Modais
  const [modalCronogramaAberto, setModalCronogramaAberto] = useState<boolean>(false);
  const [modalPreConselhoAberto, setModalPreConselhoAberto] = useState<boolean>(false);
  const [modalDeliberacaoAberto, setModalDeliberacaoAberto] = useState<boolean>(false);
  const [modalFinalizarAberto, setModalFinalizarAberto] = useState<boolean>(false);
  const [ataSelecionada, setAtaSelecionada] = useState<AtaItem | null>(null);

  // Estados dos formulários
  const [novoCronograma, setNovoCronograma] = useState({
    periodo: '1_bimestre',
    ano_letivo: '2026',
    data_inicio_pre: '2026-04-01',
    data_fim_pre: '2026-04-15',
    data_reuniao: '2026-04-20',
  });

  const [novoPreConselho, setNovoPreConselho] = useState({
    turma: '3º Ano B',
    componente: 'Matemática',
    desempenho: 'bom',
    percentual: '85',
    dificuldades: '',
    acoes: '',
  });

  const [novaDeliberacao, setNovaDeliberacao] = useState({
    aluno_nome: 'Lucas Gabriel Silveira',
    resultado: 'progressao_plena',
    parecer: 'Estudante demonstrou evolução satisfatória ao longo do período letivo.',
  });

  // Dados Mockados Iniciais
  const [cronogramas, setCronogramas] = useState<CronogramaItem[]>([
    {
      id: 'cron-01',
      ano_letivo: 2026,
      periodo: '1_bimestre',
      periodo_rotulo: '1º Bimestre',
      escola_nome: 'EMEF Paulo Freire',
      data_inicio_pre_conselho: '2026-04-01',
      data_fim_pre_conselho: '2026-04-15',
      data_reuniao_conselho: '2026-04-20',
      status: 'agendado',
    },
    {
      id: 'cron-02',
      ano_letivo: 2026,
      periodo: '2_bimestre',
      periodo_rotulo: '2º Bimestre',
      escola_nome: 'EMEF Paulo Freire',
      data_inicio_pre_conselho: '2026-06-15',
      data_fim_pre_conselho: '2026-06-30',
      data_reuniao_conselho: '2026-07-06',
      status: 'agendado',
    },
  ]);

  const [preConselhos, setPreConselhos] = useState<PreConselhoItem[]>([
    {
      id: 'pre-01',
      cronograma_id: 'cron-01',
      turma_nome: '3º Ano B - Ensino Fundamental',
      componente_nome: 'Língua Portuguesa',
      professor_nome: 'Mariana Duarte',
      periodo: '1º Bimestre',
      desempenho_geral: 'bom',
      objetivos_atingidos_percentual: 88,
      alunos_sinalizados_count: 2,
    },
    {
      id: 'pre-02',
      cronograma_id: 'cron-01',
      turma_nome: '3º Ano B - Ensino Fundamental',
      componente_nome: 'Matemática',
      professor_nome: 'Carlos Eduardo Ramos',
      periodo: '1º Bimestre',
      desempenho_geral: 'regular',
      objetivos_atingidos_percentual: 72,
      alunos_sinalizados_count: 4,
    },
  ]);

  const [atas, setAtas] = useState<AtaItem[]>([
    {
      id: 'ata-01',
      numero_ata: 'ATA-01/2026-3B',
      turma_nome: '3º Ano B - Ensino Fundamental',
      periodo_rotulo: '1º Bimestre',
      data_reuniao: '2026-04-20',
      horario: '08:00 às 10:30',
      total_alunos: 25,
      progressao_plena: 22,
      progressao_dependencia: 0,
      recuperacao_intensiva: 3,
      retencao: 0,
      status: 'finalizada',
    },
    {
      id: 'ata-02',
      numero_ata: 'ATA-02/2026-4A',
      turma_nome: '4º Ano A - Ensino Fundamental',
      periodo_rotulo: '1º Bimestre',
      data_reuniao: '2026-04-22',
      horario: '10:45 às 12:30',
      total_alunos: 26,
      progressao_plena: 20,
      progressao_dependencia: 2,
      recuperacao_intensiva: 4,
      retencao: 0,
      status: 'rascunho',
    },
  ]);

  // Handlers
  const handleCriarCronograma = (e: React.FormEvent) => {
    e.preventDefault();
    const item: CronogramaItem = {
      id: `cron-${Date.now()}`,
      ano_letivo: Number(novoCronograma.ano_letivo),
      periodo: novoCronograma.periodo,
      periodo_rotulo: novoCronograma.periodo.replace('_', 'º ').toUpperCase(),
      escola_nome: 'EMEF Paulo Freire',
      data_inicio_pre_conselho: novoCronograma.data_inicio_pre,
      data_fim_pre_conselho: novoCronograma.data_fim_pre,
      data_reuniao_conselho: novoCronograma.data_reuniao,
      status: 'agendado',
    };
    setCronogramas([item, ...cronogramas]);
    setModalCronogramaAberto(false);
  };

  const handleCriarPreConselho = (e: React.FormEvent) => {
    e.preventDefault();
    const item: PreConselhoItem = {
      id: `pre-${Date.now()}`,
      cronograma_id: 'cron-01',
      turma_nome: novoPreConselho.turma,
      componente_nome: novoPreConselho.componente,
      professor_nome: 'Docente Conectado',
      periodo: '1º Bimestre',
      desempenho_geral: novoPreConselho.desempenho as any,
      objetivos_atingidos_percentual: Number(novoPreConselho.percentual),
      alunos_sinalizados_count: 1,
    };
    setPreConselhos([item, ...preConselhos]);
    setModalPreConselhoAberto(false);
  };

  const handleSalvarDeliberacao = (e: React.FormEvent) => {
    e.preventDefault();
    setModalDeliberacaoAberto(false);
  };

  const handleConfirmarFinalizacao = () => {
    if (!ataSelecionada) return;
    setAtas(
      atas.map((a) =>
        a.id === ataSelecionada.id ? { ...a, status: 'finalizada' } : a
      )
    );
    setModalFinalizarAberto(false);
  };

  // KPIs
  const totalReunioes = cronogramas.length;
  const totalFichasPre = preConselhos.length;
  const totalAtasFinalizadas = atas.filter((a) => a.status === 'finalizada' || a.status === 'homologada').length;

  return (
    <div className="space-y-6">
      {/* Top Banner / Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ClipboardList className="h-7 w-7 text-primary" />
            Conselho de Classe & Pré-Conselho
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Fichas diagnósticas por componente curricular, acompanhamento pedagógico e atas colegiadas oficiais (LDB Art. 24).
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'cronogramas' && (
            <Button onClick={() => setModalCronogramaAberto(true)} className="gap-2">
              <PlusCircle className="h-4 w-4" />
              Novo Cronograma
            </Button>
          )}
          {activeTab === 'pre_conselho' && (
            <Button onClick={() => setModalPreConselhoAberto(true)} className="gap-2">
              <PlusCircle className="h-4 w-4" />
              Registrar Ficha Diagnóstica
            </Button>
          )}
          {activeTab === 'atas' && (
            <Button onClick={() => setModalDeliberacaoAberto(true)} className="gap-2">
              <Award className="h-4 w-4" />
              Lançar Deliberação
            </Button>
          )}
        </div>
      </div>

      {/* KPIs Operacionais */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          title="Cronogramas de Conselho"
          value={totalReunioes.toString()}
          subtitle="Períodos avaliativos agendados"
          valueClassName="text-indigo-600 font-mono tabular-nums"
          accentClassName="border-l-indigo-600"
          icon={<Calendar className="h-5 w-5 text-indigo-500" />}
        />
        <KpiCard
          title="Fichas de Pré-Conselho"
          value={totalFichasPre.toString()}
          subtitle="Diagnósticos disciplinares entregues"
          valueClassName="text-cyan-600 font-mono tabular-nums"
          accentClassName="border-l-cyan-600"
          icon={<ClipboardList className="h-5 w-5 text-cyan-500" />}
        />
        <KpiCard
          title="Atas Homologadas / Finais"
          value={totalAtasFinalizadas.toString()}
          subtitle="Atas imutáveis com deliberação plena"
          valueClassName="text-emerald-600 font-mono tabular-nums"
          accentClassName="border-l-emerald-600"
          icon={<FileCheck className="h-5 w-5 text-emerald-500" />}
        />
      </div>

      {/* Navegação por Abas */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 w-full max-w-xl">
          <TabsTrigger value="cronogramas" className="gap-2">
            <Calendar className="h-4 w-4" />
            Cronogramas
          </TabsTrigger>
          <TabsTrigger value="pre_conselho" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Pré-Conselho por Disciplina
          </TabsTrigger>
          <TabsTrigger value="atas" className="gap-2">
            <FileCheck className="h-4 w-4" />
            Atas Deliberativas
          </TabsTrigger>
        </TabsList>

        {/* ── ABA 1: CRONOGRAMAS ────────────────────────────────────────── */}
        <TabsContent value="cronogramas" className="mt-6 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Cronograma de Reuniões Pedagógicas</CardTitle>
              <CardDescription>
                Janelas regulamentares de submissão do pré-conselho e datas estipuladas para a sessão plenária de deliberação.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Período / Ano</TableHead>
                    <TableHead>Unidade Escolar</TableHead>
                    <TableHead>Janela de Pré-Conselho</TableHead>
                    <TableHead>Data da Sessão Colegiada</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cronogramas.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">
                        {c.periodo_rotulo}
                        <span className="block text-xs font-mono text-muted-foreground">{c.ano_letivo}</span>
                      </TableCell>
                      <TableCell>{c.escola_nome}</TableCell>
                      <TableCell className="font-mono tabular-nums text-sm">
                        {c.data_inicio_pre_conselho} até {c.data_fim_pre_conselho}
                      </TableCell>
                      <TableCell className="font-mono tabular-nums text-sm font-semibold text-primary">
                        {c.data_reuniao_conselho}
                      </TableCell>
                      <TableCell>
                        <Badge variant={c.status === 'agendado' ? 'secondary' : 'default'}>
                          {c.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm">
                          Ver Detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── ABA 2: PRÉ-CONSELHO ───────────────────────────────────────── */}
        <TabsContent value="pre_conselho" className="mt-6 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Fichas Diagnósticas de Pré-Conselho</CardTitle>
              <CardDescription>
                Diagnóstico prévio preenchido pelos professores identificando objetivos atingidos e alunos com necessidades de intervenção.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Turma</TableHead>
                    <TableHead>Componente Curricular</TableHead>
                    <TableHead>Docente Responsável</TableHead>
                    <TableHead>Desempenho Geral</TableHead>
                    <TableHead className="text-center">Atingimento de Objetivos</TableHead>
                    <TableHead className="text-center">Alunos Sinalizados</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preConselhos.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.turma_nome}</TableCell>
                      <TableCell className="font-semibold text-primary">{p.componente_nome}</TableCell>
                      <TableCell>{p.professor_nome}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            p.desempenho_geral === 'excelente' || p.desempenho_geral === 'bom'
                              ? 'default'
                              : 'destructive'
                          }
                        >
                          {p.desempenho_geral.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-mono tabular-nums font-bold">
                        {p.objetivos_atingidos_percentual}%
                      </TableCell>
                      <TableCell className="text-center font-mono tabular-nums">
                        {p.alunos_sinalizados_count > 0 ? (
                          <Badge variant="outline" className="border-amber-500 text-amber-500">
                            {p.alunos_sinalizados_count} em atenção
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">Nenhum</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm">
                          Visualizar Ficha
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── ABA 3: ATAS DELIBERATIVAS ──────────────────────────────────── */}
        <TabsContent value="atas" className="mt-6 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Atas Deliberativas e Decisões Colegiadas</CardTitle>
              <CardDescription>
                Registro formal de deliberações de progressão plena, dependência, recuperação e retenção por estudante.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número da Ata</TableHead>
                    <TableHead>Turma / Período</TableHead>
                    <TableHead>Data da Reunião</TableHead>
                    <TableHead className="text-center">Prog. Plena</TableHead>
                    <TableHead className="text-center">Dependência</TableHead>
                    <TableHead className="text-center">Recuperação</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {atas.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-mono font-bold">{a.numero_ata}</TableCell>
                      <TableCell>
                        {a.turma_nome}
                        <span className="block text-xs text-muted-foreground">{a.periodo_rotulo}</span>
                      </TableCell>
                      <TableCell className="font-mono text-sm tabular-nums">
                        {a.data_reuniao}
                        <span className="block text-xs text-muted-foreground">{a.horario}</span>
                      </TableCell>
                      <TableCell className="text-center font-mono tabular-nums font-semibold text-emerald-600">
                        {a.progressao_plena}
                      </TableCell>
                      <TableCell className="text-center font-mono tabular-nums text-amber-600">
                        {a.progressao_dependencia}
                      </TableCell>
                      <TableCell className="text-center font-mono tabular-nums text-rose-600">
                        {a.recuperacao_intensiva}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            a.status === 'finalizada' || a.status === 'homologada'
                              ? 'default'
                              : 'secondary'
                          }
                          className="flex items-center gap-1 w-fit"
                        >
                          {a.status === 'finalizada' && <Lock className="h-3 w-3" />}
                          {a.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {a.status === 'rascunho' && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setAtaSelecionada(a);
                              setModalFinalizarAberto(true);
                            }}
                          >
                            Finalizar Ata
                          </Button>
                        )}
                        <Button variant="outline" size="sm">
                          Imprimir Ata
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── MODAL: NOVO CRONOGRAMA ────────────────────────────────────────── */}
      <Modal
        open={modalCronogramaAberto}
        onClose={() => setModalCronogramaAberto(false)}
        title="Cadastrar Cronograma de Conselho de Classe"
      >
        <form onSubmit={handleCriarCronograma} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Ano Letivo</label>
              <Input
                value={novoCronograma.ano_letivo}
                onChange={(e) => setNovoCronograma({ ...novoCronograma, ano_letivo: e.target.value })}
                className="font-mono"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Período Avaliativo</label>
              <Select
                value={novoCronograma.periodo}
                onChange={(val) => setNovoCronograma({ ...novoCronograma, periodo: val })}
                options={[
                  { value: '1_bimestre', label: '1º Bimestre' },
                  { value: '2_bimestre', label: '2º Bimestre' },
                  { value: '3_bimestre', label: '3º Bimestre' },
                  { value: '4_bimestre', label: '4º Bimestre' },
                  { value: 'final', label: 'Conselho Final' },
                ]}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Início Pré-Conselho</label>
              <Input
                type="date"
                value={novoCronograma.data_inicio_pre}
                onChange={(e) => setNovoCronograma({ ...novoCronograma, data_inicio_pre: e.target.value })}
                className="font-mono"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Término Pré-Conselho</label>
              <Input
                type="date"
                value={novoCronograma.data_fim_pre}
                onChange={(e) => setNovoCronograma({ ...novoCronograma, data_fim_pre: e.target.value })}
                className="font-mono"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground">Data da Reunião Colegiada</label>
            <Input
              type="date"
              value={novoCronograma.data_reuniao}
              onChange={(e) => setNovoCronograma({ ...novoCronograma, data_reuniao: e.target.value })}
              className="font-mono font-semibold"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" type="button" onClick={() => setModalCronogramaAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit">Salvar Cronograma</Button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL: FICHA DIAGNÓSTICA DE PRÉ-CONSELHO ────────────────────────── */}
      <Modal
        open={modalPreConselhoAberto}
        onClose={() => setModalPreConselhoAberto(false)}
        title="Registrar Ficha de Pré-Conselho da Disciplina"
      >
        <form onSubmit={handleCriarPreConselho} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Turma</label>
              <Input value={novoPreConselho.turma} readOnly className="bg-muted/50" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Componente Curricular</label>
              <Input value={novoPreConselho.componente} readOnly className="bg-muted/50 font-semibold" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Desempenho Geral</label>
              <Select
                value={novoPreConselho.desempenho}
                onChange={(val) => setNovoPreConselho({ ...novoPreConselho, desempenho: val })}
                options={[
                  { value: 'excelente', label: 'Excelente' },
                  { value: 'bom', label: 'Bom' },
                  { value: 'regular', label: 'Regular' },
                  { value: 'insatisfatorio', label: 'Insatisfatório' },
                ]}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Atingimento de Objetivos (%)</label>
              <Input
                type="number"
                min="0"
                max="100"
                value={novoPreConselho.percentual}
                onChange={(e) => setNovoPreConselho({ ...novoPreConselho, percentual: e.target.value })}
                className="font-mono"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground">Dificuldades Detectadas na Turma</label>
            <Textarea
              placeholder="Descreva as principais lacunas conceituais observadas..."
              value={novoPreConselho.dificuldades}
              onChange={(e) => setNovoPreConselho({ ...novoPreConselho, dificuldades: e.target.value })}
              rows={3}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground">Ações de Intervenção Pedagógica</label>
            <Textarea
              placeholder="Estratégias de recuperação contínua sugeridas..."
              value={novoPreConselho.acoes}
              onChange={(e) => setNovoPreConselho({ ...novoPreConselho, acoes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" type="button" onClick={() => setModalPreConselhoAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit">Gravar Diagnóstico</Button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL: DELIBERAÇÃO INDIVIDUAL ───────────────────────────────────── */}
      <Modal
        open={modalDeliberacaoAberto}
        onClose={() => setModalDeliberacaoAberto(false)}
        title="Registrar Deliberação Colegiada do Estudante"
      >
        <form onSubmit={handleSalvarDeliberacao} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Nome do Estudante</label>
            <Input value={novaDeliberacao.aluno_nome} readOnly className="bg-muted/50 font-medium" />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground">Resultado da Deliberação</label>
            <Select
              value={novaDeliberacao.resultado}
              onChange={(val) => setNovaDeliberacao({ ...novaDeliberacao, resultado: val })}
              options={[
                { value: 'progressao_plena', label: 'Progressão Plena' },
                { value: 'progressao_dependencia', label: 'Progressão com Dependência' },
                { value: 'recuperacao_intensiva', label: 'Recuperação Intensiva' },
                { value: 'retencao', label: 'Retenção' },
              ]}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground">Parecer Descritivo do Conselho</label>
            <Textarea
              value={novaDeliberacao.parecer}
              onChange={(e) => setNovaDeliberacao({ ...novaDeliberacao, parecer: e.target.value })}
              rows={4}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" type="button" onClick={() => setModalDeliberacaoAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit">Salvar Deliberação</Button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL: FINALIZAR ATA ────────────────────────────────────────────── */}
      <Modal
        open={modalFinalizarAberto}
        onClose={() => setModalFinalizarAberto(false)}
        title="Confirmar Finalização de Ata Colegiada"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-500">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold">Atenção: Ação Irreversível</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Ao finalizar a ata <span className="font-mono font-bold text-foreground">{ataSelecionada?.numero_ata}</span>,
                todas as decisões colegiadas e deliberações de estudantes tornam-se imutáveis perante o conselho escolar.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setModalFinalizarAberto(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleConfirmarFinalizacao}>
              Confirmar e Finalizar Ata
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
