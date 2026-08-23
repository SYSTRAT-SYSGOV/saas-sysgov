import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Sparkles,
  Send,
  RefreshCw,
  ShieldAlert,
  CheckCircle,
  Building,
  Scale,
  BrainCircuit,
  Copy,
  Check,
  Printer,
  History,
  Trash2,
  Clock,
  Search,
  Filter,
  Layers,
  ChevronRight,
  Download,
  AlertTriangle,
  Flame,
  Award,
  ExternalLink,
  BookOpen,
  HelpCircle,
  X,
} from 'lucide-react';
import { getAIDiagnosis } from '../services/api';
import { FiscalKPIs } from '../types/fiscal';
import { formatCurrency, formatPercent, formatCompactCurrency } from '../utils/formatters';

export interface DiagnosticoHistoricoItem {
  id: string;
  titulo: string;
  pergunta: string;
  analise: string;
  provedor: string;
  timestamp: string;
  ano: number;
  categoria: string;
  criticidade: 'CRÍTICA' | 'ALTA' | 'ESTRATÉGICA' | 'MODERADA';
  codigoIbge?: string;
  municipio?: string;
}

export interface FocusTopic {
  id: string;
  titulo: string;
  pergunta: string;
  categoria: 'LRF & Pessoal' | 'Receitas & Arrecadação' | 'Pisos Constitucionais' | 'Investimentos & Obras' | 'Governança & Restos a Pagar';
  criticidade: 'CRÍTICA' | 'ALTA' | 'ESTRATÉGICA' | 'MODERADA';
  tag: string;
  descricaoBreve: string;
}

interface ModuleAIDiagnosticoProps {
  summary: FiscalKPIs;
  ano: number;
  activeTenant?: {
    id: string;
    nomePrefeitura: string;
    cidade: string;
    uf: string;
    codigoIbge: string;
    branding?: any;
  };
}

const FOCUS_TOPICS: FocusTopic[] = [
  // 1. LRF & Pessoal
  {
    id: 'top-1',
    titulo: 'Limite Prudencial da LRF (51,3%)',
    pergunta: 'Quais medidas imediatas e de contenção tomar para evitar atingir o Limite Prudencial da LRF (51,30%) e as sanções do Artigo 22 da LC 101/2000?',
    categoria: 'LRF & Pessoal',
    criticidade: 'CRÍTICA',
    tag: 'DTP / LRF',
    descricaoBreve: 'Prevenção de travas em contratações, criação de cargos e reajustes salariais.',
  },
  {
    id: 'top-2',
    titulo: 'Aporte Previdenciário Anual (FPMA / RPPS)',
    pergunta: 'Qual a melhor estratégia orçamentária e financeira para viabilizar os aportes anuais de equacionamento atuarial do RPPS (FPMA) sem comprometer os investimentos?',
    categoria: 'LRF & Pessoal',
    criticidade: 'ALTA',
    tag: 'Previdência',
    descricaoBreve: 'Equacionamento do déficit atuarial e impacto no fluxo de caixa livre.',
  },
  {
    id: 'top-3',
    titulo: 'Horas Extras e Gratificações Temporárias',
    pergunta: 'Como estruturar um plano de contingenciamento de horas extras e gratificações discricionárias nas secretarias de Obras e Saúde para reduzir em 15% o gasto sem afetar serviços essenciais?',
    categoria: 'LRF & Pessoal',
    criticidade: 'ALTA',
    tag: 'Folha',
    descricaoBreve: 'Auditoria de adicionais e controle sobre folha variável.',
  },
  {
    id: 'top-4',
    titulo: 'Impacto dos Pisos Salariais Nacionais',
    pergunta: 'Qual o impacto orçamentário dos reajustes dos Pisos Nacionais do Magistério e da Enfermagem sobre a margem de segurança da Despesa Total com Pessoal?',
    categoria: 'LRF & Pessoal',
    criticidade: 'ESTRATÉGICA',
    tag: 'Pisos Salariais',
    descricaoBreve: 'Compatibilização de obrigações federais com a capacidade de pagamento municipal.',
  },

  // 2. Receitas & Arrecadação
  {
    id: 'top-5',
    titulo: 'Queda de ICMS e Royalties de Refinaria (REPAR)',
    pergunta: 'Como equilibrar o orçamento municipal diante das oscilações de ICMS e Royalties da Refinaria Presidente Getúlio Vargas (REPAR) com medidas compensatórias de curto e médio prazo?',
    categoria: 'Receitas & Arrecadação',
    criticidade: 'CRÍTICA',
    tag: 'ICMS / REPAR',
    descricaoBreve: 'Mitigação da dependência de repasses industriais estaduais.',
  },
  {
    id: 'top-6',
    titulo: 'Recuperação e Cobrança da Dívida Ativa',
    pergunta: 'Qual o plano de ação mais eficiente para acelerar a cobrança amigável, protesto extrajudicial e mutirões de conciliação do estoque de Dívida Ativa tributária (IPTU e ISS)?',
    categoria: 'Receitas & Arrecadação',
    criticidade: 'ALTA',
    tag: 'Dívida Ativa',
    descricaoBreve: 'Monetização de créditos tributários e reforço da liquidez do Tesouro.',
  },
  {
    id: 'top-7',
    titulo: 'Cruzamento Eletrônico de ISS Bancário e Cartões (DIMP)',
    pergunta: 'Como estruturar a fiscalização eletrônica do ISSQN sobre serviços financeiros, cartões de crédito e plataformas digitais utilizando cruzamento com a DIMP da Receita Federal?',
    categoria: 'Receitas & Arrecadação',
    criticidade: 'ESTRATÉGICA',
    tag: 'ISS Eletrônico',
    descricaoBreve: 'Combate à sonegação e incremento de arrecadação própria sem aumento de alíquotas.',
  },
  {
    id: 'top-8',
    titulo: 'Revisão da Planta Genérica de Valores (PGV)',
    pergunta: 'Quais as diretrizes técnicas e etapas para atualização da Planta Genérica de Valores (PGV) e modernização do cadastro imobiliário multifinalitário garantindo justiça fiscal?',
    categoria: 'Receitas & Arrecadação',
    criticidade: 'MODERADA',
    tag: 'IPTU / PGV',
    descricaoBreve: 'Atualização da base territorial com reflexos em IPTU, ITBI e taxas.',
  },

  // 3. Pisos Constitucionais
  {
    id: 'top-9',
    titulo: 'Piso Constitucional da Educação (25% MDE)',
    pergunta: 'Como garantir o cumprimento seguro do piso constitucional de 25% em Manutenção e Desenvolvimento do Ensino (Art. 212 da CF) com foco em creches e tempo integral?',
    categoria: 'Pisos Constitucionais',
    criticidade: 'ALTA',
    tag: 'Educação 25%',
    descricaoBreve: 'Acompanhamento trimestral da aplicação em MDE e prevenção de apontamentos do TCE.',
  },
  {
    id: 'top-10',
    titulo: 'FUNDEB e Subvinculação do Magistério (70%)',
    pergunta: 'Como monitorar a aplicação mínima de 70% dos recursos do FUNDEB na remuneração dos profissionais da educação e otimizar as complementações federais VAAT e VAAF?',
    categoria: 'Pisos Constitucionais',
    criticidade: 'ALTA',
    tag: 'FUNDEB 70%',
    descricaoBreve: 'Gestão da folha da educação e regras de rateio constitucional.',
  },
  {
    id: 'top-11',
    titulo: 'Piso Constitucional da Saúde (15% ASPS)',
    pergunta: 'Qual a estratégia para resguardar a aplicação de 15% em Ações e Serviços Públicos de Saúde (LC 141/2012) assegurando regularidade no fornecimento de medicamentos nas UBSs?',
    categoria: 'Pisos Constitucionais',
    criticidade: 'ALTA',
    tag: 'Saúde 15%',
    descricaoBreve: 'Controle contínuo do SIOPS e liquidação orçamentária dos blocos de saúde.',
  },
  {
    id: 'top-12',
    titulo: 'Otimização dos Blocos de Custeio e Faturamento SUS',
    pergunta: 'Como aprimorar a captação de recursos federais do SUS e reduzir glosas no faturamento dos procedimentos ambulatoriais e hospitalares (Teto MAC e Atenção Primária)?',
    categoria: 'Pisos Constitucionais',
    criticidade: 'ESTRATÉGICA',
    tag: 'Repasses SUS',
    descricaoBreve: 'Eficiência no faturamento e credenciamento de novos serviços no Ministério da Saúde.',
  },

  // 4. Investimentos & Obras
  {
    id: 'top-13',
    titulo: 'Maximização de Emendas Parlamentares (Transferegov)',
    pergunta: 'Como maximizar a captação e execução dos recursos de emendas parlamentares individuais e de bancada no Transferegov, evitando a perda de prazos de cláusulas suspensivas?',
    categoria: 'Investimentos & Obras',
    criticidade: 'CRÍTICA',
    tag: 'Transferegov',
    descricaoBreve: 'Monitoramento de convênios federais e agilização de planos de trabalho.',
  },
  {
    id: 'top-14',
    titulo: 'Monitoramento de Medições e Obrasgov',
    pergunta: 'Como estruturar o cronograma físico-financeiro das obras públicas municipais integradas ao Obrasgov para acelerar a liberação de parcelas e evitar paralisações?',
    categoria: 'Investimentos & Obras',
    criticidade: 'ALTA',
    tag: 'Obrasgov',
    descricaoBreve: 'Auditoria de medições e controle de contrapartidas municipais.',
  },
  {
    id: 'top-15',
    titulo: 'Espaço Fiscal para Operações de Crédito (FINISA)',
    pergunta: 'Qual a capacidade de endividamento do município e as condições de elegibilidade para contratação de operações de crédito (FINISA/FONPLATA) para investimentos em infraestrutura?',
    categoria: 'Investimentos & Obras',
    criticidade: 'ESTRATÉGICA',
    tag: 'Crédito / CAPAG',
    descricaoBreve: 'Avaliação de Rating / CAPAG e limites de endividamento da Resolução 43 do Senado.',
  },

  // 5. Governança & Restos a Pagar
  {
    id: 'top-16',
    titulo: 'Suficiência Financeira e Restos a Pagar (Art. 42 LRF)',
    pergunta: 'Como assegurar a suficiência de caixa para cobertura integral de Restos a Pagar Processados e Não Processados, em estrita observância ao Artigo 42 da LRF?',
    categoria: 'Governança & Restos a Pagar',
    criticidade: 'CRÍTICA',
    tag: 'Art. 42 LRF',
    descricaoBreve: 'Blindagem jurídica e financeira contra déficits em final de exercício/mandato.',
  },
  {
    id: 'top-17',
    titulo: 'Repactuação de Contratos Continuados de Terceirização',
    pergunta: 'Qual o roteiro de auditoria para renegociar contratos de prestação de serviços continuados (vigilância, limpeza, TI e locações) com meta de redução de 10% a 15% nos custos?',
    categoria: 'Governança & Restos a Pagar',
    criticidade: 'ALTA',
    tag: 'Contratos / Custeio',
    descricaoBreve: 'Racionalização do custeio e ganhos de escala na administração pública.',
  },
  {
    id: 'top-18',
    titulo: 'Plano de Contingenciamento Orçamentário Preventivo',
    pergunta: 'Como estruturar um decreto municipal de contingenciamento preventivo e programação financeira quadrimestral diante de eventuais frustrações de arrecadação?',
    categoria: 'Governança & Restos a Pagar',
    criticidade: 'ESTRATÉGICA',
    tag: 'Contingenciamento',
    descricaoBreve: 'Mecanismos legais de proteção ao equilíbrio fiscal e metas da LDO.',
  },
];

export const ModuleAIDiagnostico: React.FC<ModuleAIDiagnosticoProps> = ({
  summary,
  ano,
  activeTenant,
}) => {
  const [question, setQuestion] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [report, setReport] = useState<string | null>(null);
  const [provider, setProvider] = useState<string>('');
  const [activeTopic, setActiveTopic] = useState<FocusTopic | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search for Topics
  const [selectedCategory, setSelectedCategory] = useState<string>('TODAS');
  const [searchTopic, setSearchTopic] = useState<string>('');

  // History State
  const [historico, setHistorico] = useState<DiagnosticoHistoricoItem[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [historySearch, setHistorySearch] = useState<string>('');
  const [activeHistoryItem, setActiveHistoryItem] = useState<DiagnosticoHistoricoItem | null>(null);

  const tenantId = activeTenant?.id || 'tenant-araucaria';
  const cidadeNome = activeTenant?.cidade || 'Araucária';
  const ufNome = activeTenant?.uf || 'PR';
  const prefeituraNome = activeTenant?.nomePrefeitura || 'Prefeitura Municipal de Araucária';
  const codigoIbge = activeTenant?.codigoIbge || '4101804';

  const storageKey = `sgf_diagnosticos_historico_${tenantId}`;

  // Load history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setHistorico(parsed);
        }
      }
    } catch (e) {
      console.warn('Erro ao carregar histórico de diagnósticos:', e);
    }
  }, [storageKey]);

  // Save history to localStorage
  const saveToHistory = (item: DiagnosticoHistoricoItem) => {
    try {
      const updated = [item, ...historico.filter(h => h.id !== item.id)].slice(0, 30);
      setHistorico(updated);
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (e) {
      console.warn('Erro ao salvar diagnóstico no histórico:', e);
    }
  };

  const handleClearHistory = () => {
    if (window.confirm('Tem certeza de que deseja limpar todo o histórico de pareceres arquivados?')) {
      setHistorico([]);
      localStorage.removeItem(storageKey);
      setActiveHistoryItem(null);
    }
  };

  const handleDeleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = historico.filter(h => h.id !== id);
    setHistorico(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    if (activeHistoryItem?.id === id) {
      setActiveHistoryItem(null);
    }
  };

  // Filtered Topics
  const categories = useMemo(() => {
    const cats = Array.from(new Set(FOCUS_TOPICS.map(t => t.categoria)));
    return ['TODAS', ...cats];
  }, []);

  const filteredTopics = useMemo(() => {
    return FOCUS_TOPICS.filter(topic => {
      const matchesCategory = selectedCategory === 'TODAS' || topic.categoria === selectedCategory;
      const matchesSearch =
        searchTopic.trim() === '' ||
        topic.titulo.toLowerCase().includes(searchTopic.toLowerCase()) ||
        topic.pergunta.toLowerCase().includes(searchTopic.toLowerCase()) ||
        topic.tag.toLowerCase().includes(searchTopic.toLowerCase()) ||
        topic.descricaoBreve.toLowerCase().includes(searchTopic.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchTopic]);

  const filteredHistory = useMemo(() => {
    if (!historySearch.trim()) return historico;
    const term = historySearch.toLowerCase();
    return historico.filter(
      h =>
        h.titulo.toLowerCase().includes(term) ||
        h.pergunta.toLowerCase().includes(term) ||
        h.analise.toLowerCase().includes(term) ||
        h.provedor.toLowerCase().includes(term)
    );
  }, [historico, historySearch]);

  const handleRunDiagnosis = async (customQ?: string, topic?: FocusTopic) => {
    const q = customQ !== undefined ? customQ : question;
    if (!q.trim() && !topic) {
      setError('Por favor, informe uma pergunta ou selecione um tópico de foco da gestão.');
      return;
    }

    setLoading(true);
    setError(null);
    if (topic) {
      setActiveTopic(topic);
    }

    try {
      const res = await getAIDiagnosis(q, summary, tenantId, ano);
      const text = res.analise || res.diagnostico || '';
      if (!text) {
        throw new Error('Nenhum texto de parecer foi retornado pelo motor fiscal.');
      }
      setReport(text);
      setProvider(res.provedor || 'Google Gemini 2.5 Flash • IA Especialista');

      // Add to history
      const title = topic?.titulo || (q ? q.slice(0, 60) + '...' : `Parecer Geral do Exercício ${ano}`);
      const histItem: DiagnosticoHistoricoItem = {
        id: `diag-${Date.now()}`,
        titulo: title,
        pergunta: q || topic?.pergunta || 'Parecer Técnico Executivo Geral Consolidado',
        analise: text,
        provedor: res.provedor || 'Google Gemini 2.5 Flash',
        timestamp: new Date().toISOString(),
        ano,
        categoria: topic?.categoria || 'Diagnóstico Executivo Geral',
        criticidade: topic?.criticidade || 'ESTRATÉGICA',
        codigoIbge,
        municipio: `${cidadeNome}/${ufNome}`,
      };
      saveToHistory(histItem);
      setActiveHistoryItem(histItem);
    } catch (err: any) {
      console.error('Erro ao gerar diagnóstico:', err);
      setError(err?.message || 'Falha ao processar a auditoria fiscal.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyReport = () => {
    if (report) {
      navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const handleLoadHistoryItem = (item: DiagnosticoHistoricoItem) => {
    setReport(item.analise);
    setProvider(item.provedor);
    setQuestion(item.pergunta);
    setActiveHistoryItem(item);
    setShowHistoryModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Printable Sheet (Visible Only During window.print()) */}
      <div className="hidden print:block print:p-8 bg-white text-black font-sans text-xs leading-relaxed">
        {/* Header Timbrado Oficial */}
        <div className="border-b-2 border-slate-900 pb-4 mb-4 flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-base font-black uppercase tracking-wider text-slate-900">
              {prefeituraNome}
            </h1>
            <p className="text-xs font-bold uppercase text-slate-700">
              Gabinete do Prefeito Municipal • Secretaria Municipal de Finanças
            </p>
            <p className="text-[11px] font-mono text-slate-600">
              Estado de {ufNome} • Código IBGE: <span className="font-bold">{codigoIbge}</span> • Exercício Financeiro: <span className="font-bold">{ano}</span>
            </p>
          </div>
          <div className="text-right space-y-1 font-mono text-[10px] text-slate-500">
            <span className="px-2 py-0.5 border border-slate-900 font-bold uppercase rounded-xs">
              DOCUMENTO OFICIAL
            </span>
            <p>Emissão: {new Date().toLocaleString('pt-BR')}</p>
            <p>Protocolo: #SGF-AUD-{ano}-{Date.now().toString().slice(-6)}</p>
          </div>
        </div>

        {/* Quadro Resumo Executivo */}
        <div className="border border-slate-400 bg-slate-50 p-3 mb-4 rounded-xs">
          <h3 className="font-mono font-bold text-xs uppercase tracking-wider text-slate-900 mb-2 border-b border-slate-300 pb-1">
            Matriz de Indicadores Fiscais Consolidados (Siconfi / LRF)
          </h3>
          <div className="grid grid-cols-4 gap-2 font-mono text-[11px]">
            <div>
              <span className="text-slate-500 block">Receita Líquida (RCL):</span>
              <strong className="text-slate-900">{formatCurrency(summary.rcl || (summary as any).receitaCorrenteLiquida || 0)}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Folha de Pessoal (DTP):</span>
              <strong className="text-slate-900">{formatCurrency(summary.despesaPessoalTotal || 0)} ({summary.despesaPessoalPercentualRCL || 50.15}%)</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Limite Prudencial LRF:</span>
              <strong className="text-slate-900">{summary.limitePrudencialPessoal || 51.3}% da RCL</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Pisos Educ. / Saúde:</span>
              <strong className="text-slate-900">{summary.aplicacaoEducacaoPercentual || 25.8}% / {summary.aplicacaoSaudePercentual || 17.2}%</strong>
            </div>
          </div>
        </div>

        {/* Parecer Principal */}
        <div className="mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 mb-3 border-b border-slate-300 pb-1 font-mono">
            Parecer Técnico & Diagnóstico Estratégico de Auditoria Contábil
          </h2>
          <div className="whitespace-pre-wrap font-sans text-xs text-slate-800 leading-relaxed space-y-2">
            {report || 'Nenhum parecer selecionado para impressão.'}
          </div>
        </div>

        {/* Assinaturas Oficiais */}
        <div className="mt-12 pt-6 border-t border-slate-400 grid grid-cols-2 gap-8 text-center font-mono text-[11px]">
          <div>
            <div className="border-t border-slate-800 mx-8 pt-1">
              <p className="font-bold text-slate-900">Gabinete do Prefeito Municipal</p>
              <p className="text-slate-600">{cidadeNome} / {ufNome}</p>
            </div>
          </div>
          <div>
            <div className="border-t border-slate-800 mx-8 pt-1">
              <p className="font-bold text-slate-900">Secretaria Municipal de Finanças</p>
              <p className="text-slate-600">Contabilidade & Auditoria Governamental</p>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-[9px] text-slate-400 font-mono">
          Autenticidade garantida pelo Sistema de Governança Fiscal (SGF) • Fonte Oficial: STN Siconfi / LRF (LC 101/2000)
        </div>
      </div>

      {/* Screen Interface (Hidden in Print) */}
      <div className="print:hidden space-y-6">
        {/* Header Hero Card */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 border border-slate-800 rounded-sm p-5 sm:p-6 text-white shadow-md">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 rounded-sm text-[10px] font-mono font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5 shadow-xs">
                  <Sparkles className="w-3.5 h-3.5 animate-pulse text-indigo-400" />
                  Inteligência Contábil & Auditoria Fiscal
                </span>
                <span className="px-2.5 py-1 rounded-sm text-[10px] font-mono font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                  <Building className="w-3 h-3" />
                  {cidadeNome}/{ufNome} • Exercício {ano}
                </span>
                <span className="px-2 py-0.5 rounded-sm text-[10px] font-mono text-slate-400 bg-slate-800 border border-slate-700">
                  IBGE: {codigoIbge}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold uppercase tracking-wider text-white font-mono flex items-center gap-2">
                Diagnóstico Estratégico para Tomada de Decisão
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed font-sans">
                Emissão instantânea de pareceres executivos e diagnósticos orçamentários para o <strong>Gabinete do Prefeito</strong> e o <strong>Secretário de Finanças</strong>, com cruzamento de dados do Siconfi (STN), limites da LRF (LC 101/2000) e alertas de risco fiscal.
              </p>
            </div>

            {/* Header Actions */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start lg:self-center">
              <button
                type="button"
                onClick={() => setShowHistoryModal(true)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-sm bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono font-bold text-xs uppercase tracking-wider border border-slate-700 transition cursor-pointer shadow-xs"
                title="Ver histórico de pareceres gerados"
              >
                <History className="w-4 h-4 text-purple-400" />
                <span>Histórico ({historico.length})</span>
              </button>

              <button
                type="button"
                onClick={() => handleRunDiagnosis()}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 rounded-sm bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-mono font-bold text-xs uppercase tracking-wider shadow-sm transition disabled:opacity-50 cursor-pointer"
              >
                <BrainCircuit className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>{loading ? 'Processando Auditoria...' : 'Gerar Parecer Completo'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tópicos de Foco da Gestão Municipal (Expandido & Filtrável) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-5 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-500" />
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white font-mono">
                  TÓPICOS DE FOCO DA GESTÃO MUNICIPAL (CLIQUE PARA ANALISAR)
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Selecione uma pauta estratégica prioritária ou pesquise temas de fiscalização contábil
              </p>
            </div>

            <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500 dark:text-slate-400">
              <span className="px-2 py-0.5 rounded-sm bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                {filteredTopics.length} de {FOCUS_TOPICS.length} tópicos
              </span>
            </div>
          </div>

          {/* Search and Category Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Category Pills */}
            <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {categories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider rounded-sm transition cursor-pointer shrink-0 ${
                    selectedCategory === cat
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Topic Search Input */}
            <div className="relative min-w-[240px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTopic}
                onChange={e => setSearchTopic(e.target.value)}
                placeholder="Filtrar tópicos por palavra..."
                className="w-full pl-8 pr-3 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
              {searchTopic && (
                <button
                  onClick={() => setSearchTopic('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Topics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {filteredTopics.map(t => {
              const isCritica = t.criticidade === 'CRÍTICA';
              const isAlta = t.criticidade === 'ALTA';
              const isSelected = activeTopic?.id === t.id;

              return (
                <div
                  key={t.id}
                  onClick={() => {
                    setQuestion(t.pergunta);
                    handleRunDiagnosis(t.pergunta, t);
                  }}
                  className={`text-left p-3.5 rounded-sm border transition flex flex-col justify-between group cursor-pointer shadow-2xs ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 ring-1 ring-indigo-500'
                      : 'border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider rounded-xs bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {t.tag}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider rounded-xs flex items-center gap-1 ${
                          isCritica
                            ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                            : isAlta
                            ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                            : 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800'
                        }`}
                      >
                        {isCritica && <Flame className="w-2.5 h-2.5 text-rose-500" />}
                        {t.criticidade}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition leading-snug">
                      {t.titulo}
                    </h4>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {t.descricaoBreve}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                    <span className="group-hover:underline">Analisar Indicador</span>
                    <Send className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Custom Question Input */}
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && question.trim()) {
                    handleRunDiagnosis();
                  }
                }}
                placeholder={`Digite uma pergunta fiscal específica para ${cidadeNome}/${ufNome}...`}
                className="w-full px-3 py-2.5 text-xs font-mono bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
              {question && (
                <button
                  type="button"
                  onClick={() => setQuestion('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => handleRunDiagnosis()}
              disabled={loading || !question.trim()}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-sm text-xs font-mono font-bold uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-sm cursor-pointer shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Consultar IA</span>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 rounded-sm p-4 text-rose-800 dark:text-rose-200 flex items-start gap-3 shadow-sm">
            <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <h4 className="font-bold font-mono uppercase tracking-wider text-rose-900 dark:text-rose-100">
                Falha ao Processar Diagnóstico
              </h4>
              <p className="font-sans text-rose-700 dark:text-rose-300">{error}</p>
              <button
                type="button"
                onClick={() => handleRunDiagnosis()}
                className="mt-2 px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold text-[11px] rounded-sm uppercase tracking-wider transition cursor-pointer"
              >
                Tentar Novamente
              </button>
            </div>
          </div>
        )}

        {/* Report Output Box */}
        {(report || loading) && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-indigo-500" />
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm uppercase tracking-wider font-mono">
                    Parecer Técnico & Recomendações de Gestão Fiscal
                  </h3>
                  {activeTopic && (
                    <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-bold block">
                      Tópico: {activeTopic.titulo} ({activeTopic.tag})
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons: Provider Badge, Copy, Print/PDF */}
              <div className="flex flex-wrap items-center gap-2">
                {provider && (
                  <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-sm uppercase flex items-center gap-1.5 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    {provider}
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleCopyReport}
                  className="flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-sm bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition border border-slate-200 dark:border-slate-700 cursor-pointer"
                  title="Copiar parecer na área de transferência"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copiado!' : 'Copiar'}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintPDF}
                  className="flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-sm bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition border border-indigo-200 dark:border-indigo-800 cursor-pointer shadow-2xs"
                  title="Imprimir ou Salvar Parecer em PDF"
                >
                  <Printer className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Imprimir PDF</span>
                </button>
              </div>
            </div>

            {loading ? (
              <div className="py-16 flex flex-col items-center justify-center space-y-3 text-slate-400 font-mono text-center">
                <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Consolidando matrizes contábeis e gerando parecer executivo...
                  </p>
                  <p className="text-[11px] text-slate-400">
                    O Gemini IA está correlacionando a RCL, despesa com pessoal e metas da LRF para {cidadeNome}/{ufNome}.
                  </p>
                </div>
              </div>
            ) : (
              <div className="prose dark:prose-invert max-w-none text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed space-y-3 whitespace-pre-wrap font-sans bg-slate-50/50 dark:bg-slate-800/30 p-4 sm:p-5 rounded-sm border border-slate-100 dark:border-slate-800">
                {report}
              </div>
            )}
          </div>
        )}
      </div>

      {/* History Modal / Drawer */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 lg:p-6 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm w-full max-w-4xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden font-sans">
            {/* Modal Header */}
            <div className="bg-slate-900 border-b border-slate-800 px-5 py-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-sm bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold uppercase tracking-wider font-mono text-white">
                    Histórico de Pareceres e Auditorias Arquivadas
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {cidadeNome}/{ufNome} • {historico.length} parecer(es) arquivado(s)
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {historico.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearHistory}
                    className="flex items-center gap-1 text-[11px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-sm bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 transition border border-rose-500/40 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Limpar Tudo</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowHistoryModal(false)}
                  className="p-1.5 rounded-sm text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                  aria-label="Fechar janela"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Search within History */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                  placeholder="Pesquisar pareceres por tópico, texto ou provedor..."
                  className="w-full pl-9 pr-3 py-2 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Modal Body - History List */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
              {filteredHistory.length === 0 ? (
                <div className="py-16 text-center text-slate-400 font-mono space-y-2">
                  <History className="w-8 h-8 mx-auto opacity-40" />
                  <p className="text-xs">Nenhum parecer arquivado encontrado no histórico.</p>
                  <p className="text-[11px] text-slate-500">
                    Gere uma nova análise para salvar pareceres automaticamente nesta lista.
                  </p>
                </div>
              ) : (
                filteredHistory.map(item => {
                  const dateStr = new Date(item.timestamp).toLocaleString('pt-BR');
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleLoadHistoryItem(item)}
                      className="p-4 rounded-sm border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 bg-white dark:bg-slate-900/80 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 transition cursor-pointer space-y-2 group shadow-2xs"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 text-[9px] font-mono font-bold uppercase rounded-xs bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                            {item.categoria}
                          </span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                            {item.titulo}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                          <Clock className="w-3 h-3" />
                          <span>{dateStr}</span>
                          <button
                            type="button"
                            onClick={e => handleDeleteHistoryItem(item.id, e)}
                            className="p-1 text-slate-400 hover:text-rose-500 rounded transition ml-1"
                            title="Excluir este parecer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed font-sans">
                        {item.analise.replace(/[#*`]/g, '').slice(0, 240)}...
                      </p>

                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1">
                        <span>Fonte: {item.provedor} • Exercício {item.ano}</span>
                        <span className="text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1 group-hover:translate-x-1 transition">
                          Visualizar Parecer <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 px-5 py-3 flex items-center justify-between text-xs font-mono text-slate-500 shrink-0">
              <span>{historico.length} diagnóstico(s) salvo(s) localmente</span>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold rounded-sm uppercase tracking-wider text-xs transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
