import React, { useCallback, useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
} from '@sysgov/ui';
import {
  Percent,
  Save,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Sliders,
  RotateCw,
} from 'lucide-react';
import { SysgovApi } from '@sysgov/sdk';
import type { ApiModeloFormulario } from '@sysgov/sdk';

const api = new SysgovApi();

interface FatorPeso {
  id?: number;
  fator_id: number;
  peso: number;
  redistribuivel: boolean;
  ordem: number;
  ativo: boolean;
  fator?: {
    id: number;
    codigo: string;
    nome: string;
    descricao?: string;
  };
}

interface PesosResponse {
  modelo_id: number;
  soma_pesos: number;
  valido: boolean;
  fatores: FatorPeso[];
}

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
      const resp = await api.get<PesosResponse>(`/capd/modelos-formulario/${id}/fatores-pesos`);
      setDados(resp.data);
      setEditados(resp.data?.fatores ?? []);
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

  const somaAtual = editados.reduce((acc, f) => acc + (f.ativo ? Number(f.peso) : 0), 0);
  const somaValida = Math.abs(somaAtual - 100) < 0.01;

  const atualizarPeso = (idx: number, valor: string) => {
    setEditados(prev => {
      const novo = [...prev];
      novo[idx] = { ...novo[idx], peso: parseFloat(valor) || 0 };
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
      await api.post(`/capd/modelos-formulario/${selectedModeloId}/fatores-pesos/sync`, {
        fatores: editados.map((f, idx) => ({
          fator_id:       f.fator_id,
          peso:           f.peso,
          redistribuivel: f.redistribuivel,
          ordem:          idx,
        })),
      });
      setSucesso('Pesos sincronizados com sucesso!');
      setAlterado(false);
      carregarPesos(selectedModeloId);
    } catch (e: any) {
      setErro(e?.response?.data?.message ?? 'Erro ao salvar pesos.');
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
            <Sliders className="w-4 h-4 text-indigo-400" />
            Fatores e Pesos do Formulário
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure o peso percentual de cada fator de avaliação (soma = 100%)
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
            onClick={() => selectedModeloId && carregarPesos(selectedModeloId)}
            disabled={loading || !selectedModeloId}
            title="Recarregar"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>

          {alterado && (
            <Button variant="default" size="sm" onClick={salvar} disabled={saving || !somaValida}>
              <Save className="w-3 h-3 mr-1" />
              {saving ? 'Salvando...' : 'Salvar Pesos'}
            </Button>
          )}
        </div>
      </div>

      {/* Indicador de soma */}
      <div className={`flex items-center gap-3 rounded-lg p-3 border ${somaValida
        ? 'bg-emerald-950/30 border-emerald-500/30'
        : 'bg-amber-950/30 border-amber-500/30'
      }`}>
        <Percent className={`w-4 h-4 ${somaValida ? 'text-emerald-400' : 'text-amber-400'}`} />
        <span className={`text-sm font-mono ${somaValida ? 'text-emerald-300' : 'text-amber-300'}`}>
          Soma atual: <strong>{somaAtual.toFixed(2)}%</strong>
        </span>
        {somaValida
          ? <CheckCircle className="w-4 h-4 text-emerald-400 ml-auto" />
          : <AlertTriangle className="w-4 h-4 text-amber-400 ml-auto" />
        }
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

      {/* Tabela de fatores */}
      {loading ? (
        <div className="text-slate-400 text-sm text-center py-8">Carregando...</div>
      ) : editados.length === 0 ? (
        <div className="text-center py-10 bg-[#152244] rounded-xl border border-[#1a2a52]">
          <Sliders className="w-10 h-10 mx-auto mb-3 text-slate-500" />
          <p className="text-slate-400 text-sm">Nenhum fator configurado neste formulário.</p>
        </div>
      ) : (
        <Card className="bg-[#152244] border-[#1a2a52]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">#</TableHead>
                <TableHead className="text-xs">Código</TableHead>
                <TableHead className="text-xs">Fator</TableHead>
                <TableHead className="text-xs text-center">Peso (%)</TableHead>
                <TableHead className="text-xs text-center">
                  <span title="Peso redistribuível para cargos sem atendimento ao público (RF-06)">
                    Redistribuível
                  </span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {editados.map((fator, idx) => (
                <TableRow key={fator.fator_id}>
                  <TableCell className="font-mono text-xs text-slate-500 w-8">{idx + 1}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {fator.fator?.codigo ?? `#${fator.fator_id}`}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <span className="text-xs text-white">{fator.fator?.nome ?? '—'}</span>
                      {fator.fator?.descricao && (
                        <p className="text-[10px] text-slate-500 mt-0.5">{fator.fator.descricao}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="w-32">
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.01}
                        value={fator.peso}
                        onChange={e => atualizarPeso(idx, e.target.value)}
                        className="text-xs font-mono text-center w-24"
                      />
                      <span className="text-slate-500 text-xs">%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={fator.redistribuivel}
                      onCheckedChange={v => atualizarRedistribuivel(idx, v)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <p className="text-[10px] text-slate-500">
        * <strong>Redistribuível</strong>: quando ativado, o peso deste fator é redistribuído
        proporcionalmente para os demais em avaliações de cargos sem atendimento direto ao público (RF-06).
      </p>
    </div>
  );
};

export default FatoresPesosPanel;
