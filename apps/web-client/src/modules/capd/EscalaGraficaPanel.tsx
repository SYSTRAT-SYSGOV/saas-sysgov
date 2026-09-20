import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  StatCard,
} from '@sysgov/ui';
import {
  PageHeader,
  EmptyState,
  StatusChip,
  ScreenState,
} from '@/components/ui';
import {
  BarChart2,
  Plus,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RotateCw,
  Sliders,
  Sparkles,
  Trash2,
  Edit2,
  Scale,
  ShieldAlert,
  Check,
  Layers,
  Info,
  ArrowRight,
  Copy,
  Table as TableIcon,
  LayoutGrid,
} from 'lucide-react';
import { SysgovApi } from '@sysgov/sdk';
import type { ApiModeloFormulario, ApiEscalaGrafica, ApiEscalaNivel } from '@sysgov/sdk';

const api = new SysgovApi();

type EscalaNivel = ApiEscalaNivel;
type EscalaGrafica = ApiEscalaGrafica;

// ── Presets Canônicos Chiavenato (RF-03, Art. 24 Lei 1.704/2006) ─────────────

const PRESET_5_GRAUS: EscalaNivel[] = [
  {
    grau: 1,
    rotulo: 'Insuficiente',
    valor_min: 0,
    valor_max: 39.99,
    descricao_comportamental:
      'Desempenho muito abaixo do padrão mínimo aceitável; recorrentes falhas de execução e desatenção contínua às atribuições.',
  },
  {
    grau: 2,
    rotulo: 'Regular',
    valor_min: 40,
    valor_max: 59.99,
    descricao_comportamental:
      'Desempenho abaixo do desejado; atende parcialmente às entregas, demandando constante supervisão corretiva da chefia.',
  },
  {
    grau: 3,
    rotulo: 'Bom',
    valor_min: 60,
    valor_max: 74.99,
    descricao_comportamental:
      'Desempenho dentro do padrão satisfatório esperado; cumpre as atribuições ordinárias com regularidade e confiabilidade.',
  },
  {
    grau: 4,
    rotulo: 'Muito Bom',
    valor_min: 75,
    valor_max: 89.99,
    descricao_comportamental:
      'Desempenho acima da média; demonstra proatividade, zelo técnico, assiduidade e colaboração consistente na unidade.',
  },
  {
    grau: 5,
    rotulo: 'Excelente',
    valor_min: 90,
    valor_max: 100,
    descricao_comportamental:
      'Desempenho excepcional de referência institucional; supera metas, apresenta inovações e elevado comprometimento com o interesse público.',
  },
];

const PRESET_4_GRAUS: EscalaNivel[] = [
  {
    grau: 1,
    rotulo: 'Insuficiente',
    valor_min: 0,
    valor_max: 49.99,
    descricao_comportamental:
      'Desempenho que não cumpre as exigências fundamentais do cargo; necessita de intervenção e capacitação funcional.',
  },
  {
    grau: 2,
    rotulo: 'Regular',
    valor_min: 50,
    valor_max: 69.99,
    descricao_comportamental:
      'Desempenho mínimo aceitável; cumpre rotinas com necessidade periódica de orientação técnica.',
  },
  {
    grau: 3,
    rotulo: 'Bom',
    valor_min: 70,
    valor_max: 84.99,
    descricao_comportamental:
      'Desempenho eficiente que atende aos critérios quantitativos e qualitativos pactuados no ciclo.',
  },
  {
    grau: 4,
    rotulo: 'Excelente',
    valor_min: 85,
    valor_max: 100,
    descricao_comportamental:
      'Desempenho superior de elevado valor agregado para a administração pública municipal.',
  },
];

const PRESET_3_GRAUS: EscalaNivel[] = [
  {
    grau: 1,
    rotulo: 'Insuficiente',
    valor_min: 0,
    valor_max: 49.99,
    descricao_comportamental:
      'Desempenho insuficiente perante os padrões requeridos pelo estágio probatório.',
  },
  {
    grau: 2,
    rotulo: 'Regular / Bom',
    valor_min: 50,
    valor_max: 79.99,
    descricao_comportamental:
      'Desempenho satisfatório alinhado às rotinas de trabalho regulares da pasta.',
  },
  {
    grau: 3,
    rotulo: 'Excelente',
    valor_min: 80,
    valor_max: 100,
    descricao_comportamental:
      'Desempenho com padrão de excelência contínuo e destacada proatividade técnica.',
  },
];

// Estilo cromático semântico para cada nível de grau (Metodologia Chiavenato)
const getGrauVisualConfig = (grau: number, totalNiveis: number = 5) => {
  // Para 5 níveis (canônico)
  if (totalNiveis === 5) {
    switch (grau) {
      case 1:
        return {
          bg: 'bg-rose-500/15',
          border: 'border-rose-500/40',
          text: 'text-rose-700 dark:text-rose-400',
          badgeBg: 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/30',
          barColor: 'bg-rose-500',
          isExtremo: true,
        };
      case 2:
        return {
          bg: 'bg-amber-500/15',
          border: 'border-amber-500/40',
          text: 'text-amber-700 dark:text-amber-400',
          badgeBg: 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30',
          barColor: 'bg-amber-500',
          isExtremo: true,
        };
      case 3:
        return {
          bg: 'bg-blue-500/15',
          border: 'border-blue-500/40',
          text: 'text-blue-700 dark:text-blue-400',
          badgeBg: 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30',
          barColor: 'bg-blue-500',
          isExtremo: false,
        };
      case 4:
        return {
          bg: 'bg-teal-500/15',
          border: 'border-teal-500/40',
          text: 'text-teal-700 dark:text-teal-400',
          badgeBg: 'bg-teal-500/20 text-teal-700 dark:text-teal-300 border-teal-500/30',
          barColor: 'bg-teal-500',
          isExtremo: false,
        };
      case 5:
      default:
        return {
          bg: 'bg-emerald-500/15',
          border: 'border-emerald-500/40',
          text: 'text-emerald-700 dark:text-emerald-400',
          badgeBg: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
          barColor: 'bg-emerald-500',
          isExtremo: true,
        };
    }
  }

  // Para 3 ou 4 níveis
  if (grau === 1) {
    return {
      bg: 'bg-rose-500/15',
      border: 'border-rose-500/40',
      text: 'text-rose-700 dark:text-rose-400',
      badgeBg: 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/30',
      barColor: 'bg-rose-500',
      isExtremo: true,
    };
  }
  if (grau === totalNiveis) {
    return {
      bg: 'bg-emerald-500/15',
      border: 'border-emerald-500/40',
      text: 'text-emerald-700 dark:text-emerald-400',
      badgeBg: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
      barColor: 'bg-emerald-500',
      isExtremo: true,
    };
  }
  return {
    bg: 'bg-blue-500/15',
    border: 'border-blue-500/40',
    text: 'text-blue-700 dark:text-blue-400',
    badgeBg: 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30',
    barColor: 'bg-blue-500',
    isExtremo: false,
  };
};

interface Props {
  modeloId?: number;
}

export const EscalaGraficaPanel: React.FC<Props> = ({ modeloId: propModeloId }) => {
  const [modelos, setModelos] = useState<ApiModeloFormulario[]>([]);
  const [selectedModeloId, setSelectedModeloId] = useState<number | null>(propModeloId ?? null);
  const [escalas, setEscalas] = useState<EscalaGrafica[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingModelos, setLoadingModelos] = useState(false);
  const [expandida, setExpandida] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  // Modo de visualização da Régua Contínua: Gráfico vs Tabela
  const [modoVisao, setModoVisao] = useState<'regua' | 'tabela'>('regua');
  const [copiadoAta, setCopiadoAta] = useState(false);

  // Modal de Criação / Edição
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEscalaId, setEditingEscalaId] = useState<number | null>(null);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [niveis, setNiveis] = useState<EscalaNivel[]>(PRESET_5_GRAUS);
  const [saving, setSaving] = useState(false);

  // Modal de Exclusão Segura
  const [modalExcluirOpen, setModalExcluirOpen] = useState(false);
  const [escalaParaExcluir, setEscalaParaExcluir] = useState<EscalaGrafica | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  // Ativação em andamento
  const [ativandoId, setAtivandoId] = useState<number | null>(null);

  // Simulador Interativo
  const [simuladorPontos, setSimuladorPontos] = useState<number>(75);

  // 1. Carrega a lista de modelos de formulário do tenant
  const carregarModelos = useCallback(async () => {
    setLoadingModelos(true);
    try {
      const data = await api.capd.listModelosFormulario();
      setModelos(data);
      if (data.length > 0) {
        if (propModeloId && data.some((m) => m.id === propModeloId)) {
          setSelectedModeloId(propModeloId);
        } else if (!selectedModeloId || !data.some((m) => m.id === selectedModeloId)) {
          const prioritario = data.find((m) => m.ativo) ?? data[0];
          setSelectedModeloId(prioritario.id);
        }
      }
    } catch (e) {
      console.error('Erro ao carregar modelos de formulário:', e);
    } finally {
      setLoadingModelos(false);
    }
  }, [propModeloId, selectedModeloId]);

  useEffect(() => {
    carregarModelos();
  }, [carregarModelos]);

  // 2. Carrega as escalas gráficas do modelo selecionado
  const carregarEscalas = useCallback(async (id: number) => {
    setLoading(true);
    setErro(null);
    try {
      const list = await api.capd.listEscalasGraficas(id);
      setEscalas(list);
      if (list.length > 0) {
        const ativa = list.find((e) => e.ativa) ?? list[0];
        setExpandida(ativa.id);
      } else {
        setExpandida(null);
      }
    } catch {
      setErro('Não foi possível carregar as escalas gráficas para este modelo.');
      setEscalas([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedModeloId) {
      carregarEscalas(selectedModeloId);
    }
  }, [selectedModeloId, carregarEscalas]);

  // Escala ativa vigente
  const escalaAtiva = useMemo(() => {
    return escalas.find((e) => e.ativa) ?? null;
  }, [escalas]);

  // Escala em foco (para régua e simulação: usa a expandida ou a ativa)
  const escalaEmFoco = useMemo(() => {
    if (expandida) {
      const exp = escalas.find((e) => e.id === expandida);
      if (exp) return exp;
    }
    return escalaAtiva ?? escalas[0] ?? null;
  }, [expandida, escalaAtiva, escalas]);

  // Validação matemática de integridade das faixas
  const validarContinuidadedaEscala = (listaNiveis: EscalaNivel[]): string | null => {
    if (listaNiveis.length < 3 || listaNiveis.length > 5) {
      return 'A escala gráfica deve conter entre 3 e 5 graus de desempenho (Chiavenato).';
    }

    const ordenados = [...listaNiveis].sort((a, b) => a.grau - b.grau);

    if (ordenados[0].valor_min !== 0) {
      return 'O Grau 1 deve obrigatoriamente iniciar em 0.0 pontos.';
    }

    const ultimo = ordenados[ordenados.length - 1];
    if (ultimo.valor_max !== 100) {
      return `O último grau (G${ultimo.grau}) deve obrigatoriamente encerrar em 100.0 pontos.`;
    }

    for (let i = 0; i < ordenados.length - 1; i++) {
      const atual = ordenados[i];
      const proximo = ordenados[i + 1];

      if (atual.valor_min >= atual.valor_max) {
        return `No Grau ${atual.grau}, o valor mínimo (${atual.valor_min}) deve ser menor que o máximo (${atual.valor_max}).`;
      }

      // Validação de contiguidade: tolerância mínima para centésimos (ex: 39.99 e 40 ou 40 e 40)
      const diferenca = proximo.valor_min - atual.valor_max;
      if (diferenca < 0) {
        return `Sobreposição detectada: Grau ${atual.grau} vai até ${atual.valor_max}, mas Grau ${proximo.grau} inicia em ${proximo.valor_min}.`;
      }
      if (diferenca > 1.01) {
        return `Lacuna detectada entre Grau ${atual.grau} (${atual.valor_max}) e Grau ${proximo.grau} (${proximo.valor_min}). A régua deve ser contínua.`;
      }
    }

    return null;
  };

  // Cálculo de enquadramento no Simulador
  const enquadramentoSimulador = useMemo(() => {
    if (!escalaEmFoco || !escalaEmFoco.niveis || escalaEmFoco.niveis.length === 0) {
      return null;
    }

    const pts = Number(simuladorPontos);
    const nivelEncontrado =
      escalaEmFoco.niveis.find((n) => pts >= n.valor_min && pts <= n.valor_max) ??
      (pts < escalaEmFoco.niveis[0].valor_min
        ? escalaEmFoco.niveis[0]
        : escalaEmFoco.niveis[escalaEmFoco.niveis.length - 1]);

    const notaFinalConvertida = ((pts / 100) * 10).toFixed(2);
    const visual = getGrauVisualConfig(nivelEncontrado.grau, escalaEmFoco.qtd_niveis);

    // Trava antileniência canônica: Graus 1, 2 ou 5 exigem CIT registrado
    const acionaTrava = nivelEncontrado.grau === 1 || nivelEncontrado.grau === 2 || nivelEncontrado.grau === 5;

    return {
      nivel: nivelEncontrado,
      notaFinal: notaFinalConvertida,
      visual,
      acionaTrava,
    };
  }, [escalaEmFoco, simuladorPontos]);

  // Abertura do Modal de Criação
  const abrirModalNovo = () => {
    setEditingEscalaId(null);
    setNome('Escala Padrão Chiavenato (5 Graus)');
    setDescricao('Régua contínua de 0 a 100 pontos para avaliação do estágio probatório (RF-03).');
    setNiveis(PRESET_5_GRAUS);
    setErro(null);
    setModalOpen(true);
  };

  // Abertura do Modal de Edição
  const abrirModalEditar = (escala: EscalaGrafica) => {
    setEditingEscalaId(escala.id);
    setNome(escala.nome);
    setDescricao(escala.descricao ?? '');
    setNiveis(
      escala.niveis.map((n) => ({
        grau: n.grau,
        rotulo: n.rotulo,
        valor_min: Number(n.valor_min),
        valor_max: Number(n.valor_max),
        descricao_comportamental: n.descricao_comportamental ?? '',
      }))
    );
    setErro(null);
    setModalOpen(true);
  };

  // Aplicar Presets no Formulário
  const aplicarPreset = (presetNiveis: EscalaNivel[], presetNome: string) => {
    setNiveis(presetNiveis);
    if (!editingEscalaId) {
      setNome(presetNome);
    }
  };

  // Adicionar Nível (até 5)
  const adicionarNivel = () => {
    if (niveis.length >= 5) return;
    const novoGrau = niveis.length + 1;
    const ultimo = niveis[niveis.length - 1];
    const minNovo = ultimo ? ultimo.valor_max : 0;
    setNiveis([
      ...niveis,
      {
        grau: novoGrau,
        rotulo: `Grau ${novoGrau}`,
        valor_min: minNovo,
        valor_max: 100,
        descricao_comportamental: '',
      },
    ]);
  };

  // Remover Nível (mínimo 3)
  const removerNivel = () => {
    if (niveis.length <= 3) return;
    const novaLista = niveis.slice(0, -1);
    novaLista[novaLista.length - 1].valor_max = 100;
    setNiveis(novaLista);
  };

  const atualizarNivel = (idx: number, campo: keyof EscalaNivel, valor: string | number) => {
    setNiveis((prev) => prev.map((n, i) => (i === idx ? { ...n, [campo]: valor } : n)));
  };

  // Salvar (Criação ou Edição)
  const salvar = async () => {
    if (!selectedModeloId) {
      setErro('Selecione um modelo de formulário válido.');
      return;
    }
    if (!nome.trim()) {
      setErro('Informe o nome identificador da escala.');
      return;
    }

    const erroValidacao = validarContinuidadedaEscala(niveis);
    if (erroValidacao) {
      setErro(erroValidacao);
      return;
    }

    setSaving(true);
    setErro(null);
    try {
      const payload = {
        nome: nome.trim(),
        descricao: descricao.trim() || undefined,
        niveis: niveis.map((n) => ({
          ...n,
          valor_min: Number(n.valor_min),
          valor_max: Number(n.valor_max),
        })),
      };

      if (editingEscalaId) {
        await api.capd.updateEscalaGrafica(selectedModeloId, editingEscalaId, payload);
        setSucesso('Escala gráfica atualizada com sucesso!');
      } else {
        await api.capd.createEscalaGrafica(selectedModeloId, payload);
        setSucesso('Nova escala gráfica cadastrada e ativada com sucesso!');
      }

      setModalOpen(false);
      carregarEscalas(selectedModeloId);
    } catch (e: any) {
      setErro(e?.response?.data?.message ?? 'Erro ao salvar escala gráfica.');
    } finally {
      setSaving(false);
    }
  };

  // Ativar Escala
  const ativarEscala = async (escala: EscalaGrafica) => {
    if (!selectedModeloId || escala.ativa) return;
    setAtivandoId(escala.id);
    setErro(null);
    try {
      await api.capd.updateEscalaGrafica(selectedModeloId, escala.id, { ativa: true });
      setSucesso(`Escala "${escala.nome}" ativada como a vigente do modelo!`);
      carregarEscalas(selectedModeloId);
    } catch (e: any) {
      setErro(e?.response?.data?.message ?? 'Não foi possível ativar esta escala.');
    } finally {
      setAtivandoId(null);
    }
  };

  // Confirmar e Executar Exclusão Segura
  const abrirConfirmacaoExclusao = (escala: EscalaGrafica) => {
    setEscalaParaExcluir(escala);
    setModalExcluirOpen(true);
  };

  const executarExclusao = async () => {
    if (!selectedModeloId || !escalaParaExcluir) return;
    setExcluindo(true);
    setErro(null);
    try {
      await api.capd.deleteEscalaGrafica(selectedModeloId, escalaParaExcluir.id);
      setSucesso(`Escala "${escalaParaExcluir.nome}" excluída com sucesso!`);
      setModalExcluirOpen(false);
      setEscalaParaExcluir(null);
      carregarEscalas(selectedModeloId);
    } catch (e: any) {
      setErro(e?.response?.data?.message ?? 'Erro ao excluir escala gráfica.');
    } finally {
      setExcluindo(false);
    }
  };

  // Copiar resumo formatado para ata da CAD
  const copiarResumoParaAta = () => {
    if (!escalaEmFoco) return;
    const modeloNome = modelos.find((m) => m.id === selectedModeloId)?.nome ?? 'Quadro Geral';
    const textoAta = `ESCALA GRÁFICA DE AVALIAÇÃO DE DESEMPENHO (CHIAVENATO) — ${escalaEmFoco.nome.toUpperCase()}
Modelo Regulamentar: ${modeloNome}
Amplitudes e Graus de Desempenho Funcional (Lei nº 1.704/2006, Art. 24):
${escalaEmFoco.niveis
  .map(
    (n) =>
      `• Grau ${n.grau} (${n.rotulo}): ${n.valor_min} a ${n.valor_max} pontos (Nota Escalar: ${((n.grau - 1) * 2.5).toFixed(1)}/10.0)${
        [1, 2, 5].includes(n.grau)
          ? ' [TRAVA ANTILENIÊNCIA ATIVA: Exige CIT prévio no Diário de Bordo]'
          : ' [Grau Intermediário Regular]'
      }\n  Descrição: ${n.descricao_comportamental || 'Sem descrição'}`
  )
  .join('\n')}
Cobertura: 0.00 a 100.00 pontos contínuos. Cadastrado para fins de fé pública e registro em ata deliberativa da CAD.`;

    navigator.clipboard.writeText(textoAta);
    setCopiadoAta(true);
    setTimeout(() => setCopiadoAta(false), 3000);
  };

  const modeloSelecionado = modelos.find((m) => m.id === selectedModeloId);

  // Status de Cobertura da escala ativa
  const coberturaAtiva = useMemo(() => {
    if (!escalaEmFoco || !escalaEmFoco.niveis) return { valida: false, label: 'Sem escala' };
    const err = validarContinuidadedaEscala(escalaEmFoco.niveis);
    return {
      valida: err === null,
      label: err === null ? 'Régua 100% Contínua (0-100 pts)' : 'Inconsistência de Cobertura',
    };
  }, [escalaEmFoco]);

  return (
    <div className="space-y-6">
      {/* ── HEADER PRINCIPAL DA ABA ────────────────────────────────────── */}
      <PageHeader
        icon={<Scale className="h-6 w-6 text-primary" />}
        title="Escalas Gráficas de Avaliação (Chiavenato)"
        subtitle="Parametrização dinâmica das réguas de 0 a 100 pontos, graus de desempenho (3 a 5 níveis) e regras de Trava Antileniência (RF-03)"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {modelos.length > 0 && (
              <div className="w-80">
                <Select
                  value={selectedModeloId ? String(selectedModeloId) : ''}
                  onChange={(val) => setSelectedModeloId(Number(val))}
                  options={modelos.map((m) => ({
                    value: String(m.id),
                    label: `${m.nome} (${m.codigo})`,
                  }))}
                  placeholder="Selecione o Modelo de Formulário..."
                  disabled={loadingModelos}
                />
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => selectedModeloId && carregarEscalas(selectedModeloId)}
              disabled={loading || !selectedModeloId}
              title="Recarregar"
            >
              <RotateCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={abrirModalNovo}
              disabled={!selectedModeloId || loading}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Nova Escala Gráfica
            </Button>
          </div>
        }
      />

      {/* ── NOTIFICAÇÕES & FEEDBACK ───────────────────────────────────── */}
      {erro && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{erro}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setErro(null)} className="h-6 px-2 text-xs">
            Dispensar
          </Button>
        </div>
      )}
      {sucesso && (
        <div className="rounded-lg border border-status-success-border bg-status-success-bg px-4 py-3 text-sm text-status-success flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{sucesso}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setSucesso(null)} className="h-6 px-2 text-xs">
            Dispensar
          </Button>
        </div>
      )}

      {loading ? (
        <ScreenState type="loading" title="Carregando Escalas Gráficas..." />
      ) : escalas.length === 0 ? (
        <Card className="gap-0 py-0">
          <EmptyState
            icon={<BarChart2 className="h-10 w-10 text-muted-foreground" />}
            title="Nenhuma escala cadastrada para este formulário"
            description={`O modelo "${modeloSelecionado?.nome ?? ''}" ainda não possui uma régua de escala gráfica configurada. Crie a primeira escala utilizando os presets canônicos de Chiavenato.`}
            actionLabel="Criar Escala para este Modelo"
            onAction={abrirModalNovo}
          />
        </Card>
      ) : (
        <>
          {/* ── 1. STATCARDS EXCLUSIVOS DE KPIS DESTA ABA ──────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Escala Vigente (Ativa)"
              value={escalaAtiva ? escalaAtiva.nome : 'Nenhuma'}
              caption={
                escalaAtiva ? (
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" /> ID #{escalaAtiva.id} • Padrão do Formulário
                  </span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400">Requer ativação de escala</span>
                )
              }
              accentClassName="border-l-emerald-500"
              valueClassName="text-lg truncate font-semibold"
            />
            <StatCard
              label="Total de Escalas"
              value={escalas.length}
              caption={`${escalas.filter((e) => e.ativa).length} ativa • ${escalas.filter((e) => !e.ativa).length} histórica(s)`}
              accentClassName="border-l-primary"
            />
            <StatCard
              label="Amplitude de Graus"
              value={escalaEmFoco ? `${escalaEmFoco.qtd_niveis} Níveis` : '—'}
              caption="Metodologia Chiavenato (Graus 1 a 5)"
              accentClassName="border-l-indigo-500"
            />
            <StatCard
              label="Cobertura da Régua"
              value="0.0 a 100.0 pts"
              caption={
                coberturaAtiva.valida ? (
                  <span className="text-emerald-600 dark:text-emerald-400">Régua 100% Contínua</span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400">{coberturaAtiva.label}</span>
                )
              }
              accentClassName={coberturaAtiva.valida ? 'border-l-cyan-500' : 'border-l-amber-500'}
            />
          </div>

          {/* ── 2. RÉGUA GRÁFICA CONTÍNUA (DESIGN REFINADO & NÃO SOBREPOSTO) ── */}
          {escalaEmFoco && (
            <Card className="p-5 space-y-5 shadow-sm border-border">
              {/* Cabeçalho da Régua com ações */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                      Régua Contínua de Desempenho — {escalaEmFoco.nome}
                      {escalaEmFoco.ativa && (
                        <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px]">
                          Vigente
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground mt-0.5">
                      Graduação cromática e faixas de corte conforme diretrizes do SAPDS (Chiavenato, graus 1 a 5)
                    </CardDescription>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Alternância de Modo de Visão */}
                  <div className="inline-flex rounded-lg border border-border p-0.5 bg-muted/30">
                    <Button
                      variant={modoVisao === 'regua' ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={() => setModoVisao('regua')}
                      className="h-7 px-2.5 text-xs"
                    >
                      <LayoutGrid className="h-3.5 w-3.5 mr-1" />
                      Régua Visual
                    </Button>
                    <Button
                      variant={modoVisao === 'tabela' ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={() => setModoVisao('tabela')}
                      className="h-7 px-2.5 text-xs"
                    >
                      <TableIcon className="h-3.5 w-3.5 mr-1" />
                      Tabela
                    </Button>
                  </div>

                  {/* Copiar para Ata da CAD */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copiarResumoParaAta}
                    className="h-8 text-xs font-medium"
                    title="Copiar texto formal da régua para colar na ata de deliberação da CAD"
                  >
                    {copiadoAta ? (
                      <>
                        <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                        Copiar p/ Ata
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {modoVisao === 'regua' ? (
                <div className="space-y-6">
                  {/* Trilha da Régua com Marcador Dinâmico */}
                  <div className="space-y-2 pt-2">
                    {/* Marcador flutuante sincronizado com o Simulador */}
                    <div className="relative h-7 w-full select-none">
                      <div
                        className="absolute -translate-x-1/2 flex flex-col items-center transition-all duration-150 z-20 pointer-events-none"
                        style={{
                          left: `${Math.max(2.5, Math.min(97.5, simuladorPontos))}%`,
                        }}
                      >
                        <span className="px-2.5 py-0.5 rounded-full bg-foreground text-background text-[11px] font-mono font-bold shadow-md flex items-center gap-1.5 whitespace-nowrap border border-border">
                          <span>{simuladorPontos.toFixed(1)} pts</span>
                          <span className="opacity-75 text-[10px]">
                            • G{enquadramentoSimulador?.nivel.grau}
                          </span>
                        </span>
                        <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] border-t-foreground" />
                      </div>
                    </div>

                    {/* Trilha Gráfica Limpa (sem colisão de textos internos) */}
                    <div className="w-full h-8 rounded-xl overflow-hidden flex border border-border/80 shadow-xs bg-muted/30 p-1 gap-1 relative">
                      {escalaEmFoco.niveis.map((nivel) => {
                        const larguraPct = Math.max(6, nivel.valor_max - nivel.valor_min);
                        const visual = getGrauVisualConfig(nivel.grau, escalaEmFoco.qtd_niveis);
                        const isAtivo = enquadramentoSimulador?.nivel.grau === nivel.grau;

                        return (
                          <div
                            key={nivel.grau}
                            style={{ width: `${larguraPct}%` }}
                            className={`h-full transition-all duration-200 flex items-center justify-center relative cursor-pointer select-none rounded-lg ${visual.bg} ${visual.border} border ${
                              isAtivo
                                ? 'ring-2 ring-primary ring-offset-1 z-10 brightness-105 shadow-sm'
                                : 'hover:brightness-95'
                            }`}
                            onClick={() =>
                              setSimuladorPontos((nivel.valor_min + nivel.valor_max) / 2)
                            }
                            title={`G${nivel.grau}: ${nivel.rotulo} (${nivel.valor_min} a ${nivel.valor_max} pts)\nClique para simular`}
                          >
                            <span className={`text-xs font-mono font-bold ${visual.text} tracking-wider`}>
                              G{nivel.grau}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Régua Numérica: Marcas de Corte Perfeitamente Alinhadas */}
                    <div className="relative w-full h-5 text-[11px] font-mono tabular-nums text-muted-foreground select-none">
                      <span className="absolute left-0 text-left font-semibold">0.00 pts</span>
                      {escalaEmFoco.niveis.slice(0, -1).map((n) => {
                        const posPct = n.valor_max;
                        return (
                          <span
                            key={n.grau}
                            className="absolute -translate-x-1/2 flex flex-col items-center"
                            style={{ left: `${posPct}%` }}
                          >
                            <span className="h-1.5 w-0.5 bg-border -mt-1 mb-0.5" />
                            <span className="font-semibold">{n.valor_max}</span>
                          </span>
                        );
                      })}
                      <span className="absolute right-0 text-right font-semibold">100.00 pts</span>
                    </div>
                  </div>

                  {/* Grade de Cartões de Níveis Estruturados (Layout Equalizado e Altamente Legível) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
                    {escalaEmFoco.niveis.map((n) => {
                      const visual = getGrauVisualConfig(n.grau, escalaEmFoco.qtd_niveis);
                      const isSimulado = enquadramentoSimulador?.nivel.grau === n.grau;
                      const notaEscalar = ((n.grau - 1) * 2.5).toFixed(1);

                      return (
                        <div
                          key={n.grau}
                          onClick={() => setSimuladorPontos((n.valor_min + n.valor_max) / 2)}
                          className={`p-3.5 rounded-xl border flex flex-col justify-between gap-2.5 transition-all duration-200 cursor-pointer ${
                            isSimulado
                              ? 'border-primary ring-2 ring-primary/40 bg-primary/5 shadow-sm -translate-y-0.5'
                              : 'border-border/80 bg-card hover:border-primary/50 hover:bg-muted/10'
                          }`}
                        >
                          {/* Topo do Card: Badge de Grau + Trava CIT */}
                          <div className="flex items-center justify-between">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-md font-mono font-bold text-xs ${visual.badgeBg}`}
                            >
                              Grau {n.grau}
                            </span>
                            {visual.isExtremo ? (
                              <Badge
                                variant="outline"
                                className="text-[10px] text-amber-600 border-amber-500/30 bg-amber-500/10 font-medium flex items-center gap-1"
                              >
                                <ShieldAlert className="h-3 w-3" />
                                Exige CIT
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-[10px] text-emerald-600 border-emerald-500/30 bg-emerald-500/10 font-medium flex items-center gap-1"
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                Dispensada
                              </Badge>
                            )}
                          </div>

                          {/* Rótulo e Pontuação */}
                          <div className="space-y-1">
                            <div className="font-bold text-sm text-foreground truncate">
                              {n.rotulo}
                            </div>
                            <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                              <span className="font-semibold text-foreground bg-muted/60 px-2 py-0.5 rounded border border-border/60">
                                {n.valor_min} – {n.valor_max} pts
                              </span>
                              <span className="text-muted-foreground text-[11px]">
                                Nf: {notaEscalar}
                              </span>
                            </div>
                          </div>

                          {/* Descrição Comportamental */}
                          <div className="text-[11px] text-muted-foreground leading-relaxed min-h-[48px] line-clamp-3 bg-muted/20 p-2 rounded-lg border border-border/40">
                            {n.descricao_comportamental || 'Sem descrição comportamental cadastrada.'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Visão Tabela Regimental */
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/10">
                      <TableHead className="w-16 text-xs text-center font-bold">Grau</TableHead>
                      <TableHead className="w-44 text-xs font-bold">Rótulo Conceitual</TableHead>
                      <TableHead className="w-40 text-xs font-bold">Faixa de Pontuação</TableHead>
                      <TableHead className="w-32 text-xs font-bold">Nota Escalar (Nf)</TableHead>
                      <TableHead className="text-xs font-bold">Descrição Comportamental do Grau</TableHead>
                      <TableHead className="w-32 text-xs text-center font-bold">Trava CIT</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {escalaEmFoco.niveis.map((nivel) => {
                      const visual = getGrauVisualConfig(nivel.grau, escalaEmFoco.qtd_niveis);
                      const notaConvertida = ((nivel.grau - 1) * 2.5).toFixed(1);
                      return (
                        <TableRow key={nivel.grau} className="hover:bg-muted/15">
                          <TableCell className="font-mono text-xs font-bold text-center">
                            <span
                              className={`inline-flex h-6 w-6 items-center justify-center rounded-full font-bold text-xs ${visual.badgeBg}`}
                            >
                              G{nivel.grau}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm font-semibold text-foreground">
                            {nivel.rotulo}
                          </TableCell>
                          <TableCell className="font-mono text-xs tabular-nums text-foreground font-semibold">
                            <span className="px-2.5 py-1 rounded bg-muted/60 border border-border/80">
                              {nivel.valor_min} – {nivel.valor_max} pts
                            </span>
                          </TableCell>
                          <TableCell className="font-mono text-xs tabular-nums font-bold text-foreground">
                            {notaConvertida} / 10.0
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground leading-relaxed">
                            {nivel.descricao_comportamental || '—'}
                          </TableCell>
                          <TableCell className="text-center">
                            {visual.isExtremo ? (
                              <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/30 bg-amber-500/10">
                                Exige CIT
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground font-mono">Dispensada</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </Card>
          )}

          {/* ── 3. SIMULADOR INTERATIVO DE ENQUADRAMENTO COM TRAVA CIT ────────── */}
          {escalaEmFoco && enquadramentoSimulador && (
            <Card className="p-5 border-border shadow-sm space-y-5 bg-gradient-to-br from-card to-muted/20">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                    <Sliders className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                      Simulador Interativo de Enquadramento & Trava Antileniência
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground mt-0.5">
                      Arraste a pontuação de 0 a 100 pontos para testar a conversão escalar e verificar a incidência da trava do Art. 24 da Lei nº 1.704/2006
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="font-mono text-xs text-indigo-600 dark:text-indigo-400 border-indigo-500/30">
                  Fórmula Canônica: Nf = (grau - 1) × 2,5
                </Badge>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                {/* Controles de Entrada (Slider + Input) */}
                <div className="lg:col-span-6 space-y-4 bg-muted/20 p-4 rounded-xl border border-border">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Pontuação Simulada (0 a 100)
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={simuladorPontos}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          if (!isNaN(v)) {
                            setSimuladorPontos(Math.max(0, Math.min(100, v)));
                          }
                        }}
                        className="w-24 h-8 text-center font-mono text-sm font-bold"
                      />
                      <span className="text-xs font-mono text-muted-foreground">pts</span>
                    </div>
                  </div>

                  {/* Slider nativo estilizado */}
                  <div className="space-y-2">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="0.5"
                      value={simuladorPontos}
                      onChange={(e) => setSimuladorPontos(parseFloat(e.target.value))}
                      className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <div className="flex justify-between text-[11px] font-mono text-muted-foreground">
                      <span>0.0 pts</span>
                      <span>25.0</span>
                      <span>50.0</span>
                      <span>75.0</span>
                      <span>100.0 pts</span>
                    </div>
                  </div>

                  {/* Atalhos rápidos de teste */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] text-muted-foreground">Testar notas de corte:</span>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] font-mono" onClick={() => setSimuladorPontos(25)}>
                      G1 (25 pts)
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] font-mono" onClick={() => setSimuladorPontos(50)}>
                      G2 (50 pts)
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] font-mono" onClick={() => setSimuladorPontos(70)}>
                      G3 (70 pts)
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] font-mono" onClick={() => setSimuladorPontos(85)}>
                      G4 (85 pts)
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] font-mono" onClick={() => setSimuladorPontos(95)}>
                      G5 (95 pts)
                    </Button>
                  </div>
                </div>

                {/* Resultado do Enquadramento e Alerta da Trava Antileniência */}
                <div className="lg:col-span-6 space-y-3">
                  <div className={`p-4 rounded-xl border ${enquadramentoSimulador.visual.bg} ${enquadramentoSimulador.visual.border} flex items-center justify-between gap-4`}>
                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Grau de Desempenho Resultante
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-3xl font-mono font-extrabold ${enquadramentoSimulador.visual.text}`}>
                          Grau {enquadramentoSimulador.nivel.grau}
                        </span>
                        <span className="text-lg font-bold text-foreground">
                          — {enquadramentoSimulador.nivel.rotulo}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        Faixa regulamentar: {enquadramentoSimulador.nivel.valor_min} a {enquadramentoSimulador.nivel.valor_max} pontos
                      </div>
                    </div>

                    <div className="text-right border-l border-border/40 pl-4">
                      <div className="text-[11px] font-medium text-muted-foreground">Nota Escalar (0–10)</div>
                      <div className="text-2xl font-mono font-bold text-foreground">
                        {((enquadramentoSimulador.nivel.grau - 1) * 2.5).toFixed(1)}
                      </div>
                      <div className="text-[10px] font-mono text-muted-foreground">
                        Linear: {enquadramentoSimulador.notaFinal}
                      </div>
                    </div>
                  </div>

                  {/* Descrição Comportamental do Nível */}
                  <div className="bg-muted/30 p-3 rounded-lg border border-border text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Comportamento Esperado: </span>
                    {enquadramentoSimulador.nivel.descricao_comportamental || 'Sem descrição cadastrada.'}
                  </div>

                  {/* Alerta de Trava Antileniência */}
                  {enquadramentoSimulador.acionaTrava ? (
                    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3.5 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2.5 shadow-2xs">
                      <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                      <div className="space-y-0.5">
                        <div className="font-bold flex items-center gap-1.5 text-sm">
                          Trava Antileniência Obrigatória (Art. 24 da Lei nº 1.704/2006)
                        </div>
                        <p className="leading-relaxed">
                          A atribuição de <strong>Grau {enquadramentoSimulador.nivel.grau} ({enquadramentoSimulador.nivel.rotulo})</strong> exige obrigatoriamente apontamento tempestivo de incidentes críticos registrado no <strong>Diário de Bordo (CIT)</strong> pelo avaliador com evidência documental comprobatória, sob pena de nulidade ou retificação em sede de recurso pela CAD.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2.5">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <div>
                        <span className="font-bold">Grau Intermediário Conforme: </span>
                        Desempenho dentro do padrão ordinário esperado. Não exige apontamento obrigatório prévio de CIT para validação da nota.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* ── 4. LISTA GERENCIAL DE ESCALAS CADASTRADAS ─────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-primary" />
                Escalas Parametrizadas para o Modelo ({escalas.length})
              </h3>
              <span className="text-xs text-muted-foreground">
                Clique na escala para expandir os níveis e a tabela detalhada
              </span>
            </div>

            <div className="space-y-3">
              {escalas.map((escala) => {
                const estaExpandida = expandida === escala.id;
                return (
                  <Card key={escala.id} className="gap-0 py-0 overflow-hidden border-border transition-shadow hover:shadow-sm">
                    <CardHeader className="p-4 border-b border-border bg-muted/20">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-1 h-7 w-7 text-muted-foreground"
                            onClick={() => setExpandida(estaExpandida ? null : escala.id)}
                            title={estaExpandida ? 'Recolher detalhes' : 'Expandir detalhes'}
                          >
                            {estaExpandida ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                          <div>
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-base font-bold text-foreground">
                                {escala.nome}
                              </CardTitle>
                              <StatusChip
                                label={escala.ativa ? 'Vigente / Ativa' : 'Histórico (Inativa)'}
                                variant={escala.ativa ? 'success' : 'neutral'}
                              />
                              <Badge variant="outline" className="font-mono text-xs">
                                {escala.qtd_niveis} Graus
                              </Badge>
                            </div>
                            {escala.descricao && (
                              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                                {escala.descricao}
                              </CardDescription>
                            )}
                          </div>
                        </div>

                        {/* Ações da Escala */}
                        <div className="flex items-center gap-2">
                          {!escala.ativa && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => ativarEscala(escala)}
                              disabled={ativandoId === escala.id}
                              className="text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 border-emerald-500/30"
                              title="Tornar esta escala a vigente para o modelo"
                            >
                              <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                              {ativandoId === escala.id ? 'Ativando...' : 'Tornar Vigente'}
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => abrirModalEditar(escala)}
                            className="text-xs"
                            title="Editar parâmetros desta escala"
                          >
                            <Edit2 className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => abrirConfirmacaoExclusao(escala)}
                            disabled={escala.ativa}
                            className={`text-xs ${
                              escala.ativa
                                ? 'text-muted-foreground/40 cursor-not-allowed'
                                : 'text-destructive hover:bg-destructive/10'
                            }`}
                            title={
                              escala.ativa
                                ? 'A escala atualmente ativa não pode ser excluída. Ative outra antes.'
                                : 'Excluir esta escala'
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            Excluir
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    {estaExpandida && (
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/10">
                              <TableHead className="w-16 text-xs text-center font-bold">Grau</TableHead>
                              <TableHead className="w-44 text-xs font-bold">Rótulo Conceitual</TableHead>
                              <TableHead className="w-40 text-xs font-bold">Faixa de Pontuação</TableHead>
                              <TableHead className="w-32 text-xs font-bold">Nota Escalar</TableHead>
                              <TableHead className="text-xs font-bold">Descrição Comportamental do Grau</TableHead>
                              <TableHead className="w-32 text-xs text-center font-bold">Trava CIT</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {escala.niveis.map((nivel) => {
                              const visual = getGrauVisualConfig(nivel.grau, escala.qtd_niveis);
                              const notaConvertida = ((nivel.grau - 1) * 2.5).toFixed(1);
                              return (
                                <TableRow key={nivel.grau} className="hover:bg-muted/15">
                                  <TableCell className="font-mono text-xs font-bold text-center">
                                    <span
                                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full font-bold text-xs ${visual.badgeBg}`}
                                    >
                                      G{nivel.grau}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-sm font-semibold text-foreground">
                                    {nivel.rotulo}
                                  </TableCell>
                                  <TableCell className="font-mono text-xs tabular-nums text-foreground font-semibold">
                                    <span className="px-2.5 py-1 rounded bg-muted/60 border border-border/80">
                                      {nivel.valor_min} – {nivel.valor_max} pts
                                    </span>
                                  </TableCell>
                                  <TableCell className="font-mono text-xs tabular-nums font-bold text-foreground">
                                    {notaConvertida} / 10.0
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground leading-relaxed">
                                    {nivel.descricao_comportamental || '—'}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {visual.isExtremo ? (
                                      <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/30 bg-amber-500/10">
                                        Exige CIT
                                      </Badge>
                                    ) : (
                                      <span className="text-xs text-muted-foreground font-mono">Dispensada</span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ── MODAL DE CRIAÇÃO / EDIÇÃO DE ESCALA GRÁFICA ────────────────── */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          editingEscalaId
            ? `Editar Escala Gráfica — ${modeloSelecionado?.nome ?? ''}`
            : `Nova Escala Gráfica — ${modeloSelecionado?.nome ?? ''}`
        }
        icon={<Scale className="h-5 w-5 text-primary" />}
        size="2xl"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" onClick={salvar} disabled={saving}>
              {saving
                ? 'Salvando...'
                : editingEscalaId
                ? 'Atualizar Escala Gráfica'
                : 'Salvar e Ativar Escala'}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Configure de 3 a 5 graus da escala gráfica contínua de 0 a 100 pontos conforme a Metodologia Chiavenato (RF-03). As faixas numéricas devem cobrir a totalidade da régua sem lacunas nem sobreposições.
          </p>

          {/* Atalhos de Presets */}
          <div className="bg-muted/20 p-3.5 rounded-xl border border-border space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-primary" />
                Templates Canônicos de Chiavenato
              </span>
              <span className="text-[11px] text-muted-foreground">Clique para preencher automaticamente</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs justify-start h-auto py-2.5 px-3 border-border hover:border-primary hover:bg-primary/5 transition-all text-left"
                onClick={() =>
                  aplicarPreset(PRESET_5_GRAUS, 'Escala Padrão Chiavenato (5 Graus)')
                }
              >
                <div>
                  <div className="font-bold text-foreground flex items-center gap-1.5">
                    <span>5 Graus (Canônico)</span>
                    <Badge variant="outline" className="text-[10px] font-mono py-0 px-1">G1–G5</Badge>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">Insuficiente a Excelente (0–100 pts)</div>
                </div>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs justify-start h-auto py-2.5 px-3 border-border hover:border-primary hover:bg-primary/5 transition-all text-left"
                onClick={() =>
                  aplicarPreset(PRESET_4_GRAUS, 'Escala de Desempenho (4 Graus)')
                }
              >
                <div>
                  <div className="font-bold text-foreground flex items-center gap-1.5">
                    <span>4 Graus</span>
                    <Badge variant="outline" className="text-[10px] font-mono py-0 px-1">G1–G4</Badge>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">Insuficiente a Excelente</div>
                </div>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs justify-start h-auto py-2.5 px-3 border-border hover:border-primary hover:bg-primary/5 transition-all text-left"
                onClick={() =>
                  aplicarPreset(PRESET_3_GRAUS, 'Escala Simplificada (3 Graus)')
                }
              >
                <div>
                  <div className="font-bold text-foreground flex items-center gap-1.5">
                    <span>3 Graus</span>
                    <Badge variant="outline" className="text-[10px] font-mono py-0 px-1">G1–G3</Badge>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">Insuficiente, Regular, Excelente</div>
                </div>
              </Button>
            </div>
          </div>

          {/* Identificação */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-6">
              <label className="text-xs font-semibold text-foreground block mb-1">
                Nome da Escala *
              </label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Escala Padrão Chiavenato (5 Graus)"
                required
                className="h-9 text-xs"
              />
            </div>
            <div className="md:col-span-6">
              <label className="text-xs font-semibold text-foreground block mb-1">
                Descrição ou Fundamentação Legal
              </label>
              <Input
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Ex: Régua contínua de 0 a 100 pontos para cômputo dos graus nos termos da Lei nº 1.704/2006."
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Controle de Níveis */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Graus de Desempenho ({niveis.length} Níveis)
                </label>
                <Badge variant="outline" className="text-[10px] font-mono">
                  Regulamentar: 3 a 5 Graus
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={removerNivel}
                  disabled={niveis.length <= 3}
                  className="h-7 px-2.5 text-xs"
                >
                  - Remover Nível
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={adicionarNivel}
                  disabled={niveis.length >= 5}
                  className="h-7 px-2.5 text-xs text-primary font-medium"
                >
                  + Adicionar Nível
                </Button>
              </div>
            </div>

            {/* Linhas de parametrização em cards estruturados e espaçosos */}
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {niveis.map((nivel, idx) => {
                const visual = getGrauVisualConfig(nivel.grau, niveis.length);
                return (
                  <div
                    key={nivel.grau}
                    className={`p-3 rounded-xl border transition-all ${visual.bg} ${visual.border}`}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                      {/* Grau Tag */}
                      <div className="md:col-span-1 flex flex-col items-center justify-center">
                        <span
                          className={`h-8 w-8 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${visual.badgeBg}`}
                        >
                          G{nivel.grau}
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground mt-0.5">
                          Nf {((nivel.grau - 1) * 2.5).toFixed(1)}
                        </span>
                      </div>

                      {/* Rótulo Conceitual */}
                      <div className="md:col-span-3">
                        <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                          Rótulo Conceitual
                        </label>
                        <Input
                          value={nivel.rotulo}
                          onChange={(e) => atualizarNivel(idx, 'rotulo', e.target.value)}
                          placeholder="Ex: Bom"
                          className="h-9 text-xs bg-background font-medium"
                        />
                      </div>

                      {/* Faixa de Pontuação (Mín e Máx) */}
                      <div className="md:col-span-3">
                        <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                          Faixa de Pontuação (pts)
                        </label>
                        <div className="flex items-center gap-1.5">
                          <div className="relative flex-1">
                            <Input
                              type="number"
                              step="0.01"
                              value={nivel.valor_min}
                              onChange={(e) =>
                                atualizarNivel(idx, 'valor_min', parseFloat(e.target.value) || 0)
                              }
                              placeholder="0.00"
                              className="h-9 text-xs font-mono tabular-nums text-center bg-background"
                            />
                          </div>
                          <span className="text-xs text-muted-foreground font-mono font-medium">a</span>
                          <div className="relative flex-1">
                            <Input
                              type="number"
                              step="0.01"
                              value={nivel.valor_max}
                              onChange={(e) =>
                                atualizarNivel(idx, 'valor_max', parseFloat(e.target.value) || 0)
                              }
                              placeholder="100.00"
                              className="h-9 text-xs font-mono tabular-nums text-center bg-background"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Descrição Comportamental */}
                      <div className="md:col-span-5">
                        <label className="text-[11px] font-semibold text-muted-foreground block mb-1 flex items-center justify-between">
                          <span>Descrição Comportamental</span>
                          {visual.isExtremo ? (
                            <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
                              <ShieldAlert className="h-3 w-3" /> Trava CIT Ativa
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-muted-foreground">Regular</span>
                          )}
                        </label>
                        <Input
                          value={nivel.descricao_comportamental ?? ''}
                          onChange={(e) =>
                            atualizarNivel(idx, 'descricao_comportamental', e.target.value)
                          }
                          placeholder="Padrão observável de comportamento esperado..."
                          className="h-9 text-xs bg-background"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Feedback em tempo real de integridade matemática */}
            {(() => {
              const erroMatematico = validarContinuidadedaEscala(niveis);
              if (erroMatematico) {
                return (
                  <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5 p-2.5 bg-amber-500/10 rounded-md border border-amber-500/20">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>{erroMatematico}</span>
                  </div>
                );
              }
              return (
                <div className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 p-2.5 bg-emerald-500/10 rounded-md border border-emerald-500/20">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>Régua válida: cobertura perfeita de 0.0 a 100.0 pontos sem sobreposições nem lacunas.</span>
                </div>
              );
            })()}
          </div>
        </div>
      </Modal>

      {/* ── MODAL DE EXCLUSÃO SEGURA (SEM WINDOW.CONFIRM) ─────────────── */}
      <Modal
        open={modalExcluirOpen}
        onClose={() => setModalExcluirOpen(false)}
        title="Confirmar Exclusão de Escala Gráfica"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-3.5 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-destructive shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs text-foreground">
              <div className="font-bold text-sm text-destructive">Atenção deliberativa</div>
              <p>
                Deseja realmente excluir a escala <strong>"{escalaParaExcluir?.nome}"</strong>?
              </p>
              <p className="text-muted-foreground">
                Esta ação removerá a régua histórica e seus respectivos {escalaParaExcluir?.qtd_niveis} níveis de pontuação. Esta operação é irreversível.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setModalExcluirOpen(false)}
              disabled={excluindo}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={executarExclusao}
              disabled={excluindo}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              {excluindo ? 'Excluindo...' : 'Sim, Excluir Escala'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default EscalaGraficaPanel;
