import React, { useCallback, useEffect, useState } from 'react';
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
  BarChart2,
  Plus,
  Trash2,
  Edit2,
  CheckCircle,
  AlertTriangle,
  Sliders,
  ChevronDown,
  ChevronUp,
  Save,
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
  const [modelos, setModelos]               = useState<ApiModeloFormulario[]>([]);
  const [selectedModeloId, setSelectedModeloId] = useState<number | null>(propModeloId ?? null);
  const [escalas, setEscalas]               = useState<EscalaGrafica[]>([]);
  const [loading, setLoading]               = useState(false);
  const [loadingModelos, setLoadingModelos] = useState(false);
  const [modalOpen, setModalOpen]           = useState(false);
  const [expandida, setExpandida]           = useState<number | null>(null);
  const [erro, setErro]                     = useState<string | null>(null);
  const [sucesso, setSucesso]               = useState<string | null>(null);

  // Form
  const [nome, setNome]                     = useState('');
  const [descricao, setDescricao]           = useState('');
  const [niveis, setNiveis]                 = useState<EscalaNivel[]>(NIVEIS_PADRAO);
  const [saving, setSaving]                 = useState(false);

  // 1. Carrega a lista de modelos de formulário do tenant
  const carregarModelos = useCallback(async () => {
    setLoadingModelos(true);
    try {
      const data = await api.capd.listModelosFormulario();
      setModelos(data);
      if (data.length > 0) {
        // Se propModeloId foi passado e existe na lista, prioriza
        if (propModeloId && data.some(m => m.id === propModeloId)) {
          setSelectedModeloId(propModeloId);
        } else if (!selectedModeloId || !data.some(m => m.id === selectedModeloId)) {
          // Prioriza o modelo ativo ou mais recente
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
      setEscalas(resp.data ?? []);
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

  const abrirModal = () => {
    setNome('Escala Padrão de Desempenho');
    setDescricao('');
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

  return (
    <div className="space-y-4">
      {/* Header com Seletor de Modelo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#101a3a] border border-[#1a2a52] rounded-xl p-4">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-emerald-400" />
            Escalas Gráficas de Avaliação
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure os graus de desempenho (3 a 5 níveis) e faixas de pontuação por formulário
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {modelos.length > 0 && (
            <div className="min-w-[280px]">
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
            variant="ghost"
            size="sm"
            onClick={() => selectedModeloId && carregarEscalas(selectedModeloId)}
            disabled={loading || !selectedModeloId}
            title="Recarregar"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>

          <Button variant="default" size="sm" onClick={abrirModal} disabled={!selectedModeloId}>
            <Plus className="w-3 h-3 mr-1" /> Nova Escala
          </Button>
        </div>
      </div>

      {/* Alertas */}
      {erro && (
        <div className="flex items-start gap-2 bg-rose-950/50 border border-rose-500/30 rounded-lg p-3 text-rose-300 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{erro}</span>
        </div>
      )}
      {sucesso && (
        <div className="flex items-start gap-2 bg-emerald-950/50 border border-emerald-500/30 rounded-lg p-3 text-emerald-300 text-xs">
          <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{sucesso}</span>
        </div>
      )}

      {/* Lista de escalas */}
      {loading ? (
        <div className="text-slate-400 text-sm text-center py-8">Carregando...</div>
      ) : escalas.length === 0 ? (
        <div className="text-center py-10 bg-[#152244] rounded-xl border border-[#1a2a52] space-y-3">
          <BarChart2 className="w-10 h-10 mx-auto text-slate-500" />
          <p className="text-slate-300 text-sm font-medium">Nenhuma escala cadastrada para este formulário.</p>
          <p className="text-slate-400 text-xs max-w-md mx-auto">
            Defina uma escala gráfica contínua de 0 a 100 pontos para parametrizar os graus de desempenho deste instrumento.
          </p>
          <div className="pt-2">
            <Button variant="default" size="sm" onClick={abrirModal} disabled={!selectedModeloId}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Criar Escala para este Modelo
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {escalas.map(escala => (
            <Card key={escala.id} className="bg-[#152244] border-[#1a2a52]">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm text-white">{escala.nome}</CardTitle>
                    <Badge variant={escala.ativa ? 'default' : 'secondary'} className="text-[10px]">
                      {escala.ativa ? 'Ativa' : 'Inativa'}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {escala.qtd_niveis} níveis
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandida(expandida === escala.id ? null : escala.id)}
                  >
                    {expandida === escala.id
                      ? <ChevronUp className="w-4 h-4" />
                      : <ChevronDown className="w-4 h-4" />
                    }
                  </Button>
                </div>
                {escala.descricao && (
                  <CardDescription className="text-xs">{escala.descricao}</CardDescription>
                )}
              </CardHeader>

              {expandida === escala.id && (
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Grau</TableHead>
                        <TableHead className="text-xs">Rótulo</TableHead>
                        <TableHead className="text-xs">Faixa</TableHead>
                        <TableHead className="text-xs">Descrição Comportamental</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {escala.niveis.map(nivel => (
                        <TableRow key={nivel.grau}>
                          <TableCell className="font-mono text-xs text-center w-12">{nivel.grau}</TableCell>
                          <TableCell className="text-xs font-medium">{nivel.rotulo}</TableCell>
                          <TableCell className="font-mono text-xs text-emerald-400">
                            {nivel.valor_min} – {nivel.valor_max}
                          </TableCell>
                          <TableCell className="text-xs text-slate-400 max-w-xs">
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
        title="Nova Escala Gráfica"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-400">Configure os graus e faixas de pontuação (0–100 pontos)</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-slate-400 mb-1 block">Nome da Escala *</label>
              <Input
                value={nome}
                onChange={e => setNome(e.target.value)}
                placeholder="Ex.: Escala Padrão 2026"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-slate-400 mb-1 block">Descrição (opcional)</label>
              <Input
                value={descricao}
                onChange={e => setDescricao(e.target.value)}
                placeholder="Descreva o propósito desta escala"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-300">Níveis de Desempenho</label>
              <span className="text-[10px] text-slate-500 font-mono">
                Faixa 0–100 pontos · {niveis.length} níveis
              </span>
            </div>

            <div className="space-y-2">
              {niveis.map((nivel, idx) => (
                <div key={idx} className="bg-[#101a3a] border border-[#1a2a52] rounded-lg p-3 grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-1">
                    <label className="text-[10px] text-slate-500 block mb-1">Grau</label>
                    <span className="font-mono text-sm text-emerald-400 block text-center">{nivel.grau}</span>
                  </div>
                  <div className="col-span-3">
                    <label className="text-[10px] text-slate-500 block mb-1">Rótulo *</label>
                    <Input
                      value={nivel.rotulo}
                      onChange={e => atualizarNivel(idx, 'rotulo', e.target.value)}
                      className="text-xs"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] text-slate-500 block mb-1">Mín</label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={nivel.valor_min}
                      onChange={e => atualizarNivel(idx, 'valor_min', parseFloat(e.target.value))}
                      className="text-xs font-mono"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] text-slate-500 block mb-1">Máx</label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={nivel.valor_max}
                      onChange={e => atualizarNivel(idx, 'valor_max', parseFloat(e.target.value))}
                      className="text-xs font-mono"
                    />
                  </div>
                  <div className="col-span-4">
                    <label className="text-[10px] text-slate-500 block mb-1">Descrição comportamental</label>
                    <Input
                      value={nivel.descricao_comportamental ?? ''}
                      onChange={e => atualizarNivel(idx, 'descricao_comportamental', e.target.value)}
                      className="text-xs"
                      placeholder="Opcional"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button variant="default" onClick={salvar} disabled={saving}>
              <Save className="w-3 h-3 mr-1" />
              {saving ? 'Salvando...' : 'Criar Escala'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default EscalaGraficaPanel;
