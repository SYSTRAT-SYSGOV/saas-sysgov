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
  Checkbox,
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
  Users,
  GraduationCap,
  UserCheck,
  Clock,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Building2,
  Sparkles,
  Filter,
  FileText,
  Check,
  Eye,
  Send,
  CalendarCheck,
  ArrowUpDown,
} from 'lucide-react';
import { useEduca } from '../context/EducaContext';

export interface CapacidadeRede {
  id: string;
  escola_nome: string;
  etapa_ensino: string;
  turno: 'matutino' | 'vespertino' | 'integral' | 'noturno';
  vagas_totais: number;
  vagas_ocupadas: number;
  vagas_reservadas: number;
  vagas_remanescentes: number;
  taxa_ocupacao: number;
}

export interface InscricaoPreMatricula {
  id: string;
  numero_protocolo: string;
  candidato_nome: string;
  candidato_cpf: string;
  candidato_data_nascimento: string;
  responsavel_nome: string;
  responsavel_telefone: string;
  etapa_ensino: string;
  turno_preferencial: string;
  escola_preferencia_nome: string;
  status: 'inscrito' | 'deferida' | 'indeferida' | 'cancelada';
  criterio_pcd: boolean;
  criterio_bolsa_familia: boolean;
  criterio_mae_trabalhadora: boolean;
  criterio_irmao_escola: boolean;
  criterio_zoneamento: boolean;
  pontuacao_total: number;
  criado_em: string;
  motivo_indeferimento?: string;
}

export interface ItemFilaEspera {
  id: string;
  posicao: number;
  numero_protocolo: string;
  candidato_nome: string;
  etapa_ensino: string;
  turno: string;
  escola_nome: string;
  pontuacao: number;
  prioridade_legal: boolean;
  status: 'aguardando' | 'convocado' | 'matriculado' | 'desistente';
  convocado_em?: string;
  limite_comparecimento_em?: string;
  dias_restantes_sla?: number;
}

export const GestaoVagasView: React.FC = () => {
  const { escolaAtivaId, anoLetivoAtivo } = useEduca();

  // Estados principais
  const [subAba, setSubAba] = useState<'capacidade' | 'triagem' | 'fila'>('capacidade');
  const [busca, setBusca] = useState('');
  const [filtroEtapa, setFiltroEtapa] = useState<string>('todos');

  // Dados mockados iniciais realistas para demonstração e interação imediata
  const [capacidades, setCapacidades] = useState<CapacidadeRede[]>([
    {
      id: 'cap-1',
      escola_nome: 'E.M. Darcy Ribeiro',
      etapa_ensino: 'creche_bercario',
      turno: 'integral',
      vagas_totais: 25,
      vagas_ocupadas: 22,
      vagas_reservadas: 2,
      vagas_remanescentes: 1,
      taxa_ocupacao: 96.0,
    },
    {
      id: 'cap-2',
      escola_nome: 'E.M. Darcy Ribeiro',
      etapa_ensino: 'creche_maternal_1',
      turno: 'integral',
      vagas_totais: 30,
      vagas_ocupadas: 28,
      vagas_reservadas: 1,
      vagas_remanescentes: 1,
      taxa_ocupacao: 96.7,
    },
    {
      id: 'cap-3',
      escola_nome: 'E.M. Paulo Freire',
      etapa_ensino: 'pre_escola_1',
      turno: 'matutino',
      vagas_totais: 35,
      vagas_ocupadas: 30,
      vagas_reservadas: 0,
      vagas_remanescentes: 5,
      taxa_ocupacao: 85.7,
    },
    {
      id: 'cap-4',
      escola_nome: 'E.M. Cecília Meireles',
      etapa_ensino: 'fundamental_1_ano',
      turno: 'matutino',
      vagas_totais: 40,
      vagas_ocupadas: 38,
      vagas_reservadas: 2,
      vagas_remanescentes: 0,
      taxa_ocupacao: 100.0,
    },
  ]);

  const [inscricoes, setInscricoes] = useState<InscricaoPreMatricula[]>([
    {
      id: 'app-1',
      numero_protocolo: 'VAGA-2026-00012',
      candidato_nome: 'Arthur Henrique de Souza',
      candidato_cpf: '123.456.789-01',
      candidato_data_nascimento: '15/05/2024',
      responsavel_nome: 'Mariana de Souza',
      responsavel_telefone: '(11) 98877-6655',
      etapa_ensino: 'creche_bercario',
      turno_preferencial: 'integral',
      escola_preferencia_nome: 'E.M. Darcy Ribeiro',
      status: 'inscrito',
      criterio_pcd: true,
      criterio_bolsa_familia: true,
      criterio_mae_trabalhadora: true,
      criterio_irmao_escola: false,
      criterio_zoneamento: true,
      pontuacao_total: 100, // PcD garante pontuação máxima e prioridade legal
      criado_em: '20/10/2026 09:14',
    },
    {
      id: 'app-2',
      numero_protocolo: 'VAGA-2026-00015',
      candidato_nome: 'Helena Beatriz Mendes',
      candidato_cpf: '234.567.890-12',
      candidato_data_nascimento: '02/08/2023',
      responsavel_nome: 'Carla Cristina Mendes',
      responsavel_telefone: '(11) 97766-5544',
      etapa_ensino: 'creche_maternal_1',
      turno_preferencial: 'integral',
      escola_preferencia_nome: 'E.M. Darcy Ribeiro',
      status: 'inscrito',
      criterio_pcd: false,
      criterio_bolsa_familia: true,
      criterio_mae_trabalhadora: true,
      criterio_irmao_escola: true,
      criterio_zoneamento: true,
      pontuacao_total: 75,
      criado_em: '21/10/2026 14:30',
    },
    {
      id: 'app-3',
      numero_protocolo: 'VAGA-2026-00018',
      candidato_nome: 'Lucas Gabriel Oliveira',
      candidato_cpf: '345.678.901-23',
      candidato_data_nascimento: '10/01/2022',
      responsavel_nome: 'Roberto Carlos Oliveira',
      responsavel_telefone: '(11) 96655-4433',
      etapa_ensino: 'pre_escola_1',
      turno_preferencial: 'matutino',
      escola_preferencia_nome: 'E.M. Paulo Freire',
      status: 'deferida',
      criterio_pcd: false,
      criterio_bolsa_familia: false,
      criterio_mae_trabalhadora: true,
      criterio_irmao_escola: false,
      criterio_zoneamento: true,
      pontuacao_total: 40,
      criado_em: '18/10/2026 11:05',
    },
  ]);

  const [filaEspera, setFilaEspera] = useState<ItemFilaEspera[]>([
    {
      id: 'wait-1',
      posicao: 1,
      numero_protocolo: 'VAGA-2026-00012',
      candidato_nome: 'Arthur Henrique de Souza',
      etapa_ensino: 'creche_bercario',
      turno: 'integral',
      escola_nome: 'E.M. Darcy Ribeiro',
      pontuacao: 100,
      prioridade_legal: true,
      status: 'aguardando',
    },
    {
      id: 'wait-2',
      posicao: 2,
      numero_protocolo: 'VAGA-2026-00008',
      candidato_nome: 'Bernardo Lima Santos',
      etapa_ensino: 'creche_bercario',
      turno: 'integral',
      escola_nome: 'E.M. Darcy Ribeiro',
      pontuacao: 85,
      prioridade_legal: false,
      status: 'convocado',
      convocado_em: '22/10/2026',
      limite_comparecimento_em: '29/10/2026',
      dias_restantes_sla: 4,
    },
    {
      id: 'wait-3',
      posicao: 3,
      numero_protocolo: 'VAGA-2026-00015',
      candidato_nome: 'Helena Beatriz Mendes',
      etapa_ensino: 'creche_maternal_1',
      turno: 'integral',
      escola_nome: 'E.M. Darcy Ribeiro',
      pontuacao: 75,
      prioridade_legal: false,
      status: 'aguardando',
    },
  ]);

  // Modais
  const [modalTriagemOpen, setModalTriagemOpen] = useState(false);
  const [inscricaoEmAnalise, setInscricaoEmAnalise] = useState<InscricaoPreMatricula | null>(null);
  const [analiseCriterios, setAnaliseCriterios] = useState({
    pcd: false,
    bolsa_familia: false,
    mae_trabalhadora: false,
    irmao_escola: false,
    zoneamento: false,
  });
  const [motivoIndeferimento, setMotivoIndeferimento] = useState('');

  const [modalConvocacaoOpen, setModalConvocacaoOpen] = useState(false);
  const [candidatoParaConvocar, setCandidatoParaConvocar] = useState<ItemFilaEspera | null>(null);
  const [diasSla, setDiasSla] = useState('5');

  const [modalConsultaPublicaOpen, setModalConsultaPublicaOpen] = useState(false);

  // Cálculos de KPI
  const totaisRede = useMemo(() => {
    const totais = capacidades.reduce((acc, c) => acc + c.vagas_totais, 0);
    const ocupadas = capacidades.reduce((acc, c) => acc + c.vagas_ocupadas, 0);
    const reservadas = capacidades.reduce((acc, c) => acc + c.vagas_reservadas, 0);
    const remanescentes = capacidades.reduce((acc, c) => acc + c.vagas_remanescentes, 0);
    const ocupacaoPercent = totais > 0 ? Math.round(((ocupadas + reservadas) / totais) * 100) : 0;
    return { totais, ocupadas, reservadas, remanescentes, ocupacaoPercent };
  }, [capacidades]);

  // Abertura do modal de análise documental
  const abrirAnalise = (inscricao: InscricaoPreMatricula) => {
    setInscricaoEmAnalise(inscricao);
    setAnaliseCriterios({
      pcd: inscricao.criterio_pcd,
      bolsa_familia: inscricao.criterio_bolsa_familia,
      mae_trabalhadora: inscricao.criterio_mae_trabalhadora,
      irmao_escola: inscricao.criterio_irmao_escola,
      zoneamento: inscricao.criterio_zoneamento,
    });
    setMotivoIndeferimento('');
    setModalTriagemOpen(true);
  };

  // Salvar deferimento ou indeferimento
  const salvarAnalise = (statusFinal: 'deferida' | 'indeferida') => {
    if (!inscricaoEmAnalise) return;

    if (statusFinal === 'indeferida' && !motivoIndeferimento.trim()) {
      alert('Informe o motivo do indeferimento documental.');
      return;
    }

    setInscricoes((prev) =>
      prev.map((item) =>
        item.id === inscricaoEmAnalise.id
          ? {
              ...item,
              status: statusFinal,
              criterio_pcd: analiseCriterios.pcd,
              criterio_bolsa_familia: analiseCriterios.bolsa_familia,
              criterio_mae_trabalhadora: analiseCriterios.mae_trabalhadora,
              criterio_irmao_escola: analiseCriterios.irmao_escola,
              criterio_zoneamento: analiseCriterios.zoneamento,
              motivo_indeferimento: statusFinal === 'indeferida' ? motivoIndeferimento : undefined,
            }
          : item
      )
    );

    // Se deferida, adiciona automaticamente à fila de espera
    if (statusFinal === 'deferida') {
      const novaPosicao = filaEspera.length + 1;
      setFilaEspera((prev) => [
        ...prev,
        {
          id: `wait-${Date.now()}`,
          posicao: novaPosicao,
          numero_protocolo: inscricaoEmAnalise.numero_protocolo,
          candidato_nome: inscricaoEmAnalise.candidato_nome,
          etapa_ensino: inscricaoEmAnalise.etapa_ensino,
          turno: inscricaoEmAnalise.turno_preferencial,
          escola_nome: inscricaoEmAnalise.escola_preferencia_nome,
          pontuacao: inscricaoEmAnalise.pontuacao_total,
          prioridade_legal: analiseCriterios.pcd,
          status: 'aguardando',
        },
      ]);
    }

    setModalTriagemOpen(false);
  };

  // Abrir modal de convocação
  const abrirConvocacao = (item: ItemFilaEspera) => {
    setCandidatoParaConvocar(item);
    setDiasSla('5');
    setModalConvocacaoOpen(true);
  };

  // Confirmar convocação com SLA
  const confirmarConvocacao = () => {
    if (!candidatoParaConvocar) return;

    setFilaEspera((prev) =>
      prev.map((f) =>
        f.id === candidatoParaConvocar.id
          ? {
              ...f,
              status: 'convocado',
              convocado_em: '25/10/2026',
              limite_comparecimento_em: '31/10/2026',
              dias_restantes_sla: parseInt(diasSla, 10),
            }
          : f
      )
    );

    // Reserva vaga na capacidade
    setCapacidades((prev) =>
      prev.map((c) =>
        c.etapa_ensino === candidatoParaConvocar.etapa_ensino
          ? {
              ...c,
              vagas_reservadas: c.vagas_reservadas + 1,
              vagas_remanescentes: Math.max(0, c.vagas_remanescentes - 1),
            }
          : c
      )
    );

    setModalConvocacaoOpen(false);
  };

  // Efetivar conversão em matrícula
  const efetivarMatricula = (item: ItemFilaEspera) => {
    setFilaEspera((prev) =>
      prev.map((f) => (f.id === item.id ? { ...f, status: 'matriculado' } : f))
    );

    setCapacidades((prev) =>
      prev.map((c) =>
        c.etapa_ensino === item.etapa_ensino
          ? {
              ...c,
              vagas_ocupadas: c.vagas_ocupadas + 1,
              vagas_reservadas: Math.max(0, c.vagas_reservadas - 1),
            }
          : c
      )
    );
  };

  // Reclassificação dinâmica
  const reclassificarFila = () => {
    const ordenado = [...filaEspera].sort((a, b) => {
      if (a.prioridade_legal && !b.prioridade_legal) return -1;
      if (!a.prioridade_legal && b.prioridade_legal) return 1;
      return b.pontuacao - a.pontuacao;
    });

    const atualizado = ordenado.map((item, idx) => ({
      ...item,
      posicao: idx + 1,
    }));

    setFilaEspera(atualizado);
  };

  // Função para mascarar nome (LGPD)
  const mascararNome = (nome: string): string => {
    return nome
      .split(' ')
      .map((part) => (part.length > 2 ? `${part[0]}***` : part))
      .join(' ');
  };

  return (
    <div className="space-y-6">
      {/* Cards de Métricas Principais (KPIs) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard
          title="Vagas Totais Ofertadas"
          value={totaisRede.totais}
          subtitle="Capacidade autorizada na rede"
          valueClassName="text-blue-700 font-mono tabular-nums"
          accentClassName="border-l-blue-600"
        />
        <KpiCard
          title="Vagas Ocupadas"
          value={totaisRede.ocupadas}
          subtitle={`Taxa de ocupação: ${totaisRede.ocupacaoPercent}%`}
          valueClassName="text-emerald-700 font-mono tabular-nums"
          accentClassName="border-l-emerald-600"
        />
        <KpiCard
          title="Vagas Reservadas (SLA)"
          value={totaisRede.reservadas}
          subtitle="Candidatos convocados em prazo"
          valueClassName="text-amber-700 font-mono tabular-nums"
          accentClassName="border-l-amber-600"
        />
        <KpiCard
          title="Vagas Remanescentes"
          value={totaisRede.remanescentes}
          subtitle="Disponíveis para convocação"
          valueClassName="text-cyan-700 font-mono tabular-nums"
          accentClassName="border-l-cyan-600"
        />
      </div>

      {/* Navegação Secundária do Submódulo de Vagas */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-3 rounded-lg border border-gov-border">
        <div className="flex items-center gap-2">
          <Button
            variant={subAba === 'capacidade' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSubAba('capacidade')}
            className="text-xs"
          >
            <Building2 className="w-3.5 h-3.5 mr-1" />
            Capacidade da Rede
          </Button>
          <Button
            variant={subAba === 'triagem' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSubAba('triagem')}
            className="text-xs"
          >
            <FileText className="w-3.5 h-3.5 mr-1" />
            Inscrições & Triagem
          </Button>
          <Button
            variant={subAba === 'fila' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSubAba('fila')}
            className="text-xs"
          >
            <Users className="w-3.5 h-3.5 mr-1" />
            Fila de Espera Transparente
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setModalConsultaPublicaOpen(true)}
            className="text-xs border-blue-300 text-blue-700 hover:bg-blue-50"
          >
            <Eye className="w-3.5 h-3.5 mr-1 text-blue-600" />
            Portal Cidadão (Lei 14.685)
          </Button>
        </div>
      </div>

      {/* ABA 1: CAPACIDADE DA REDE */}
      {subAba === 'capacidade' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Capacidade de Atendimento por Unidade e Etapa</span>
              <Badge variant="outline" className="font-mono text-xs">
                Ano Letivo: {anoLetivoAtivo || 2026}
              </Badge>
            </CardTitle>
            <CardDescription>
              Controle de vagas remanescentes, reservas ativas e limites físicos homologados por turma.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unidade Escolar</TableHead>
                  <TableHead>Etapa de Ensino</TableHead>
                  <TableHead>Turno</TableHead>
                  <TableHead className="text-right">Vagas Totais</TableHead>
                  <TableHead className="text-right">Ocupadas</TableHead>
                  <TableHead className="text-right">Reservadas</TableHead>
                  <TableHead className="text-right">Remanescentes</TableHead>
                  <TableHead className="text-right">Ocupação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {capacidades.map((cap) => (
                  <TableRow key={cap.id}>
                    <TableCell className="font-medium text-gov-text">
                      {cap.escola_nome}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize text-xs">
                        {cap.etapa_ensino.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize text-xs text-gov-text-muted">
                      {cap.turno}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums font-semibold">
                      {cap.vagas_totais}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-emerald-700">
                      {cap.vagas_ocupadas}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-amber-600">
                      {cap.vagas_reservadas}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums font-bold text-blue-700">
                      {cap.vagas_remanescentes}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                          cap.taxa_ocupacao >= 95
                            ? 'bg-rose-100 text-rose-800'
                            : cap.taxa_ocupacao >= 80
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {cap.taxa_ocupacao}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ABA 2: INSCRIÇÕES E TRIAGEM DOCUMENTAL */}
      {subAba === 'triagem' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Inscrições de Pré-Matrícula e Conferência Socioeconômica</span>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Buscar protocolo ou candidato..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="w-64 text-xs h-8"
                />
              </div>
            </CardTitle>
            <CardDescription>
              Validação das autodeclarações e documentos comprobatórios (PcD, CadÚnico, Zoneamento e Mãe Trabalhadora).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Protocolo</TableHead>
                  <TableHead>Candidato</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Etapa</TableHead>
                  <TableHead>Pontuação</TableHead>
                  <TableHead>Prioridade Legal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inscricoes.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-mono text-xs font-bold text-blue-800">
                      {app.numero_protocolo}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-xs text-gov-text">{app.candidato_nome}</div>
                      <div className="text-[11px] font-mono text-gov-text-muted">
                        Nasc: {app.candidato_data_nascimento}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-gov-text">{app.responsavel_nome}</div>
                      <div className="text-[11px] font-mono text-gov-text-muted">
                        {app.responsavel_telefone}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize text-[11px]">
                        {app.etapa_ensino.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono tabular-nums font-bold text-xs text-emerald-700">
                      {app.pontuacao_total} pts
                    </TableCell>
                    <TableCell>
                      {app.criterio_pcd ? (
                        <Badge variant="default" className="bg-purple-600 text-[11px] flex items-center gap-1 w-fit">
                          <Sparkles className="w-3 h-3" />
                          PcD (Legal)
                        </Badge>
                      ) : (
                        <span className="text-[11px] text-gov-text-muted">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          app.status === 'deferida'
                            ? 'default'
                            : app.status === 'indeferida'
                            ? 'destructive'
                            : 'secondary'
                        }
                        className="text-[11px] capitalize"
                      >
                        {app.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {app.status === 'inscrito' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => abrirAnalise(app)}
                          className="text-xs h-7 px-2 border-blue-600 text-blue-700 hover:bg-blue-50"
                        >
                          Analisar
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => abrirAnalise(app)}
                          className="text-xs h-7 px-2 text-gov-text-muted"
                        >
                          Ver Análise
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ABA 3: FILA DE ESPERA TRANSPARENTE */}
      {subAba === 'fila' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Fila de Espera Classificada (Lei Federal nº 14.685/2023)</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={reclassificarFila}
                  className="text-xs h-8 border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                >
                  <ArrowUpDown className="w-3.5 h-3.5 mr-1" />
                  Reclassificar Fila
                </Button>
              </div>
            </CardTitle>
            <CardDescription>
              Ordem de chamamento transparente com desempate por PcD (prioridade absoluta), menor renda familiar e data/hora.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Posição</TableHead>
                  <TableHead>Protocolo</TableHead>
                  <TableHead>Candidato</TableHead>
                  <TableHead>Etapa & Escola</TableHead>
                  <TableHead>Pontuação</TableHead>
                  <TableHead>Status & SLA</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filaEspera.map((item) => (
                  <TableRow key={item.id} className={item.prioridade_legal ? 'bg-purple-50/40' : ''}>
                    <TableCell>
                      <span className="font-mono tabular-nums text-sm font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                        {item.posicao}º
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs font-semibold text-blue-700">
                      {item.numero_protocolo}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-xs text-gov-text flex items-center gap-1.5">
                        {item.candidato_nome}
                        {item.prioridade_legal && (
                          <Badge variant="default" className="bg-purple-600 text-[10px] py-0 px-1.5">
                            PcD
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs capitalize font-medium">{item.etapa_ensino.replace(/_/g, ' ')}</div>
                      <div className="text-[11px] text-gov-text-muted">{item.escola_nome}</div>
                    </TableCell>
                    <TableCell className="font-mono tabular-nums font-bold text-xs text-emerald-700">
                      {item.pontuacao} pts
                    </TableCell>
                    <TableCell>
                      {item.status === 'convocado' ? (
                        <div className="space-y-0.5">
                          <Badge variant="default" className="bg-amber-600 text-[11px]">
                            Convocado ({item.dias_restantes_sla}d restantes)
                          </Badge>
                          <div className="text-[10px] font-mono text-gov-text-muted">
                            Limite: {item.limite_comparecimento_em}
                          </div>
                        </div>
                      ) : item.status === 'matriculado' ? (
                        <Badge variant="default" className="bg-emerald-600 text-[11px]">
                          Matriculado
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[11px]">
                          Aguardando Vaga
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.status === 'aguardando' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => abrirConvocacao(item)}
                          className="text-xs h-7 px-2 border-blue-600 text-blue-700 hover:bg-blue-50"
                        >
                          <Send className="w-3 h-3 mr-1" />
                          Convocar
                        </Button>
                      )}
                      {item.status === 'convocado' && (
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => efetivarMatricula(item)}
                            className="text-xs h-7 px-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <CalendarCheck className="w-3 h-3 mr-1" />
                            Matricular
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* MODAL 1: CONFERÊNCIA DE CRITÉRIOS SOCIOECONÔMICOS (TRIAGEM) */}
      <Modal
        open={modalTriagemOpen}
        onClose={() => setModalTriagemOpen(false)}
        title="Análise Documental de Pré-Matrícula"
        description={
          inscricaoEmAnalise
            ? `Protocolo ${inscricaoEmAnalise.numero_protocolo} — Candidato: ${inscricaoEmAnalise.candidato_nome}`
            : ''
        }
        size="lg"
        footer={
          <div className="flex justify-between w-full">
            <Button
              variant="outline"
              onClick={() => setModalTriagemOpen(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={() => salvarAnalise('indeferida')}
                className="text-xs"
              >
                <XCircle className="w-3.5 h-3.5 mr-1" />
                Indeferir Inscrição
              </Button>
              <Button
                variant="default"
                onClick={() => salvarAnalise('deferida')}
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                Deferir & Enfileirar
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4 py-2">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
            <div className="text-xs font-semibold text-slate-800">Dados do Responsável:</div>
            <div className="text-xs text-slate-600">
              Nome: {inscricaoEmAnalise?.responsavel_nome} | Telefone: {inscricaoEmAnalise?.responsavel_telefone}
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold text-gov-text uppercase tracking-wider">
              Conferência de Documentos e Critérios:
            </span>

            <div className="space-y-2.5 pt-1">
              <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                <Checkbox
                  checked={analiseCriterios.pcd}
                  onCheckedChange={(checked) =>
                    setAnaliseCriterios((p) => ({ ...p, pcd: !!checked }))
                  }
                />
                <span>
                  <strong>Laudo Médico PcD (Lei nº 13.146/2015):</strong> Prioridade absoluta com cota garantida.
                </span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                <Checkbox
                  checked={analiseCriterios.bolsa_familia}
                  onCheckedChange={(checked) =>
                    setAnaliseCriterios((p) => ({ ...p, bolsa_familia: !!checked }))
                  }
                />
                <span>
                  <strong>CadÚnico / Bolsa Família:</strong> Vulnerabilidade socioeconômica comprovada (+30 pts).
                </span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                <Checkbox
                  checked={analiseCriterios.mae_trabalhadora}
                  onCheckedChange={(checked) =>
                    setAnaliseCriterios((p) => ({ ...p, mae_trabalhadora: !!checked }))
                  }
                />
                <span>
                  <strong>Mãe Trabalhadora:</strong> Carteira de trabalho ou holerite apresentado (+25 pts).
                </span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                <Checkbox
                  checked={analiseCriterios.irmao_escola}
                  onCheckedChange={(checked) =>
                    setAnaliseCriterios((p) => ({ ...p, irmao_escola: !!checked }))
                  }
                />
                <span>
                  <strong>Irmão Matriculado na Mesma Unidade:</strong> Matrícula ativa confirmada (+15 pts).
                </span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                <Checkbox
                  checked={analiseCriterios.zoneamento}
                  onCheckedChange={(checked) =>
                    setAnaliseCriterios((p) => ({ ...p, zoneamento: !!checked }))
                  }
                />
                <span>
                  <strong>Zoneamento Geográfico:</strong> Comprovante de residência no raio municipal (+10 pts).
                </span>
              </label>
            </div>
          </div>

          <div className="space-y-1 pt-2">
            <span className="text-xs font-semibold text-gov-text">
              Motivo do Indeferimento (obrigatório se indeferida):
            </span>
            <Textarea
              placeholder="Descreva a inconformidade documental ou ausência de laudo comprobatório..."
              value={motivoIndeferimento}
              onChange={(e) => setMotivoIndeferimento(e.target.value)}
              className="text-xs min-h-[70px]"
            />
          </div>
        </div>
      </Modal>

      {/* MODAL 2: CONVOCAÇÃO NOMINAL COM SLA */}
      <Modal
        open={modalConvocacaoOpen}
        onClose={() => setModalConvocacaoOpen(false)}
        title="Convocação Nominal de Vaga"
        description={
          candidatoParaConvocar
            ? `Candidato: ${candidatoParaConvocar.candidato_nome} (${candidatoParaConvocar.numero_protocolo})`
            : ''
        }
        size="md"
        footer={
          <div className="flex justify-between w-full">
            <Button
              variant="outline"
              onClick={() => setModalConvocacaoOpen(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              variant="default"
              onClick={confirmarConvocacao}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Send className="w-3.5 h-3.5 mr-1" />
              Confirmar Convocação & Reservar Vaga
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-2">
          <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-xs text-amber-800 space-y-1">
            <strong>Atenção:</strong> Ao confirmar, 1 vaga remanescente será automaticamente
            bloqueada em estado <strong>Reservada</strong> na escola indicada, e o prazo legal de
            comparecimento começará a correr.
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gov-text">
              Prazo de Comparecimento (SLA em dias úteis):
            </label>
            <Input
              type="number"
              value={diasSla}
              onChange={(e) => setDiasSla(e.target.value)}
              min={1}
              max={30}
              className="text-xs font-mono tabular-nums"
            />
            <span className="text-[11px] text-gov-text-muted">
              Padrão municipal: 5 dias úteis a contar do primeiro dia útil subsequente.
            </span>
          </div>
        </div>
      </Modal>

      {/* MODAL 3: PORTAL PÚBLICO CIDADÃO (LEI 14.685/2023 - LGPD) */}
      <Modal
        open={modalConsultaPublicaOpen}
        onClose={() => setModalConsultaPublicaOpen(false)}
        title="Portal Público de Transparência da Fila Escolar"
        description="Visualização com anonimização de dados conforme Lei Federal nº 14.685/2023 e LGPD"
        size="lg"
        footer={
          <div className="flex justify-end w-full">
            <Button
              variant="outline"
              onClick={() => setModalConsultaPublicaOpen(false)}
              className="text-xs"
            >
              Fechar Visualização
            </Button>
          </div>
        }
      >
        <div className="space-y-3 py-2">
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 text-xs text-blue-900">
            A <strong>Lei nº 14.685/2023</strong> determina a divulgação pública, periódica e acessível
            da ordem de espera de vagas na educação infantil e básica, assegurando o anonimato dos dados
            pessoais de menores.
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Posição</TableHead>
                <TableHead>Protocolo</TableHead>
                <TableHead>Candidato (Anonimizado)</TableHead>
                <TableHead>Etapa</TableHead>
                <TableHead>Pontos</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filaEspera.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono tabular-nums font-bold text-xs">
                    {item.posicao}º
                  </TableCell>
                  <TableCell className="font-mono text-xs text-blue-700">
                    {item.numero_protocolo}
                  </TableCell>
                  <TableCell className="font-medium text-xs text-slate-700">
                    {mascararNome(item.candidato_nome)}
                  </TableCell>
                  <TableCell className="text-xs capitalize">
                    {item.etapa_ensino.replace(/_/g, ' ')}
                  </TableCell>
                  <TableCell className="font-mono tabular-nums text-xs">
                    {item.pontuacao}
                  </TableCell>
                  <TableCell>
                    {item.prioridade_legal ? (
                      <Badge variant="default" className="bg-purple-600 text-[10px]">
                        PcD
                      </Badge>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px] capitalize">
                      {item.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Modal>
    </div>
  );
};

export default GestaoVagasView;
