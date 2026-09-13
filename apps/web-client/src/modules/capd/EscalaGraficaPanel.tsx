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
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RotateCw,
} from 'lucide-react';
import { SysgovApi } from '@sysgov/sdk';
import type { ApiModeloFormulario } from '@sysgov/sdk';

const api = new SysgovApi();

interface EscalaNivel {
  id?: number;
  grau: number;
  rotulo: string;
  valor_min: number;
  valor_max: number;
  descricao_comportamental?: string;
}

interface EscalaGrafica {
  id: number;
  modelo_id: number;
  nome: string;
  descricao?: string;
  qtd_niveis: number;
  ativa: boolean;
  niveis: EscalaNivel[];
}

const NIVEIS_PADRAO: EscalaNivel[] = [
  { grau: 1, rotulo: 'Insuficiente', valor_min: 0,   valor_max: 39.99, descricao_comportamental: 'Desempenho muito abaixo do esperado.' },
  { grau: 2, rotulo: 'Regular',      valor_min: 40,  valor_max: 59.99, descricao_comportamental: 'Desempenho abaixo do padrão desejado.' },
  { grau: 3, rotulo: 'Bom',          valor_min: 60,  valor_max: 74.99, descricao_comportamental: 'Desempenho dentro do esperado.' },
  { grau: 4, rotulo: 'Muito Bom',    valor_min: 75,  valor_max: 89.99, descricao_comportamental: 'Desempenho acima do esperado.' },
  { grau: 5, rotulo: 'Excelente',    valor_min: 90,  valor_max: 100,   descricao_comportamental: 'Desempenho excepcional.' },
];

interface Props {
  modeloId?: number;
}

export const EscalaGraficaPanel: React.FC<Props> = ({ modeloId: propModeloId }) => {
  const [modelos, setModelos]                   = useState<ApiModeloFormulario[]>([]);
  const [selectedModeloId, setSelectedModeloId] = useState<number | null>(propModeloId ?? null);
  const [escalas, setEscalas]                   = useState<EscalaGrafica[]>([]);
  const [loading, setLoading]                   = useState(false);
  const [loadingModelos, setLoadingModelos]     = useState(false);
  const [modalOpen, setModalOpen]               = useState(false);
  const [expandida, setExpandida]               = useState<number | null>(null);
  const [erro, setErro]                         = useState<string | null>(null);
  const [sucesso, setSucesso]                   = useState<string | null>(null);

  // Form
  const [nome, setNome]                         = useState('');
  const [descricao, setDescricao]               = useState('');
  const [niveis, setNiveis]                     = useState<EscalaNivel[]>(NIVEIS_PADRAO);
  const [saving, setSaving]                     = useState(false);

  // 1. Carrega a lista de modelos de formulário do tenant
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

  // 2. Carrega as escalas gráficas do modelo selecionado
  const carregarEscalas = useCallback(async (id: number) => {
    setLoading(true);
    setErro(null);
    try {
      const resp = await api.get<EscalaGrafica[]>(`/capd/modelos-formulario/${id}/escalas-graficas`);
      const list = resp.data ?? [];
      setEscalas(list);
      if (list.length > 0 && !expandida) {
        setExpandida(list[0].id);
      }
    } catch {
      setErro('Não foi possível carregar as escalas gráficas para este modelo.');
      setEscalas([]);
    } finally {
      setLoading(false);
    }
  }, [expandida]);

  useEffect(() => {
    if (selectedModeloId) {
      carregarEscalas(selectedModeloId);
    }
  }, [selectedModeloId, carregarEscalas]);

  const abrirModal = () => {
    setNome('Escala Padrão de Desempenho (5 Graus)');
    setDescricao('Régua gráfica contínua de 0 a 100 pontos para cômputo dos graus de Chiavenato');
    setNiveis(NIVEIS_PADRAO);
    setModalOpen(true);
  };

  const atualizarNivel = (idx: number, campo: keyof EscalaNivel, valor: string | number) => {
    setNiveis(prev => prev.map((n, i) => i === idx ? { ...n, [campo]: valor } : n));
  };

  const validarNiveis = (): string | null => {
    const sorted = [...niveis].sort((a, b) => a.grau - b.grau);
    if (sorted[0]?.valor_min !== 0) return 'O grau 1 deve iniciar em 0.';
    if (sorted[sorted.length - 1]?.valor_max !== 100) return 'O último grau deve terminar em 100.';
    return null;
  };

  const salvar = async () => {
    if (!selectedModeloId) {
      setErro('Selecione um modelo de formulário.');
      return;
    }
    const erroNivel = validarNiveis();
    if (erroNivel) { setErro(erroNivel); return; }
    if (!nome.trim()) { setErro('Informe o nome da escala.'); return; }

    setSaving(true);
    setErro(null);
    try {
      await api.post(`/capd/modelos-formulario/${selectedModeloId}/escalas-graficas`, {
        nome,
        descricao: descricao || undefined,
        niveis: niveis.map(n => ({ ...n, valor_max: Number(n.valor_max) })),
      });
      setSucesso('Escala gráfica criada com sucesso!');
      setModalOpen(false);
      carregarEscalas(selectedModeloId);
    } catch (e: any) {
      setErro(e?.response?.data?.message ?? 'Erro ao salvar escala.');
    } finally {
      setSaving(false);
    }
  };

  const modeloSelecionado = modelos.find(m => m.id === selectedModeloId);

  return (
    <div className="space-y-6">
      {/* PageHeader Canônico */}
      <PageHeader
        icon={<BarChart2 className="h-6 w-6" />}
        title="Escalas Gráficas de Avaliação"
        subtitle="Parametrização dinâmica dos graus de desempenho (3 a 5 níveis) e réguas contínuas de 0 a 100 pontos (RF-03)"
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
              onClick={() => selectedModeloId && carregarEscalas(selectedModeloId)}
              disabled={loading || !selectedModeloId}
              title="Recarregar"
            >
              <RotateCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="primary" size="sm" onClick={abrirModal} disabled={!selectedModeloId}>
              <Plus className="h-4 w-4 mr-1.5" />
              Nova Escala
            </Button>
          </div>
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
        <ScreenState type="loading" title="Carregando Escalas Gráficas..." />
      ) : escalas.length === 0 ? (
        <Card className="gap-0 py-0">
          <EmptyState
            icon={<BarChart2 className="h-10 w-10" />}
            title="Nenhuma escala cadastrada para este formulário"
            description={`O modelo "${modeloSelecionado?.nome ?? ''}" ainda não possui uma régua de escala gráfica configurada.`}
            actionLabel="Criar Escala para este Modelo"
            onAction={abrirModal}
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {escalas.map(escala => (
            <Card key={escala.id} className="gap-0 py-0 overflow-hidden">
              <CardHeader className="p-4 border-b border-border bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <CardTitle className="text-base font-bold text-foreground">{escala.nome}</CardTitle>
                    <StatusChip
                      label={escala.ativa ? 'Ativa' : 'Inativa'}
                      variant={escala.ativa ? 'success' : 'neutral'}
                    />
                    <Badge variant="outline" className="font-mono text-xs">
                      {escala.qtd_niveis} níveis de pontuação
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandida(expandida === escala.id ? null : escala.id)}
                  >
                    {expandida === escala.id
                      ? <ChevronUp className="h-4 w-4" />
                      : <ChevronDown className="h-4 w-4" />
                    }
                  </Button>
                </div>
                {escala.descricao && (
                  <CardDescription className="text-xs text-muted-foreground mt-1">
                    {escala.descricao}
                  </CardDescription>
                )}
              </CardHeader>

              {expandida === escala.id && (
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/10">
                        <TableHead className="w-16 text-xs text-center font-bold">Grau</TableHead>
                        <TableHead className="w-48 text-xs font-bold">Rótulo Conceitual</TableHead>
                        <TableHead className="w-36 text-xs font-bold">Faixa de Pontuação</TableHead>
                        <TableHead className="text-xs font-bold">Descrição Comportamental do Grau</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {escala.niveis.map(nivel => (
                        <TableRow key={nivel.grau}>
                          <TableCell className="font-mono text-xs font-bold text-center">
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent text-accent-foreground">
                              {nivel.grau}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm font-semibold text-foreground">
                            {nivel.rotulo}
                          </TableCell>
                          <TableCell className="font-mono text-xs tabular-nums text-foreground font-semibold">
                            <span className="px-2 py-0.5 rounded bg-muted border border-border">
                              {nivel.valor_min} – {nivel.valor_max} pts
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {nivel.descricao_comportamental ?? '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Modal de criação */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Nova Escala Gráfica — ${modeloSelecionado?.nome ?? ''}`}
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Defina os 3 a 5 graus da escala gráfica contínua de 0 a 100 pontos (Metodologia Chiavenato).
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-foreground block mb-1">Nome da Escala *</label>
              <Input
                value={nome}
                onChange={e => setNome(e.target.value)}
                placeholder="Ex: Escala Padrão Chiavenato (5 Graus)"
                required
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-foreground block mb-1">Descrição</label>
              <Input
                value={descricao}
                onChange={e => setDescricao(e.target.value)}
                placeholder="Ex: Escala contínua de 0 a 100 pontos com 5 graus de desempenho."
              />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <label className="text-xs font-bold uppercase tracking-wider text-foreground block">
              Graus de Desempenho (3 a 5 Níveis)
            </label>

            {niveis.map((nivel, idx) => (
              <div key={nivel.grau} className="grid grid-cols-12 gap-2 items-center bg-muted/20 p-2.5 rounded-lg border border-border">
                <span className="col-span-1 font-mono font-bold text-center text-xs text-foreground">
                  G{nivel.grau}
                </span>
                <div className="col-span-3">
                  <Input
                    value={nivel.rotulo}
                    onChange={e => atualizarNivel(idx, 'rotulo', e.target.value)}
                    placeholder="Rótulo"
                    className="text-xs h-8"
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    value={nivel.valor_min}
                    onChange={e => atualizarNivel(idx, 'valor_min', parseFloat(e.target.value) || 0)}
                    placeholder="Mín"
                    className="text-xs h-8 font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    value={nivel.valor_max}
                    onChange={e => atualizarNivel(idx, 'valor_max', parseFloat(e.target.value) || 0)}
                    placeholder="Máx"
                    className="text-xs h-8 font-mono"
                  />
                </div>
                <div className="col-span-4">
                  <Input
                    value={nivel.descricao_comportamental ?? ''}
                    onChange={e => atualizarNivel(idx, 'descricao_comportamental', e.target.value)}
                    placeholder="Descrição comportamental..."
                    className="text-xs h-8"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" onClick={salvar} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar Escala Gráfica'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default EscalaGraficaPanel;
