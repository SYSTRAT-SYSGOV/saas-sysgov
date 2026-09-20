import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  Card,
  Button,
  Badge,
  Input,
  Select,
  Switch,
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
  ScreenState,
} from '@/components/ui';
import {
  Percent,
  Save,
  AlertTriangle,
  CheckCircle,
  Sliders,
  RotateCw,
  Sparkles,
  RotateCcw,
  Scale,
  Info,
  ShieldCheck,
  CheckCircle2,
  PieChart,
} from 'lucide-react';
import { SysgovApi } from '@sysgov/sdk';
import type { ApiModeloFormulario, ApiModeloFatorPeso, ApiFatoresPesosResponse } from '@sysgov/sdk';

const api = new SysgovApi();

type FatorPeso = ApiModeloFatorPeso;
type PesosResponse = ApiFatoresPesosResponse;

// Paleta semântica canônica do Design System SYSGOV para os fatores na régua fatiada
const CORES_PALETA_FATORES = [
  'bg-emerald-500 text-white dark:bg-emerald-600',
  'bg-indigo-500 text-white dark:bg-indigo-600',
  'bg-cyan-500 text-white dark:bg-cyan-600',
  'bg-amber-500 text-white dark:bg-amber-600',
  'bg-purple-500 text-white dark:bg-purple-600',
  'bg-blue-500 text-white dark:bg-blue-600',
  'bg-teal-500 text-white dark:bg-teal-600',
  'bg-rose-500 text-white dark:bg-rose-600',
  'bg-violet-500 text-white dark:bg-violet-600',
  'bg-slate-500 text-white dark:bg-slate-600',
];

interface Props {
  modeloId?: number;
}

export const FatoresPesosPanel: React.FC<Props> = ({ modeloId: propModeloId }) => {
  const [modelos, setModelos]                   = useState<ApiModeloFormulario[]>([]);
  const [selectedModeloId, setSelectedModeloId] = useState<number | null>(propModeloId ?? null);
  const [dados, setDados]                       = useState<PesosResponse | null>(null);
  const [editados, setEditados]                 = useState<FatorPeso[]>([]);
  const [loading, setLoading]                   = useState(false);
  const [loadingModelos, setLoadingModelos]     = useState(false);
  const [saving, setSaving]                     = useState(false);
  const [erro, setErro]                         = useState<string | null>(null);
  const [sucesso, setSucesso]                   = useState<string | null>(null);
  const [alterado, setAlterado]                 = useState(false);

  // 1. Carrega modelos do tenant
  const carregarModelos = useCallback(async () => {
    setLoadingModelos(true);
    try {
      const data = await api.capd.listModelosFormulario();
      setModelos(data);
      if (data.length > 0) {
        if (propModeloId && data.some(m => m.id === propModeloId)) {
          setSelectedModeloId(propModeloId);
        } else if (!selectedModeloId || !data.some(m => m.id === selectedModeloId)) {
          const prioritario = data.find(m => m.ativo) ?? data[0];
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

  // 2. Carrega pesos do modelo selecionado
  const carregarPesos = useCallback(async (id: number) => {
    setLoading(true);
    setErro(null);
    try {
      const resp = await api.capd.listFatoresPesos(id);
      setDados(resp);
      setEditados(resp?.fatores ?? []);
      setAlterado(false);
    } catch {
      setErro('Não foi possível carregar os pesos dos fatores para este modelo.');
      setDados(null);
      setEditados([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedModeloId) {
      carregarPesos(selectedModeloId);
    }
  }, [selectedModeloId, carregarPesos]);

  // Cálculos de soma e métricas
  const somaAtual = useMemo(() => {
    return editados.reduce((acc, f) => acc + (f.ativo ? Number(f.peso || 0) : 0), 0);
  }, [editados]);

  const somaValida = Math.abs(somaAtual - 100) < 0.01;
  const diferenca = 100 - somaAtual;

  const fatorH = useMemo(() => {
    return editados.find(f => f.redistribuivel);
  }, [editados]);

  const mediaPonderada = useMemo(() => {
    const ativos = editados.filter(f => f.ativo);
    if (ativos.length === 0) return 0;
    return somaAtual / ativos.length;
  }, [editados, somaAtual]);

  const atualizarPeso = (idx: number, valor: string) => {
    const num = parseFloat(valor);
    setEditados(prev => {
      const novo = [...prev];
      novo[idx] = { ...novo[idx], peso: isNaN(num) ? 0 : num };
      return novo;
    });
    setAlterado(true);
    setSucesso(null);
  };

  const ajustarPesoDelta = (idx: number, delta: number) => {
    setEditados(prev => {
      const novo = [...prev];
      const atual = Number(novo[idx].peso || 0);
      const atualizado = Math.max(0, Math.min(100, Math.round((atual + delta) * 100) / 100));
      novo[idx] = { ...novo[idx], peso: atualizado };
      return novo;
    });
    setAlterado(true);
    setSucesso(null);
  };

  const atualizarRedistribuivel = (idx: number, valor: boolean) => {
    setEditados(prev => {
      const novo = [...prev];
      novo[idx] = { ...novo[idx], redistribuivel: valor };
      return novo;
    });
    setAlterado(true);
    setSucesso(null);
  };

  // 3. Utilitários de Auto-Balanceamento e Presets
  const balancearAutomaticamente = () => {
    if (editados.length === 0) return;
    const ativos = editados.filter(f => f.ativo);
    if (ativos.length === 0) return;

    if (somaAtual === 0) {
      // Divide igualmente entre todos os ativos
      const parcelaBase = Math.floor((100 / ativos.length) * 100) / 100;
      let somaDist = 0;

      const novos = editados.map((f, i) => {
        if (!f.ativo) return f;
        if (i === editados.length - 1) {
          const ultimo = Math.round((100 - somaDist) * 100) / 100;
          return { ...f, peso: ultimo };
        }
        somaDist += parcelaBase;
        return { ...f, peso: parcelaBase };
      });
      setEditados(novos);
    } else {
      // Distribui proporcionalmente ao peso atual de cada um
      let somaDist = 0;
      const novos = editados.map((f, i) => {
        if (!f.ativo) return f;
        if (i === editados.length - 1) {
          const ultimo = Math.round((100 - somaDist) * 100) / 100;
          return { ...f, peso: Math.max(0, ultimo) };
        }
        const prop = (Number(f.peso) / somaAtual) * 100;
        const arredondado = Math.round(prop * 100) / 100;
        somaDist += arredondado;
        return { ...f, peso: arredondado };
      });
      setEditados(novos);
    }
    setAlterado(true);
    setSucesso('Pesos balanceados proporcionalmente para atingir exatamente 100,00%!');
  };

  const aplicarDistribuicaoEquitativa = () => {
    if (editados.length === 0) return;
    const count = editados.length;
    const base = Math.floor((100 / count) * 100) / 100;
    let acumulado = 0;

    const novos = editados.map((f, idx) => {
      if (idx === count - 1) {
        return { ...f, peso: Math.round((100 - acumulado) * 100) / 100 };
      }
      acumulado += base;
      return { ...f, peso: base };
    });

    setEditados(novos);
    setAlterado(true);
    setSucesso(`Distribuição equitativa aplicada (${(100 / count).toFixed(2)}% por fator).`);
  };

  const restaurarOriginal = () => {
    if (dados?.fatores) {
      setEditados(dados.fatores);
      setAlterado(false);
      setErro(null);
      setSucesso('Valores originais restaurados.');
    }
  };

  const salvar = async () => {
    if (!selectedModeloId) {
      setErro('Selecione um modelo de formulário.');
      return;
    }
    if (!somaValida) {
      setErro(`A soma dos pesos deve ser exatamente 100%. Soma atual: ${somaAtual.toFixed(2)}%`);
      return;
    }
    setSaving(true);
    setErro(null);
    try {
      await api.capd.syncFatoresPesos(
        selectedModeloId,
        editados.map((f, idx) => ({
          fator_id:       f.fator_id,
          peso:           f.peso,
          redistribuivel: f.redistribuivel,
          ordem:          idx,
        })),
      );
      setSucesso('Pesos sincronizados e homologados com sucesso!');
      setAlterado(false);
      carregarPesos(selectedModeloId);
    } catch (e: any) {
      setErro(e?.response?.data?.message ?? 'Erro ao salvar pesos.');
    } finally {
      setSaving(false);
    }
  };

  const modeloSelecionado = modelos.find(m => m.id === selectedModeloId);

  return (
    <div className="space-y-6">
      {/* ── PageHeader Canônico com Seletor e Ações ── */}
      <PageHeader
        icon={<Sliders className="h-6 w-6 text-primary" />}
        title="Fatores e Pesos do Formulário"
        subtitle="Parametrização ponderada com trava obrigatória de 100,00% e regra de redistribuição do Fator H (Art. 18 / RF-02 e RF-06)"
        badge="Matriz de Ponderação"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {modelos.length > 0 && (
              <div className="w-72">
                <Select
                  value={selectedModeloId ? String(selectedModeloId) : ''}
                  onChange={(val) => setSelectedModeloId(Number(val))}
                  options={modelos.map(m => ({
                    value: String(m.id),
                    label: `${m.nome} (${m.codigo})`,
                  }))}
                  placeholder="Selecione o Modelo..."
                  disabled={loadingModelos}
                />
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => selectedModeloId && carregarPesos(selectedModeloId)}
              disabled={loading || !selectedModeloId}
              title="Recarregar dados do servidor"
            >
              <RotateCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>

            {alterado && (
              <Button
                variant="outline"
                size="sm"
                onClick={restaurarOriginal}
                disabled={saving}
                title="Descartar alterações em memória"
              >
                <RotateCcw className="h-4 w-4 mr-1.5 text-muted-foreground" />
                Restaurar
              </Button>
            )}

            {alterado && (
              <Button
                variant="primary"
                size="sm"
                onClick={salvar}
                disabled={saving || !somaValida}
                className="shadow-sm"
              >
                <Save className="h-4 w-4 mr-1.5" />
                {saving ? 'Salvando...' : 'Salvar Pesos'}
              </Button>
            )}
          </div>
        }
      />

      {/* ── 4 STATCARDS DEDICADOS EXCLUSIVAMENTE À PONDERAÇÃO DOS FATORES ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Soma Total dos Pesos"
          value={`${somaAtual.toFixed(2)}%`}
          caption={
            somaValida
              ? 'Conforme exigência legal (100,00%)'
              : Math.abs(diferenca) < 0.05
              ? 'Ajuste residual de centésimos'
              : diferenca > 0
              ? `Faltam ${diferenca.toFixed(2)}% para 100%`
              : `Excesso de ${Math.abs(diferenca).toFixed(2)}%`
          }
          accentClassName={
            somaValida
              ? 'border-l-emerald-500'
              : Math.abs(diferenca) < 0.1
              ? 'border-l-amber-500'
              : 'border-l-rose-500'
          }
          valueClassName={
            somaValida
              ? 'text-emerald-600 dark:text-emerald-400 font-mono tabular-nums'
              : 'text-rose-600 dark:text-rose-400 font-mono tabular-nums'
          }
          captionClassName={somaValida ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}
        />

        <StatCard
          label="Total de Fatores Ativos"
          value={`${editados.filter(f => f.ativo).length} Critérios`}
          caption={
            modeloSelecionado
              ? `Vinculados ao modelo ${modeloSelecionado.codigo}`
              : 'Fatores de avaliação cadastrados'
          }
          accentClassName="border-l-indigo-500"
          valueClassName="text-indigo-600 dark:text-indigo-400 font-mono tabular-nums"
        />

        <StatCard
          label="Fator H (Atendimento ao Público)"
          value={
            fatorH
              ? `${Number(fatorH.peso || 0).toFixed(2)}%`
              : 'Desativado'
          }
          caption={
            fatorH
              ? 'Redistribuição proporcional ativa (RF-06)'
              : 'Sem fator configurado para redistribuição'
          }
          accentClassName={fatorH ? 'border-l-cyan-500' : 'border-l-muted'}
          valueClassName="text-cyan-600 dark:text-cyan-400 font-mono tabular-nums"
        />

        <StatCard
          label="Média Ponderada por Fator"
          value={`${mediaPonderada.toFixed(2)}%`}
          caption="Equilíbrio médio da pontuação funcional"
          accentClassName="border-l-amber-500"
          valueClassName="text-amber-600 dark:text-amber-400 font-mono tabular-nums"
        />
      </div>

      {/* ── CARD DE DISTRIBUIÇÃO VISUAL EMPILHADA (STACKED DISTRIBUTION BAR) ── */}
      <Card className="p-4 space-y-3 border-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <PieChart className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">
              Régua de Distribuição Ponderada (0% a 100%)
            </h3>
            <Badge
              variant={somaValida ? 'success' : 'outline'}
              className="text-xs font-mono font-bold"
            >
              {somaValida ? '100% Homologado' : `${somaAtual.toFixed(2)}% Total`}
            </Badge>
          </div>

          {/* Barra de Utilitários Rápidos de Balanceamento */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={balancearAutomaticamente}
              disabled={editados.length === 0}
              className="text-xs h-7 px-2.5"
              title="Ajusta proporcionalmente os pesos dos fatores ativos para atingir exatamente 100,00%"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1 text-primary" />
              Balancear em 100%
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={aplicarDistribuicaoEquitativa}
              disabled={editados.length === 0}
              className="text-xs h-7 px-2.5"
              title="Divide os 100% igualmente entre todos os fatores cadastrados"
            >
              <Scale className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
              Distribuição Equitativa
            </Button>
          </div>
        </div>

        {/* Trilha Gráfica Empilhada Contínua */}
        <div className="w-full h-8 bg-muted/40 rounded-lg overflow-hidden flex border border-border/70 p-0.5 shadow-inner">
          {editados.map((fator, idx) => {
            const peso = Number(fator.peso || 0);
            if (peso <= 0) return null;
            const cor = CORES_PALETA_FATORES[idx % CORES_PALETA_FATORES.length];
            const sigla = fator.fator?.codigo || `#${idx + 1}`;

            return (
              <div
                key={fator.fator_id}
                style={{ width: `${Math.max(0, Math.min(100, peso))}%` }}
                className={`h-full flex items-center justify-center transition-all duration-300 relative group select-none text-[11px] font-bold font-mono ${cor} first:rounded-l-md last:rounded-r-md`}
                title={`${sigla}: ${fator.fator?.nome ?? 'Fator'} — ${peso.toFixed(2)}%`}
              >
                {peso >= 6 ? (
                  <span className="truncate px-1 drop-shadow-sm">
                    {sigla} ({peso.toFixed(1)}%)
                  </span>
                ) : peso >= 3 ? (
                  <span className="truncate px-0.5 text-[9px] drop-shadow-sm">{sigla}</span>
                ) : null}
              </div>
            );
          })}

          {/* Espaço residual se faltar para 100% */}
          {diferenca > 0.05 && (
            <div
              style={{ width: `${Math.min(100, diferenca)}%` }}
              className="h-full bg-destructive/15 border-l border-dashed border-destructive/40 flex items-center justify-center text-[10px] text-destructive font-mono font-semibold"
              title={`Falta preencher ${diferenca.toFixed(2)}%`}
            >
              {diferenca >= 5 && `+${diferenca.toFixed(1)}%`}
            </div>
          )}
        </div>

        {/* Legenda dos Fatores com Badges e Cores */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          {editados.map((fator, idx) => {
            const cor = CORES_PALETA_FATORES[idx % CORES_PALETA_FATORES.length];
            const sigla = fator.fator?.codigo || `#${idx + 1}`;
            return (
              <div
                key={fator.fator_id}
                className="flex items-center gap-1.5 bg-muted/30 px-2 py-0.5 rounded border border-border/50 text-muted-foreground hover:text-foreground transition-colors"
              >
                <span className={`w-2.5 h-2.5 rounded-full ${cor} shrink-0`} />
                <span className="font-semibold text-foreground">{sigla}</span>
                <span className="text-[11px] text-muted-foreground truncate max-w-[120px]">
                  {fator.fator?.nome}
                </span>
                <span className="font-mono tabular-nums font-bold text-foreground ml-0.5">
                  {Number(fator.peso || 0).toFixed(2)}%
                </span>
                {fator.redistribuivel && (
                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-cyan-500/50 text-cyan-600 dark:text-cyan-400">
                    RF-06
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* ── ALERTA DE CONFORMIDADE SEMÂNTICA ── */}
      <div
        className={`flex items-center gap-3 rounded-lg p-3.5 border transition-all ${
          somaValida
            ? 'border-status-success-border bg-status-success-bg text-status-success'
            : 'border-status-warning-border bg-status-warning-bg text-status-warning'
        }`}
      >
        <Percent className="w-5 h-5 shrink-0" />
        <div className="text-sm font-medium flex-1">
          <span>
            Soma atual dos pesos dos fatores: <strong className="font-mono tabular-nums text-base">{somaAtual.toFixed(2)}%</strong>
          </span>
          {!somaValida && (
            <span className="ml-2 text-xs opacity-90">
              (Diferença de {(100 - somaAtual).toFixed(2)}% para atingir os 100,00% obrigatórios para homologação)
            </span>
          )}
        </div>

        {!somaValida && (
          <Button
            variant="outline"
            size="sm"
            onClick={balancearAutomaticamente}
            className="text-xs h-7 bg-white dark:bg-card border-status-warning-border text-status-warning hover:bg-status-warning-bg"
          >
            Ajustar Automaticamente
          </Button>
        )}

        {somaValida ? (
          <CheckCircle className="w-5 h-5 ml-2 text-status-success shrink-0" />
        ) : (
          <AlertTriangle className="w-5 h-5 ml-2 text-status-warning shrink-0" />
        )}
      </div>

      {/* Alertas de Notificação */}
      {erro && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{erro}</span>
        </div>
      )}
      {sucesso && (
        <div className="rounded-lg border border-status-success-border bg-status-success-bg px-4 py-3 text-sm text-status-success flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{sucesso}</span>
        </div>
      )}

      {/* ── TABELA DE FATORES E PARAMETRIZAÇÃO DE PESOS ── */}
      {loading ? (
        <ScreenState type="loading" title="Carregando Pesos dos Fatores..." />
      ) : editados.length === 0 ? (
        <Card className="gap-0 py-0">
          <EmptyState
            icon={<Sliders className="h-10 w-10" />}
            title="Nenhum fator configurado neste formulário"
            description={`O modelo "${modeloSelecionado?.nome ?? ''}" ainda não possui fatores de avaliação vinculados.`}
          />
        </Card>
      ) : (
        <Card className="gap-0 py-0 overflow-hidden border-border">
          <div className="p-3.5 bg-muted/20 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Grade de Critérios e Ponderação Funcional
              </span>
            </div>
            <span className="text-xs text-muted-foreground font-mono">
              {editados.length} Fatores no Formulário
            </span>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-12 text-xs text-center font-bold">#</TableHead>
                <TableHead className="w-24 text-xs font-bold">Código</TableHead>
                <TableHead className="text-xs font-bold">Fator de Avaliação e Competência</TableHead>
                <TableHead className="w-48 text-xs text-center font-bold">Peso Ponderado (%)</TableHead>
                <TableHead className="w-44 text-xs text-center font-bold">
                  <span title="Redistribuível proporcionalmente para cargos sem atendimento ao público (RF-06)">
                    Fator H Redistr. (RF-06)
                  </span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {editados.map((fator, idx) => (
                <TableRow key={fator.fator_id} className="hover:bg-muted/10 transition-colors">
                  <TableCell className="font-mono text-xs text-muted-foreground text-center font-semibold">
                    {idx + 1}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs font-bold bg-muted/30">
                      {fator.fator?.codigo ?? `#${fator.fator_id}`}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">
                          {fator.fator?.nome ?? '—'}
                        </span>
                        {fator.redistribuivel && (
                          <Badge variant="outline" className="text-[10px] border-cyan-500/50 text-cyan-600 dark:text-cyan-400">
                            Atendimento ao Público
                          </Badge>
                        )}
                      </div>
                      {fator.fator?.descricao && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {fator.fator.descricao}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => ajustarPesoDelta(idx, -1)}
                        className="h-7 w-7 p-0 text-xs font-mono font-bold"
                        title="Diminuir 1%"
                      >
                        -
                      </Button>
                      <div className="relative flex items-center">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step={0.01}
                          value={fator.peso}
                          onChange={e => atualizarPeso(idx, e.target.value)}
                          className="text-xs font-mono tabular-nums font-bold text-center w-20 h-8 pr-5"
                        />
                        <span className="absolute right-2 text-muted-foreground text-xs font-mono pointer-events-none">
                          %
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => ajustarPesoDelta(idx, 1)}
                        className="h-7 w-7 p-0 text-xs font-mono font-bold"
                        title="Aumentar 1%"
                      >
                        +
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Switch
                        checked={fator.redistribuivel}
                        onCheckedChange={v => atualizarRedistribuivel(idx, v)}
                      />
                      <span className="text-xs font-mono text-muted-foreground">
                        {fator.redistribuivel ? 'Sim' : 'Não'}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* ── NOTA REGULAMENTAR CANÔNICA ── */}
      <div className="p-4 rounded-lg bg-muted/20 border border-border flex items-start gap-3">
        <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>
            <strong className="text-foreground">Fundamentação Normativa (Lei nº 1.704/2006, Art. 18):</strong> A avaliação de desempenho funcional deve distribuir 100% de sua pontuação de forma ponderada entre os fatores regimentais previstos.
          </p>
          <p>
            * <strong>Regra de Redistribuição do Fator H (RF-06):</strong> Caso o servidor avaliado esteja lotado em funções sem atendimento direto ao público, o percentual atribuído ao Fator H é automaticamente expurgado em tempo de execução e redistribuído de maneira estritamente proporcional entre os demais critérios ativos, preservando a base de cálculo de 100 pontos sem distorções avaliativas.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FatoresPesosPanel;
