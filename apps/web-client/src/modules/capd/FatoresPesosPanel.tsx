import React, { useCallback, useEffect, useState } from 'react';
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

  const modeloSelecionado = modelos.find(m => m.id === selectedModeloId);

  return (
    <div className="space-y-6">
      {/* PageHeader Canônico */}
      <PageHeader
        icon={<Sliders className="h-6 w-6" />}
        title="Fatores e Pesos do Formulário"
        subtitle="Parametrização ponderada dos fatores canônicos (soma = 100%) e regra de redistribuição do Fator H (RF-02/RF-06)"
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
              title="Recarregar"
            >
              <RotateCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>

            {alterado && (
              <Button
                variant="primary"
                size="sm"
                onClick={salvar}
                disabled={saving || !somaValida}
              >
                <Save className="h-4 w-4 mr-1.5" />
                {saving ? 'Salvando...' : 'Salvar Pesos'}
              </Button>
            )}
          </div>
        }
      />

      {/* Indicador de soma com cores semânticas */}
      <div
        className={`flex items-center gap-3 rounded-lg p-3.5 border transition-all ${
          somaValida
            ? 'border-status-success-border bg-status-success-bg text-status-success'
            : 'border-status-warning-border bg-status-warning-bg text-status-warning'
        }`}
      >
        <Percent className="w-5 h-5 shrink-0" />
        <span className="text-sm font-medium">
          Soma atual dos pesos dos fatores: <strong className="font-mono tabular-nums text-base">{somaAtual.toFixed(2)}%</strong>
          {!somaValida && (
            <span className="ml-2 text-xs opacity-80">
              (Diferença de {(100 - somaAtual).toFixed(2)}% para atingir os 100% obrigatórios)
            </span>
          )}
        </span>
        {somaValida ? (
          <CheckCircle className="w-5 h-5 ml-auto text-status-success shrink-0" />
        ) : (
          <AlertTriangle className="w-5 h-5 ml-auto text-status-warning shrink-0" />
        )}
      </div>

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

      {/* Tabela de fatores */}
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
        <Card className="gap-0 py-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20">
                <TableHead className="w-12 text-xs text-center font-bold">#</TableHead>
                <TableHead className="w-24 text-xs font-bold">Código</TableHead>
                <TableHead className="text-xs font-bold">Fator de Avaliação</TableHead>
                <TableHead className="w-36 text-xs text-center font-bold">Peso Ponderado</TableHead>
                <TableHead className="w-36 text-xs text-center font-bold">
                  <span title="Redistribuível proporcionalmente para cargos sem atendimento ao público (RF-06)">
                    Fator H Redistr.
                  </span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {editados.map((fator, idx) => (
                <TableRow key={fator.fator_id}>
                  <TableCell className="font-mono text-xs text-muted-foreground text-center font-semibold">
                    {idx + 1}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs font-bold">
                      {fator.fator?.codigo ?? `#${fator.fator_id}`}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <span className="text-sm font-semibold text-foreground">{fator.fator?.nome ?? '—'}</span>
                      {fator.fator?.descricao && (
                        <p className="text-xs text-muted-foreground mt-0.5">{fator.fator.descricao}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1.5">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.01}
                        value={fator.peso}
                        onChange={e => atualizarPeso(idx, e.target.value)}
                        className="text-xs font-mono font-bold text-center w-20 h-8"
                      />
                      <span className="text-muted-foreground text-xs font-mono">%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center">
                      <Switch
                        checked={fator.redistribuivel}
                        onCheckedChange={v => atualizarRedistribuivel(idx, v)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        * <strong>Fator H Redistribuível</strong>: quando ativado (previsto na alínea 'h' da Lei 1.704/2006), o percentual deste fator é automaticamente recalculado e redistribuído proporcionalmente entre os demais fatores para servidores lotados em cargos sem contato direto com o cidadão (RF-06).
      </p>
    </div>
  );
};

export default FatoresPesosPanel;
