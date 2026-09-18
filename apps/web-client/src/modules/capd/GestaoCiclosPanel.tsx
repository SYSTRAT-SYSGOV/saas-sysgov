import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Card,
  Button,
  Badge,
  Input,
  Select,
  Modal,
  Switch,
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
  Calendar,
  Plus,
  RotateCw,
  Users,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  Clock,
  LayoutGrid,
  Table as TableIcon,
  Sparkles,
  Sliders,
  Edit3,
  CheckCircle2,
  Info,
  Layers,
  Award,
} from 'lucide-react';
import { SysgovApi } from '@sysgov/sdk';
import type { ApiCiclo } from '@sysgov/sdk';

const api = new SysgovApi();

const STATUS_VARIANT: Record<string, 'success' | 'primary' | 'neutral' | 'warning' | 'info'> = {
  aberto: 'primary',
  em_avaliacao: 'primary',
  homologado: 'success',
  encerrado: 'neutral',
  em_recurso: 'warning',
  deliberacao: 'warning',
  planejamento: 'info',
  planejado: 'info',
};

const STATUS_LABEL: Record<string, string> = {
  aberto: 'Em Andamento',
  em_avaliacao: 'Em Avaliação',
  homologado: 'Homologado',
  encerrado: 'Encerrado',
  em_recurso: 'Em Fase Recursal',
  deliberacao: 'Em Deliberação',
  planejamento: 'Planejamento',
  planejado: 'Planejado',
};

const formatDataIsoParaBr = (dateStr?: string | null) => {
  if (!dateStr) return '—';
  const clean = String(dateStr).split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return clean;
};

export const GestaoCiclosPanel: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [ciclos, setCiclos] = useState<ApiCiclo[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  // Sub-abas do Painel
  const [subTab, setSubTab] = useState<'ciclos' | 'cadencia'>('ciclos');

  // Modo de exibição: Tabela como primeira visualização ativa
  const [modoExibicao, setModoExibicao] = useState<'tabela' | 'cards'>('tabela');

  // Filtros Avançados de Ciclos
  const [search, setSearch] = useState<string>('');
  const [filtroStatus, setFiltroStatus] = useState<string>('');
  const [filtroEtapa, setFiltroEtapa] = useState<string>('');
  const [filtroAno, setFiltroAno] = useState<string>('');

  // Modal de abertura de novo ciclo
  const [showModalNovoCiclo, setShowModalNovoCiclo] = useState<boolean>(false);
  const [formAno, setFormAno] = useState<number>(new Date().getFullYear());
  const [formNome, setFormNome] = useState<string>('');
  const [formDataInicio, setFormDataInicio] = useState<string>(`${new Date().getFullYear()}-01-01`);
  const [formDataFim, setFormDataFim] = useState<string>(`${new Date().getFullYear()}-12-31`);
  const [formDataLimitePreenchimento, setFormDataLimitePreenchimento] = useState<string>('');
  const [formDataLimiteRecurso, setFormDataLimiteRecurso] = useState<string>('');
  const [formEtapa, setFormEtapa] = useState<number>(1);
  const [formNotaCorte, setFormNotaCorte] = useState<number>(70.0);
  const [formCadenciaAutomatica, setFormCadenciaAutomatica] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  // Modal de Edição / Parametrização do Ciclo
  const [showModalEditarCiclo, setShowModalEditarCiclo] = useState<boolean>(false);
  const [cicloParaEditar, setCicloParaEditar] = useState<ApiCiclo | null>(null);
  const [editNome, setEditNome] = useState<string>('');
  const [editAno, setEditAno] = useState<number>(new Date().getFullYear());
  const [editDataInicio, setEditDataInicio] = useState<string>('');
  const [editDataFim, setEditDataFim] = useState<string>('');
  const [editLimitePreenchimento, setEditLimitePreenchimento] = useState<string>('');
  const [editLimiteRecurso, setEditLimiteRecurso] = useState<string>('');
  const [editEtapa, setEditEtapa] = useState<number>(1);
  const [editNotaCorte, setEditNotaCorte] = useState<number>(70.0);
  const [editStatus, setEditStatus] = useState<string>('aberto');
  const [editCadenciaAutomatica, setEditCadenciaAutomatica] = useState<boolean>(true);
  const [salvandoEdicao, setSalvandoEdicao] = useState<boolean>(false);

  // Modal de Elegibilidade
  const [showModalElegibilidade, setShowModalElegibilidade] = useState<boolean>(false);
  const [selectedCiclo, setSelectedCiclo] = useState<ApiCiclo | null>(null);
  const [elegibilidadeData, setElegibilidadeData] = useState<any>(null);
  const [loadingElegibilidade, setLoadingElegibilidade] = useState<boolean>(false);
  const [buscaElegibilidade, setBuscaElegibilidade] = useState<string>('');
  const [filtroTipoElegibilidade, setFiltroTipoElegibilidade] = useState<'todos' | 'elegiveis' | 'bloqueados'>('todos');

  // Modal de Confirmação de Encerramento (sem window.confirm)
  const [encerramentoModal, setEncerramentoModal] = useState<{
    open: boolean;
    ciclo: ApiCiclo | null;
    abrirProximo: boolean;
  }>({ open: false, ciclo: null, abrirProximo: false });
  const [encerrando, setEncerrando] = useState<boolean>(false);

  const fetchCiclos = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const data = await api.capd.listCiclos();
      setCiclos(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Erro ao carregar ciclos:', e);
      setErro('Não foi possível carregar os ciclos de avaliação.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCiclos();
  }, [fetchCiclos]);

  // Lista dinâmica de anos para filtro
  const anosDisponiveis = useMemo(() => {
    const set = new Set<number>();
    ciclos.forEach((c) => {
      const ano = c.ano_competencia || c.ano_referencia;
      if (ano) set.add(ano);
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [ciclos]);

  // Ciclos filtrados por busca textual e filtros avançados
  const filteredCiclos = useMemo(() => {
    return ciclos.filter((c) => {
      const term = search.toLowerCase().trim();
      const ano = String(c.ano_competencia || c.ano_referencia || '');
      const matchSearch = term
        ? c.nome.toLowerCase().includes(term) ||
          ano.includes(term) ||
          (c.data_inicio && c.data_inicio.includes(term)) ||
          (c.data_fim && c.data_fim.includes(term))
        : true;

      const matchStatus = filtroStatus ? c.status === filtroStatus : true;
      const matchEtapa = filtroEtapa ? String(c.etapa_cadencia || 1) === filtroEtapa : true;
      const matchAno = filtroAno ? ano === filtroAno : true;

      return matchSearch && matchStatus && matchEtapa && matchAno;
    });
  }, [ciclos, search, filtroStatus, filtroEtapa, filtroAno]);

  // Handler de abertura de novo ciclo
  const handleCriarCiclo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErro(null);
    try {
      await api.capd.createCiclo({
        ano_competencia: formAno,
        ano_referencia: formAno,
        nome: formNome || `Ciclo de Avaliação de Desempenho ${formAno}`,
        data_inicio: formDataInicio,
        data_fim: formDataFim,
        data_inicio_avaliacao: formDataInicio,
        data_fim_avaliacao: formDataFim,
        data_limite_preenchimento: formDataLimitePreenchimento || undefined,
        data_limite_recurso: formDataLimiteRecurso || undefined,
        etapa_cadencia: formEtapa,
        cadencia_automatica: formCadenciaAutomatica,
        status: 'aberto',
        nota_corte_nfc: formNotaCorte,
      });
      setShowModalNovoCiclo(false);
      setSucesso(`Novo ciclo de 12 meses (${formAno} - Etapa ${formEtapa}) aberto com sucesso!`);
      await fetchCiclos();
    } catch (err: any) {
      setErro(err.message || 'Falha ao abrir novo ciclo de avaliação.');
    } finally {
      setSaving(false);
    }
  };

  // Prepara modal de edição de ciclo
  const handleAbrirEdicao = (c: ApiCiclo) => {
    setCicloParaEditar(c);
    setEditNome(c.nome);
    setEditAno(c.ano_competencia || c.ano_referencia || new Date().getFullYear());
    setEditDataInicio((c.data_inicio || c.data_inicio_avaliacao || '').split('T')[0]);
    setEditDataFim((c.data_fim || c.data_fim_avaliacao || '').split('T')[0]);
    setEditLimitePreenchimento((c.data_limite_preenchimento || '').split('T')[0]);
    setEditLimiteRecurso((c.data_limite_recurso || '').split('T')[0]);
    setEditEtapa(c.etapa_cadencia || 1);
    setEditNotaCorte(Number(c.nota_corte_nfc ?? 70.0));
    setEditStatus(c.status);
    setEditCadenciaAutomatica(c.cadencia_automatica !== false);
    setShowModalEditarCiclo(true);
  };

  // Salva edição de parâmetros do ciclo
  const handleSalvarEdicao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cicloParaEditar) return;
    setSalvandoEdicao(true);
    setErro(null);
    try {
      await api.capd.updateCiclo(cicloParaEditar.id, {
        nome: editNome,
        ano_competencia: editAno,
        data_inicio: editDataInicio,
        data_fim: editDataFim,
        data_limite_preenchimento: editLimitePreenchimento || undefined,
        data_limite_recurso: editLimiteRecurso || undefined,
        status: editStatus as any,
        etapa_cadencia: editEtapa,
        cadencia_automatica: editCadenciaAutomatica,
        nota_corte_nfc: editNotaCorte,
      });
      setShowModalEditarCiclo(false);
      setSucesso(`Ciclo "${editNome}" atualizado e parametrizado com sucesso!`);
      await fetchCiclos();
    } catch (err: any) {
      setErro(err.message || 'Falha ao atualizar parâmetros do ciclo.');
    } finally {
      setSalvandoEdicao(false);
    }
  };

  // Handler de encerramento seguro
  const confirmarEncerramento = async () => {
    if (!encerramentoModal.ciclo) return;
    setEncerrando(true);
    setErro(null);
    try {
      await api.capd.encerrarCiclo(encerramentoModal.ciclo.id, encerramentoModal.abrirProximo);
      setSucesso(
        encerramentoModal.abrirProximo
          ? `Ciclo encerrado e ciclo subsequente (Etapa ${((encerramentoModal.ciclo.etapa_cadencia || 1) % 3) + 1}) aberto com sucesso!`
          : 'Ciclo de avaliação encerrado com sucesso!'
      );
      setEncerramentoModal({ open: false, ciclo: null, abrirProximo: false });
      await fetchCiclos();
    } catch (err: any) {
      setErro(err.message || 'Não foi possível encerrar o ciclo.');
    } finally {
      setEncerrando(false);
    }
  };

  // Consulta de elegibilidade
  const handleVerElegibilidade = async (ciclo: ApiCiclo) => {
    setSelectedCiclo(ciclo);
    setShowModalElegibilidade(true);
    setLoadingElegibilidade(true);
    setBuscaElegibilidade('');
    setFiltroTipoElegibilidade('todos');
    try {
      const res = await api.capd.getElegibilidadeCiclo(ciclo.id);
      setElegibilidadeData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingElegibilidade(false);
    }
  };

  // Normalização e filtragem da lista de elegibilidade do modal
  const servidoresElegibilidadeNormalizados = useMemo(() => {
    if (!elegibilidadeData) return [];
    let list: Array<{
      id: number;
      nome: string;
      matricula: string;
      cargo: string;
      elegivel: boolean;
      motivo?: string;
    }> = [];

    if (Array.isArray(elegibilidadeData.servidores)) {
      list = elegibilidadeData.servidores.map((s: any) => ({
        id: s.servidor_id || s.id,
        nome: s.nome_completo || s.nome || s.name || `Servidor #${s.servidor_id}`,
        matricula: s.matricula || '-',
        cargo: s.cargo_efetivo || s.cargo || 'Efetivo',
        elegivel: Boolean(s.elegivel),
        motivo: s.bloqueios && s.bloqueios.length > 0 ? s.bloqueios.join(' • ') : undefined,
      }));
    } else {
      if (Array.isArray(elegibilidadeData.elegiveis)) {
        elegibilidadeData.elegiveis.forEach((item: any) => {
          list.push({
            id: item.id || item.servidor_id,
            nome: item.nome_completo || item.servidor_nome || item.nome || item.name,
            matricula: item.matricula || '-',
            cargo: item.cargo || 'Efetivo',
            elegivel: true,
          });
        });
      }
      if (Array.isArray(elegibilidadeData.bloqueados)) {
        elegibilidadeData.bloqueados.forEach((item: any) => {
          list.push({
            id: item.id || item.servidor_id,
            nome: item.nome_completo || item.servidor_nome || item.nome || item.name,
            matricula: item.matricula || '-',
            cargo: item.cargo || 'Efetivo',
            elegivel: false,
            motivo: item.motivo || 'Afastamento superior a 90 dias ou suspensão',
          });
        });
      }
    }

    return list.filter((item) => {
      const term = buscaElegibilidade.toLowerCase().trim();
      const matchBusca = term
        ? item.nome.toLowerCase().includes(term) ||
          item.matricula.toLowerCase().includes(term) ||
          item.cargo.toLowerCase().includes(term) ||
          (item.motivo && item.motivo.toLowerCase().includes(term))
        : true;

      const matchTipo =
        filtroTipoElegibilidade === 'todos'
          ? true
          : filtroTipoElegibilidade === 'elegiveis'
          ? item.elegivel
          : !item.elegivel;

      return matchBusca && matchTipo;
    });
  }, [elegibilidadeData, buscaElegibilidade, filtroTipoElegibilidade]);

  // Colunas do TanStack DataTable
  const columns = useMemo<ColumnDef<ApiCiclo, any>[]>(() => [
    {
      id: 'ano',
      header: 'Ano / Nome do Ciclo',
      size: 260,
      meta: {
        sortValue: (c) => c.ano_competencia || c.ano_referencia || 0,
        exportValue: (c) => `${c.nome} (${c.ano_competencia || c.ano_referencia})`,
      },
      cell: ({ row }) => {
        const c = row.original;
        const ano = c.ano_competencia || c.ano_referencia;
        return (
          <div className="space-y-0.5">
            <span className="font-semibold text-foreground text-xs block">
              {c.nome}
            </span>
            <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground tabular-nums">
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-mono">
                {ano}
              </Badge>
              <span>Competência {ano}</span>
            </div>
          </div>
        );
      },
    },
    {
      id: 'etapa',
      header: 'Cadência Trienal',
      size: 190,
      meta: {
        sortValue: (c) => c.etapa_cadencia || 1,
        exportValue: (c) => `Etapa ${c.etapa_cadencia || 1} de 3`,
      },
      cell: ({ row }) => {
        const etapa = row.original.etapa_cadencia || 1;
        const percent = Math.round((etapa / 3) * 100);
        const meses = etapa * 12;

        return (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs font-mono tabular-nums">
              <span className="font-semibold text-foreground">
                Etapa {etapa} de 3
              </span>
              <span className="text-[10px] text-muted-foreground">
                {meses} meses
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-20 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full ${etapa === 3 ? 'bg-primary' : 'bg-blue-500'}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">
                {etapa === 3 ? 'Conclusiva' : `${percent}%`}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      id: 'vigencia',
      header: 'Período de Vigência',
      size: 190,
      cell: ({ row }) => {
        const c = row.original;
        const ini = formatDataIsoParaBr(c.data_inicio || c.data_inicio_avaliacao);
        const fim = formatDataIsoParaBr(c.data_fim || c.data_fim_avaliacao);
        return (
          <div className="flex items-center gap-1.5 font-mono text-xs text-foreground tabular-nums">
            <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>
              {ini} <span className="text-muted-foreground">até</span> {fim}
            </span>
          </div>
        );
      },
    },
    {
      id: 'prazos',
      header: 'Prazos Operacionais',
      size: 180,
      cell: ({ row }) => {
        const c = row.original;
        const limitePreenchimento = formatDataIsoParaBr(c.data_limite_preenchimento);
        const limiteRecurso = formatDataIsoParaBr(c.data_limite_recurso);

        return (
          <div className="space-y-1 text-xs font-mono tabular-nums">
            <div className="flex items-center gap-1 text-[11px] text-foreground" title="Limite para chefias imediatas enviarem notas">
              <Clock className="h-3 w-3 text-amber-500 shrink-0" />
              <span>Notas: {limitePreenchimento !== '—' ? limitePreenchimento : 'Regulamentar'}</span>
            </div>
            {limiteRecurso !== '—' && (
              <div className="text-[10px] text-muted-foreground">
                Recursos: {limiteRecurso}
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: 'nota_corte',
      header: 'Nota de Corte (NFC)',
      size: 150,
      cell: ({ row }) => {
        const corte = Number(row.original.nota_corte_nfc ?? 70.0);
        return (
          <div className="font-mono text-xs font-semibold text-primary tabular-nums">
            {Number.isFinite(corte) ? corte.toFixed(1) : '70.0'}% <span className="text-[10px] font-sans font-normal text-muted-foreground">mínimo</span>
          </div>
        );
      },
    },
    {
      id: 'status',
      header: 'Status Operacional',
      size: 140,
      meta: {
        sortValue: (c) => c.status || '',
        exportValue: (c) => (c.status ? (STATUS_LABEL[c.status] ?? c.status) : ''),
      },
      cell: ({ row }) => {
        const s = row.original?.status;
        return (
          <StatusChip
            label={s ? (STATUS_LABEL[s] ?? s.toUpperCase()) : 'N/D'}
            variant={(s && STATUS_VARIANT[s]) ? STATUS_VARIANT[s] : 'neutral'}
          />
        );
      },
    },
    {
      id: 'acoes',
      header: 'Ações de Gestão',
      size: 260,
      enableSorting: false,
      cell: ({ row }) => {
        const c = row.original;
        const isAtivo = !['encerrado', 'homologado'].includes(c.status);

        return (
          <div className="flex items-center justify-end gap-1.5 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7 px-2"
              onClick={() => handleVerElegibilidade(c)}
              title="Consultar Elegibilidade e Bloqueios Legais"
            >
              <Users className="h-3.5 w-3.5 mr-1 text-primary" />
              Elegíveis
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground"
              onClick={() => handleAbrirEdicao(c)}
              title="Editar Parâmetros do Ciclo"
            >
              <Edit3 className="h-3.5 w-3.5 mr-1" />
              Editar
            </Button>

            {isAtivo && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7 px-2 text-rose-600 hover:text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/60"
                  onClick={() => setEncerramentoModal({ open: true, ciclo: c, abrirProximo: false })}
                  title="Encerrar ciclo atual"
                >
                  Encerrar
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="text-xs h-7 px-2 font-semibold bg-primary text-primary-foreground"
                  onClick={() => setEncerramentoModal({ open: true, ciclo: c, abrirProximo: true })}
                  title="Encerrar ciclo atual e abrir próxima etapa da cadência trienal"
                >
                  <RotateCw className="h-3 w-3 mr-1" />
                  N+1
                </Button>
              </>
            )}
          </div>
        );
      },
    },
  ], []);

  return (
    <div className="space-y-4">
      {/* CABEÇALHO DO PAINEL */}
      <PageHeader
        icon={<Calendar className="h-6 w-6" />}
        title="Gestão de Ciclos de Avaliação (12 Meses)"
        subtitle="Cadência anual trienal — 3 avaliações em 3 anos com roll-over automático (N → N+1) e controle de elegibilidade funcional"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchCiclos}
              disabled={loading}
              title="Recarregar dados"
            >
              <RotateCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button
              size="sm"
              className="font-semibold shadow-sm"
              onClick={() => {
                const nextAno = ciclos.length > 0 ? (ciclos[0].ano_competencia || 2026) + 1 : new Date().getFullYear();
                setFormAno(nextAno);
                setFormNome(`Ciclo de Avaliação de Desempenho ${nextAno}`);
                setFormDataInicio(`${nextAno}-01-01`);
                setFormDataFim(`${nextAno}-12-31`);
                setFormEtapa(1);
                setFormNotaCorte(70.0);
                setFormCadenciaAutomatica(true);
                setShowModalNovoCiclo(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Abrir Novo Ciclo
            </Button>
          </div>
        }
      />

      {/* ALERTAS DE FEEDBACK */}
      {erro && (
        <div className="rounded-lg border border-rose-200 dark:border-rose-900/50 bg-rose-50/80 dark:bg-rose-950/20 px-4 py-3 text-xs text-rose-700 dark:text-rose-400 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{erro}</span>
          </div>
          <Button size="sm" variant="ghost" className="h-6 text-xs px-1.5" onClick={() => setErro(null)}>
            Fechar
          </Button>
        </div>
      )}
      {sucesso && (
        <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/80 dark:bg-emerald-950/20 px-4 py-3 text-xs text-emerald-700 dark:text-emerald-400 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 shrink-0" />
            <span>{sucesso}</span>
          </div>
          <Button size="sm" variant="ghost" className="h-6 text-xs px-1.5" onClick={() => setSucesso(null)}>
            Fechar
          </Button>
        </div>
      )}

      {/* BANNER INSTITUCIONAL: CADÊNCIA DE 12 MESES & CHIAVENATO */}
      <Card className="p-4 border-primary/20 bg-accent/20">
        <div className="flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-foreground">
                Cadência Anual de 12 Meses & Estágio Probatório Trienal (Art. 41 CF / Lei nº 1.704)
              </h4>
              <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">
                Regra Canônica
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              O estágio probatório compõe-se de <strong>3 avaliações ordinárias em 3 anos</strong> com interstício mínimo de 12 meses entre cada ciclo.
              Ao término de cada etapa, o sistema executa a validação de elegibilidade e o roll-over automático N → N+1. A nota final consolidada (NFC)
              será apurada na 3ª etapa para a homologação definitiva de estabilidade ou exoneração.
            </p>
          </div>
        </div>
      </Card>

      {/* PAINEL PRINCIPAL COM SUB-VISÕES E DATA TABLE */}
      <Card className="p-4 space-y-4">
        {/* SUB-VISÃO: CICLOS VS CADÊNCIA TRIENAL */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex items-center gap-1.5 p-1 bg-muted/40 rounded-lg border border-border/60">
            <button
              type="button"
              onClick={() => setSubTab('ciclos')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                subTab === 'ciclos'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>Ciclos Avaliativos</span>
              <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0 h-4">
                {ciclos.length}
              </Badge>
            </button>

            <button
              type="button"
              onClick={() => setSubTab('cadencia')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                subTab === 'cadencia'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Painel da Cadência Trienal (N → N+1)</span>
            </button>
          </div>

          {/* TOGGLE DE MODO DE EXIBIÇÃO: TABELA (PADRÃO) VS CARDS */}
          {subTab === 'ciclos' && (
            <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-lg border border-border/60">
              <button
                type="button"
                onClick={() => setModoExibicao('tabela')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all ${
                  modoExibicao === 'tabela'
                    ? 'bg-background text-primary font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Visualização em Tabela Dinâmica"
              >
                <TableIcon className="h-3.5 w-3.5" />
                <span>Tabela</span>
              </button>
              <button
                type="button"
                onClick={() => setModoExibicao('cards')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all ${
                  modoExibicao === 'cards'
                    ? 'bg-background text-primary font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Visualização em Cards"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Cards</span>
              </button>
            </div>
          )}
        </div>

        {/* CONTEÚDO SUB-ABA 1: CICLOS AVALIATIVOS */}
        {subTab === 'ciclos' ? (
          <div className="space-y-3">
            {/* FILTROS AVANÇADOS */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
              <div className="flex-1 min-w-[240px]">
                <SearchInput
                  value={search}
                  onChange={setSearch}
                  placeholder="Buscar por nome do ciclo, ano de competência ou período..."
                  className="w-full"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Select
                  value={filtroStatus}
                  onChange={setFiltroStatus}
                  options={[
                    { value: '', label: 'Todos os Status' },
                    { value: 'aberto', label: 'Em Andamento / Aberto' },
                    { value: 'em_avaliacao', label: 'Em Avaliação' },
                    { value: 'em_recurso', label: 'Em Fase Recursal' },
                    { value: 'deliberacao', label: 'Em Deliberação' },
                    { value: 'homologado', label: 'Homologado' },
                    { value: 'encerrado', label: 'Encerrado' },
                  ]}
                  className="w-44"
                />

                <Select
                  value={filtroEtapa}
                  onChange={setFiltroEtapa}
                  options={[
                    { value: '', label: 'Todas as Etapas' },
                    { value: '1', label: 'Etapa 1 (1º Ano / 12 meses)' },
                    { value: '2', label: 'Etapa 2 (2º Ano / 24 meses)' },
                    { value: '3', label: 'Etapa 3 (3º Ano / 36 meses)' },
                  ]}
                  className="w-48"
                />

                {anosDisponiveis.length > 0 && (
                  <Select
                    value={filtroAno}
                    onChange={setFiltroAno}
                    options={[
                      { value: '', label: 'Todos os Anos' },
                      ...anosDisponiveis.map((ano) => ({
                        value: String(ano),
                        label: `Ano ${ano}`,
                      })),
                    ]}
                    className="w-36"
                  />
                )}

                {(search || filtroStatus || filtroEtapa || filtroAno) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs h-9 px-2 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setSearch('');
                      setFiltroStatus('');
                      setFiltroEtapa('');
                      setFiltroAno('');
                    }}
                  >
                    Limpar
                  </Button>
                )}
              </div>
            </div>

            {/* TABELA OU CARDS */}
            {loading ? (
              <ScreenState type="loading" title="Carregando Ciclos de Avaliação..." />
            ) : modoExibicao === 'tabela' ? (
              filteredCiclos.length > 0 ? (
                <DataTable
                  columns={columns}
                  data={filteredCiclos}
                  pageSize={10}
                  searchPlaceholder="Filtrar nesta página..."
                />
              ) : (
                <EmptyState
                  icon={<Calendar className="h-10 w-10 text-muted-foreground" />}
                  title="Nenhum ciclo encontrado"
                  description={
                    search || filtroStatus || filtroEtapa || filtroAno
                      ? 'Nenhum ciclo de avaliação atende aos filtros pesquisados.'
                      : 'Abra um novo ciclo de avaliação para iniciar o período avaliativo anual do município.'
                  }
                  actionLabel="Abrir Novo Ciclo"
                  onAction={() => setShowModalNovoCiclo(true)}
                />
              )
            ) : (
              /* MODO CARDS DETALHADOS */
              filteredCiclos.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredCiclos.map((c) => {
                    const ano = c.ano_competencia || c.ano_referencia;
                    const etapa = c.etapa_cadencia || 1;
                    const percent = Math.round((etapa / 3) * 100);
                    const isAtivo = !['encerrado', 'homologado'].includes(c.status);

                    return (
                      <div
                        key={c.id}
                        className="p-3.5 rounded-lg border border-border/80 bg-background hover:border-primary/40 transition-all shadow-xs space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-0.5 min-w-0">
                            <span className="font-semibold text-xs text-foreground block truncate">
                              {c.nome}
                            </span>
                            <div className="font-mono text-[10px] text-muted-foreground tabular-nums">
                              Competência {ano}
                            </div>
                          </div>
                          <StatusChip
                            label={STATUS_LABEL[c.status] ?? c.status}
                            variant={STATUS_VARIANT[c.status] ?? 'neutral'}
                          />
                        </div>

                        <div className="space-y-1.5 pt-2 border-t border-border/60 text-xs">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground">Cadência Trienal:</span>
                            <span className="font-mono font-semibold text-foreground">
                              Etapa {etapa} de 3 ({etapa * 12} meses)
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full ${etapa === 3 ? 'bg-primary' : 'bg-blue-500'}`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>

                        <div className="space-y-1 pt-2 border-t border-border/60 text-[11px] font-mono tabular-nums text-muted-foreground">
                          <div className="flex justify-between">
                            <span>Vigência:</span>
                            <span className="text-foreground">
                              {c.data_inicio || c.data_inicio_avaliacao} até {c.data_fim || c.data_fim_avaliacao}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Limite Notas:</span>
                            <span className="text-foreground">
                              {c.data_limite_preenchimento || 'Regulamentar'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Corte NFC:</span>
                            <span className="font-semibold text-primary">
                              {Number(c.nota_corte_nfc ?? 70.0).toFixed(1)}%
                            </span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-1 flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[11px] px-2"
                            onClick={() => handleVerElegibilidade(c)}
                          >
                            <Users className="h-3 w-3 mr-1 text-primary" />
                            Elegíveis
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-[11px] px-2 text-muted-foreground"
                            onClick={() => handleAbrirEdicao(c)}
                          >
                            <Edit3 className="h-3 w-3 mr-1" />
                            Editar
                          </Button>

                          {isAtivo && (
                            <Button
                              size="sm"
                              className="h-7 text-[11px] px-2 font-semibold"
                              onClick={() => setEncerramentoModal({ open: true, ciclo: c, abrirProximo: true })}
                            >
                              <RotateCw className="h-3 w-3 mr-1" />
                              N+1
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  icon={<Calendar className="h-10 w-10 text-muted-foreground" />}
                  title="Nenhum ciclo encontrado"
                  description="Nenhum ciclo corresponde aos critérios pesquisados."
                />
              )
            )}
          </div>
        ) : (
          /* CONTEÚDO SUB-ABA 2: PAINEL DA CADÊNCIA TRIENAL & ROLL-OVER */
          <div className="space-y-4">
            <div className="p-3.5 rounded-lg bg-muted/40 border border-border flex items-start gap-3 text-xs">
              <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-semibold text-foreground">
                  Estrutura do Triênio Probatório (3 Ciclos de 12 Meses)
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Em estrito cumprimento ao Art. 41 da Constituição Federal e à Lei Municipal nº 1.704/2006, o servidor em estágio probatório é submetido
                  a 3 avaliações ordinárias, cada uma com intervalo de 12 meses de efetivo exercício.
                  Abaixo está o mapeamento dos 3 marcos temporais do processo.
                </p>
              </div>
            </div>

            {/* OS 3 MARCOS TEMPORAIS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* ETAPA 1 */}
              <div className="p-4 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="default" className="text-[10px] font-mono">
                    1ª ETAPA • 12 MESES
                  </Badge>
                  <span className="text-[10px] font-mono text-muted-foreground">Ano 1</span>
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-foreground">Primeira Avaliação Ordinária</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Aferição do período de adaptação e cumprimento dos deveres funcionais pela chefia imediata via Escala Gráfica (Chiavenato, Graus 1 a 5).
                  </p>
                </div>
                <div className="pt-2 border-t border-blue-200/40 text-[10px] font-mono text-muted-foreground">
                  Gatilho: Interstício de 365 dias de exercício.
                </div>
              </div>

              {/* ETAPA 2 */}
              <div className="p-4 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/50 space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-[10px] font-mono">
                    2ª ETAPA • 24 MESES
                  </Badge>
                  <span className="text-[10px] font-mono text-muted-foreground">Ano 2</span>
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-foreground">Segunda Avaliação Ordinária</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Roll-over automático 1 → 2. Consolidação da evolução funcional e confirmação da assiduidade e disciplina probatória.
                  </p>
                </div>
                <div className="pt-2 border-t border-indigo-200/40 text-[10px] font-mono text-muted-foreground">
                  Gatilho: Conclusão do 2º ano de estágio.
                </div>
              </div>

              {/* ETAPA 3 */}
              <div className="p-4 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[10px] font-mono text-emerald-600 border-emerald-300">
                    3ª ETAPA • 36 MESES
                  </Badge>
                  <span className="text-[10px] font-mono text-emerald-600 font-semibold">Conclusivo</span>
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-foreground">Consolidação NFC & Estabilidade</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Cálculo da Nota Final Consolidada (NFC Trienal). Homologação colegiada pela CAD para aquisição de estabilidade ou exoneração.
                  </p>
                </div>
                <div className="pt-2 border-t border-emerald-200/40 text-[10px] font-mono text-emerald-600">
                  Gatilho: Parecer definitivo da CAD ao Prefeito.
                </div>
              </div>
            </div>

            {/* CONFIGURAÇÃO DE PARÂMETROS REGIMENTAIS */}
            <div className="p-4 rounded-lg border border-border bg-background space-y-3">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="h-4 w-4 text-primary" />
                Parâmetros Regulamentares de Cadência (Comissão CAD)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="p-2.5 rounded bg-muted/30 border border-border/60 space-y-1">
                  <span className="text-[11px] text-muted-foreground block">Interstício Mínimo:</span>
                  <span className="font-mono font-bold text-foreground text-sm">12 meses (365 dias)</span>
                  <span className="text-[10px] text-muted-foreground block">Trava entre avaliações consecutivas</span>
                </div>
                <div className="p-2.5 rounded bg-muted/30 border border-border/60 space-y-1">
                  <span className="text-[11px] text-muted-foreground block">Nota de Corte NFC Padrão:</span>
                  <span className="font-mono font-bold text-primary text-sm">70.0% (70 pontos)</span>
                  <span className="text-[10px] text-muted-foreground block">Aptidão para estabilidade regimental</span>
                </div>
                <div className="p-2.5 rounded bg-muted/30 border border-border/60 space-y-1">
                  <span className="text-[11px] text-muted-foreground block">Tolerância de Afastamento:</span>
                  <span className="font-mono font-bold text-foreground text-sm">90 dias contínuos</span>
                  <span className="text-[10px] text-muted-foreground block">Suspensão automática de estágio</span>
                </div>
                <div className="p-2.5 rounded bg-muted/30 border border-border/60 space-y-1">
                  <span className="text-[11px] text-muted-foreground block">Roll-Over Automático:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">Ativado (N → N+1)</span>
                  <span className="text-[10px] text-muted-foreground block">Abertura compulsória no encerramento</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* ── MODAL: ABERTURA DE NOVO CICLO ────────────────────────────── */}
      <Modal
        open={showModalNovoCiclo}
        onClose={() => setShowModalNovoCiclo(false)}
        title="Abertura de Novo Ciclo de Avaliação"
        size="xl"
      >
        <form onSubmit={handleCriarCiclo} className="space-y-4">
          {/* BANNER DE IDENTIFICAÇÃO DA ETAPA E REGRA CANÔNICA */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-muted/40 rounded-xl border border-border text-xs">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs border-primary/40 text-primary bg-primary/10">
                Etapa {formEtapa} de 3
              </Badge>
              <span className="font-semibold text-foreground">
                {formEtapa === 1 && '1º Ano — Avaliação Probatória Inicial (12 meses)'}
                {formEtapa === 2 && '2º Ano — Avaliação Probatória Intermediária (24 meses)'}
                {formEtapa === 3 && '3º Ano — Consolidação Trienal Conclusiva para Estabilidade (36 meses)'}
              </span>
            </div>
            <div className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Art. 41 CF / Lei nº 1.704</span>
            </div>
          </div>

          {/* CARD 1: IDENTIFICAÇÃO E COMPETÊNCIA */}
          <div className="bg-card/70 rounded-xl border border-border/80 p-4 space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-md bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                  1
                </div>
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Identificação & Competência Funcional
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground font-mono">
                Parâmetros Obrigatórios
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-foreground">
                  Nome Oficial do Ciclo *
                </label>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">Sugestão:</span>
                  <button
                    type="button"
                    onClick={() => setFormNome(`Ciclo Anual ${formAno} (${formEtapa}ª Etapa${formEtapa === 3 ? ' - Consolidação Trienal' : ''})`)}
                    className="text-[10px] text-primary hover:underline font-medium"
                  >
                    [Padrão Etapa]
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormNome(`Ciclo de Avaliação de Desempenho ${formAno}`)}
                    className="text-[10px] text-primary hover:underline font-medium"
                  >
                    [Geral]
                  </button>
                </div>
              </div>
              <Input
                value={formNome}
                onChange={(e) => setFormNome(e.target.value)}
                placeholder="Ex.: Ciclo Anual 2027 (1ª Etapa - Avaliação Probatória Inicial)"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Ano de Competência *
                </label>
                <Input
                  type="number"
                  value={formAno}
                  onChange={(e) => {
                    const nextAno = Number(e.target.value);
                    setFormAno(nextAno);
                    if (!formNome || formNome.includes('Ciclo')) {
                      setFormNome(`Ciclo Anual ${nextAno} (${formEtapa}ª Etapa${formEtapa === 3 ? ' - Consolidação Trienal' : ''})`);
                    }
                  }}
                  className="font-mono text-center font-bold tabular-nums"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Etapa da Cadência (1 a 3) *
                </label>
                <Select
                  value={String(formEtapa)}
                  onChange={(v) => {
                    const nextEtapa = Number(v);
                    setFormEtapa(nextEtapa);
                    setFormNome(`Ciclo Anual ${formAno} (${nextEtapa}ª Etapa${nextEtapa === 3 ? ' - Consolidação Trienal' : ''})`);
                  }}
                  options={[
                    { value: '1', label: 'Etapa 1 (1º Ano / 12 meses)' },
                    { value: '2', label: 'Etapa 2 (2º Ano / 24 meses)' },
                    { value: '3', label: 'Etapa 3 (3º Ano / 36 meses - Conclusivo)' },
                  ]}
                />
              </div>
            </div>
          </div>

          {/* CARD 2: CRONOGRAMA REGULAMENTAR (12 MESES) */}
          <div className="bg-card/70 rounded-xl border border-border/80 p-4 space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                  2
                </div>
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Cronograma Regulamentar (Interstício de 12 Meses)
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFormDataInicio(`${formAno}-01-01`);
                  setFormDataFim(`${formAno}-12-31`);
                  setFormDataLimitePreenchimento(`${formAno}-10-31`);
                  setFormDataLimiteRecurso(`${formAno}-11-15`);
                }}
                className="text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1.5 transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span>Preencher Ano Padrão ({formAno})</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Início da Vigência do Ciclo *
                </label>
                <Input
                  type="date"
                  value={formDataInicio}
                  onChange={(e) => setFormDataInicio(e.target.value)}
                  className="font-mono tabular-nums"
                  required
                />
                <span className="text-[11px] text-muted-foreground mt-0.5 block">
                  Início formal do interstício de 12 meses
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Fim da Vigência do Ciclo *
                </label>
                <Input
                  type="date"
                  value={formDataFim}
                  onChange={(e) => setFormDataFim(e.target.value)}
                  className="font-mono tabular-nums"
                  required
                />
                <span className="text-[11px] text-muted-foreground mt-0.5 block">
                  Término do período avaliativo ordinário
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Limite Preenchimento (Chefias Imediatas)
                </label>
                <Input
                  type="date"
                  value={formDataLimitePreenchimento}
                  onChange={(e) => setFormDataLimitePreenchimento(e.target.value)}
                  className="font-mono tabular-nums"
                />
                <span className="text-[11px] text-muted-foreground mt-0.5 block">
                  Trava de prazo para submissão dos relatórios de notas
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Limite para Interposição de Recursos
                </label>
                <Input
                  type="date"
                  value={formDataLimiteRecurso}
                  onChange={(e) => setFormDataLimiteRecurso(e.target.value)}
                  className="font-mono tabular-nums"
                />
                <span className="text-[11px] text-muted-foreground mt-0.5 block">
                  Prazo decadencial para o servidor recorrer à CAD
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 flex items-center gap-2 text-xs text-blue-800 dark:text-blue-300">
              <Clock className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
              <span>
                Cadência de 12 meses: 3 avaliações em 3 anos com interstício mínimo legal obrigatório entre etapas.
              </span>
            </div>
          </div>

          {/* CARD 3: NOTA DE CORTE & ROLL-OVER */}
          <div className="bg-card/70 rounded-xl border border-border/80 p-4 space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xs">
                  3
                </div>
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Nota de Corte (NFC) & Automação de Cadência
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground font-mono">
                Trava Anti-Leniência & Roll-over
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-foreground">
                    Nota de Corte NFC (%)
                  </label>
                  <span className="text-[11px] font-mono font-bold text-primary tabular-nums">
                    {Number(formNotaCorte || 0).toFixed(1)}% mínimo
                  </span>
                </div>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={formNotaCorte}
                  onChange={(e) => setFormNotaCorte(Number(e.target.value))}
                  className="font-mono font-bold text-base tabular-nums"
                  required
                />
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-[10px] text-muted-foreground">Presets:</span>
                  {[60, 70, 75, 80].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setFormNotaCorte(v)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                        Number(formNotaCorte) === v
                          ? 'bg-primary text-primary-foreground font-bold'
                          : 'bg-muted hover:bg-muted/80 text-foreground'
                      }`}
                    >
                      {v}%{v === 70 ? ' (Padrão)' : ''}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-muted/40 rounded-xl border border-border/80 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                  <Award className="h-4 w-4 text-amber-500" />
                  <span>Régua de Aprovação Funcional</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Servidores com nota final ≥ <span className="font-mono font-semibold text-foreground tabular-nums">{Number(formNotaCorte || 70).toFixed(1)}%</span> são considerados aptos na etapa para efeitos de estágio probatório e progressão na carreira.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-border bg-muted/30 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <RotateCw className="h-4 w-4 text-primary" />
                  <span className="font-bold text-xs text-foreground">
                    Roll-over Automático da Cadência (N → N+1)
                  </span>
                </div>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  Ao homologar ou encerrar este ciclo, provisiona automaticamente o ciclo subsequente de 12 meses (Etapa {((formEtapa || 1) % 3) + 1} de 3), garantindo a continuidade do estágio probatório.
                </p>
              </div>
              <Switch
                checked={formCadenciaAutomatica}
                onCheckedChange={setFormCadenciaAutomatica}
              />
            </div>
          </div>

          {/* RODAPÉ DO MODAL */}
          <div className="flex items-center justify-between pt-3 border-t border-border mt-4">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Parâmetros auditados com registro imutável no log</span>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <Button
                variant="outline"
                size="md"
                type="button"
                onClick={() => setShowModalNovoCiclo(false)}
              >
                Cancelar
              </Button>
              <Button
                size="md"
                type="submit"
                disabled={saving}
                className="font-bold shadow-sm flex items-center gap-1.5"
              >
                <CheckCircle2 className="h-4 w-4" />
                {saving ? 'Criando Ciclo...' : 'Abrir Ciclo'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* ── MODAL: EDITAR / PARAMETRIZAR CICLO ───────────────────────── */}
      <Modal
        open={showModalEditarCiclo}
        onClose={() => setShowModalEditarCiclo(false)}
        title={`Parametrizar Ciclo — ${cicloParaEditar?.nome || ''}`}
        size="xl"
      >
        <form onSubmit={handleSalvarEdicao} className="space-y-4">
          {/* BANNER DE IDENTIFICAÇÃO DA ETAPA E REGRA CANÔNICA */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-muted/40 rounded-xl border border-border text-xs">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs border-primary/40 text-primary bg-primary/10">
                Etapa {editEtapa} de 3
              </Badge>
              <span className="font-semibold text-foreground">
                {editEtapa === 1 && '1º Ano — Avaliação Probatória Inicial (12 meses)'}
                {editEtapa === 2 && '2º Ano — Avaliação Probatória Intermediária (24 meses)'}
                {editEtapa === 3 && '3º Ano — Consolidação Trienal Conclusiva para Estabilidade (36 meses)'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {editStatus && (
                <StatusChip
                  label={STATUS_LABEL[editStatus] ?? editStatus.toUpperCase()}
                  variant={STATUS_VARIANT[editStatus] ?? 'neutral'}
                />
              )}
              <div className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Art. 41 CF / Lei nº 1.704</span>
              </div>
            </div>
          </div>

          {/* CARD 1: IDENTIFICAÇÃO E COMPETÊNCIA */}
          <div className="bg-card/70 rounded-xl border border-border/80 p-4 space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-md bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                  1
                </div>
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Identificação & Competência Funcional
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground font-mono">
                Parâmetros Obrigatórios
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-foreground">
                  Nome Oficial do Ciclo *
                </label>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">Sugestão:</span>
                  <button
                    type="button"
                    onClick={() => setEditNome(`Ciclo Anual ${editAno} (${editEtapa}ª Etapa${editEtapa === 3 ? ' - Consolidação Trienal' : ''})`)}
                    className="text-[10px] text-primary hover:underline font-medium"
                  >
                    [Padrão Etapa]
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditNome(`Ciclo de Avaliação de Desempenho ${editAno}`)}
                    className="text-[10px] text-primary hover:underline font-medium"
                  >
                    [Geral]
                  </button>
                </div>
              </div>
              <Input
                value={editNome}
                onChange={(e) => setEditNome(e.target.value)}
                placeholder="Ex.: Ciclo Anual 2026 (3ª Etapa - Consolidação Trienal de Progressão)"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Ano Competência *
                </label>
                <Input
                  type="number"
                  value={editAno}
                  onChange={(e) => setEditAno(Number(e.target.value))}
                  className="font-mono text-center font-bold tabular-nums"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Etapa Cadência (1 a 3) *
                </label>
                <Select
                  value={String(editEtapa)}
                  onChange={(v) => setEditEtapa(Number(v))}
                  options={[
                    { value: '1', label: 'Etapa 1 (1º Ano / 12 meses)' },
                    { value: '2', label: 'Etapa 2 (2º Ano / 24 meses)' },
                    { value: '3', label: 'Etapa 3 (3º Ano / 36 meses - Conclusivo)' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Status Operacional *
                </label>
                <Select
                  value={editStatus}
                  onChange={setEditStatus}
                  options={[
                    { value: 'aberto', label: 'Em Andamento' },
                    { value: 'em_avaliacao', label: 'Em Avaliação' },
                    { value: 'em_recurso', label: 'Em Fase Recursal' },
                    { value: 'deliberacao', label: 'Em Deliberação' },
                    { value: 'homologado', label: 'Homologado' },
                    { value: 'encerrado', label: 'Encerrado' },
                  ]}
                />
              </div>
            </div>
          </div>

          {/* CARD 2: CRONOGRAMA REGULAMENTAR (12 MESES) */}
          <div className="bg-card/70 rounded-xl border border-border/80 p-4 space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                  2
                </div>
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Cronograma Regulamentar (Interstício de 12 Meses)
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditDataInicio(`${editAno}-01-01`);
                  setEditDataFim(`${editAno}-12-31`);
                  setEditLimitePreenchimento(`${editAno}-10-31`);
                  setEditLimiteRecurso(`${editAno}-11-15`);
                }}
                className="text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1.5 transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span>Preencher Ano Padrão ({editAno})</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Início da Vigência do Ciclo *
                </label>
                <Input
                  type="date"
                  value={editDataInicio}
                  onChange={(e) => setEditDataInicio(e.target.value)}
                  className="font-mono tabular-nums"
                  required
                />
                <span className="text-[11px] text-muted-foreground mt-0.5 block">
                  Início formal do interstício de 12 meses
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Fim da Vigência do Ciclo *
                </label>
                <Input
                  type="date"
                  value={editDataFim}
                  onChange={(e) => setEditDataFim(e.target.value)}
                  className="font-mono tabular-nums"
                  required
                />
                <span className="text-[11px] text-muted-foreground mt-0.5 block">
                  Término do período avaliativo ordinário
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Limite Preenchimento (Chefias Imediatas)
                </label>
                <Input
                  type="date"
                  value={editLimitePreenchimento}
                  onChange={(e) => setEditLimitePreenchimento(e.target.value)}
                  className="font-mono tabular-nums"
                />
                <span className="text-[11px] text-muted-foreground mt-0.5 block">
                  Trava de prazo para submissão dos relatórios de notas
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Limite para Interposição de Recursos
                </label>
                <Input
                  type="date"
                  value={editLimiteRecurso}
                  onChange={(e) => setEditLimiteRecurso(e.target.value)}
                  className="font-mono tabular-nums"
                />
                <span className="text-[11px] text-muted-foreground mt-0.5 block">
                  Prazo decadencial para o servidor recorrer à CAD
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 flex items-center gap-2 text-xs text-blue-800 dark:text-blue-300">
              <Clock className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
              <span>
                Cadência de 12 meses: 3 avaliações em 3 anos com interstício mínimo legal obrigatório entre etapas.
              </span>
            </div>
          </div>

          {/* CARD 3: NOTA DE CORTE & ROLL-OVER */}
          <div className="bg-card/70 rounded-xl border border-border/80 p-4 space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xs">
                  3
                </div>
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Nota de Corte (NFC) & Automação de Cadência
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground font-mono">
                Trava Anti-Leniência & Roll-over
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-foreground">
                    Nota de Corte NFC (%)
                  </label>
                  <span className="text-[11px] font-mono font-bold text-primary tabular-nums">
                    {Number(editNotaCorte || 0).toFixed(1)}% mínimo
                  </span>
                </div>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={editNotaCorte}
                  onChange={(e) => setEditNotaCorte(Number(e.target.value))}
                  className="font-mono font-bold text-base tabular-nums"
                  required
                />
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-[10px] text-muted-foreground">Presets:</span>
                  {[60, 70, 75, 80].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setEditNotaCorte(v)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                        Number(editNotaCorte) === v
                          ? 'bg-primary text-primary-foreground font-bold'
                          : 'bg-muted hover:bg-muted/80 text-foreground'
                      }`}
                    >
                      {v}%{v === 70 ? ' (Padrão)' : ''}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-muted/40 rounded-xl border border-border/80 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                  <Award className="h-4 w-4 text-amber-500" />
                  <span>Régua de Aprovação Funcional</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Servidores com nota final ≥ <span className="font-mono font-semibold text-foreground tabular-nums">{Number(editNotaCorte || 70).toFixed(1)}%</span> são considerados aptos na etapa para efeitos de estágio probatório e progressão na carreira.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-border bg-muted/30 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <RotateCw className="h-4 w-4 text-primary" />
                  <span className="font-bold text-xs text-foreground">
                    Roll-over Automático da Cadência (N → N+1)
                  </span>
                </div>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  Ao homologar ou encerrar este ciclo, provisiona automaticamente o ciclo subsequente de 12 meses (Etapa {((editEtapa || 1) % 3) + 1} de 3), garantindo a continuidade do estágio probatório.
                </p>
              </div>
              <Switch
                checked={editCadenciaAutomatica}
                onCheckedChange={setEditCadenciaAutomatica}
              />
            </div>
          </div>

          {/* RODAPÉ DO MODAL */}
          <div className="flex items-center justify-between pt-3 border-t border-border mt-4">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Parâmetros auditados com registro imutável no log</span>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <Button
                variant="outline"
                size="md"
                type="button"
                onClick={() => setShowModalEditarCiclo(false)}
              >
                Cancelar
              </Button>
              <Button
                size="md"
                type="submit"
                disabled={salvandoEdicao}
                className="font-bold shadow-sm flex items-center gap-1.5"
              >
                <CheckCircle2 className="h-4 w-4" />
                {salvandoEdicao ? 'Salvando Alterações...' : 'Salvar Alterações'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* ── MODAL: CONFIRMAÇÃO DE ENCERRAMENTO (SEM ALERT/CONFIRM) ───── */}
      <Modal
        open={encerramentoModal.open}
        onClose={() => setEncerramentoModal({ open: false, ciclo: null, abrirProximo: false })}
        title="Confirmar Encerramento do Ciclo de Avaliação"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 space-y-2">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
              {encerramentoModal.abrirProximo
                ? 'Encerrar Ciclo Atual & Abrir Subsequente (N → N+1)'
                : 'Encerrar Ciclo de Avaliação'}
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
              {encerramentoModal.abrirProximo
                ? `O ciclo "${encerramentoModal.ciclo?.nome}" será encerrado e o ciclo de 12 meses seguinte (Etapa ${((encerramentoModal.ciclo?.etapa_cadencia || 1) % 3) + 1} de 3) será provisionado automaticamente no banco de dados.`
                : `O ciclo "${encerramentoModal.ciclo?.nome}" será marcado como encerrado. As avaliações vigentes serão travadas para novas inserções.`}
            </p>
          </div>

          <div className="p-3 rounded border border-border bg-muted/20 text-xs space-y-1 font-mono">
            <div>Ciclo: {encerramentoModal.ciclo?.nome}</div>
            <div>Etapa Atual: {encerramentoModal.ciclo?.etapa_cadencia || 1} de 3</div>
            <div>
              Próxima Ação:{' '}
              {encerramentoModal.abrirProximo
                ? `Provisionar Etapa ${((encerramentoModal.ciclo?.etapa_cadencia || 1) % 3) + 1} com roll-over`
                : 'Apenas encerrar'}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEncerramentoModal({ open: false, ciclo: null, abrirProximo: false })}
              disabled={encerrando}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              className="bg-primary text-primary-foreground font-bold"
              onClick={confirmarEncerramento}
              disabled={encerrando}
            >
              {encerrando ? 'Encerrando...' : 'Confirmar Encerramento'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── MODAL: ELEGIBILIDADE & BLOQUEIOS LEGAIS ───────────────────── */}
      <Modal
        open={showModalElegibilidade}
        onClose={() => setShowModalElegibilidade(false)}
        title={`Elegibilidade & Bloqueios Funcionais — ${selectedCiclo?.nome ?? ''}`}
        size="full"
      >
        {loadingElegibilidade ? (
          <div className="p-12 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
            <RotateCw className="h-6 w-6 animate-spin text-primary" />
            <span>Processando regras de elegibilidade funcional e afastamentos médicos/licenças...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* CARDS DE RESUMO DE ELEGIBILIDADE */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 bg-muted/40 rounded-lg border border-border text-center space-y-1">
                <span className="text-xs text-muted-foreground block">Quadro Geral Analisado</span>
                <span className="text-2xl font-bold font-mono text-foreground tabular-nums">
                  {elegibilidadeData?.total_analisados ?? servidoresElegibilidadeNormalizados.length}
                </span>
                <span className="text-[10px] text-muted-foreground block">Servidores efetivos</span>
              </div>
              <div className="p-3.5 bg-emerald-500/10 rounded-lg border border-emerald-500/30 text-center space-y-1">
                <span className="text-xs text-emerald-600 dark:text-emerald-400 block font-semibold">Servidores Elegíveis</span>
                <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {elegibilidadeData?.total_elegiveis ?? servidoresElegibilidadeNormalizados.filter((s) => s.elegivel).length}
                </span>
                <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 block">Aptos à avaliação ordinária</span>
              </div>
              <div className="p-3.5 bg-rose-500/10 rounded-lg border border-rose-500/30 text-center space-y-1">
                <span className="text-xs text-rose-600 dark:text-rose-400 block font-semibold">Bloqueados / Afastados</span>
                <span className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400 tabular-nums">
                  {elegibilidadeData?.total_bloqueados ?? servidoresElegibilidadeNormalizados.filter((s) => !s.elegivel).length}
                </span>
                <span className="text-[10px] text-rose-600/80 dark:text-rose-400/80 block">Licença &gt; 90 dias / Suspensão</span>
              </div>
            </div>

            {/* FILTROS INTERNOS DA ELEGIBILIDADE */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 border-b border-border pb-3">
              <div className="flex-1 max-w-md">
                <SearchInput
                  value={buscaElegibilidade}
                  onChange={setBuscaElegibilidade}
                  placeholder="Buscar servidor por nome, matrícula ou motivo..."
                />
              </div>

              <div className="flex items-center gap-1.5 bg-muted/40 p-1 rounded-lg border border-border/60">
                <button
                  type="button"
                  onClick={() => setFiltroTipoElegibilidade('todos')}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                    filtroTipoElegibilidade === 'todos'
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground'
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroTipoElegibilidade('elegiveis')}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                    filtroTipoElegibilidade === 'elegiveis'
                      ? 'bg-background text-emerald-600 shadow-xs'
                      : 'text-muted-foreground'
                  }`}
                >
                  Elegíveis
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroTipoElegibilidade('bloqueados')}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                    filtroTipoElegibilidade === 'bloqueados'
                      ? 'bg-background text-rose-600 shadow-xs'
                      : 'text-muted-foreground'
                  }`}
                >
                  Bloqueados
                </button>
              </div>
            </div>

            {/* LISTA ESTRUTURADA DE SERVIDORES ANALISADOS */}
            {servidoresElegibilidadeNormalizados.length > 0 ? (
              <div className="max-h-96 overflow-y-auto pr-1 space-y-1.5">
                {servidoresElegibilidadeNormalizados.map((s) => (
                  <div
                    key={s.id}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-xs gap-3 ${
                      s.elegivel
                        ? 'bg-background border-border/70 hover:border-emerald-300 dark:hover:border-emerald-900/50'
                        : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40'
                    }`}
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="font-semibold text-foreground truncate">
                        {s.nome}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono tabular-nums">
                        <span>Matrícula: {s.matricula}</span>
                        <span>•</span>
                        <span className="font-sans truncate">{s.cargo}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {s.elegivel ? (
                        <StatusChip label="ELEGÍVEL" variant="success" />
                      ) : (
                        <div className="text-right space-y-0.5">
                          <StatusChip label="BLOQUEADO" variant="danger" />
                          {s.motivo && (
                            <div className="text-[10px] text-rose-600 dark:text-rose-400 font-sans max-w-xs truncate" title={s.motivo}>
                              {s.motivo}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-8 text-xs text-muted-foreground">
                Nenhum servidor encontrado com os critérios de filtro.
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-border">
              <Button size="sm" variant="outline" onClick={() => setShowModalElegibilidade(false)}>
                Fechar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default GestaoCiclosPanel;
