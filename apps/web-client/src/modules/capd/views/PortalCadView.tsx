import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  Card,
  Button,
  Badge,
  Input,
  Select,
  Modal,
  StatCard,
} from '@sysgov/ui';
import {
  Gavel,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  AlertTriangle,
  Scale,
  ShieldCheck,
  UserCheck,
  RotateCcw,
  Sparkles,
  Calendar,
  FileQuestion,
  BarChart3,
  Sliders,
  Trophy,
  Lock,
  Eye,
  Plus,
  ShieldAlert,
  ScrollText,
  Copy,
  Check,
  LayoutGrid,
  Table as TableIcon,
  ThumbsUp,
  ThumbsDown,
  Info,
  BookOpen,
  Printer,
  Filter,
  Users,
  UserPlus,
} from 'lucide-react';
import { GestaoCiclosPanel } from '../GestaoCiclosPanel';
import { CadastroPerguntasPanel } from '../CadastroPerguntasPanel';
import { EscalaGraficaPanel } from '../EscalaGraficaPanel';
import { FatoresPesosPanel } from '../FatoresPesosPanel';
import { ConsolidacaoPanel } from '../ConsolidacaoPanel';
import { EspelhoAvaliacaoModal } from '../EspelhoAvaliacaoModal';
import { SysgovApi } from '@sysgov/sdk';
import type {
  ApiRecurso,
  ApiSessao,
  ApiComissao,
  ApiComissaoMembro,
  ApiCiclo,
} from '@sysgov/sdk';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs, type TabsItem } from '@/components/ui/Tabs';
import { StatusChip } from '@/components/ui/StatusChip';
import { EmptyState } from '@/components/ui/EmptyState';
import { SearchInput } from '@/components/ui/SearchInput';
import { DataTable } from '@/components/ui/DataTable';
import type { ColumnDef } from '@tanstack/react-table';

const api = new SysgovApi();

type CadSubTab =
  | 'julgamento'
  | 'sessoes'
  | 'comissao'
  | 'ciclos'
  | 'perguntas'
  | 'escalas'
  | 'pesos'
  | 'consolidacao'
  | 'homologacao';

export interface PortalCadViewProps {
  portalSelector?: React.ReactNode;
}

const TEMPLATES_PARECER = [
  {
    label: 'Ausência de CIT (Art. 24)',
    texto:
      'Com fulcro no Art. 24 da Lei nº 1.704/2006, diante da inexistência de fatos observáveis ou apontamentos prévios no Diário de Bordo (CIT) pela chefia imediata que respaldem a atribuição de nota reduzida, voto pelo PROVIMENTO do recurso com a devida retificação da pontuação na Escala Gráfica.',
  },
  {
    label: 'CIT Consistente (Manter Nota)',
    texto:
      'Compulsando os autos e o Diário de Bordo (CIT), resta comprovada a materialidade dos apontamentos objetivos e incidentes críticos registrados no período aquisitivo pela chefia, demonstrando higidez avaliativa. Voto pelo DESPROVIMENTO do recurso e manutenção integral da avaliação.',
  },
  {
    label: 'Tempestividade & Contraditório',
    texto:
      'Verificada a tempestividade do recurso e acolhendo as ponderações fáticas e documentais apresentadas pelo servidor recorrente em sede de contraditório, voto pelo PROVIMENTO PARCIAL para readequação do grau na Escala Gráfica.',
  },
];

const TEMPLATES_ATA = [
  {
    label: 'Ata Ordinária de Julgamento',
    texto:
      'Aos [DATA], reuniu-se ordinariamente a Comissão de Avaliação e Desempenho (CAD), instituída pela Portaria competente, contando com a presença regimental dos membros titulares e suplentes para deliberação dos recursos interpostos no âmbito do Sistema de Avaliação do Estágio Probatório. Aberta a sessão pelo(a) Presidente, foram submetidos a julgamento os processos constantes da pauta do dia, colhendo-se os relatórios regimentais e as manifestações de voto nominal dos membros julgadores. Concluída a deliberação dos recursos e homologadas as decisões colegiadas, lavrou-se a presente ata, que vai devidamente assinada e selada com hash criptográfico SHA-256 para garantia de fé pública e imutabilidade jurídica perante os órgãos de controle interno e externo.',
  },
  {
    label: 'Ata Extraordinária Homologatória',
    texto:
      'Aos [DATA], reuniu-se extraordinariamente a Comissão de Avaliação e Desempenho (CAD) para conclusão e consolidação dos trabalhos deliberativos do ciclo avaliativo de estágio probatório. Verificado o quórum qualificado, procedeu-se à certificação da inexistência de recursos pendentes de julgamento e à homologação dos pareceres conclusivos de estabilidade ou exoneração regimental, autorizando o envio do processo consolidado à autoridade competente.',
  },
];

export const PortalCadView: React.FC<PortalCadViewProps> = ({ portalSelector }) => {
  const [activeTab, setActiveTab] = useState<CadSubTab>('julgamento');
  const [loading, setLoading] = useState<boolean>(true);
  const [recursos, setRecursos] = useState<ApiRecurso[]>([]);
  const [sessoes, setSessoes] = useState<ApiSessao[]>([]);
  const [comissoes, setComissoes] = useState<ApiComissao[]>([]);
  const [ciclos, setCiclos] = useState<ApiCiclo[]>([]);
  const [servidores, setServidores] = useState<any[]>([]);

  // Modo de Exibição da Fila de Recursos (Tabela como primeira visualização ativa)
  const [modoExibicaoRecursos, setModoExibicaoRecursos] = useState<'tabela' | 'cards'>('tabela');

  // Filtros de Recursos
  const [buscaRecurso, setBuscaRecurso] = useState<string>('');
  const [filtroStatus, setFiltroStatus] = useState<string>('');

  // Modal de Julgamento Comparativo (3 Colunas: Razões x Contrarrazões x CIT)
  const [modalJulgamentoOpen, setModalJulgamentoOpen] = useState<boolean>(false);
  const [recursoSelecionado, setRecursoSelecionado] = useState<ApiRecurso | null>(null);
  const [modalEspelhoOpen, setModalEspelhoOpen] = useState<boolean>(false);
  const [modalAutosOpen, setModalAutosOpen] = useState<boolean>(false);
  const [modalSorteioOpen, setModalSorteioOpen] = useState<boolean>(false);
  const [recursoParaSorteio, setRecursoParaSorteio] = useState<ApiRecurso | null>(null);

  const [avaliacaoEmFocoId, setAvaliacaoEmFocoId] = useState<number | null>(null);
  const [sessaoAtivaId, setSessaoAtivaId] = useState<number>(1);
  const [votoFavoravel, setVotoFavoravel] = useState<boolean>(false);
  const [novoGrauProposto, setNovoGrauProposto] = useState<number>(3);
  const [parecerVoto, setParecerVoto] = useState<string>('');
  const [salvandoVoto, setSalvandoVoto] = useState<boolean>(false);
  const [sorteandoRelatorId, setSorteandoRelatorId] = useState<number | null>(null);

  // Modal Nova Sessão
  const [modalSessaoOpen, setModalSessaoOpen] = useState<boolean>(false);
  const [comissaoSessaoId, setComissaoSessaoId] = useState<string>('');
  const [tipoSessao, setTipoSessao] = useState<'ordinaria' | 'extraordinaria'>('ordinaria');
  const [dataSessao, setDataSessao] = useState<string>(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [quorumMinimo, setQuorumMinimo] = useState<number>(3);
  const [salvandoSessao, setSalvandoSessao] = useState<boolean>(false);

  // Modal Selar Ata
  const [modalSelarAtaOpen, setModalSelarAtaOpen] = useState<boolean>(false);
  const [sessaoParaSelar, setSessaoParaSelar] = useState<ApiSessao | null>(null);
  const [textoAtaParaSelar, setTextoAtaParaSelar] = useState<string>('');
  const [salvandoSelamento, setSalvandoSelamento] = useState<boolean>(false);
  const [hashCopiado, setHashCopiado] = useState<string | null>(null);

  // Modo de Exibição de Sessões (Tabela como primeira visualização ativa)
  const [modoExibicaoSessoes, setModoExibicaoSessoes] = useState<'tabela' | 'cards'>('tabela');

  // Filtros Avançados de Sessões
  const [buscaSessao, setBuscaSessao] = useState<string>('');
  const [filtroTipoSessao, setFiltroTipoSessao] = useState<string>('');
  const [filtroStatusSessao, setFiltroStatusSessao] = useState<string>('');
  const [filtroComissaoSessao, setFiltroComissaoSessao] = useState<string>('');

  // Modal Dossiê / Visualização da Ata Deliberativa Completa (SHA-256)
  const [modalDetalheAtaOpen, setModalDetalheAtaOpen] = useState<boolean>(false);
  const [sessaoDetalheAta, setSessaoDetalheAta] = useState<ApiSessao | null>(null);
  const [textoAtaCopiado, setTextoAtaCopiado] = useState<boolean>(false);

  // Modal Nova Portaria / Comissão
  const [modalNovaPortariaOpen, setModalNovaPortariaOpen] = useState<boolean>(false);
  const [formCicloPortariaId, setFormCicloPortariaId] = useState<string>('');
  const [formNumeroPortaria, setFormNumeroPortaria] = useState<string>('');
  const [formDataPortaria, setFormDataPortaria] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [salvandoPortaria, setSalvandoPortaria] = useState<boolean>(false);

  // Modal Adicionar Membro
  const [modalNovoMembroOpen, setModalNovoMembroOpen] = useState<boolean>(false);
  const [comissaoSelecionadaId, setComissaoSelecionadaId] = useState<number | null>(null);
  const [formMembroServidorId, setFormMembroServidorId] = useState<string>('');
  const [formMembroPapel, setFormMembroPapel] = useState<
    'presidente' | 'secretario' | 'titular_gestao' | 'titular_servidor' | 'suplente'
  >('titular_gestao');
  const [formDataInicioMandato, setFormDataInicioMandato] = useState<string>('');
  const [formDataFimMandato, setFormDataFimMandato] = useState<string>('');
  const [salvandoMembro, setSalvandoMembro] = useState<boolean>(false);

  // Modal Declarar Impedimento (Art. 31)
  const [modalImpedimentoOpen, setModalImpedimentoOpen] = useState<boolean>(false);
  const [membroSelecionado, setMembroSelecionado] = useState<ApiComissaoMembro | null>(null);
  const [formImpedimentoServidorAlvoId, setFormImpedimentoServidorAlvoId] = useState<string>('');
  const [formImpedimentoTipo, setFormImpedimentoTipo] = useState<
    'grau_parentesco' | 'subordinacao_direta' | 'recorrente' | 'avaliador' | 'autodeclarado'
  >('grau_parentesco');
  const [formImpedimentoMotivo, setFormImpedimentoMotivo] = useState<string>('');
  const [salvandoImpedimento, setSalvandoImpedimento] = useState<boolean>(false);

  // Sub-visão e Modo de Exibição da Comissão (Tabela como padrão de visualização)
  const [subVisaoComissao, setSubVisaoComissao] = useState<'membros' | 'portarias'>('membros');
  const [modoExibicaoComissao, setModoExibicaoComissao] = useState<'tabela' | 'cards'>('tabela');

  // Filtros Avançados para Quadro de Membros
  const [buscaMembro, setBuscaMembro] = useState<string>('');
  const [filtroPapelMembro, setFiltroPapelMembro] = useState<string>('');
  const [filtroSituacaoMembro, setFiltroSituacaoMembro] = useState<string>('');
  const [filtroPortariaMembro, setFiltroPortariaMembro] = useState<string>('');

  // Filtros Avançados para Portarias de Nomeação
  const [buscaPortaria, setBuscaPortaria] = useState<string>('');
  const [filtroStatusPortaria, setFiltroStatusPortaria] = useState<string>('');

  // Modal Homologação Segura (sem confirm() nem alert())
  const [modalHomologacaoOpen, setModalHomologacaoOpen] = useState<boolean>(false);
  const [cicloParaHomologarId, setCicloParaHomologarId] = useState<number>(1);
  const [homologandoCiclo, setHomologandoCiclo] = useState<boolean>(false);

  // Feedback Modal Institucional
  const [feedback, setFeedback] = useState<{
    open: boolean;
    title: string;
    message: string;
    type: 'success' | 'warning' | 'error';
  } | null>(null);

  const carregarDadosCad = useCallback(async () => {
    setLoading(true);
    try {
      const [resRec, resSess, resCom, resCic, resServ] = await Promise.all([
        api.capd.listRecursos().catch(() => ({ data: [] })),
        api.capd.listSessoes().catch(() => ({ data: [] })),
        api.capd.listComissoes().catch(() => ({ data: [] })),
        api.capd.listCiclos().catch(() => []),
        api.capd.listServidores({ per_page: 100 }).catch(() => ({ data: [] })),
      ]);

      const recs = resRec.data || [];
      const sess = resSess.data || [];
      const coms = resCom.data || [];
      const cics = Array.isArray(resCic) ? resCic : [];
      const servs = resServ.data || [];

      setRecursos(recs);
      setSessoes(sess);
      setComissoes(coms);
      setCiclos(cics);
      setServidores(servs);

      if (sess.length > 0) {
        const aberta = sess.find((s: ApiSessao) => !s.finalizada);
        if (aberta) setSessaoAtivaId(aberta.id);
      }
      if (coms.length > 0 && !comissaoSessaoId) {
        setComissaoSessaoId(String(coms[0].id));
      }
      if (cics.length > 0) {
        setCicloParaHomologarId(cics[0].id);
        if (!formCicloPortariaId) {
          setFormCicloPortariaId(String(cics[0].id));
        }
      }
    } catch (e) {
      console.error('Erro ao carregar dados do CAD:', e);
    } finally {
      setLoading(false);
    }
  }, [comissaoSessaoId, formCicloPortariaId]);

  useEffect(() => {
    carregarDadosCad();
  }, [carregarDadosCad]);

  // Estatísticas e KPIs Analíticos dos Recursos
  const recursosPendentes = useMemo(() => {
    return recursos.filter((r) => ['interposto', 'em_instrucao', 'pautado'].includes(r.status));
  }, [recursos]);

  const interpostosCount = useMemo(
    () => recursos.filter((r) => r.status === 'interposto').length,
    [recursos]
  );
  const emInstrucaoCount = useMemo(
    () => recursos.filter((r) => r.status === 'em_instrucao').length,
    [recursos]
  );
  const pautadosCount = useMemo(
    () => recursos.filter((r) => r.status === 'pautado').length,
    [recursos]
  );
  const providosCount = useMemo(
    () => recursos.filter((r) => r.status === 'julgado_provido').length,
    [recursos]
  );
  const desprovidosCount = useMemo(
    () => recursos.filter((r) => r.status === 'julgado_desprovido').length,
    [recursos]
  );
  const totalJulgados = useMemo(
    () => providosCount + desprovidosCount,
    [providosCount, desprovidosCount]
  );
  const taxaProvimento = useMemo(
    () => (totalJulgados > 0 ? Math.round((providosCount / totalJulgados) * 100) : 0),
    [providosCount, totalJulgados]
  );
  const taxaDesprovimento = useMemo(
    () => (totalJulgados > 0 ? Math.round((desprovidosCount / totalJulgados) * 100) : 0),
    [desprovidosCount, totalJulgados]
  );
  const comRelatorCount = useMemo(
    () => recursos.filter((r) => Boolean(r.relator_id || r.relator)).length,
    [recursos]
  );
  const semRelatorCount = useMemo(
    () => recursos.length - comRelatorCount,
    [recursos, comRelatorCount]
  );

  // Estatísticas Gerais de Sessões e Comissões
  const sessoesSeladas = useMemo(() => {
    return sessoes.filter((s) => s.finalizada && Boolean(s.hash_ata_sha256)).length;
  }, [sessoes]);

  const comissoesAtivas = useMemo(() => {
    return comissoes.filter((c) => c.ativa).length;
  }, [comissoes]);

  const totalMembros = useMemo(() => {
    return comissoes.reduce((acc, c) => acc + (c.membros?.length || 0), 0);
  }, [comissoes]);

  const cicloAtivo = useMemo(() => {
    return (
      ciclos.find((c) => ['aberto', 'deliberacao', 'em_recurso', 'em_avaliacao'].includes(c.status)) ||
      ciclos[0] ||
      null
    );
  }, [ciclos]);

  // Handler de Sorteio de Relator com Trava de Impedimentos (Art. 31)
  const handleSortearRelator = async (recursoId: number) => {
    setSorteandoRelatorId(recursoId);
    try {
      const res = await api.capd.sortearRelator(recursoId);
      setModalSorteioOpen(false);
      setRecursoParaSorteio(null);
      setFeedback({
        open: true,
        title: 'Relator Sorteado com Sucesso',
        message:
          res.message ||
          `Relator sorteado para o Recurso #${recursoId}. Isenção legal e triagem de impedimentos (Art. 31) validadas com sucesso.`,
        type: 'success',
      });
      await carregarDadosCad();
      if (recursoSelecionado && recursoSelecionado.id === recursoId) {
        setRecursoSelecionado(res.recurso);
      }
    } catch (err: any) {
      setFeedback({
        open: true,
        title: 'Falha no Sorteio de Relator',
        message:
          err?.response?.data?.message ||
          err?.message ||
          'Não foi possível sortear relator desimpedido. Verifique os membros ativos da comissão.',
        type: 'error',
      });
    } finally {
      setSorteandoRelatorId(null);
    }
  };

  // Handler de Votação Colegiada
  const handleRegistrarVoto = async () => {
    if (!recursoSelecionado) return;
    if (!parecerVoto.trim()) {
      setFeedback({
        open: true,
        title: 'Parecer Obrigatório',
        message: 'A CAD exige fundamentação e parecer técnico para registrar o voto colegiado.',
        type: 'warning',
      });
      return;
    }

    setSalvandoVoto(true);
    try {
      await api.capd.votarRecurso({
        sessao_id: sessaoAtivaId,
        recurso_id: recursoSelecionado.id,
        voto_favoravel: votoFavoravel,
        novo_grau_proposto: votoFavoravel ? novoGrauProposto : undefined,
        parecer_voto: parecerVoto,
      });

      setModalJulgamentoOpen(false);
      setParecerVoto('');
      setFeedback({
        open: true,
        title: 'Voto Registrado no Colegiado',
        message:
          'O voto foi registrado na ata da sessão com sucesso e hash SHA-256 gerado para integridade e auditoria.',
        type: 'success',
      });
      await carregarDadosCad();
    } catch (err: any) {
      setFeedback({
        open: true,
        title: 'Erro na Deliberação',
        message: err?.response?.data?.message || err?.message || 'Falha ao registrar voto.',
        type: 'error',
      });
    } finally {
      setSalvandoVoto(false);
    }
  };

  // Handler Nova Sessão Deliberativa
  const handleCriarSessao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comissaoSessaoId) {
      setFeedback({
        open: true,
        title: 'Comissão Obrigatória',
        message: 'Selecione a Portaria/Comissão competente para presidir a sessão.',
        type: 'warning',
      });
      return;
    }
    setSalvandoSessao(true);
    try {
      await api.capd.createSessao({
        comissao_id: Number(comissaoSessaoId),
        tipo_sessao: tipoSessao,
        data_sessao: dataSessao,
        quorum_minimo: Number(quorumMinimo),
      });
      setModalSessaoOpen(false);
      setFeedback({
        open: true,
        title: 'Sessão Deliberativa Aberta',
        message: `Sessão ${tipoSessao} agendada com sucesso para a comissão designada.`,
        type: 'success',
      });
      await carregarDadosCad();
    } catch (err: any) {
      setFeedback({
        open: true,
        title: 'Erro ao Abrir Sessão',
        message: err?.response?.data?.message || err?.message || 'Falha ao cadastrar sessão.',
        type: 'error',
      });
    } finally {
      setSalvandoSessao(false);
    }
  };

  // Handler Selar Ata com Hash SHA-256
  const handleSelarAta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessaoParaSelar) return;
    if (textoAtaParaSelar.trim().length < 100) {
      setFeedback({
        open: true,
        title: 'Texto da Ata Insuficiente',
        message:
          'A ata formal deliberativa deve possuir no mínimo 100 caracteres de fundamentação e registro para fé pública.',
        type: 'warning',
      });
      return;
    }
    setSalvandoSelamento(true);
    try {
      const res = await api.capd.selarAta(sessaoParaSelar.id, textoAtaParaSelar);
      setModalSelarAtaOpen(false);
      setTextoAtaParaSelar('');
      setSessaoParaSelar(null);
      setFeedback({
        open: true,
        title: 'Ata Lavrada e Selada Irrevogavelmente',
        message: `A ata foi selada criptograficamente com sucesso. Hash SHA-256 gerado: ${res.hash_ata_sha256}`,
        type: 'success',
      });
      await carregarDadosCad();
    } catch (err: any) {
      setFeedback({
        open: true,
        title: 'Erro ao Selar Ata',
        message: err?.response?.data?.message || err?.message || 'Falha ao selar ata criptográfica.',
        type: 'error',
      });
    } finally {
      setSalvandoSelamento(false);
    }
  };

  // Handler Nova Portaria / Comissão
  const handleCriarPortaria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCicloPortariaId || !formNumeroPortaria.trim() || !formDataPortaria) {
      setFeedback({
        open: true,
        title: 'Campos Obrigatórios',
        message: 'Preencha o ciclo de referência, número da portaria e data de publicação oficial.',
        type: 'warning',
      });
      return;
    }
    setSalvandoPortaria(true);
    try {
      await api.capd.createComissao({
        ciclo_id: Number(formCicloPortariaId),
        numero_portaria: formNumeroPortaria,
        data_publicacao_portaria: formDataPortaria,
      });
      setModalNovaPortariaOpen(false);
      setFormNumeroPortaria('');
      setFeedback({
        open: true,
        title: 'Portaria Registrada',
        message: 'Comissão de Avaliação e Desempenho constituída com sucesso.',
        type: 'success',
      });
      await carregarDadosCad();
    } catch (err: any) {
      setFeedback({
        open: true,
        title: 'Erro ao Cadastrar Portaria',
        message: err?.response?.data?.message || err?.message || 'Falha ao cadastrar comissão.',
        type: 'error',
      });
    } finally {
      setSalvandoPortaria(false);
    }
  };

  // Handler Adicionar Membro
  const handleAdicionarMembro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comissaoSelecionadaId || !formMembroServidorId) {
      setFeedback({
        open: true,
        title: 'Servidor Obrigatório',
        message: 'Selecione o servidor público para compor o colegiado da comissão.',
        type: 'warning',
      });
      return;
    }
    setSalvandoMembro(true);
    try {
      await api.capd.adicionarMembroComissao(comissaoSelecionadaId, {
        servidor_id: Number(formMembroServidorId),
        papel: formMembroPapel,
        data_inicio_mandato: formDataInicioMandato || undefined,
        data_fim_mandato: formDataFimMandato || undefined,
      });
      setModalNovoMembroOpen(false);
      setFormMembroServidorId('');
      setFeedback({
        open: true,
        title: 'Membro Designado',
        message: 'Servidor adicionado ao quadro regimental da comissão com sucesso.',
        type: 'success',
      });
      await carregarDadosCad();
    } catch (err: any) {
      setFeedback({
        open: true,
        title: 'Erro ao Adicionar Membro',
        message: err?.response?.data?.message || err?.message || 'Falha ao designar membro.',
        type: 'error',
      });
    } finally {
      setSalvandoMembro(false);
    }
  };

  // Handler Declarar Impedimento (Art. 31)
  const handleDeclararImpedimento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !membroSelecionado ||
      !formImpedimentoServidorAlvoId ||
      formImpedimentoMotivo.trim().length < 10
    ) {
      setFeedback({
        open: true,
        title: 'Dados Incompletos',
        message:
          'Selecione o servidor avaliado em conflito e fundamente o motivo circunstanciado com no mínimo 10 caracteres (Art. 31).',
        type: 'warning',
      });
      return;
    }
    setSalvandoImpedimento(true);
    try {
      await api.capd.declararImpedimento(membroSelecionado.id, {
        servidor_alvo_id: Number(formImpedimentoServidorAlvoId),
        tipo_impedimento: formImpedimentoTipo,
        motivo: formImpedimentoMotivo,
      });
      setModalImpedimentoOpen(false);
      setFormImpedimentoMotivo('');
      setFormImpedimentoServidorAlvoId('');
      setMembroSelecionado(null);
      setFeedback({
        open: true,
        title: 'Impedimento Legal Registrado (Art. 31)',
        message:
          'Impedimento formal averbado. O membro será automaticamente excluído da votação colegiada referente a este servidor, com convocação automática de suplente legal.',
        type: 'success',
      });
      await carregarDadosCad();
    } catch (err: any) {
      setFeedback({
        open: true,
        title: 'Erro ao Declarar Impedimento',
        message: err?.response?.data?.message || err?.message || 'Falha ao registrar impedimento.',
        type: 'error',
      });
    } finally {
      setSalvandoImpedimento(false);
    }
  };

  // Handler Homologação Final Segura (Substitui confirm() e alert())
  const handleConfirmarHomologacao = async () => {
    if (!cicloParaHomologarId) return;
    setHomologandoCiclo(true);
    try {
      const res = await api.capd.homologarCiclo(cicloParaHomologarId);
      setModalHomologacaoOpen(false);
      setFeedback({
        open: true,
        title: 'Ciclo Homologado com Sucesso',
        message:
          res.message ||
          'Ciclo de avaliação homologado em definitivo. Todas as notas se tornaram imutáveis e o evento Outbox foi publicado para folha e progressões.',
        type: 'success',
      });
      await carregarDadosCad();
    } catch (err: any) {
      setFeedback({
        open: true,
        title: 'Falha na Homologação',
        message:
          err?.response?.data?.message ||
          err?.message ||
          'Erro ao homologar ciclo de avaliações. Verifique se existem pendências de preenchimento ou recursos não deliberados.',
        type: 'error',
      });
    } finally {
      setHomologandoCiclo(false);
    }
  };

  const handleCopiarHash = (hash: string) => {
    navigator.clipboard?.writeText(hash);
    setHashCopiado(hash);
    setTimeout(() => setHashCopiado(null), 3000);
  };

  // Recursos filtrados
  const recursosFiltrados = useMemo(() => {
    return recursos.filter((rec) => {
      const matchBusca = buscaRecurso
        ? rec.servidor?.nome_completo?.toLowerCase().includes(buscaRecurso.toLowerCase()) ||
          rec.servidor?.matricula?.includes(buscaRecurso) ||
          rec.fatorContestado?.nome?.toLowerCase().includes(buscaRecurso.toLowerCase()) ||
          rec.fator_contestado?.nome?.toLowerCase().includes(buscaRecurso.toLowerCase()) ||
          rec.relator?.nome_completo?.toLowerCase().includes(buscaRecurso.toLowerCase()) ||
          rec.relator?.name?.toLowerCase().includes(buscaRecurso.toLowerCase())
        : true;
      const matchStatus = filtroStatus ? rec.status === filtroStatus : true;
      return matchBusca && matchStatus;
    });
  }, [recursos, buscaRecurso, filtroStatus]);

  // Colunas TanStack para o DataTable de Recursos
  const columnsRecursos = useMemo<ColumnDef<ApiRecurso>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'Protocolo',
        size: 95,
        cell: ({ row }) => (
          <span className="font-mono text-xs font-bold text-primary tabular-nums">
            #{row.original.id}
          </span>
        ),
      },
      {
        accessorKey: 'servidor',
        header: 'Recorrente',
        cell: ({ row }) => (
          <div>
            <div className="font-semibold text-xs text-foreground">
              {row.original.servidor?.nome_completo || `Servidor #${row.original.recorrente_id}`}
            </div>
            <div className="font-mono text-[11px] text-muted-foreground tabular-nums">
              Matrícula: {row.original.servidor?.matricula || '-'}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'fator',
        header: 'Fator Contestado',
        cell: ({ row }) => {
          const fator = row.original.fatorContestado || row.original.fator_contestado;
          return (
            <div>
              <div className="text-xs font-medium text-foreground">
                {fator?.nome || `Fator #${row.original.fator_contestado_id}`}
              </div>
              <div className="text-[11px] text-muted-foreground truncate max-w-xs">
                {row.original.justificativa_servidor}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'relator',
        header: 'Relator da CAD',
        size: 160,
        cell: ({ row }) => {
          const relatorNome = row.original.relator?.nome_completo || row.original.relator?.name;
          if (relatorNome) {
            return (
              <div className="flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="text-xs font-medium text-foreground">{relatorNome}</span>
              </div>
            );
          }
          return (
            <Badge variant="outline" className="text-[10px] text-muted-foreground font-mono">
              Não sorteado
            </Badge>
          );
        },
      },
      {
        accessorKey: 'status',
        header: 'Status Processual',
        size: 150,
        cell: ({ row }) => {
          let variant: 'warning' | 'info' | 'success' | 'danger' | 'neutral' = 'neutral';
          if (row.original.status === 'interposto') variant = 'warning';
          else if (row.original.status === 'em_instrucao') variant = 'info';
          else if (row.original.status === 'pautado') variant = 'info';
          else if (row.original.status === 'julgado_provido') variant = 'success';
          else if (row.original.status === 'julgado_desprovido') variant = 'danger';
          return (
            <StatusChip
              label={row.original.status ? row.original.status.replace('_', ' ').toUpperCase() : 'N/D'}
              variant={variant}
            />
          );
        },
      },
      {
        accessorKey: 'prazo',
        header: 'Prazo CAD',
        size: 120,
        cell: ({ row }) => (
          <div className="font-mono text-[11px] tabular-nums text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3 text-warning shrink-0" />
            {row.original.prazo_julgamento || '10 dias úteis'}
          </div>
        ),
      },
      {
        id: 'acoes',
        header: 'Ações Processuais',
        size: 240,
        cell: ({ row }) => {
          const rec = row.original;
          const pendente = ['interposto', 'em_instrucao', 'pautado'].includes(rec.status);
          const sorteando = sorteandoRelatorId === rec.id;

          return (
            <div className="flex items-center justify-end gap-1.5 flex-wrap">
              <Button
                size="sm"
                variant="ghost"
                className="text-xs h-7 px-2"
                onClick={() => {
                  setRecursoSelecionado(rec);
                  setModalAutosOpen(true);
                }}
              >
                <FileText className="h-3.5 w-3.5 mr-1" />
                Autos
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7 px-2"
                onClick={() => {
                  setAvaliacaoEmFocoId(rec.avaliacao_id);
                  setModalEspelhoOpen(true);
                }}
              >
                <Eye className="h-3.5 w-3.5 mr-1 text-primary" />
                Espelho
              </Button>

              {pendente && !rec.relator_id && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7 px-2 border-indigo-300 text-indigo-700 dark:text-indigo-300"
                  onClick={() => {
                    setRecursoParaSorteio(rec);
                    setModalSorteioOpen(true);
                  }}
                  disabled={sorteando}
                >
                  <RotateCcw className={`h-3 w-3 mr-1 ${sorteando ? 'animate-spin' : ''}`} />
                  Sortear
                </Button>
              )}

              <Button
                size="sm"
                className="text-xs h-7 px-2 font-semibold"
                onClick={() => {
                  setRecursoSelecionado(rec);
                  setModalJulgamentoOpen(true);
                }}
              >
                <Scale className="h-3.5 w-3.5 mr-1" />
                Julgar
              </Button>
            </div>
          );
        },
      },
    ],
    [sorteandoRelatorId]
  );

  // Estatísticas e Métricas da Aba de Sessões
  const sessoesStats = useMemo(() => {
    const total = sessoes.length;
    const ordinarias = sessoes.filter((s) => s.tipo_sessao === 'ordinaria').length;
    const extraordinarias = sessoes.filter((s) => s.tipo_sessao === 'extraordinaria').length;
    const seladas = sessoes.filter((s) => s.finalizada && Boolean(s.hash_ata_sha256)).length;
    const taxaSelamento = total > 0 ? Math.round((seladas / total) * 100) : 0;
    const somaPresentes = sessoes.reduce((acc, s) => acc + (s.quorum_presente || 0), 0);
    const quorumMedio = total > 0 ? (somaPresentes / total).toFixed(1) : '0.0';
    return { total, ordinarias, extraordinarias, seladas, taxaSelamento, quorumMedio };
  }, [sessoes]);

  // Sessões Filtradas por Busca e Critérios Avançados
  const sessoesFiltradas = useMemo(() => {
    return sessoes.filter((sessao) => {
      const matchBusca = buscaSessao
        ? String(sessao.id).includes(buscaSessao.replace('#', '')) ||
          sessao.data_sessao.toLowerCase().includes(buscaSessao.toLowerCase()) ||
          (sessao.hash_ata_sha256 &&
            sessao.hash_ata_sha256.toLowerCase().includes(buscaSessao.toLowerCase())) ||
          (sessao.ata_texto &&
            sessao.ata_texto.toLowerCase().includes(buscaSessao.toLowerCase())) ||
          (sessao.comissao?.numero_portaria &&
            sessao.comissao.numero_portaria.toLowerCase().includes(buscaSessao.toLowerCase()))
        : true;
      const matchTipo = filtroTipoSessao ? sessao.tipo_sessao === filtroTipoSessao : true;
      const matchStatus = filtroStatusSessao
        ? filtroStatusSessao === 'finalizada'
          ? sessao.finalizada
          : !sessao.finalizada
        : true;
      const matchComissao = filtroComissaoSessao
        ? String(sessao.comissao_id) === filtroComissaoSessao
        : true;

      return matchBusca && matchTipo && matchStatus && matchComissao;
    });
  }, [sessoes, buscaSessao, filtroTipoSessao, filtroStatusSessao, filtroComissaoSessao]);

  // Colunas TanStack para o DataTable de Sessões Deliberativas
  const columnsSessoes = useMemo<ColumnDef<ApiSessao>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'Protocolo',
        size: 95,
        cell: ({ row }) => (
          <span className="font-mono text-xs font-bold text-primary tabular-nums">
            #{String(row.original.id).padStart(3, '0')}
          </span>
        ),
      },
      {
        accessorKey: 'tipo_sessao',
        header: 'Tipo de Sessão',
        size: 140,
        cell: ({ row }) => {
          const isOrdinaria = row.original.tipo_sessao === 'ordinaria';
          return (
            <Badge
              variant={isOrdinaria ? 'default' : 'secondary'}
              className="text-[10px] font-mono uppercase tracking-wider"
            >
              {isOrdinaria ? 'Ordinária' : 'Extraordinária'}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'data_sessao',
        header: 'Data da Reunião',
        size: 135,
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 font-mono text-xs text-foreground tabular-nums">
            <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>{row.original.data_sessao}</span>
          </div>
        ),
      },
      {
        accessorKey: 'comissao',
        header: 'Portaria Vinculada',
        size: 160,
        cell: ({ row }) => {
          const comissao = comissoes.find((c) => c.id === row.original.comissao_id);
          const portariaNum =
            row.original.comissao?.numero_portaria ||
            comissao?.numero_portaria ||
            `Portaria #${row.original.comissao_id}`;
          return (
            <div className="font-mono text-[11px] text-foreground flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span>Portaria nº {portariaNum}</span>
            </div>
          );
        },
      },
      {
        accessorKey: 'quorum',
        header: 'Quórum Regimental',
        size: 180,
        cell: ({ row }) => {
          const presentes = row.original.quorum_presente || 0;
          const minimo = row.original.quorum_minimo || 3;
          const atingido = presentes >= minimo;
          const perc = Math.min(100, Math.round((presentes / minimo) * 100));

          return (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                <span className="text-foreground font-semibold">
                  {presentes} presentes
                </span>
                <span className="text-muted-foreground text-[10px]">
                  (mín. {minimo})
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-24 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${atingido ? 'bg-emerald-500' : 'bg-amber-500'}`}
                    style={{ width: `${perc}%` }}
                  />
                </div>
                <span
                  className={`text-[10px] font-mono ${
                    atingido
                      ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {atingido ? 'Atingido' : 'Pendente'}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'finalizada',
        header: 'Status Deliberativo',
        size: 160,
        cell: ({ row }) => {
          const selada = row.original.finalizada && Boolean(row.original.hash_ata_sha256);
          return (
            <StatusChip
              label={selada ? 'SELADA & IMUTÁVEL' : 'EM ANDAMENTO'}
              variant={selada ? 'success' : 'warning'}
            />
          );
        },
      },
      {
        accessorKey: 'hash_ata_sha256',
        header: 'Selo SHA-256',
        size: 195,
        cell: ({ row }) => {
          const hash = row.original.hash_ata_sha256;
          if (!hash) {
            return (
              <span className="text-[11px] text-muted-foreground italic">
                Aguardando lavratura
              </span>
            );
          }
          const copiado = hashCopiado === hash;
          return (
            <div className="flex items-center gap-1.5 bg-muted/40 px-2 py-1 rounded border border-border/80 max-w-[190px]">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span
                className="font-mono text-[10px] text-primary tabular-nums truncate select-all"
                title={hash}
              >
                {hash.slice(0, 8)}...{hash.slice(-6)}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopiarHash(hash);
                }}
                className="text-muted-foreground hover:text-primary transition-colors ml-auto shrink-0 p-0.5"
                title="Copiar Hash SHA-256"
              >
                {copiado ? (
                  <Check className="h-3 w-3 text-emerald-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </button>
            </div>
          );
        },
      },
      {
        id: 'acoes',
        header: 'Ações Deliberativas',
        size: 195,
        cell: ({ row }) => {
          const sessao = row.original;
          const temAta = Boolean(sessao.ata_texto || sessao.hash_ata_sha256);

          return (
            <div className="flex items-center justify-end gap-1.5 flex-wrap">
              {temAta && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs px-2.5"
                  onClick={() => {
                    setSessaoDetalheAta(sessao);
                    setModalDetalheAtaOpen(true);
                  }}
                  title="Visualizar Ata Deliberativa Integral"
                >
                  <ScrollText className="h-3.5 w-3.5 mr-1 text-primary" />
                  Ver Ata
                </Button>
              )}

              {!sessao.finalizada && (
                <Button
                  size="sm"
                  variant="default"
                  className="h-7 text-xs px-2.5 font-semibold"
                  onClick={() => {
                    setSessaoParaSelar(sessao);
                    setTextoAtaParaSelar(sessao.ata_texto || '');
                    setModalSelarAtaOpen(true);
                  }}
                  title="Lavrar e Selar Ata com SHA-256"
                >
                  <Lock className="h-3.5 w-3.5 mr-1" />
                  Selar Ata
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [hashCopiado, comissoes]
  );

  // ─── ESTATÍSTICAS E TABELAS DA COMISSÃO & IMPEDIMENTOS (ART. 31) ─────
  interface MembroComissaoRow extends ApiComissaoMembro {
    comissaoNumeroPortaria: string;
    comissaoAtiva: boolean;
    comissaoId: number;
    cicloNome?: string;
  }

  // Lista achatada de todos os membros designados em todas as portarias
  const todosMembros = useMemo<MembroComissaoRow[]>(() => {
    const list: MembroComissaoRow[] = [];
    comissoes.forEach((comissao) => {
      if (comissao.membros && comissao.membros.length > 0) {
        comissao.membros.forEach((membro) => {
          list.push({
            ...membro,
            comissaoNumeroPortaria: comissao.numero_portaria || String(comissao.id),
            comissaoAtiva: Boolean(comissao.ativa),
            comissaoId: comissao.id,
            cicloNome: comissao.ciclo?.nome,
          });
        });
      }
    });
    return list;
  }, [comissoes]);

  // Estatísticas e Métricas da Comissão & Impedimentos
  const comissoesStats = useMemo(() => {
    const totalPortarias = comissoes.length;
    const portariasVigentes = comissoes.filter((c) => c.ativa).length;
    const portariasInativas = totalPortarias - portariasVigentes;
    const totalMembrosCount = todosMembros.length;
    const titularesCount = todosMembros.filter((m) => m.papel !== 'suplente').length;
    const suplentesCount = todosMembros.filter((m) => m.papel === 'suplente').length;
    const impedidosCount = todosMembros.filter(
      (m) => !m.ativo || (m.impedimentos && m.impedimentos.length > 0)
    ).length;
    const aptosCount = Math.max(0, totalMembrosCount - impedidosCount);
    const percentualApto =
      totalMembrosCount > 0 ? Math.round((aptosCount / totalMembrosCount) * 100) : 100;

    return {
      totalPortarias,
      portariasVigentes,
      portariasInativas,
      totalMembros: totalMembrosCount,
      titularesCount,
      suplentesCount,
      impedidosCount,
      aptosCount,
      percentualApto,
    };
  }, [comissoes, todosMembros]);

  // Membros filtrados por busca textual, papel, situação e portaria
  const membrosFiltrados = useMemo(() => {
    return todosMembros.filter((membro) => {
      const nomeMembro =
        membro.servidor?.nome_completo || membro.servidor?.name || membro.nome_completo || '';
      const matricula = membro.servidor?.matricula || membro.matricula || '';
      const cargo = membro.servidor?.cargo || '';
      const portaria = membro.comissaoNumeroPortaria || '';

      const matchBusca = buscaMembro
        ? nomeMembro.toLowerCase().includes(buscaMembro.toLowerCase()) ||
          matricula.toLowerCase().includes(buscaMembro.toLowerCase()) ||
          cargo.toLowerCase().includes(buscaMembro.toLowerCase()) ||
          portaria.toLowerCase().includes(buscaMembro.toLowerCase()) ||
          membro.papel.toLowerCase().includes(buscaMembro.toLowerCase())
        : true;

      const matchPapel = filtroPapelMembro ? membro.papel === filtroPapelMembro : true;

      const isImpedido = !membro.ativo || (membro.impedimentos && membro.impedimentos.length > 0);
      const matchSituacao = filtroSituacaoMembro
        ? filtroSituacaoMembro === 'apto'
          ? !isImpedido
          : isImpedido
        : true;

      const matchPortaria = filtroPortariaMembro
        ? String(membro.comissaoId) === filtroPortariaMembro
        : true;

      return matchBusca && matchPapel && matchSituacao && matchPortaria;
    });
  }, [todosMembros, buscaMembro, filtroPapelMembro, filtroSituacaoMembro, filtroPortariaMembro]);

  // Portarias filtradas por busca e status
  const portariasFiltradas = useMemo(() => {
    return comissoes.filter((comissao) => {
      const portariaNum = comissao.numero_portaria || '';
      const dataPub = comissao.data_publicacao_portaria || '';
      const cicloNome = comissao.ciclo?.nome || '';

      const matchBusca = buscaPortaria
        ? portariaNum.toLowerCase().includes(buscaPortaria.toLowerCase()) ||
          dataPub.toLowerCase().includes(buscaPortaria.toLowerCase()) ||
          cicloNome.toLowerCase().includes(buscaPortaria.toLowerCase())
        : true;

      const matchStatus = filtroStatusPortaria
        ? filtroStatusPortaria === 'vigente'
          ? comissao.ativa
          : !comissao.ativa
        : true;

      return matchBusca && matchStatus;
    });
  }, [comissoes, buscaPortaria, filtroStatusPortaria]);

  // Colunas TanStack para o DataTable do Quadro de Membros (Art. 31)
  const columnsMembros = useMemo<ColumnDef<MembroComissaoRow>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'ID Membro',
        size: 95,
        cell: ({ row }) => (
          <span className="font-mono text-xs font-bold text-primary tabular-nums">
            #{String(row.original.id).padStart(3, '0')}
          </span>
        ),
      },
      {
        accessorKey: 'servidor',
        header: 'Servidor Público Designado',
        cell: ({ row }) => {
          const m = row.original;
          const nome =
            m.servidor?.nome_completo || m.servidor?.name || m.nome_completo || `Servidor #${m.servidor_id}`;
          const matricula = m.servidor?.matricula || m.matricula || '-';
          const cargo = m.servidor?.cargo;

          return (
            <div>
              <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                <span>{nome}</span>
              </div>
              <div className="font-mono text-[11px] text-muted-foreground tabular-nums flex items-center gap-2">
                <span>Matrícula: {matricula}</span>
                {cargo && (
                  <>
                    <span>•</span>
                    <span className="font-sans truncate max-w-xs">{cargo}</span>
                  </>
                )}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'papel',
        header: 'Papel Regimental',
        size: 170,
        cell: ({ row }) => {
          const papel = row.original.papel;
          if (papel === 'presidente') {
            return (
              <Badge variant="default" className="text-[10px] font-mono uppercase tracking-wider">
                Presidente
              </Badge>
            );
          }
          if (papel === 'secretario') {
            return (
              <Badge variant="secondary" className="text-[10px] font-mono uppercase tracking-wider">
                Secretário(a)
              </Badge>
            );
          }
          if (papel === 'titular_gestao') {
            return (
              <Badge variant="outline" className="text-[10px] font-mono uppercase tracking-wider text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900">
                Titular (Gestão)
              </Badge>
            );
          }
          if (papel === 'titular_servidor') {
            return (
              <Badge variant="outline" className="text-[10px] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900">
                Titular (Servidor)
              </Badge>
            );
          }
          return (
            <Badge variant="outline" className="text-[10px] font-mono uppercase tracking-wider border-dashed text-muted-foreground">
              Suplente
            </Badge>
          );
        },
      },
      {
        accessorKey: 'comissaoNumeroPortaria',
        header: 'Portaria de Nomeação',
        size: 190,
        cell: ({ row }) => (
          <div className="space-y-1">
            <div className="font-mono text-xs font-semibold text-foreground flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>Portaria nº {row.original.comissaoNumeroPortaria}</span>
            </div>
            <div>
              <Badge
                variant={row.original.comissaoAtiva ? 'default' : 'outline'}
                className="text-[9px] font-mono"
              >
                {row.original.comissaoAtiva ? 'Portaria Vigente' : 'Portaria Inativa'}
              </Badge>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'mandato',
        header: 'Mandato Regimental',
        size: 160,
        cell: ({ row }) => {
          const inicio = row.original.data_inicio_mandato;
          const fim = row.original.data_fim_mandato;
          if (inicio || fim) {
            return (
              <div className="font-mono text-[11px] tabular-nums text-muted-foreground">
                <div>De: {inicio || 'Início do Ciclo'}</div>
                <div>Até: {fim || 'Em exercício'}</div>
              </div>
            );
          }
          return (
            <span className="text-[11px] font-mono text-muted-foreground">
              Mandato Regulamentar
            </span>
          );
        },
      },
      {
        accessorKey: 'ativo',
        header: 'Condição Legal (Art. 31)',
        size: 190,
        cell: ({ row }) => {
          const m = row.original;
          const isImpedido = !m.ativo || (m.impedimentos && m.impedimentos.length > 0);

          if (isImpedido) {
            const primeiroImpedimento = m.impedimentos?.[0];
            return (
              <div className="space-y-1">
                <StatusChip label="IMPEDIDO (ART. 31)" variant="danger" />
                {primeiroImpedimento && (
                  <div className="text-[10px] text-rose-600 dark:text-rose-400 font-sans truncate max-w-[170px]" title={primeiroImpedimento.motivo}>
                    {primeiroImpedimento.tipo_impedimento.replace('_', ' ')}
                  </div>
                )}
              </div>
            );
          }

          return <StatusChip label="APTO REGIMENTAL" variant="success" />;
        },
      },
      {
        id: 'acoes',
        header: 'Ações Regimentais',
        size: 170,
        cell: ({ row }) => {
          const m = row.original;
          return (
            <div className="flex items-center justify-end gap-1.5">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs px-2.5 text-rose-600 hover:text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/60"
                title="Averbar impedimento formal com fulcro no Art. 31"
                onClick={() => {
                  setMembroSelecionado(m);
                  setModalImpedimentoOpen(true);
                }}
              >
                <ShieldAlert className="h-3.5 w-3.5 mr-1" />
                Impedimento
              </Button>
            </div>
          );
        },
      },
    ],
    []
  );

  // Colunas TanStack para o DataTable de Portarias de Nomeação
  const columnsPortarias = useMemo<ColumnDef<ApiComissao>[]>(
    () => [
      {
        accessorKey: 'numero_portaria',
        header: 'Portaria Oficial',
        size: 180,
        cell: ({ row }) => (
          <div>
            <div className="font-mono text-xs font-bold text-primary tabular-nums">
              Portaria nº {row.original.numero_portaria}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {row.original.ciclo?.nome || `Ciclo #${row.original.ciclo_id}`}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'data_publicacao_portaria',
        header: 'Publicação Oficial',
        size: 160,
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 font-mono text-xs text-foreground tabular-nums">
            <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>{row.original.data_publicacao_portaria}</span>
          </div>
        ),
      },
      {
        accessorKey: 'membros',
        header: 'Quadro de Membros Designados',
        size: 220,
        cell: ({ row }) => {
          const membros = row.original.membros || [];
          const titulares = membros.filter((m) => m.papel !== 'suplente').length;
          const suplentes = membros.filter((m) => m.papel === 'suplente').length;

          return (
            <div className="space-y-1">
              <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>{membros.length} membros designados</span>
              </div>
              <div className="font-mono text-[10px] text-muted-foreground tabular-nums">
                {titulares} titulares • {suplentes} suplentes
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'ativa',
        header: 'Situação Jurídica',
        size: 140,
        cell: ({ row }) => (
          <StatusChip
            label={row.original.ativa ? 'VIGENTE' : 'INATIVA'}
            variant={row.original.ativa ? 'success' : 'neutral'}
          />
        ),
      },
      {
        id: 'acoes',
        header: 'Ações Administrativas',
        size: 180,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs px-2.5 font-medium"
              onClick={() => {
                setComissaoSelecionadaId(row.original.id);
                setModalNovoMembroOpen(true);
              }}
            >
              <UserPlus className="h-3.5 w-3.5 mr-1 text-primary" />
              Designar Membro
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  const subTabItems: TabsItem<CadSubTab>[] = [
    {
      key: 'julgamento',
      label: 'Fila de Recursos',
      icon: <Scale className="h-4 w-4" />,
      badge: recursosPendentes.length,
    },
    {
      key: 'sessoes',
      label: 'Sessões & Atas Colegiadas',
      icon: <Gavel className="h-4 w-4" />,
      badge: sessoes.length,
    },
    {
      key: 'comissao',
      label: 'Comissão & Impedimentos (Art. 31)',
      icon: <ShieldCheck className="h-4 w-4" />,
      badge: comissoes.length,
    },
    {
      key: 'ciclos',
      label: 'Ciclos Anuais (12 Meses)',
      icon: <Calendar className="h-4 w-4" />,
    },
    {
      key: 'perguntas',
      label: 'Banco de Perguntas',
      icon: <FileQuestion className="h-4 w-4" />,
    },
    {
      key: 'escalas',
      label: 'Escalas Gráficas (Chiavenato)',
      icon: <BarChart3 className="h-4 w-4" />,
    },
    {
      key: 'pesos',
      label: 'Pesos dos Fatores (100%)',
      icon: <Sliders className="h-4 w-4" />,
    },
    {
      key: 'consolidacao',
      label: 'Consolidação NFC Trienal',
      icon: <Trophy className="h-4 w-4" />,
    },
    {
      key: 'homologacao',
      label: 'Homologação Final',
      icon: <Lock className="h-4 w-4" />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Gavel className="h-6 w-6 text-primary" />}
        title="Portal da CAD — Comissão de Avaliação e Desempenho"
        subtitle="Julgamento colegiado em 3 colunas, verificação de impedimentos, relatoria regimental e atas com assinatura digital SHA-256."
        badge="Órgão Julgador Oficial"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {portalSelector}
            <Button size="sm" variant="outline" onClick={() => setModalSessaoOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1 text-primary" />
              Nova Sessão
            </Button>
            <Button size="sm" variant="outline" onClick={() => setModalNovaPortariaOpen(true)}>
              <ShieldCheck className="h-3.5 w-3.5 mr-1 text-primary" />
              Nova Portaria
            </Button>
          </div>
        }
      />

      <Tabs items={subTabItems} value={activeTab} onChange={setActiveTab} />

      {/* ── KPI CARDS DINÂMICOS ────────────────────────────────────────── */}
      {activeTab === 'julgamento' ? (
        /* CARDS DEDICADOS EXCLUSIVAMENTE AOS RECURSOS ADMINISTRATIVOS */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Fila Recursal em Trâmite"
            value={`${recursosPendentes.length} Pendentes`}
            caption={`${interpostosCount} interpostos • ${emInstrucaoCount} em instrução • ${pautadosCount} pautados`}
            accentClassName="border-l-amber-500"
            valueClassName="text-amber-600 dark:text-amber-400"
          />

          <StatCard
            label="Distribuição de Relatoria"
            value={`${comRelatorCount}/${recursos.length} Sorteados`}
            caption={`${semRelatorCount} recursos aguardando designação de relator`}
            accentClassName="border-l-indigo-500"
            valueClassName="text-indigo-600 dark:text-indigo-400"
          />

          <StatCard
            label="Decisões Favoráveis (Providos)"
            value={`${providosCount} Providos`}
            caption={
              totalJulgados > 0
                ? `${taxaProvimento}% dos recursos julgados pela CAD`
                : 'Nenhum recurso julgado'
            }
            accentClassName="border-l-emerald-500"
            valueClassName="text-emerald-600 dark:text-emerald-400"
            captionClassName="text-emerald-600 dark:text-emerald-400"
          />

          <StatCard
            label="Decisões Mantidas (Desprovidos)"
            value={`${desprovidosCount} Desprovidos`}
            caption={
              totalJulgados > 0
                ? `${taxaDesprovimento}% dos recursos julgados pela CAD`
                : 'Nenhum recurso julgado'
            }
            accentClassName="border-l-rose-500"
            valueClassName="text-rose-600 dark:text-rose-400"
            captionClassName="text-rose-600 dark:text-rose-400"
          />
        </div>
      ) : activeTab === 'sessoes' ? (
        /* CARDS DEDICADOS EXCLUSIVAMENTE A SESSÕES & ATAS COLEGIADAS */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard
            label="Total de Sessões"
            value={`${sessoesStats.total} Sessões`}
            caption="Realizadas ou agendadas"
            accentClassName="border-l-primary"
          />
          <StatCard
            label="Sessões Ordinárias"
            value={`${sessoesStats.ordinarias} Ordinárias`}
            caption="Calendário regular"
            accentClassName="border-l-blue-500"
            valueClassName="text-blue-600 dark:text-blue-400"
          />
          <StatCard
            label="Sessões Extraordinárias"
            value={`${sessoesStats.extraordinarias} Extraordinárias`}
            caption="Convocação especial"
            accentClassName="border-l-indigo-500"
            valueClassName="text-indigo-600 dark:text-indigo-400"
          />
          <StatCard
            label="Atas Seladas (SHA-256)"
            value={`${sessoesStats.seladas}/${sessoesStats.total} Seladas`}
            caption={`${sessoesStats.taxaSelamento}% das atas com fé pública`}
            accentClassName="border-l-emerald-500"
            valueClassName="text-emerald-600 dark:text-emerald-400"
            captionClassName="text-emerald-600 dark:text-emerald-400"
          />
          <StatCard
            label="Quórum Médio"
            value={`${sessoesStats.quorumMedio} membros`}
            caption="Presença média registrada"
            accentClassName="border-l-amber-500"
            valueClassName="text-amber-600 dark:text-amber-400"
          />
        </div>
      ) : activeTab === 'comissao' ? (
        /* CARDS DEDICADOS EXCLUSIVAMENTE A COMISSÃO & CONTROLE DE IMPEDIMENTOS (ART. 31) */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard
            label="Portarias da CAD"
            value={`${comissoesStats.totalPortarias} Portarias`}
            caption={`${comissoesStats.portariasVigentes} vigentes • ${comissoesStats.portariasInativas} inativas`}
            accentClassName="border-l-primary"
          />
          <StatCard
            label="Quadro de Membros"
            value={`${comissoesStats.totalMembros} Membros`}
            caption="Servidores designados"
            accentClassName="border-l-blue-500"
            valueClassName="text-blue-600 dark:text-blue-400"
          />
          <StatCard
            label="Titulares em Exercício"
            value={`${comissoesStats.titularesCount} Titulares`}
            caption="Direito a voto regimental"
            accentClassName="border-l-emerald-500"
            valueClassName="text-emerald-600 dark:text-emerald-400"
            captionClassName="text-emerald-600 dark:text-emerald-400"
          />
          <StatCard
            label="Suplentes Regimentais"
            value={`${comissoesStats.suplentesCount} Suplentes`}
            caption="Substituição por Art. 31"
            accentClassName="border-l-indigo-500"
            valueClassName="text-indigo-600 dark:text-indigo-400"
          />
          <StatCard
            label="Impedimentos Averbados"
            value={`${comissoesStats.impedidosCount} Afastamento(s)`}
            caption={`${comissoesStats.percentualApto}% do quadro sem restrições`}
            accentClassName="border-l-rose-500"
            valueClassName="text-rose-600 dark:text-rose-400"
          />
        </div>
      ) : activeTab === 'ciclos' ? (
        /* CARDS DEDICADOS EXCLUSIVAMENTE A GESTÃO DE CICLOS DE AVALIAÇÃO */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard
            label="Total de Ciclos"
            value={`${ciclos.length} Ciclos`}
            caption={`${ciclos.filter((c) => ['aberto', 'em_avaliacao', 'em_recurso', 'deliberacao'].includes(c.status)).length} ativos • ${ciclos.filter((c) => c.status === 'encerrado' || c.status === 'homologado').length} concluídos`}
            accentClassName="border-l-primary"
          />
          <StatCard
            label="Ciclo Vigente"
            value={cicloAtivo ? `${cicloAtivo.ano_competencia || cicloAtivo.ano_referencia}` : 'Nenhum'}
            caption={cicloAtivo ? cicloAtivo.nome : 'Sem ciclo aberto'}
            accentClassName="border-l-blue-500"
            valueClassName="text-blue-600 dark:text-blue-400"
          />
          <StatCard
            label="Cadência Trienal"
            value={cicloAtivo ? `Etapa ${cicloAtivo.etapa_cadencia || 1} de 3` : 'Triênio'}
            caption={
              cicloAtivo?.etapa_cadencia === 3
                ? 'Etapa Conclusiva de Estabilidade'
                : `${(cicloAtivo?.etapa_cadencia || 1) * 12} meses de interstício`
            }
            accentClassName="border-l-emerald-500"
            valueClassName="text-emerald-600 dark:text-emerald-400"
            captionClassName="text-emerald-600 dark:text-emerald-400"
          />
          <StatCard
            label="Ciclos Homologados"
            value={`${ciclos.filter((c) => c.status === 'homologado').length} Homologados`}
            caption="Notas com fé pública definitiva"
            accentClassName="border-l-indigo-500"
            valueClassName="text-indigo-600 dark:text-indigo-400"
          />
          <StatCard
            label="Roll-Over Automático"
            value={cicloAtivo?.cadencia_automatica !== false ? 'Ativado (N+1)' : 'Desativado'}
            caption="Transição anual de estágio probatório"
            accentClassName="border-l-amber-500"
            valueClassName="text-amber-600 dark:text-amber-400"
          />
        </div>
      ) : activeTab === 'perguntas' || activeTab === 'escalas' || activeTab === 'pesos' || activeTab === 'consolidacao' || activeTab === 'homologacao' ? (
        /* SEM CARDS AQUI: Perguntas, Escalas, Pesos, Consolidação e Homologação exibem seus próprios KPIs internamente */
        null
      ) : (
        /* CARDS GERAIS DE GOVERNANÇA DO ÓRGÃO */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Recursos na CAD"
            value={recursosPendentes.length}
            caption={`Total de ${recursos.length} recursos autuados`}
            accentClassName="border-l-amber-500"
            valueClassName="text-amber-600 dark:text-amber-400"
          />

          <StatCard
            label="Sessões & Atas SHA-256"
            value={`${sessoesSeladas}/${sessoes.length}`}
            caption="Atas com hash criptográfico selado"
            accentClassName="border-l-emerald-500"
          />

          <StatCard
            label="Portarias & Membros"
            value={`${comissoesAtivas} Ativa(s)`}
            caption={`${totalMembros} membros regimentais designados`}
            accentClassName="border-l-indigo-500"
            valueClassName="text-indigo-600 dark:text-indigo-400"
          />

          <StatCard
            label="Ciclo Vigente"
            value={cicloAtivo ? cicloAtivo.nome : 'Sem Ciclo Ativo'}
            caption={
              cicloAtivo
                ? `Fase: ${cicloAtivo.status ? cicloAtivo.status.toUpperCase() : 'EM ANDAMENTO'} (12 meses)`
                : 'Nenhum ciclo aberto'
            }
            accentClassName="border-l-cyan-500"
            valueClassName="text-cyan-600 dark:text-cyan-400"
          />
        </div>
      )}

      {/* ── SUB-ABA 1: FILA DE JULGAMENTO DE RECURSOS ─────────────────── */}
      {activeTab === 'julgamento' && (
        <div className="space-y-4">
          <Card className="gap-0 py-0">
            {/* BARRA DE FILTROS E CONTROLE DE VISUALIZAÇÃO */}
            <div className="p-3 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 max-w-2xl flex-wrap sm:flex-nowrap">
                <SearchInput
                  value={buscaRecurso}
                  onChange={setBuscaRecurso}
                  placeholder="Buscar por recorrente, matrícula, relator ou fator contestado..."
                  className="flex-1"
                />
                <Select
                  value={filtroStatus}
                  onChange={setFiltroStatus}
                  options={[
                    { value: '', label: 'Todos os Status Processuais' },
                    { value: 'interposto', label: 'Interposto (Aguardando Instrução)' },
                    { value: 'em_instrucao', label: 'Em Instrução pela Chefia' },
                    { value: 'pautado', label: 'Pautado para Julgamento' },
                    { value: 'julgado_provido', label: 'Julgado Provido (Favorável)' },
                    { value: 'julgado_desprovido', label: 'Julgado Desprovido (Mantido)' },
                  ]}
                  className="w-56"
                />
              </div>

              {/* SELETOR DE MODO DE EXIBIÇÃO: CARDS VS TABELA */}
              <div className="flex items-center gap-2">
                <div className="text-xs text-muted-foreground font-mono mr-2 hidden md:block">
                  Total: <strong className="text-foreground">{recursosFiltrados.length}</strong>
                </div>
                <div className="inline-flex rounded-md border border-border p-0.5 bg-muted/40">
                  <Button
                    size="sm"
                    variant={modoExibicaoRecursos === 'tabela' ? 'default' : 'ghost'}
                    className="h-7 px-2.5 text-xs font-semibold"
                    onClick={() => setModoExibicaoRecursos('tabela')}
                    title="Visualizar em Tabela Dinâmica (Padrão)"
                  >
                    <TableIcon className="h-3.5 w-3.5 mr-1.5" />
                    Tabela Dinâmica
                  </Button>
                  <Button
                    size="sm"
                    variant={modoExibicaoRecursos === 'cards' ? 'default' : 'ghost'}
                    className="h-7 px-2.5 text-xs font-semibold"
                    onClick={() => setModoExibicaoRecursos('cards')}
                    title="Visualizar em Cards Detalhados"
                  >
                    <LayoutGrid className="h-3.5 w-3.5 mr-1.5" />
                    Cards Detalhados
                  </Button>
                </div>
              </div>
            </div>

            {/* CONTEÚDO DA FILA: CARDS OU TABELA */}
            <div className="p-4">
              {recursosFiltrados.length === 0 && !loading ? (
                <EmptyState
                  icon={<Scale className="h-10 w-10 text-muted-foreground" />}
                  title="Nenhum recurso encontrado"
                  description="Não há recursos com os filtros selecionados ou todos os recursos já foram devidamente julgados pela comissão."
                />
              ) : modoExibicaoRecursos === 'cards' ? (
                /* ── VISUALIZAÇÃO EM CARDS DETALHADOS DOS RECURSOS ──── */
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {recursosFiltrados.map((rec) => {
                    const fator = rec.fatorContestado || rec.fator_contestado;
                    const pendente = ['interposto', 'em_instrucao', 'pautado'].includes(rec.status);
                    const sorteando = sorteandoRelatorId === rec.id;

                    let statusVariant: 'warning' | 'info' | 'success' | 'danger' | 'neutral' =
                      'neutral';
                    if (rec.status === 'interposto') statusVariant = 'warning';
                    else if (rec.status === 'em_instrucao' || rec.status === 'pautado')
                      statusVariant = 'info';
                    else if (rec.status === 'julgado_provido') statusVariant = 'success';
                    else if (rec.status === 'julgado_desprovido') statusVariant = 'danger';

                    return (
                      <Card
                        key={rec.id}
                        className="p-4 border-border hover:shadow-md transition-shadow space-y-3.5 flex flex-col justify-between"
                      >
                        <div className="space-y-3">
                          {/* Topo do Card: Protocolo + Status + Prazo */}
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-primary tabular-nums">
                                  #REC-{String(rec.id).padStart(4, '0')}
                                </span>
                                <StatusChip
                                  label={rec.status ? rec.status.replace('_', ' ').toUpperCase() : 'PENDENTE'}
                                  variant={statusVariant}
                                />
                              </div>
                              <h4 className="font-bold text-sm text-foreground mt-1">
                                {rec.servidor?.nome_completo || `Servidor #${rec.recorrente_id}`}
                              </h4>
                              <div className="font-mono text-[11px] text-muted-foreground tabular-nums">
                                Matrícula: {rec.servidor?.matricula || '-'}
                              </div>
                            </div>

                            <div className="text-right">
                              <span className="font-mono text-[10px] text-muted-foreground tabular-nums flex items-center gap-1 justify-end">
                                <Clock className="h-3 w-3 text-warning shrink-0" />
                                {rec.prazo_julgamento || '10 dias úteis'}
                              </span>
                            </div>
                          </div>

                          {/* Fator Contestado e Razões Resumidas */}
                          <div className="p-3 rounded-lg bg-muted/40 border border-border/70 space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground font-semibold">Fator Contestado:</span>
                              <Badge variant="outline" className="text-[10px] font-mono">
                                Peso {fator?.peso_geral || 20}%
                              </Badge>
                            </div>
                            <div className="font-semibold text-foreground text-xs">
                              {fator?.nome || `Fator #${rec.fator_contestado_id}`}
                            </div>
                            <p className="text-[11px] text-muted-foreground line-clamp-2 italic bg-background/50 p-2 rounded border border-border/40 font-sans">
                              &quot;{rec.justificativa_servidor}&quot;
                            </p>
                          </div>

                          {/* Bloco de Relatoria e Contrarrazões da Chefia */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div className="p-2.5 rounded bg-background border border-border space-y-1">
                              <div className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                                <UserCheck className="h-3 w-3 text-primary" />
                                Relator da CAD (Art. 31):
                              </div>
                              <div className="font-medium text-foreground truncate">
                                {rec.relator?.nome_completo || rec.relator?.name ? (
                                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold text-xs">
                                    {rec.relator?.nome_completo || rec.relator?.name}
                                  </span>
                                ) : (
                                  <span className="text-amber-600 dark:text-amber-400 font-mono text-[11px] italic">
                                    Pendente de Sorteio
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="p-2.5 rounded bg-background border border-border space-y-1">
                              <div className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                                <FileText className="h-3 w-3 text-amber-500" />
                                Contrarrazões da Chefia:
                              </div>
                              <div className="font-medium text-foreground truncate">
                                {rec.contestacao_chefia ? (
                                  <span className="text-emerald-600 dark:text-emerald-400 text-xs">
                                    Apresentadas nos autos
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground italic text-xs">
                                    Sem manifestação (Precluso)
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Barra Inferior de Ações do Card */}
                        <div className="flex items-center justify-between gap-1.5 pt-3 border-t border-border flex-wrap">
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                setRecursoSelecionado(rec);
                                setModalAutosOpen(true);
                              }}
                            >
                              <BookOpen className="h-3.5 w-3.5 mr-1" />
                              Ver Autos
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                setAvaliacaoEmFocoId(rec.avaliacao_id);
                                setModalEspelhoOpen(true);
                              }}
                            >
                              <Eye className="h-3.5 w-3.5 mr-1 text-primary" />
                              Espelho
                            </Button>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {pendente && !rec.relator_id && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs px-2 border-indigo-300 text-indigo-700 dark:text-indigo-300"
                                onClick={() => {
                                  setRecursoParaSorteio(rec);
                                  setModalSorteioOpen(true);
                                }}
                                disabled={sorteando}
                              >
                                <RotateCcw
                                  className={`h-3 w-3 mr-1 ${sorteando ? 'animate-spin' : ''}`}
                                />
                                Sortear Relator
                              </Button>
                            )}

                            <Button
                              size="sm"
                              className="h-7 text-xs px-3 font-semibold"
                              onClick={() => {
                                setRecursoSelecionado(rec);
                                setModalJulgamentoOpen(true);
                              }}
                            >
                              <Scale className="h-3.5 w-3.5 mr-1" />
                              Julgar
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                /* ── VISUALIZAÇÃO EM TABELA ANALÍTICA (DATA TABLE) ──── */
                <DataTable
                  columns={columnsRecursos}
                  data={recursosFiltrados}
                  loading={loading}
                  emptyText="Nenhum recurso encontrado."
                  pageSize={10}
                  pageSizeSelector
                  fixedLayout
                  exportable
                  exportFileName="recursos-cad"
                  exportTitle="CAPD — Recursos Administrativos"
                />
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ── SUB-ABA 2: SESSÕES E ATAS COLEGIADAS ─────────────────────── */}
      {activeTab === 'sessoes' && (
        <div className="space-y-4">
          {/* CABEÇALHO DA ABA */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Gavel className="h-4 w-4 text-primary" />
                Sessões Deliberativas & Atas Colegiadas (CAD)
              </h3>
              <p className="text-xs text-muted-foreground">
                Gestão do plenário, verificação de quórum regimental, pautas de julgamento e lavratura de atas com selo criptográfico SHA-256.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" onClick={() => setModalSessaoOpen(true)}>
                <Plus className="h-4 w-4 mr-1.5" />
                Abrir Nova Sessão
              </Button>
            </div>
          </div>

          {/* CARD CONTAINER COM FILTROS AVANÇADOS E VISUALIZAÇÃO */}
          <Card className="gap-0 py-0">
            {/* BARRA DE FILTROS AVANÇADOS */}
            <div className="p-3 border-b border-border flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 flex-1 flex-wrap">
                <SearchInput
                  value={buscaSessao}
                  onChange={setBuscaSessao}
                  placeholder="Buscar por #protocolo, data, portaria ou trecho da ata..."
                  className="flex-1 min-w-[240px]"
                />

                <Select
                  value={filtroTipoSessao}
                  onChange={setFiltroTipoSessao}
                  options={[
                    { value: '', label: 'Todos os Tipos' },
                    { value: 'ordinaria', label: 'Ordinária' },
                    { value: 'extraordinaria', label: 'Extraordinária' },
                  ]}
                  className="w-40 text-xs"
                />

                <Select
                  value={filtroStatusSessao}
                  onChange={setFiltroStatusSessao}
                  options={[
                    { value: '', label: 'Todos os Status' },
                    { value: 'finalizada', label: 'Selada & Imutável (SHA-256)' },
                    { value: 'aberta', label: 'Em Andamento' },
                  ]}
                  className="w-52 text-xs"
                />

                {comissoes.length > 1 && (
                  <Select
                    value={filtroComissaoSessao}
                    onChange={setFiltroComissaoSessao}
                    options={[
                      { value: '', label: 'Todas as Portarias' },
                      ...comissoes.map((c) => ({
                        value: String(c.id),
                        label: `Portaria nº ${c.numero_portaria}`,
                      })),
                    ]}
                    className="w-48 text-xs"
                  />
                )}

                {(buscaSessao || filtroTipoSessao || filtroStatusSessao || filtroComissaoSessao) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs px-2 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setBuscaSessao('');
                      setFiltroTipoSessao('');
                      setFiltroStatusSessao('');
                      setFiltroComissaoSessao('');
                    }}
                  >
                    Limpar Filtros
                  </Button>
                )}
              </div>

              {/* SELETOR DE MODO DE EXIBIÇÃO: TABELA DINÂMICA (PADRÃO) VS CARDS */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="text-xs text-muted-foreground font-mono mr-2 hidden sm:block">
                  Total: <strong className="text-foreground">{sessoesFiltradas.length}</strong>
                </div>
                <div className="inline-flex rounded-md border border-border p-0.5 bg-muted/40">
                  <Button
                    size="sm"
                    variant={modoExibicaoSessoes === 'tabela' ? 'default' : 'ghost'}
                    className="h-7 px-2.5 text-xs font-semibold"
                    onClick={() => setModoExibicaoSessoes('tabela')}
                    title="Visualizar em Tabela Dinâmica (Padrão)"
                  >
                    <TableIcon className="h-3.5 w-3.5 mr-1.5" />
                    Tabela Dinâmica
                  </Button>
                  <Button
                    size="sm"
                    variant={modoExibicaoSessoes === 'cards' ? 'default' : 'ghost'}
                    className="h-7 px-2.5 text-xs font-semibold"
                    onClick={() => setModoExibicaoSessoes('cards')}
                    title="Visualizar em Cards Detalhados"
                  >
                    <LayoutGrid className="h-3.5 w-3.5 mr-1.5" />
                    Cards Detalhados
                  </Button>
                </div>
              </div>
            </div>

            {/* CONTEÚDO: TABELA DINÂMICA OU CARDS DETALHADOS */}
            <div className="p-4">
              {sessoesFiltradas.length === 0 && !loading ? (
                <EmptyState
                  icon={<Gavel className="h-10 w-10 text-muted-foreground" />}
                  title="Nenhuma sessão deliberativa encontrada"
                  description={
                    buscaSessao || filtroTipoSessao || filtroStatusSessao || filtroComissaoSessao
                      ? 'Nenhuma sessão corresponde aos filtros aplicados. Tente ajustar os parâmetros de pesquisa.'
                      : 'Abra a primeira sessão da comissão para pautar e julgar os recursos interpostos.'
                  }
                  actionLabel={
                    buscaSessao || filtroTipoSessao || filtroStatusSessao || filtroComissaoSessao
                      ? 'Limpar Filtros'
                      : 'Abrir Nova Sessão'
                  }
                  onAction={() => {
                    if (buscaSessao || filtroTipoSessao || filtroStatusSessao || filtroComissaoSessao) {
                      setBuscaSessao('');
                      setFiltroTipoSessao('');
                      setFiltroStatusSessao('');
                      setFiltroComissaoSessao('');
                    } else {
                      setModalSessaoOpen(true);
                    }
                  }}
                />
              ) : modoExibicaoSessoes === 'tabela' ? (
                /* ── VISUALIZAÇÃO EM TABELA DINÂMICA (DATA TABLE) ──────── */
                <DataTable
                  columns={columnsSessoes}
                  data={sessoesFiltradas}
                  loading={loading}
                  emptyText="Nenhuma sessão deliberativa encontrada."
                  pageSize={10}
                  pageSizeSelector
                  fixedLayout
                  exportable
                  exportFileName="sessoes-atas-cad"
                  exportTitle="CAPD — Sessões Deliberativas & Atas Colegiadas"
                />
              ) : (
                /* ── VISUALIZAÇÃO EM CARDS DETALHADOS ──────────────────── */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sessoesFiltradas.map((sessao) => {
                    const selada = sessao.finalizada && Boolean(sessao.hash_ata_sha256);
                    const comissao = comissoes.find((c) => c.id === sessao.comissao_id);
                    const portariaNum =
                      sessao.comissao?.numero_portaria ||
                      comissao?.numero_portaria ||
                      `Portaria #${sessao.comissao_id}`;
                    const atingido = (sessao.quorum_presente || 0) >= (sessao.quorum_minimo || 3);
                    const perc = Math.min(
                      100,
                      Math.round(((sessao.quorum_presente || 0) / (sessao.quorum_minimo || 3)) * 100)
                    );

                    return (
                      <Card
                        key={sessao.id}
                        className="p-4 space-y-3.5 border-border hover:border-primary/40 transition-all flex flex-col justify-between"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Badge
                              variant={sessao.tipo_sessao === 'ordinaria' ? 'default' : 'secondary'}
                              className="uppercase text-[10px] font-mono tracking-wider"
                            >
                              Sessão {sessao.tipo_sessao} #{String(sessao.id).padStart(3, '0')}
                            </Badge>
                            <StatusChip
                              label={selada ? 'SELADA & IMUTÁVEL' : 'EM ANDAMENTO'}
                              variant={selada ? 'success' : 'warning'}
                            />
                          </div>

                          <div className="text-xs space-y-2 font-mono">
                            <div className="flex justify-between items-center text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-primary" /> Data da Reunião:
                              </span>
                              <span className="text-foreground font-semibold tabular-nums">
                                {sessao.data_sessao}
                              </span>
                            </div>

                            <div className="flex justify-between items-center text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <ShieldCheck className="h-3 w-3 text-muted-foreground" /> Portaria:
                              </span>
                              <span className="text-foreground">Portaria nº {portariaNum}</span>
                            </div>

                            <div className="space-y-1 pt-1 border-t border-border/60">
                              <div className="flex justify-between text-muted-foreground text-[11px]">
                                <span>Quórum Regimental:</span>
                                <span className="text-foreground font-semibold tabular-nums">
                                  {sessao.quorum_presente} / {sessao.quorum_minimo} presentes
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className={`h-full ${atingido ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                    style={{ width: `${perc}%` }}
                                  />
                                </div>
                                <span
                                  className={`text-[10px] ${
                                    atingido
                                      ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                                      : 'text-amber-600 dark:text-amber-400'
                                  }`}
                                >
                                  {atingido ? 'Quórum OK' : 'Pendente'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* SELO HASH SHA-256 */}
                          {sessao.hash_ata_sha256 ? (
                            <div className="p-2.5 rounded bg-muted/40 border border-border space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                                  <ShieldCheck className="h-3 w-3 text-emerald-600" /> Selo SHA-256:
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopiarHash(sessao.hash_ata_sha256!)}
                                  className="text-muted-foreground hover:text-primary transition-colors p-0.5"
                                  title="Copiar Hash SHA-256"
                                >
                                  {hashCopiado === sessao.hash_ata_sha256 ? (
                                    <Check className="h-3 w-3 text-emerald-500" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </button>
                              </div>
                              <div className="font-mono text-[9px] text-primary truncate tabular-nums select-all">
                                {sessao.hash_ata_sha256}
                              </div>
                            </div>
                          ) : (
                            <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                              <span>Ata ainda não selada com hash SHA-256.</span>
                            </div>
                          )}
                        </div>

                        {/* AÇÕES NO RODAPÉ DO CARD */}
                        <div className="pt-2 border-t border-border flex items-center gap-2">
                          {(sessao.ata_texto || sessao.hash_ata_sha256) && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 text-xs h-7"
                              onClick={() => {
                                setSessaoDetalheAta(sessao);
                                setModalDetalheAtaOpen(true);
                              }}
                            >
                              <ScrollText className="h-3.5 w-3.5 mr-1 text-primary" />
                              Ver Ata Integral
                            </Button>
                          )}

                          {!sessao.finalizada && (
                            <Button
                              size="sm"
                              variant="default"
                              className="flex-1 text-xs h-7 font-semibold"
                              onClick={() => {
                                setSessaoParaSelar(sessao);
                                setTextoAtaParaSelar(sessao.ata_texto || '');
                                setModalSelarAtaOpen(true);
                              }}
                            >
                              <Lock className="h-3.5 w-3.5 mr-1" />
                              Selar Ata
                            </Button>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ── SUB-ABA 3: COMISSÃO & CONTROLE DE IMPEDIMENTOS (ART. 31) ──── */}
      {activeTab === 'comissao' && (
        <div className="space-y-4">
          {/* BANNER INSTITUCIONAL E LEGAL ART. 31 */}
          <Card className="p-4 border-primary/20 bg-accent/20">
            <div className="flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-foreground">
                    Regra Mandatória de Isenção & Impedimentos Legais (Art. 31 da Lei nº 1.704/2006)
                  </h4>
                  <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">
                    Lei Municipal
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Membros da CAD que possuam grau de parentesco até 3º grau com o servidor avaliado, subordinação direta
                  ou que tenham atuado como avaliador imediato da nota contestada são <strong>automaticamente impedidos de julgar o recurso</strong>.
                  O sistema averba o impedimento em ata colegiada e redistribui compulsoriamente a função avaliativa ao suplente regimental sorteado.
                </p>
              </div>
            </div>
          </Card>

          {/* CABEÇALHO DA ABA COM CONTROLES E AÇÕES */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Quadro da CAD & Atos de Nomeação
              </h3>
              <p className="text-xs text-muted-foreground">
                Gestão da composição colegiada, designações por portaria oficial e triagem de isenção legal.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-8"
                onClick={() => {
                  if (comissoes.length > 0 && !comissaoSelecionadaId) {
                    setComissaoSelecionadaId(comissoes[0].id);
                  }
                  setModalNovoMembroOpen(true);
                }}
              >
                <UserPlus className="h-3.5 w-3.5 mr-1 text-primary" />
                Designar Membro
              </Button>
              <Button
                size="sm"
                className="text-xs h-8 font-semibold shadow-sm"
                onClick={() => setModalNovaPortariaOpen(true)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Cadastrar Nova Portaria
              </Button>
            </div>
          </div>

          {/* PAINEL PRINCIPAL COM SUB-VISÕES E DATA TABLE */}
          <Card className="p-4 space-y-4">
            {/* SUB-VISÃO: MEMBROS VS PORTARIAS */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
              <div className="flex items-center gap-1.5 p-1 bg-muted/40 rounded-lg border border-border/60">
                <button
                  type="button"
                  onClick={() => setSubVisaoComissao('membros')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                    subVisaoComissao === 'membros'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Users className="h-3.5 w-3.5" />
                  <span>Quadro de Membros (Art. 31)</span>
                  <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0 h-4">
                    {todosMembros.length}
                  </Badge>
                </button>

                <button
                  type="button"
                  onClick={() => setSubVisaoComissao('portarias')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                    subVisaoComissao === 'portarias'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <ScrollText className="h-3.5 w-3.5" />
                  <span>Portarias de Nomeação</span>
                  <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0 h-4">
                    {comissoes.length}
                  </Badge>
                </button>
              </div>

              {/* TOGGLE DE MODO DE EXIBIÇÃO: TABELA (PADRÃO) VS CARDS */}
              <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-lg border border-border/60">
                <button
                  type="button"
                  onClick={() => setModoExibicaoComissao('tabela')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all ${
                    modoExibicaoComissao === 'tabela'
                      ? 'bg-background text-primary font-semibold shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Visualização em Tabela Dinâmica com Ordenação"
                >
                  <TableIcon className="h-3.5 w-3.5" />
                  <span>Tabela</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModoExibicaoComissao('cards')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all ${
                    modoExibicaoComissao === 'cards'
                      ? 'bg-background text-primary font-semibold shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Visualização em Grade de Cards"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span>Cards</span>
                </button>
              </div>
            </div>

            {/* FILTROS AVANÇADOS CONTEXTUAIS */}
            {subVisaoComissao === 'membros' ? (
              <div className="space-y-3">
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
                  <div className="flex-1 min-w-[240px]">
                    <SearchInput
                      value={buscaMembro}
                      onChange={setBuscaMembro}
                      placeholder="Buscar membro por nome, matrícula, cargo ou portaria..."
                      className="w-full"
                    />
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Select
                      value={filtroPapelMembro}
                      onChange={setFiltroPapelMembro}
                      options={[
                        { value: '', label: 'Todos os Papéis' },
                        { value: 'presidente', label: 'Presidente' },
                        { value: 'secretario', label: 'Secretário(a)' },
                        { value: 'titular_gestao', label: 'Titular (Gestão)' },
                        { value: 'titular_servidor', label: 'Titular (Servidor)' },
                        { value: 'suplente', label: 'Suplente Regimental' },
                      ]}
                      className="w-44"
                    />

                    <Select
                      value={filtroSituacaoMembro}
                      onChange={setFiltroSituacaoMembro}
                      options={[
                        { value: '', label: 'Todas as Situações' },
                        { value: 'apto', label: 'Apto Regimental' },
                        { value: 'impedido', label: 'Impedido (Art. 31)' },
                      ]}
                      className="w-44"
                    />

                    <Select
                      value={filtroPortariaMembro}
                      onChange={setFiltroPortariaMembro}
                      options={[
                        { value: '', label: 'Todas as Portarias' },
                        ...comissoes.map((c) => ({
                          value: String(c.id),
                          label: `Portaria nº ${c.numero_portaria}`,
                        })),
                      ]}
                      className="w-48"
                    />

                    {(buscaMembro || filtroPapelMembro || filtroSituacaoMembro || filtroPortariaMembro) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs h-9 px-2 text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setBuscaMembro('');
                          setFiltroPapelMembro('');
                          setFiltroSituacaoMembro('');
                          setFiltroPortariaMembro('');
                        }}
                      >
                        Limpar
                      </Button>
                    )}
                  </div>
                </div>

                {/* CONTEÚDO SUB-VISÃO MEMBROS */}
                {modoExibicaoComissao === 'tabela' ? (
                  membrosFiltrados.length > 0 ? (
                    <DataTable
                      columns={columnsMembros}
                      data={membrosFiltrados}
                      pageSize={10}
                      searchPlaceholder="Filtrar dados nesta página..."
                    />
                  ) : (
                    <EmptyState
                      icon={<Users className="h-10 w-10 text-muted-foreground" />}
                      title="Nenhum membro encontrado"
                      description={
                        buscaMembro || filtroPapelMembro || filtroSituacaoMembro || filtroPortariaMembro
                          ? 'Nenhum membro corresponde aos critérios de busca ou filtros selecionados.'
                          : 'Nenhum servidor foi designado para as comissões constituídas ainda.'
                      }
                      actionLabel={comissoes.length > 0 ? 'Designar Membro' : 'Cadastrar Portaria'}
                      onAction={() => {
                        if (comissoes.length > 0) {
                          setComissaoSelecionadaId(comissoes[0].id);
                          setModalNovoMembroOpen(true);
                        } else {
                          setModalNovaPortariaOpen(true);
                        }
                      }}
                    />
                  )
                ) : (
                  /* MODO CARDS DETALHADOS PARA MEMBROS */
                  membrosFiltrados.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {membrosFiltrados.map((m) => {
                        const isImpedido = !m.ativo || (m.impedimentos && m.impedimentos.length > 0);
                        const nome =
                          m.servidor?.nome_completo ||
                          m.servidor?.name ||
                          m.nome_completo ||
                          `Servidor #${m.servidor_id}`;

                        return (
                          <div
                            key={m.id}
                            className={`p-3.5 rounded-lg border transition-all ${
                              isImpedido
                                ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50'
                                : 'bg-background border-border/80 hover:border-primary/40 shadow-xs'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="space-y-0.5 min-w-0">
                                <div className="font-semibold text-xs text-foreground truncate">
                                  {nome}
                                </div>
                                <div className="font-mono text-[10px] text-muted-foreground tabular-nums">
                                  Matrícula: {m.servidor?.matricula || m.matricula || '-'}
                                </div>
                              </div>
                              <StatusChip
                                label={isImpedido ? 'IMPEDIDO' : 'APTO'}
                                variant={isImpedido ? 'danger' : 'success'}
                              />
                            </div>

                            <div className="mt-2.5 pt-2 border-t border-border/60 text-xs space-y-1.5">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-muted-foreground">Papel:</span>
                                <Badge variant="outline" className="text-[10px] font-mono uppercase">
                                  {m.papel.replace('_', ' ')}
                                </Badge>
                              </div>
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-muted-foreground">Portaria:</span>
                                <span className="font-mono font-medium text-foreground">
                                  nº {m.comissaoNumeroPortaria}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-muted-foreground">Mandato:</span>
                                <span className="font-mono text-muted-foreground text-[10px]">
                                  {m.data_inicio_mandato || 'Vigente'}
                                </span>
                              </div>
                            </div>

                            <div className="mt-3 pt-2 border-t border-border/60 flex items-center justify-between">
                              <span className="font-mono text-[10px] text-muted-foreground">
                                #{String(m.id).padStart(3, '0')}
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-[11px] px-2 text-rose-600 hover:text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/60"
                                onClick={() => {
                                  setMembroSelecionado(m);
                                  setModalImpedimentoOpen(true);
                                }}
                              >
                                <ShieldAlert className="h-3 w-3 mr-1" />
                                Impedimento
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <EmptyState
                      icon={<Users className="h-10 w-10 text-muted-foreground" />}
                      title="Nenhum membro encontrado"
                      description="Nenhum servidor corresponde aos filtros aplicados."
                    />
                  )
                )}
              </div>
            ) : (
              /* SUB-VISÃO: PORTARIAS DE NOMEAÇÃO */
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="flex-1 min-w-[240px]">
                    <SearchInput
                      value={buscaPortaria}
                      onChange={setBuscaPortaria}
                      placeholder="Buscar portaria por número, publicação ou ciclo..."
                      className="w-full"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Select
                      value={filtroStatusPortaria}
                      onChange={setFiltroStatusPortaria}
                      options={[
                        { value: '', label: 'Todas as Portarias' },
                        { value: 'vigente', label: 'Apenas Vigentes' },
                        { value: 'inativa', label: 'Apenas Inativas' },
                      ]}
                      className="w-48"
                    />

                    {(buscaPortaria || filtroStatusPortaria) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs h-9 px-2 text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setBuscaPortaria('');
                          setFiltroStatusPortaria('');
                        }}
                      >
                        Limpar
                      </Button>
                    )}
                  </div>
                </div>

                {/* CONTEÚDO SUB-VISÃO PORTARIAS */}
                {modoExibicaoComissao === 'tabela' ? (
                  portariasFiltradas.length > 0 ? (
                    <DataTable
                      columns={columnsPortarias}
                      data={portariasFiltradas}
                      pageSize={10}
                      searchPlaceholder="Filtrar dados nesta página..."
                    />
                  ) : (
                    <EmptyState
                      icon={<ScrollText className="h-10 w-10 text-muted-foreground" />}
                      title="Nenhuma portaria encontrada"
                      description={
                        buscaPortaria || filtroStatusPortaria
                          ? 'Nenhuma portaria corresponde aos critérios de pesquisa.'
                          : 'Cadastre a portaria oficial de nomeação da CAD para o ciclo de avaliação.'
                      }
                      actionLabel="Cadastrar Portaria"
                      onAction={() => setModalNovaPortariaOpen(true)}
                    />
                  )
                ) : (
                  /* MODO CARDS DETALHADOS PARA PORTARIAS */
                  portariasFiltradas.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {portariasFiltradas.map((comissao) => {
                        const membros = comissao.membros || [];
                        const titulares = membros.filter((m) => m.papel !== 'suplente').length;
                        const suplentes = membros.filter((m) => m.papel === 'suplente').length;

                        return (
                          <Card key={comissao.id} className="p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                                <ShieldCheck className="h-4 w-4 text-primary" />
                                <span>Portaria nº {comissao.numero_portaria}</span>
                              </div>
                              <Badge variant={comissao.ativa ? 'default' : 'outline'} className="text-[10px]">
                                {comissao.ativa ? 'Vigente' : 'Inativa'}
                              </Badge>
                            </div>

                            <div className="text-xs text-muted-foreground flex justify-between">
                              <span>Data de Publicação:</span>
                              <span className="font-mono font-semibold text-foreground tabular-nums">
                                {comissao.data_publicacao_portaria}
                              </span>
                            </div>

                            <div className="text-xs text-muted-foreground flex justify-between">
                              <span>Ciclo Vinculado:</span>
                              <span className="font-medium text-foreground">
                                {comissao.ciclo?.nome || `Ciclo #${comissao.ciclo_id}`}
                              </span>
                            </div>

                            <div className="space-y-2 pt-2 border-t border-border">
                              <div className="flex items-center justify-between">
                                <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                  <Users className="h-3.5 w-3.5 text-primary" />
                                  <span>Membros ({membros.length})</span>
                                  <span className="text-[10px] font-mono text-muted-foreground">
                                    ({titulares} tit. / {suplentes} supl.)
                                  </span>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 text-[11px] px-2 text-primary"
                                  onClick={() => {
                                    setComissaoSelecionadaId(comissao.id);
                                    setModalNovoMembroOpen(true);
                                  }}
                                >
                                  <UserPlus className="h-3 w-3 mr-1" />
                                  Designar Membro
                                </Button>
                              </div>

                              {membros.length > 0 ? (
                                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                  {membros.map((m) => {
                                    const isImpedido = !m.ativo || (m.impedimentos && m.impedimentos.length > 0);
                                    return (
                                      <div
                                        key={m.id}
                                        className={`flex items-center justify-between text-xs p-2 rounded border gap-2 ${
                                          isImpedido
                                            ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40'
                                            : 'bg-muted/30 border-border/50'
                                        }`}
                                      >
                                        <div className="min-w-0">
                                          <div className="font-medium text-foreground truncate">
                                            {m.servidor?.nome_completo || m.servidor?.name || `Servidor #${m.servidor_id}`}
                                          </div>
                                          <div className="text-[10px] text-muted-foreground font-mono">
                                            {m.papel ? m.papel.replace('_', ' ').toUpperCase() : 'MEMBRO'}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                          <StatusChip
                                            label={isImpedido ? 'IMPEDIDO' : 'APTO'}
                                            variant={isImpedido ? 'danger' : 'success'}
                                          />
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 text-[10px] px-1.5 text-rose-600 hover:text-rose-700 dark:text-rose-400"
                                            title="Declarar impedimento legal (Art. 31)"
                                            onClick={() => {
                                              setMembroSelecionado(m);
                                              setModalImpedimentoOpen(true);
                                            }}
                                          >
                                            <ShieldAlert className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="text-xs text-muted-foreground italic p-2 bg-muted/20 rounded">
                                  Nenhum membro vinculado a esta portaria. Clique em &quot;Designar Membro&quot;.
                                </div>
                              )}
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  ) : (
                    <EmptyState
                      icon={<ScrollText className="h-10 w-10 text-muted-foreground" />}
                      title="Nenhuma portaria encontrada"
                      description="Nenhuma portaria corresponde aos critérios pesquisados."
                    />
                  )
                )}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── SUB-ABA 4: GESTÃO DE CICLOS 12 MESES ─────────────────────── */}
      {activeTab === 'ciclos' && <GestaoCiclosPanel />}

      {/* ── SUB-ABA 5: CADASTRO DE PERGUNTAS & FATORES ─────────────────── */}
      {activeTab === 'perguntas' && <CadastroPerguntasPanel />}

      {/* ── SUB-ABA 6: ESCALAS GRÁFICAS (CHIAVENATO) ────────────────────── */}
      {activeTab === 'escalas' && (
        <div className="space-y-4 p-1">
          <EscalaGraficaPanel />
        </div>
      )}

      {/* ── SUB-ABA 7: PESOS DOS FATORES (100%) ─────────────────────────── */}
      {activeTab === 'pesos' && (
        <div className="space-y-4 p-1">
          <FatoresPesosPanel />
        </div>
      )}

      {/* ── SUB-ABA 8: CONSOLIDAÇÃO NFC TRIENAL ─────────────────────────── */}
      {activeTab === 'consolidacao' && (
        <div className="space-y-4 p-1">
          <ConsolidacaoPanel />
        </div>
      )}

      {/* ── SUB-ABA 9: HOMOLOGAÇÃO FINAL DO CICLO (SEM ALERT/CONFIRM) ───── */}
      {activeTab === 'homologacao' && (() => {
        const cicloAlvo = ciclos.find((c) => c.id === cicloParaHomologarId) || cicloAtivo || ciclos[0];
        const isHomologado = cicloAlvo?.status === 'homologado';
        const temRecursosPendentes = recursosPendentes.length > 0;
        const podeHomologar = !isHomologado && !temRecursosPendentes;

        return (
          <div className="space-y-6">
            {/* ── 4 STATCARDS DEDICADOS EXCLUSIVAMENTE À HOMOLOGAÇÃO FINAL ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Situação do Ciclo Selecionado"
                value={cicloAlvo?.status ? cicloAlvo.status.toUpperCase() : 'ABERTO'}
                caption={
                  cicloAlvo
                    ? `Ano-Base ${cicloAlvo.ano_competencia || cicloAlvo.ano_referencia || '—'} • Etapa ${cicloAlvo.etapa_cadencia || 1} de 3`
                    : 'Sem ciclo selecionado'
                }
                accentClassName={isHomologado ? 'border-l-emerald-500' : 'border-l-amber-500'}
                valueClassName={
                  isHomologado
                    ? 'text-emerald-600 dark:text-emerald-400 font-mono font-bold'
                    : 'text-amber-600 dark:text-amber-400 font-mono font-bold'
                }
              />

              <StatCard
                label="Avaliações do Ciclo (RN-C08)"
                value={isHomologado ? '100% Concluídas' : 'Fase Conclusiva'}
                caption="Notas consolidadas pelas chefias imediatas"
                accentClassName="border-l-indigo-500"
                valueClassName="text-indigo-600 dark:text-indigo-400 font-mono tabular-nums"
              />

              <StatCard
                label="Fila Recursal (Trava RN-C07)"
                value={temRecursosPendentes ? `${recursosPendentes.length} Pendente(s)` : '0 Pendentes'}
                caption={
                  temRecursosPendentes
                    ? 'Bloqueia homologação até deliberação'
                    : '100% dos recursos julgados pela CAD'
                }
                accentClassName={temRecursosPendentes ? 'border-l-rose-500' : 'border-l-emerald-500'}
                valueClassName={
                  temRecursosPendentes
                    ? 'text-rose-600 dark:text-rose-400 font-mono tabular-nums'
                    : 'text-emerald-600 dark:text-emerald-400 font-mono tabular-nums'
                }
                captionClassName={temRecursosPendentes ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}
              />

              <StatCard
                label="Atas Colegiadas com SHA-256"
                value={`${sessoesSeladas}/${sessoes.length} Atas`}
                caption="Fé pública criptográfica garantida"
                accentClassName="border-l-cyan-500"
                valueClassName="text-cyan-600 dark:text-cyan-400 font-mono tabular-nums"
              />
            </div>

            {/* ── CARD PRINCIPAL: PORTÕES DE AUDITORIA E DESPACHO OUTBOX ── */}
            <Card className="border-border p-5 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                    <Lock className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">
                      Homologação Final em Lote & Despacho Outbox (RN-C07 a RN-C09)
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Encerramento solene do ciclo avaliativo, selamento definitivo de notas com fé pública e publicação de evento assíncrono para Folha de Pagamento.
                    </p>
                  </div>
                </div>

                <Badge
                  variant={isHomologado ? 'success' : podeHomologar ? 'primary' : 'warning'}
                  className="font-mono text-xs px-3 py-1 self-start sm:self-auto"
                >
                  {isHomologado ? 'Ciclo Homologado' : podeHomologar ? 'Pronto para Homologar' : 'Pendências Regimentais'}
                </Badge>
              </div>

              {/* ── PORTÕES DE AUDITORIA REGIMENTAL (AUDIT GATES) ── */}
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span>Portões Obrigatórios de Validação Institucional (RN-C07 / RN-C08 / RN-C09)</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  {/* Gate 1: Preenchimento Chefias */}
                  <div className="p-3.5 rounded-lg border border-border bg-muted/20 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">Portão 1: Chefias</span>
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      Concluído
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-tight">
                      Avaliações do período regular devidamente submetidas pelos avaliadores.
                    </p>
                  </div>

                  {/* Gate 2: Fila Recursal */}
                  <div
                    className={`p-3.5 rounded-lg border space-y-1.5 ${
                      temRecursosPendentes
                        ? 'border-rose-300 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20'
                        : 'border-border bg-muted/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">Portão 2: Recursos</span>
                      {temRecursosPendentes ? (
                        <AlertTriangle className="h-4 w-4 text-rose-500" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      )}
                    </div>
                    <div
                      className={`text-xs font-bold font-mono ${
                        temRecursosPendentes
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {temRecursosPendentes
                        ? `${recursosPendentes.length} Pendente(s)`
                        : 'Fila 100% Julgada'}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-tight">
                      {temRecursosPendentes
                        ? 'A Lei nº 1.704/2006 (RN-C07) veda homologar com recursos não julgados.'
                        : 'Inexistência de recursos pendentes de deliberação colegiada.'}
                    </p>
                  </div>

                  {/* Gate 3: Atas Seladas */}
                  <div className="p-3.5 rounded-lg border border-border bg-muted/20 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">Portão 3: Atas da CAD</span>
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
                      {sessoesSeladas} Atas Seladas
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-tight">
                      Atas de sessões assinadas com hash SHA-256 e fé pública oficial.
                    </p>
                  </div>

                  {/* Gate 4: Despacho Outbox */}
                  <div className="p-3.5 rounded-lg border border-border bg-muted/20 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">Portão 4: Outbox</span>
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div className="text-xs font-bold text-foreground">
                      capd.ciclo_homologado
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-tight">
                      Despacho assíncrono garantido para Folha e Progressões de Carreira.
                    </p>
                  </div>
                </div>
              </div>

              {/* ── NOTA DE IMUTABILIDADE JURÍDICA ── */}
              <div className="p-4 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p className="font-semibold text-foreground">
                    Efeitos Jurídicos da Homologação Definitiva:
                  </p>
                  <p>
                    Ao homologar o ciclo, todas as notas finais atribuídas aos servidores tornam-se <strong className="text-foreground">rigorosamente definitivas e imutáveis</strong> no banco de dados (Invariant RN-C07). O ciclo é transicionado para o status <strong className="text-foreground">HOMOLOGADO</strong> e, caso a cadência automática esteja ativa, o próximo ciclo do estágio probatório (N+1) é agendado com deslocamento exato de 12 meses de interstício.
                  </p>
                </div>
              </div>

              {/* ── SELETOR E AÇÕES ── */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2 border-t border-border">
                <div className="flex items-center gap-3">
                  <label className="text-xs font-semibold text-foreground shrink-0">
                    Ciclo a Homologar:
                  </label>
                  <Select
                    value={String(cicloParaHomologarId)}
                    onChange={(v) => setCicloParaHomologarId(Number(v))}
                    options={ciclos.map((c) => ({
                      value: String(c.id),
                      label: `${c.nome} (${c.status ? c.status.toUpperCase() : 'ABERTO'})`,
                    }))}
                    className="w-72"
                  />
                </div>

                <div className="flex items-center gap-3">
                  {isHomologado ? (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-status-success-bg border border-status-success-border text-status-success text-xs font-semibold">
                      <CheckCircle2 className="h-4 w-4" />
                      Ciclo Homologado com Sucesso
                    </div>
                  ) : (
                    <Button
                      size="md"
                      className="font-bold shadow-sm"
                      onClick={() => setModalHomologacaoOpen(true)}
                      disabled={!podeHomologar || homologandoCiclo}
                    >
                      <Lock className="h-4 w-4 mr-2" />
                      {homologandoCiclo
                        ? 'Homologando Ciclo...'
                        : 'Homologar Ciclo e Selar Atas da Comissão'}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </div>
        );
      })()}

      {/* ── MODAL 1: JULGAMENTO COMPARATIVO EM 3 COLUNAS ─────────────── */}
      <Modal
        open={modalJulgamentoOpen}
        onClose={() => setModalJulgamentoOpen(false)}
        title={`Julgamento Colegiado da CAD — Protocolo #REC-${recursoSelecionado?.id ? String(recursoSelecionado.id).padStart(4, '0') : ''}`}
        size="full"
      >
        <div className="space-y-5">
          {/* CABEÇALHO PROCESSUAL E INSTRUÇÃO DO JULGAMENTO */}
          <div className="p-3.5 rounded-lg bg-muted/40 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <div className="font-bold text-sm text-foreground">
                {recursoSelecionado?.servidor?.nome_completo || `Servidor #${recursoSelecionado?.recorrente_id}`}
              </div>
              <div className="text-[11px] text-muted-foreground flex items-center gap-3 font-mono">
                <span>Matrícula: {recursoSelecionado?.servidor?.matricula || '-'}</span>
                <span>•</span>
                <span>Fator: {recursoSelecionado?.fatorContestado?.nome || recursoSelecionado?.fator_contestado?.nome}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-background/80 p-2 rounded border border-border shrink-0">
              <UserCheck className="h-4 w-4 text-primary shrink-0" />
              <div className="text-[11px]">
                <div className="text-muted-foreground">Relator Designado:</div>
                <div className="font-semibold text-foreground">
                  {recursoSelecionado?.relator?.nome_completo ||
                    recursoSelecionado?.relator?.name ||
                    'Não sorteado'}
                </div>
              </div>
              {recursoSelecionado && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-[11px] px-1.5 ml-1 text-primary"
                  onClick={() => {
                    setRecursoParaSorteio(recursoSelecionado);
                    setModalSorteioOpen(true);
                  }}
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>

          {/* GUIA DE JULGAMENTO DIDÁTICO */}
          <div className="p-2.5 rounded bg-primary/5 border border-primary/20 flex items-center gap-2 text-xs text-foreground/80">
            <Info className="h-4 w-4 text-primary shrink-0" />
            <span>
              <strong>Guia da Comissão:</strong> Compare os 3 pilares probatórios abaixo (Servidor x Chefia x CIT).
              Para alterar notas extremas (Graus 1 ou 5), é obrigatória a existência de fatos no Diário de Bordo (Art. 24).
            </span>
          </div>

          {/* PAINEL COMPARATIVO TRI-PARTITE (3 COLUNAS) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Coluna 1: Razões do Servidor */}
            <div className="p-4 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-blue-200/50 pb-2">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-semibold text-xs min-w-0">
                    <FileText className="h-4 w-4 shrink-0" />
                    <span className="truncate">1. Razões do Servidor</span>
                  </div>
                  <Badge variant="outline" className="text-[9px] font-mono shrink-0 self-start sm:self-auto">
                    Petição Inicial
                  </Badge>
                </div>
                <div className="text-xs text-foreground/90 leading-relaxed font-sans italic bg-background/80 p-3 rounded border border-border min-h-[110px]">
                  &quot;{recursoSelecionado?.justificativa_servidor || 'Sem manifestação digitada nos autos.'}&quot;
                </div>
              </div>
              <div className="text-[11px] text-muted-foreground pt-1 border-t border-blue-200/30 font-mono">
                Pretensão: <strong className="text-foreground">Retificação de Nota e Grau</strong>
              </div>
            </div>

            {/* Coluna 2: Contrarrazões da Chefia Imediata */}
            <div className="p-4 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-amber-200/50 pb-2">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-semibold text-xs min-w-0">
                    <UserCheck className="h-4 w-4 shrink-0" />
                    <span className="truncate">2. Contrarrazões Chefia</span>
                  </div>
                  <Badge variant="outline" className="text-[9px] font-mono shrink-0 self-start sm:self-auto">
                    Art. 28 (5 dias)
                  </Badge>
                </div>
                <div className="text-xs text-foreground/90 leading-relaxed font-sans bg-background/80 p-3 rounded border border-border min-h-[110px]">
                  {recursoSelecionado?.contestacao_chefia ? (
                    `"${recursoSelecionado.contestacao_chefia}"`
                  ) : (
                    <div className="text-muted-foreground italic flex flex-col items-center justify-center h-full text-center p-2">
                      <AlertTriangle className="h-5 w-5 text-amber-500 mb-1 opacity-60" />
                      <span>Chefia imediata não apresentou contestação no prazo legal. Preclusão formal averbada.</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="text-[11px] text-muted-foreground pt-1 border-t border-amber-200/30 font-mono">
                Prazo: <strong className="text-foreground">5 dias úteis</strong> {recursoSelecionado?.contestacao_chefia ? '• Cumprido' : '• Expirado'}
              </div>
            </div>

            {/* Coluna 3: Apontamentos e Evidências do CIT */}
            <div className="p-4 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-emerald-200/50 pb-2">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-semibold text-xs min-w-0">
                    <Sparkles className="h-4 w-4 shrink-0" />
                    <span className="truncate">3. Evidências do CIT</span>
                  </div>
                  <Badge variant="outline" className="text-[9px] font-mono text-emerald-600 shrink-0 self-start sm:self-auto">
                    Art. 24 (Base Fática)
                  </Badge>
                </div>
                <div className="text-xs text-foreground/90 leading-relaxed font-sans bg-background/80 p-3 rounded border border-border min-h-[110px] space-y-2">
                  <div className="font-semibold text-emerald-600 dark:text-emerald-400 text-[11px]">
                    Fator: {recursoSelecionado?.fatorContestado?.nome || recursoSelecionado?.fator_contestado?.nome}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Fatos observáveis e incidentes críticos registrados tempestivamente no ciclo servem como esteio probatório para a comissão.
                  </p>
                </div>
              </div>
              <div className="text-[11px] text-muted-foreground font-mono pt-1 border-t border-emerald-200/30">
                Trava Art. 24: Verificação mandatória
              </div>
            </div>
          </div>

          {/* VOTAÇÃO COLEGIADA INTUITIVA E DIDÁTICA */}
          <div className="p-4 rounded-lg border border-border bg-card space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-2">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <Scale className="h-4 w-4 text-primary" />
                Votação Colegiada da Comissão (Ata Deliberativa)
              </h4>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Sessão Vinculada:</span>
                <Select
                  value={String(sessaoAtivaId)}
                  onChange={(v) => setSessaoAtivaId(Number(v))}
                  options={sessoes
                    .filter((s) => !s.finalizada)
                    .map((s) => ({
                      value: String(s.id),
                      label: `Sessão ${s.tipo_sessao} #${s.id} (${s.data_sessao})`,
                    }))}
                  className="w-52 h-7 text-xs"
                />
              </div>
            </div>

            {/* SELEÇÃO DO VOTO COM CARDS EXPRESSIVOS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                onClick={() => setVotoFavoravel(true)}
                className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                  votoFavoravel
                    ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 ring-2 ring-emerald-500/20'
                    : 'border-border hover:border-border/80 bg-background/50'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <ThumbsUp
                    className={`h-5 w-5 mt-0.5 shrink-0 ${
                      votoFavoravel ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
                    }`}
                  />
                  <div>
                    <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                      Dar Provimento (Retificar Nota)
                      {votoFavoravel && <Check className="h-3.5 w-3.5 text-emerald-600" />}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Acolhe as razões do servidor e eleva o grau na Escala Gráfica de Chiavenato.
                    </p>
                  </div>
                </div>
              </div>

              <div
                onClick={() => setVotoFavoravel(false)}
                className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                  !votoFavoravel
                    ? 'border-rose-500 bg-rose-50/40 dark:bg-rose-950/20 ring-2 ring-rose-500/20'
                    : 'border-border hover:border-border/80 bg-background/50'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <ThumbsDown
                    className={`h-5 w-5 mt-0.5 shrink-0 ${
                      !votoFavoravel ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground'
                    }`}
                  />
                  <div>
                    <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                      Negar Provimento (Manter Nota)
                      {!votoFavoravel && <Check className="h-3.5 w-3.5 text-rose-600" />}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Mantém a nota e o parecer emitido pela chefia imediata sem retificações.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* SELETOR DE GRAU RETIFICADO (CHIAVENATO 1 A 5) */}
            {votoFavoravel && (
              <div className="p-3 rounded-lg bg-muted/30 border border-border space-y-2">
                <label className="text-xs font-semibold text-foreground block">
                  Novo Grau Retificado pela CAD (Escala Gráfica de Chiavenato 1 a 5)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                  {[
                    { grau: 1, label: 'Grau 1', desc: 'Insuficiente' },
                    { grau: 2, label: 'Grau 2', desc: 'Regular' },
                    { grau: 3, label: 'Grau 3', desc: 'Bom' },
                    { grau: 4, label: 'Grau 4', desc: 'Muito Bom' },
                    { grau: 5, label: 'Grau 5', desc: 'Excelente' },
                  ].map((g) => (
                    <div
                      key={g.grau}
                      onClick={() => setNovoGrauProposto(g.grau)}
                      className={`p-2 rounded border text-center cursor-pointer transition-all ${
                        novoGrauProposto === g.grau
                          ? 'border-primary bg-primary/10 font-bold text-primary ring-1 ring-primary'
                          : 'border-border bg-background hover:bg-muted/40 text-muted-foreground'
                      }`}
                    >
                      <div className="font-mono text-sm">{g.label}</div>
                      <div className="text-[10px] truncate">{g.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PARECER TÉCNICO COM TEMPLATES DE 1 CLIQUE */}
            <div className="space-y-1.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <label className="text-xs font-semibold text-foreground">
                  Parecer Técnico Colegiado (Fundamentação Formal para a Ata)
                </label>
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-[10px] text-muted-foreground font-mono mr-1">Inserir Modelo:</span>
                  {TEMPLATES_PARECER.map((tpl) => (
                    <Button
                      key={tpl.label}
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-5 text-[10px] px-1.5 text-primary border border-border/70"
                      onClick={() => setParecerVoto(tpl.texto)}
                    >
                      {tpl.label}
                    </Button>
                  ))}
                </div>
              </div>
              <textarea
                value={parecerVoto}
                onChange={(e) => setParecerVoto(e.target.value)}
                placeholder="Fundamente a deliberação com base nos autos, fatos do CIT e legislação aplicável..."
                rows={3}
                className="w-full p-2.5 text-xs rounded-md border border-input bg-background font-sans focus:outline-none focus:ring-2 focus:ring-primary leading-relaxed"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => {
                if (recursoSelecionado) {
                  setAvaliacaoEmFocoId(recursoSelecionado.avaliacao_id);
                  setModalEspelhoOpen(true);
                }
              }}
            >
              <Eye className="h-3.5 w-3.5 mr-1 text-primary" />
              Ver Espelho da Avaliação
            </Button>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setModalJulgamentoOpen(false)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleRegistrarVoto} disabled={salvandoVoto}>
                {salvandoVoto ? 'Gravando Voto...' : 'Assinar e Concluir Voto (SHA-256)'}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* ── MODAL 2: AUTOS COMPLETOS E DOSSIÊ PROCESSUAL DO RECURSO ────────── */}
      <Modal
        open={modalAutosOpen}
        onClose={() => setModalAutosOpen(false)}
        title={`Autos do Processo Recursal #${recursoSelecionado?.id ? String(recursoSelecionado.id).padStart(4, '0') : ''}`}
        size="2xl"
      >
        <div className="space-y-5">
          {/* IDENTIFICAÇÃO DO PROCESSO */}
          <div className="p-3.5 rounded-lg bg-muted/40 border border-border space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-primary text-sm">
                Processo Administrativo nº {recursoSelecionado?.id}/CAPD
              </span>
              <StatusChip
                label={recursoSelecionado?.status?.replace('_', ' ').toUpperCase() || 'EM ANÁLISE'}
                variant="info"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-muted-foreground pt-1 border-t border-border font-mono text-[11px]">
              <div>Servidor: <strong className="text-foreground">{recursoSelecionado?.servidor?.nome_completo}</strong></div>
              <div>Matrícula: <strong className="text-foreground">{recursoSelecionado?.servidor?.matricula || '-'}</strong></div>
              <div>Fator: <strong className="text-foreground">{recursoSelecionado?.fatorContestado?.nome || recursoSelecionado?.fator_contestado?.nome}</strong></div>
              <div>Prazo CAD: <strong className="text-foreground">{recursoSelecionado?.prazo_julgamento || '10 dias úteis'}</strong></div>
            </div>
          </div>

          {/* ESTEIRA PROCESSUAL (TIMELINE DOS AUTOS) */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-primary" />
              Linha do Tempo Processual (Ampla Defesa e Contraditório)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 rounded bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 space-y-1">
                <div className="font-bold text-emerald-700 dark:text-emerald-400 text-[11px]">1. Interposição</div>
                <div className="text-[10px] text-muted-foreground">Protocolado tempestivamente no prazo legal de 10 dias úteis.</div>
              </div>
              <div className="p-2.5 rounded bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 space-y-1">
                <div className="font-bold text-blue-700 dark:text-blue-300 text-[11px]">2. Notificação Chefia</div>
                <div className="text-[10px] text-muted-foreground">Prazo de 5 dias úteis para contrarrazões (Art. 28).</div>
              </div>
              <div className="p-2.5 rounded bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/50 space-y-1">
                <div className="font-bold text-indigo-700 dark:text-indigo-300 text-[11px]">3. Relatoria CAD</div>
                <div className="text-[10px] text-muted-foreground">Sorteio com checagem de impedimentos (Art. 31).</div>
              </div>
              <div className="p-2.5 rounded bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 space-y-1">
                <div className="font-bold text-amber-700 dark:text-amber-300 text-[11px]">4. Julgamento</div>
                <div className="text-[10px] text-muted-foreground">Voto colegiado registrado em ata selada por SHA-256.</div>
              </div>
            </div>
          </div>

          {/* PEÇA 1: PETIÇÃO DO SERVIDOR RECORRENTE */}
          <div className="space-y-1.5">
            <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-blue-600" />
              Peça Processual: Razões da Interposição
            </div>
            <div className="p-3.5 rounded-lg bg-background border border-border text-xs leading-relaxed italic text-foreground/90 font-sans">
              &quot;{recursoSelecionado?.justificativa_servidor || 'Sem manifestação digitada.'}&quot;
            </div>
          </div>

          {/* PEÇA 2: CONTRARRAZÕES DA CHEFIA */}
          <div className="space-y-1.5">
            <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <UserCheck className="h-4 w-4 text-amber-600" />
              Peça Processual: Contrarrazões da Chefia Imediata
            </div>
            <div className="p-3.5 rounded-lg bg-background border border-border text-xs leading-relaxed text-foreground/90 font-sans">
              {recursoSelecionado?.contestacao_chefia ? (
                `"${recursoSelecionado.contestacao_chefia}"`
              ) : (
                <div className="text-muted-foreground italic flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                  Chefia imediata não apresentou contrarrazões escritas no prazo do Art. 28.
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setModalAutosOpen(false)}>
              Fechar Autos
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setModalAutosOpen(false);
                setModalJulgamentoOpen(true);
              }}
            >
              <Scale className="h-3.5 w-3.5 mr-1" />
              Abrir Painel de Julgamento
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── MODAL 3: SORTEIO TRANSPARENTE DE RELATOR (ART. 31) ─────────────── */}
      <Modal
        open={modalSorteioOpen}
        onClose={() => setModalSorteioOpen(false)}
        title="Sorteio Regimental de Relator da CAD (Art. 31)"
        size="lg"
      >
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/50 space-y-1 text-xs">
            <div className="font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4" />
              Triagem Prévia de Impedimentos Legais (Art. 31 da Lei nº 1.704/2006)
            </div>
            <p className="text-indigo-600 dark:text-indigo-400 text-[11px] leading-relaxed">
              O sorteio seleciona aleatoriamente um membro titular ou suplente da comissão, excluindo
              automaticamente qualquer membro que seja chefia imediata, parente até 3º grau ou parte interessada no recurso.
            </p>
          </div>

          <div className="p-3 rounded border border-border bg-muted/20 text-xs space-y-1 font-mono">
            <div>Recurso: #REC-{recursoParaSorteio?.id}</div>
            <div>Servidor Recorrente: {recursoParaSorteio?.servidor?.nome_completo}</div>
            <div>Fator Contestado: {recursoParaSorteio?.fatorContestado?.nome || recursoParaSorteio?.fator_contestado?.nome}</div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-foreground">Quadro de Membros Elegíveis da Comissão:</div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {comissoes[0]?.membros && comissoes[0].membros.length > 0 ? (
                comissoes[0].membros.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-2 rounded bg-background border border-border text-xs"
                  >
                    <div>
                      <span className="font-semibold text-foreground">{m.servidor?.name || `Membro #${m.id}`}</span>
                      <span className="text-[10px] text-muted-foreground ml-2 font-mono">({m.papel.replace('_', ' ')})</span>
                    </div>
                    <Badge variant={m.ativo ? 'outline' : 'warning'} className="text-[10px] font-mono">
                      {m.ativo ? 'Apto para Sorteio' : 'Impedido'}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-xs text-muted-foreground italic p-2 bg-muted/20 rounded">
                  Nenhum membro vinculado à comissão vigente.
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setModalSorteioOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
              onClick={() => recursoParaSorteio && handleSortearRelator(recursoParaSorteio.id)}
              disabled={sorteandoRelatorId !== null}
            >
              <RotateCcw className={`h-3.5 w-3.5 mr-1.5 ${sorteandoRelatorId ? 'animate-spin' : ''}`} />
              {sorteandoRelatorId ? 'Sorteando Relator...' : 'Realizar Sorteio Aleatório'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── MODAL: NOVA SESSÃO DELIBERATIVA ───────────────────────────── */}
      <Modal
        open={modalSessaoOpen}
        onClose={() => setModalSessaoOpen(false)}
        title="Agendar Nova Sessão Deliberativa da CAD"
        size="lg"
      >
        <form onSubmit={handleCriarSessao} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              Portaria / Comissão Competente
            </label>
            <Select
              value={comissaoSessaoId}
              onChange={setComissaoSessaoId}
              options={comissoes.map((c) => ({
                value: String(c.id),
                label: `Portaria nº ${c.numero_portaria} (${c.ativa ? 'Vigente' : 'Inativa'})`,
              }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Tipo de Sessão
              </label>
              <Select
                value={tipoSessao}
                onChange={(v) => setTipoSessao(v as 'ordinaria' | 'extraordinaria')}
                options={[
                  { value: 'ordinaria', label: 'Ordinária' },
                  { value: 'extraordinaria', label: 'Extraordinária' },
                ]}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Quórum Mínimo de Membros
              </label>
              <Input
                type="number"
                min={3}
                max={15}
                value={quorumMinimo}
                onChange={(e) => setQuorumMinimo(Number(e.target.value))}
                className="font-mono tabular-nums"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              Data e Horário Previsto
            </label>
            <Input
              type="date"
              value={dataSessao}
              onChange={(e) => setDataSessao(e.target.value)}
              className="font-mono tabular-nums"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalSessaoOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={salvandoSessao}>
              {salvandoSessao ? 'Agendando...' : 'Confirmar e Abrir Sessão'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL: SELAR ATA COM CRIPTOGRAFIA SHA-256 ──────────────────── */}
      <Modal
        open={modalSelarAtaOpen}
        onClose={() => setModalSelarAtaOpen(false)}
        title={`Lavrar e Selar Ata Deliberativa — Sessão #${sessaoParaSelar?.id}`}
        size="xl"
      >
        <form onSubmit={handleSelarAta} className="space-y-4">
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Selo Criptográfico Irrevogável
            </div>
            <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
              O selamento desta ata gerará um hash criptográfico SHA-256 que tornará o texto
              juridicamente imutável para auditoria e controle externo dos tribunais.
            </p>
          </div>

          {sessaoParaSelar && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono p-2.5 bg-muted/30 rounded border border-border">
              <div>
                <span className="text-muted-foreground block text-[10px]">Data da Reunião:</span>
                <strong className="text-foreground">{sessaoParaSelar.data_sessao}</strong>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Tipo:</span>
                <strong className="text-foreground uppercase">{sessaoParaSelar.tipo_sessao}</strong>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Quórum Registrado:</span>
                <strong className="text-foreground">
                  {sessaoParaSelar.quorum_presente} / {sessaoParaSelar.quorum_minimo} membros
                </strong>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <label className="text-xs font-semibold text-foreground">
                Texto Integral da Ata Deliberativa
              </label>
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-[10px] text-muted-foreground font-mono mr-1">Inserir Modelo:</span>
                {TEMPLATES_ATA.map((tpl) => (
                  <Button
                    key={tpl.label}
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-5 text-[10px] px-1.5 text-primary border border-border/70"
                    onClick={() =>
                      setTextoAtaParaSelar(
                        tpl.texto.replace(
                          '[DATA]',
                          sessaoParaSelar?.data_sessao || new Date().toLocaleDateString('pt-BR')
                        )
                      )
                    }
                  >
                    {tpl.label}
                  </Button>
                ))}
              </div>
            </div>
            <textarea
              value={textoAtaParaSelar}
              onChange={(e) => setTextoAtaParaSelar(e.target.value)}
              placeholder="Aos [data], reuniu-se a Comissão de Avaliação e Desempenho (CAD)... Registre todas as deliberações, quórum e votos..."
              rows={8}
              className="w-full p-2.5 text-xs rounded-md border border-input bg-background font-sans focus:outline-none focus:ring-2 focus:ring-primary leading-relaxed"
            />
            <div className="flex justify-between items-center text-[10px] text-muted-foreground font-mono">
              <span>Mínimo de 100 caracteres para fé pública.</span>
              <span className="tabular-nums">{textoAtaParaSelar.length} caracteres digitados</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalSelarAtaOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={salvandoSelamento || textoAtaParaSelar.trim().length < 100}
            >
              {salvandoSelamento ? 'Gerando SHA-256...' : 'Gerar Hash SHA-256 e Selar Ata'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL: DETALHE INTEGRAL DA ATA DELIBERATIVA (SHA-256) ──────── */}
      <Modal
        open={modalDetalheAtaOpen}
        onClose={() => {
          setModalDetalheAtaOpen(false);
          setTextoAtaCopiado(false);
        }}
        title={`Ata Deliberativa da Sessão ${sessaoDetalheAta?.tipo_sessao === 'ordinaria' ? 'Ordinária' : 'Extraordinária'} #${sessaoDetalheAta?.id ? String(sessaoDetalheAta.id).padStart(3, '0') : ''}`}
        size="2xl"
      >
        {sessaoDetalheAta && (
          <div className="space-y-4">
            {/* BANNER DE FÉ PÚBLICA CRIPTOGRÁFICA */}
            {sessaoDetalheAta.hash_ata_sha256 ? (
              <div className="p-3.5 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-xs">
                    <ShieldCheck className="h-4 w-4 shrink-0" />
                    Selo Criptográfico Irrevogável (SHA-256) — Fé Pública
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono text-emerald-600 border-emerald-300">
                    Ata Imutável
                  </Badge>
                </div>
                <div className="bg-background/80 p-2.5 rounded border border-emerald-200 dark:border-emerald-900/40 space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                    <span>Hash SHA-256 da Ata:</span>
                    <button
                      type="button"
                      onClick={() => handleCopiarHash(sessaoDetalheAta.hash_ata_sha256!)}
                      className="text-primary hover:underline flex items-center gap-1 font-mono text-[10px]"
                    >
                      {hashCopiado === sessaoDetalheAta.hash_ata_sha256 ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-500" /> Copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" /> Copiar Hash
                        </>
                      )}
                    </button>
                  </div>
                  <div className="font-mono text-xs text-foreground select-all break-all tabular-nums">
                    {sessaoDetalheAta.hash_ata_sha256}
                  </div>
                </div>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                  Esta ata foi formalmente deliberada e selada com integridade matemática. Qualquer alteração posterior no texto invalidará o hash perante os tribunais.
                </p>
              </div>
            ) : (
              <div className="p-3 rounded bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Minuta de ata em elaboração — ainda não selada com hash criptográfico SHA-256.</span>
              </div>
            )}

            {/* METADADOS DA SESSÃO */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono p-3 bg-muted/30 rounded border border-border">
              <div>
                <span className="text-muted-foreground block text-[10px]">Data:</span>
                <strong className="text-foreground">{sessaoDetalheAta.data_sessao}</strong>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Tipo de Sessão:</span>
                <strong className="text-foreground uppercase">{sessaoDetalheAta.tipo_sessao}</strong>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Quórum Registrado:</span>
                <strong className="text-foreground">
                  {sessaoDetalheAta.quorum_presente} / {sessaoDetalheAta.quorum_minimo} membros
                </strong>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Situação:</span>
                <strong className={sessaoDetalheAta.finalizada ? 'text-emerald-600' : 'text-amber-600'}>
                  {sessaoDetalheAta.finalizada ? 'Finalizada' : 'Em Andamento'}
                </strong>
              </div>
            </div>

            {/* TEXTO INTEGRAL DA ATA */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <ScrollText className="h-4 w-4 text-primary" />
                  Texto Oficial Lavrado na Ata
                </label>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {sessaoDetalheAta.ata_texto?.length || 0} caracteres
                </span>
              </div>
              <div className="p-4 rounded-lg bg-card border border-border text-xs leading-relaxed text-foreground/90 font-sans whitespace-pre-wrap max-h-[42vh] overflow-y-auto">
                {sessaoDetalheAta.ata_texto || 'Ata ainda não lavrada para esta sessão.'}
              </div>
            </div>

            {/* BOTÕES DE AÇÃO */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t border-border">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    if (sessaoDetalheAta.ata_texto) {
                      navigator.clipboard?.writeText(sessaoDetalheAta.ata_texto);
                      setTextoAtaCopiado(true);
                      setTimeout(() => setTextoAtaCopiado(false), 3000);
                    }
                  }}
                  disabled={!sessaoDetalheAta.ata_texto}
                >
                  {textoAtaCopiado ? (
                    <>
                      <Check className="h-3.5 w-3.5 mr-1 text-emerald-500" />
                      Texto Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 mr-1" />
                      Copiar Ata
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => window.print()}
                >
                  <Printer className="h-3.5 w-3.5 mr-1 text-primary" />
                  Imprimir Ata
                </Button>
              </div>

              <Button
                variant="default"
                size="sm"
                onClick={() => setModalDetalheAtaOpen(false)}
              >
                Fechar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── MODAL: NOVA PORTARIA / COMISSÃO ───────────────────────────── */}
      <Modal
        open={modalNovaPortariaOpen}
        onClose={() => setModalNovaPortariaOpen(false)}
        title="Cadastrar Portaria de Nomeação da CAD"
        size="lg"
      >
        <form onSubmit={handleCriarPortaria} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              Ciclo de Referência Vinculado
            </label>
            <Select
              value={formCicloPortariaId}
              onChange={setFormCicloPortariaId}
              options={ciclos.map((c) => ({
                value: String(c.id),
                label: `${c.nome} (${c.ano_referencia})`,
              }))}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              Número Oficial da Portaria
            </label>
            <Input
              type="text"
              placeholder="Ex: Portaria nº 042/2026-GP"
              value={formNumeroPortaria}
              onChange={(e) => setFormNumeroPortaria(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              Data de Publicação Oficial
            </label>
            <Input
              type="date"
              value={formDataPortaria}
              onChange={(e) => setFormDataPortaria(e.target.value)}
              className="font-mono tabular-nums"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalNovaPortariaOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={salvandoPortaria}>
              {salvandoPortaria ? 'Cadastrando...' : 'Salvar Portaria'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL: ADICIONAR MEMBRO À COMISSÃO ────────────────────────── */}
      <Modal
        open={modalNovoMembroOpen}
        onClose={() => setModalNovoMembroOpen(false)}
        title="Designar Membro para a Comissão da CAD"
        size="lg"
      >
        <form onSubmit={handleAdicionarMembro} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              Servidor Público
            </label>
            <Select
              value={formMembroServidorId}
              onChange={setFormMembroServidorId}
              options={[
                { value: '', label: 'Selecione um servidor...' },
                ...servidores.map((s) => ({
                  value: String(s.id),
                  label: `${s.nome_completo || s.name} (Matrícula: ${s.matricula || s.id})`,
                })),
              ]}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              Papel Regimental na Comissão
            </label>
            <Select
              value={formMembroPapel}
              onChange={(v) => setFormMembroPapel(v as any)}
              options={[
                { value: 'presidente', label: 'Presidente da Comissão' },
                { value: 'secretario', label: 'Secretário(a)' },
                { value: 'titular_gestao', label: 'Membro Titular (Gestão)' },
                { value: 'titular_servidor', label: 'Membro Titular (Servidor)' },
                { value: 'suplente', label: 'Membro Suplente' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Início do Mandato
              </label>
              <Input
                type="date"
                value={formDataInicioMandato}
                onChange={(e) => setFormDataInicioMandato(e.target.value)}
                className="font-mono tabular-nums"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Fim do Mandato
              </label>
              <Input
                type="date"
                value={formDataFimMandato}
                onChange={(e) => setFormDataFimMandato(e.target.value)}
                className="font-mono tabular-nums"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalNovoMembroOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={salvandoMembro}>
              {salvandoMembro ? 'Designando...' : 'Designar Membro'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL: DECLARAR IMPEDIMENTO LEGAL (ART. 31) ───────────────── */}
      <Modal
        open={modalImpedimentoOpen}
        onClose={() => setModalImpedimentoOpen(false)}
        title="Declarar Impedimento Legal de Membro (Art. 31)"
        size="lg"
      >
        <form onSubmit={handleDeclararImpedimento} className="space-y-4">
          <div className="p-3 rounded bg-muted/40 border border-border text-xs">
            Membro Declarante:{' '}
            <strong>
              {membroSelecionado?.servidor?.name || `Membro #${membroSelecionado?.id}`}
            </strong>{' '}
            <span className="font-mono text-muted-foreground">
              ({membroSelecionado?.papel.replace('_', ' ')})
            </span>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              Servidor Avaliado em Conflito de Interesse
            </label>
            <Select
              value={formImpedimentoServidorAlvoId}
              onChange={setFormImpedimentoServidorAlvoId}
              options={[
                { value: '', label: 'Selecione o servidor alvo...' },
                ...servidores
                  .filter((s) => s.id !== membroSelecionado?.servidor_id)
                  .map((s) => ({
                    value: String(s.id),
                    label: `${s.nome_completo || s.name} (Matrícula: ${s.matricula || s.id})`,
                  })),
              ]}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              Tipo de Impedimento Regimental
            </label>
            <Select
              value={formImpedimentoTipo}
              onChange={(v) => setFormImpedimentoTipo(v as any)}
              options={[
                {
                  value: 'grau_parentesco',
                  label: 'Grau de Parentesco até 3º Grau (Cônjuge, Pai, Filho, Irmão, etc.)',
                },
                {
                  value: 'subordinacao_direta',
                  label: 'Subordinação Direta ou Chefia Imediata',
                },
                { value: 'recorrente', label: 'Membro é o Próprio Recorrente' },
                { value: 'avaliador', label: 'Membro foi o Avaliador Imediato da Nota' },
                { value: 'autodeclarado', label: 'Motivo Íntimo / Autodeclarado' },
              ]}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              Motivo e Fundamentação Circunstanciada
            </label>
            <textarea
              value={formImpedimentoMotivo}
              onChange={(e) => setFormImpedimentoMotivo(e.target.value)}
              placeholder="Descreva as circunstâncias fáticas que ensejam o impedimento para fé pública regimental..."
              rows={3}
              className="w-full p-2.5 text-xs rounded-md border border-input bg-background font-sans focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalImpedimentoOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={salvandoImpedimento || formImpedimentoMotivo.trim().length < 10}
            >
              {salvandoImpedimento ? 'Averbando...' : 'Averbar Impedimento Legal'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL: CONFIRMAÇÃO SEGURA DE HOMOLOGAÇÃO (SEM ALERT/CONFIRM) ── */}
      <Modal
        open={modalHomologacaoOpen}
        onClose={() => setModalHomologacaoOpen(false)}
        title="Confirmar Homologação Final do Ciclo de Avaliação"
        size="lg"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 space-y-2">
            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-bold text-xs">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              Ato Jurídico Definitivo e Irrevogável
            </div>
            <p className="text-xs text-rose-600 dark:text-rose-400 leading-relaxed">
              Ao homologar o ciclo, todas as notas atribuídas tornam-se definitivas e imutáveis no banco de dados.
              Será publicado um evento Outbox para atualização de progressões no plano de cargos e folha de pagamento.
            </p>
          </div>

          <div className="p-3 rounded border border-border bg-muted/20 text-xs space-y-1 font-mono">
            <div>Ciclo Selecionado: ID #{cicloParaHomologarId}</div>
            <div>Recursos Pendentes: {recursosPendentes.length}</div>
            <div>Atas Seladas com Hash: {sessoesSeladas}</div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalHomologacaoOpen(false)}
              disabled={homologandoCiclo}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              className="bg-primary text-primary-foreground font-bold"
              onClick={handleConfirmarHomologacao}
              disabled={homologandoCiclo}
            >
              {homologandoCiclo ? 'Homologando Ciclo...' : 'Confirmar Homologação Definitiva'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Modal: Visualização do Espelho da Avaliação Contestada ─────── */}
      <EspelhoAvaliacaoModal
        avaliacaoId={avaliacaoEmFocoId}
        open={modalEspelhoOpen}
        onClose={() => setModalEspelhoOpen(false)}
      />

      {/* FEEDBACK MODAL INSTITUCIONAL */}
      {feedback && (
        <Modal open={feedback.open} onClose={() => setFeedback(null)} title={feedback.title} size="sm">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              {feedback.type === 'success' && (
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
              )}
              {feedback.type === 'warning' && (
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              )}
              {feedback.type === 'error' && (
                <XCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
              )}
              <p className="text-xs text-foreground leading-relaxed font-sans">
                {feedback.message}
              </p>
            </div>
            <div className="flex justify-end pt-2 border-t border-border">
              <Button size="sm" onClick={() => setFeedback(null)}>
                Entendido
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
