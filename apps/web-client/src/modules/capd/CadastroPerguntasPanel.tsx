import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  Input,
  Select,
  Modal,
  Switch,
} from '@sysgov/ui';
import {
  Plus,
  Trash2,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  FileQuestion,
} from 'lucide-react';
import { SysgovApi } from '@sysgov/sdk';
import type { ApiModeloFormulario, ApiPergunta, TipoPergunta } from '@sysgov/sdk';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable } from '@/components/ui/DataTable';
import { StatusChip } from '@/components/ui/StatusChip';
import { EmptyState } from '@/components/ui/EmptyState';

const api = new SysgovApi();

export const CadastroPerguntasPanel: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [modelos, setModelos] = useState<ApiModeloFormulario[]>([]);
  const [selectedModelo, setSelectedModelo] = useState<ApiModeloFormulario | null>(null);

  // Modal de nova pergunta
  const [showModalPergunta, setShowModalPergunta] = useState<boolean>(false);
  const [perguntaCodigo, setPerguntaCodigo] = useState<string>('');
  const [perguntaEnunciado, setPerguntaEnunciado] = useState<string>('');
  const [perguntaTipo, setPerguntaTipo] = useState<TipoPergunta>('escala_grafica');
  const [perguntaGrupo, setPerguntaGrupo] = useState<string>('competencias');
  const [perguntaPeso, setPerguntaPeso] = useState<number>(1.0);
  const [perguntaObrigatoria, setPerguntaObrigatoria] = useState<boolean>(true);
  const [perguntaExigeEvidencia, setPerguntaExigeEvidencia] = useState<boolean>(false);
  const [savingPergunta, setSavingPergunta] = useState<boolean>(false);

  // Estados de confirmação e alertas estilizados (padrão SYSGOV)
  const [showConfirmSeedModal, setShowConfirmSeedModal] = useState<boolean>(false);
  const [loadingSeed, setLoadingSeed] = useState<boolean>(false);
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{
    open: boolean;
    perguntaId: number;
    codigo: string;
  } | null>(null);
  const [feedbackModal, setFeedbackModal] = useState<{
    open: boolean;
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
    details?: Array<{ label: string; value: string; code?: boolean }>;
  } | null>(null);

  const fetchModelos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.capd.listModelosFormulario();
      setModelos(data);
      if (data.length > 0) {
        const full = await api.capd.getModeloFormulario(selectedModelo?.id || data[0].id);
        setSelectedModelo(full);
      }
    } catch (err) {
      console.error('Erro ao carregar modelos:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedModelo?.id]);

  useEffect(() => {
    fetchModelos();
  }, [fetchModelos]);

  const handleSelectModelo = async (modeloId: number) => {
    try {
      const full = await api.capd.getModeloFormulario(modeloId);
      setSelectedModelo(full);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSalvarPergunta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModelo) return;
    setSavingPergunta(true);

    try {
      await api.capd.savePergunta(selectedModelo.id, {
        codigo: perguntaCodigo,
        enunciado: perguntaEnunciado,
        tipo: perguntaTipo,
        grupo_key: perguntaGrupo,
        peso: perguntaPeso,
        obrigatoria: perguntaObrigatoria,
        exige_evidencia: perguntaExigeEvidencia,
        opcoes:
          perguntaTipo === 'escala_grafica'
            ? [
                { valor: 1, rotulo: 'Grau 1 - Insuficiente', descricao: 'Desempenho abaixo do padrão exigido.' },
                { valor: 2, rotulo: 'Grau 2 - Regular', descricao: 'Desempenho regular com necessidades pontuais.' },
                { valor: 3, rotulo: 'Grau 3 - Bom', descricao: 'Desempenho satisfatório, atende plenamente.' },
                { valor: 4, rotulo: 'Grau 4 - Muito Bom', descricao: 'Supera as expectativas habituais com presteza.' },
                { valor: 5, rotulo: 'Grau 5 - Excelente', descricao: 'Desempenho exemplar de referência institucional.' },
              ]
            : null,
      });

      setShowModalPergunta(false);
      const codigoSalvo = perguntaCodigo;
      setPerguntaCodigo('');
      setPerguntaEnunciado('');
      await handleSelectModelo(selectedModelo.id);

      setFeedbackModal({
        open: true,
        type: 'success',
        title: 'Pergunta Salva com Sucesso',
        message: `O fator ${codigoSalvo} foi gravado e integrado ao modelo de avaliação vigente.`,
      });
    } catch (err: any) {
      setFeedbackModal({
        open: true,
        type: 'error',
        title: 'Erro ao Salvar Pergunta',
        message: err.message || 'Verifique as informações preenchidas e tente novamente.',
      });
    } finally {
      setSavingPergunta(false);
    }
  };

  const handleExcluirPergunta = (perguntaId: number, codigo: string) => {
    setConfirmDeleteModal({
      open: true,
      perguntaId,
      codigo,
    });
  };

  const handleConfirmDeletePergunta = async () => {
    if (!confirmDeleteModal) return;
    try {
      await api.capd.destroyPergunta(confirmDeleteModal.perguntaId);
      const cod = confirmDeleteModal.codigo;
      setConfirmDeleteModal(null);
      if (selectedModelo) {
        await handleSelectModelo(selectedModelo.id);
      }
      setFeedbackModal({
        open: true,
        type: 'success',
        title: 'Pergunta Removida',
        message: `A pergunta ${cod} foi removida com sucesso do instrumento de avaliação.`,
      });
    } catch (err: any) {
      setFeedbackModal({
        open: true,
        type: 'error',
        title: 'Erro ao Excluir Pergunta',
        message: err.message || 'Não foi possível remover o item.',
      });
    }
  };

  const handleConfirmSeedPadrao = async () => {
    setLoadingSeed(true);
    try {
      await api.capd.seedPerguntasPadrao();
      await fetchModelos();
      setShowConfirmSeedModal(false);
      setFeedbackModal({
        open: true,
        type: 'success',
        title: 'Modelo e Perguntas Padrão Gerados com Sucesso!',
        message: 'Os instrumentos oficiais e seus 8 fatores da Escala Gráfica de Chiavenato foram gerados e sincronizados para este município.',
        details: [
          { label: 'Modelos Criados/Atualizados', value: 'FORM_GERAL_V1 e FORM_MAGISTERIO_V1', code: true },
          { label: 'Metodologia de Avaliação', value: 'Escala Gráfica de Desempenho (Chiavenato, Graus 1 a 5)' },
          { label: 'Fatores Parametrizados', value: 'P1 a P8 (Assiduidade, Disciplina, Competências)', code: true },
          { label: 'Distribuição dos Pesos', value: 'Assiduidade (15%), Disciplina (15%), Competências (70%)', code: true },
          { label: 'Trava Anti-Leniência (CIT)', value: 'Ativa (Graus 1 e 5 exigem registro no Diário de Bordo)' },
        ],
      });
    } catch (err: any) {
      setShowConfirmSeedModal(false);
      setFeedbackModal({
        open: true,
        type: 'error',
        title: 'Erro ao Gerar Seed Padrão',
        message: err.message || 'Falha ao processar a geração dos modelos de instrumento.',
      });
    } finally {
      setLoadingSeed(false);
    }
  };

  // Colunas TanStack do DataTable de Perguntas
  const columns = useMemo<ColumnDef<ApiPergunta>[]>(
    () => [
      {
        accessorKey: 'codigo',
        header: 'Cód.',
        size: 80,
        cell: ({ row }) => (
          <span className="font-mono font-bold text-foreground">
            {row.original.codigo}
          </span>
        ),
      },
      {
        accessorKey: 'enunciado',
        header: 'Enunciado do Fator / Pergunta',
        cell: ({ row }) => (
          <div>
            <div className="font-medium text-foreground">{row.original.enunciado}</div>
            <div className="text-xs text-muted-foreground">Grupo: {row.original.grupo_key}</div>
          </div>
        ),
      },
      {
        accessorKey: 'tipo',
        header: 'Tipo',
        size: 150,
        cell: ({ row }) => (
          <Badge variant="outline" className="font-mono text-xs">
            {row.original.tipo}
          </Badge>
        ),
      },
      {
        accessorKey: 'peso',
        header: 'Peso',
        size: 90,
        cell: ({ row }) => (
          <span className="font-mono tabular-nums font-semibold text-foreground">
            {Number(row.original.peso).toFixed(1)}
          </span>
        ),
      },
      {
        accessorKey: 'exige_evidencia',
        header: 'Trava CIT',
        size: 130,
        cell: ({ row }) => (
          row.original.exige_evidencia ? (
            <StatusChip label="Exige CIT" variant="warning" />
          ) : (
            <StatusChip label="Padrão" variant="neutral" />
          )
        ),
      },
      {
        id: 'acoes',
        header: '',
        size: 60,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => handleExcluirPergunta(row.original.id, row.original.codigo)}
              title="Remover pergunta"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      {/* ── Topo: Cabeçalho Canônico PageHeader ───────────────────────── */}
      <PageHeader
        title="Cadastro de Perguntas & Instrumentos de Avaliação"
        subtitle="Metodologia de Escala Gráfica (Chiavenato) parametrizada por plano de carreira e pesos por grupo"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConfirmSeedModal(true)}
            >
              <Sparkles className="h-4 w-4 mr-1.5 text-amber-600" />
              Carregar Seed Padrão (F1 a F8)
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={() => {
                setPerguntaCodigo(`P${(selectedModelo?.perguntas_ativas?.length || 0) + 1}`);
                setShowModalPergunta(true);
              }}
              disabled={!selectedModelo}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Adicionar Pergunta
            </Button>
          </div>
        }
      />

      {/* ── Seletor de Modelo Formulario ─────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Painel Esquerdo: Lista de Modelos */}
        <Card className="gap-0 py-0 overflow-hidden">
          <CardHeader className="p-4 border-b border-border bg-muted/20">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Modelos de Formulário
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 space-y-1">
            {modelos.map((m) => (
              <button
                key={m.id}
                onClick={() => handleSelectModelo(m.id)}
                className={`w-full text-left p-2.5 rounded text-xs transition-colors ${
                  selectedModelo?.id === m.id
                    ? 'bg-primary/10 border border-primary/30 text-primary font-semibold'
                    : 'hover:bg-muted/40 text-foreground'
                }`}
              >
                <div className="truncate font-medium">{m.nome}</div>
                <div className="text-muted-foreground font-mono mt-0.5">
                  {m.codigo} | v{m.versao}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Painel Direito: Perguntas do Modelo Selecionado */}
        <div className="md:col-span-3 space-y-4">
          {selectedModelo ? (
            <>
              {/* Resumo dos Grupos e Pesos do Modelo */}
              <Card className="p-4 bg-muted/20 border-border">
                <div className="flex items-center justify-between text-xs font-semibold text-foreground mb-3">
                  <span className="flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-primary" />
                    Ponderação dos Grupos no Modelo
                  </span>
                  <span className="font-mono text-muted-foreground">
                    Vigência: {selectedModelo.vigencia_inicio} a {selectedModelo.vigencia_fim || 'Indeterminada'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  {selectedModelo.grupos &&
                    Object.entries(selectedModelo.grupos).map(([k, g]) => (
                      <div key={k} className="p-2.5 bg-card rounded border border-border">
                        <div className="text-muted-foreground truncate">{g.nome}</div>
                        <div className="font-mono font-bold text-primary mt-1">
                          Peso: {g.peso}%
                        </div>
                      </div>
                    ))}
                </div>
              </Card>

              {/* Tabela TanStack de Perguntas Cadastradas */}
              <Card className="gap-0 py-0 overflow-hidden">
                <DataTable
                  data={selectedModelo.perguntas_ativas || []}
                  columns={columns}
                  fixedLayout
                  emptyText="Nenhuma pergunta cadastrada neste modelo. Clique em 'Carregar Seed Padrão' ou 'Adicionar Pergunta'."
                />
              </Card>
            </>
          ) : (
            <EmptyState
              icon={<FileQuestion className="h-8 w-8 text-muted-foreground" />}
              title="Nenhum modelo selecionado"
              description="Selecione um modelo de formulário ao lado para gerenciar os fatores e perguntas."
            />
          )}
        </div>
      </div>

      {/* ── Modal: Adicionar Pergunta ─────────────────────────────────── */}
      <Modal
        open={showModalPergunta}
        onClose={() => setShowModalPergunta(false)}
        title="Nova Pergunta / Fator do Instrumento"
      >
        <form onSubmit={handleSalvarPergunta} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Código
              </label>
              <Input
                value={perguntaCodigo}
                onChange={(e) => setPerguntaCodigo(e.target.value)}
                placeholder="Ex.: P1, F1"
                className="font-mono"
                required
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-semibold text-foreground mb-1">
                Tipo do Campo
              </label>
              <Select
                value={perguntaTipo}
                onChange={(val) => setPerguntaTipo(val as TipoPergunta)}
                options={[
                  { value: 'escala_grafica', label: 'Escala Gráfica (Graus 1 a 5 - Chiavenato)' },
                  { value: 'escolha_simples', label: 'Escolha Simples' },
                  { value: 'escolha_multipla', label: 'Escolha Múltipla' },
                  { value: 'nota_0_10', label: 'Nota Decimal de 0 a 10' },
                  { value: 'sim_nao', label: 'Sim / Não' },
                  { value: 'texto_livre', label: 'Texto Livre' },
                ]}
                aria-label="Tipo da Pergunta"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Enunciado / Fator Avaliado
            </label>
            <Input
              value={perguntaEnunciado}
              onChange={(e) => setPerguntaEnunciado(e.target.value)}
              placeholder="Ex.: Capacidade de Iniciativa e Solução de Demandas"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Grupo
              </label>
              <Input
                value={perguntaGrupo}
                onChange={(e) => setPerguntaGrupo(e.target.value)}
                placeholder="assiduidade, disciplina, competencias"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Peso Relativo
              </label>
              <Input
                type="number"
                step="0.1"
                value={perguntaPeso}
                onChange={(e) => setPerguntaPeso(Number(e.target.value))}
                className="font-mono"
                required
              />
            </div>
          </div>

          <div className="p-3 bg-muted/20 rounded border border-border space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-medium text-foreground">Preenchimento Obrigatório</span>
              <Switch
                checked={perguntaObrigatoria}
                onCheckedChange={setPerguntaObrigatoria}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-foreground">Trava Antileniência (Exige CIT)</div>
                <div className="text-muted-foreground text-[11px]">
                  Exige registro prévio de incidente crítico no Diário de Bordo para graus extremos
                </div>
              </div>
              <Switch
                checked={perguntaExigeEvidencia}
                onCheckedChange={setPerguntaExigeEvidencia}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowModalPergunta(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="default"
              disabled={savingPergunta}
            >
              {savingPergunta ? 'Salvando...' : 'Salvar Pergunta'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Modal de Confirmação: Inicializar Seed Padrão ─────────────── */}
      <Modal
        open={showConfirmSeedModal}
        onClose={() => !loadingSeed && setShowConfirmSeedModal(false)}
        title="Inicializar Instrumentos e Fatores Padrão"
        size="md"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button
              variant="outline"
              size="sm"
              disabled={loadingSeed}
              onClick={() => setShowConfirmSeedModal(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="default"
              size="sm"
              disabled={loadingSeed}
              onClick={handleConfirmSeedPadrao}
            >
              {loadingSeed ? (
                <>
                  <RotateCw className="h-4 w-4 mr-1.5 animate-spin" />
                  Gerando Instrumentos...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-1.5" />
                  Confirmar e Gerar
                </>
              )}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-2">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-full bg-status-warning-bg text-status-warning border border-status-warning-border shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                Deseja gerar a estrutura padrão da Escala Gráfica de Chiavenato?
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Esta ação criará ou atualizará os modelos de avaliação oficiais do município com os 8 fatores funcionais recomendados pela legislação municipal e contratos do SAPDS.
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted/20 p-3.5 space-y-2 text-xs">
            <div className="font-semibold text-foreground">Estrutura que será gerada:</div>
            <ul className="space-y-1.5 text-muted-foreground list-disc list-inside">
              <li>
                <span className="font-mono font-medium text-foreground">FORM_GERAL_V1</span>: Instrumento do Quadro Geral (8 fatores)
              </li>
              <li>
                <span className="font-mono font-medium text-foreground">FORM_MAGISTERIO_V1</span>: Instrumento do Magistério (pesos diferenciados)
              </li>
              <li>
                <span className="font-mono font-medium text-foreground">P1 a P8</span>: Escala Gráfica com 5 graus de desempenho (1 a 5)
              </li>
              <li>
                <span className="font-mono font-medium text-foreground">Assiduidade (15%), Disciplina (15%), Competências (70%)</span>
              </li>
              <li>
                <span className="font-mono font-medium text-foreground">Trava Anti-Leniência</span>: exigência de apontamento no CIT
              </li>
            </ul>
          </div>
        </div>
      </Modal>

      {/* ── Modal de Confirmação: Excluir Pergunta ─────────────────────── */}
      {confirmDeleteModal && (
        <Modal
          open={confirmDeleteModal.open}
          onClose={() => setConfirmDeleteModal(null)}
          title="Remover Pergunta do Instrumento"
          size="sm"
          footer={
            <div className="flex justify-end gap-2 w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDeleteModal(null)}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleConfirmDeletePergunta}
              >
                Remover Pergunta
              </Button>
            </div>
          }
        >
          <div className="space-y-3 py-2">
            <p className="text-sm text-foreground">
              Tem certeza de que deseja remover a pergunta{' '}
              <span className="font-mono font-bold text-foreground">
                {confirmDeleteModal.codigo}
              </span>{' '}
              deste instrumento de avaliação?
            </p>
            <p className="text-xs text-status-warning bg-status-warning-bg p-2.5 rounded border border-status-warning-border">
              Atenção: Perguntas já avaliadas em ciclos anteriores não serão afetadas, mas o item deixará de constar nas novas avaliações.
            </p>
          </div>
        </Modal>
      )}

      {/* ── Modal de Alerta / Feedback Estilizado (Padrão SYSGOV) ──────── */}
      {feedbackModal && (
        <Modal
          open={feedbackModal.open}
          onClose={() => setFeedbackModal(null)}
          title={feedbackModal.title}
          size="md"
          footer={
            <div className="flex justify-end w-full">
              <Button
                variant={feedbackModal.type === 'error' ? 'destructive' : 'default'}
                size="sm"
                onClick={() => setFeedbackModal(null)}
              >
                {feedbackModal.type === 'success' ? 'Continuar' : 'Fechar'}
              </Button>
            </div>
          }
        >
          <div className="space-y-4 py-2">
            <div className="flex items-start gap-3.5">
              <div
                className={`p-2.5 rounded-full shrink-0 ${
                  feedbackModal.type === 'success'
                    ? 'bg-status-success-bg text-status-success border border-status-success-border'
                    : feedbackModal.type === 'error'
                    ? 'bg-status-danger-bg text-status-danger border border-status-danger-border'
                    : 'bg-primary/10 text-primary border border-primary/20'
                }`}
              >
                {feedbackModal.type === 'success' ? (
                  <CheckCircle2 className="h-6 w-6" />
                ) : feedbackModal.type === 'error' ? (
                  <AlertTriangle className="h-6 w-6" />
                ) : (
                  <Sparkles className="h-6 w-6" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground leading-relaxed">
                  {feedbackModal.message}
                </p>

                {feedbackModal.type === 'success' && (
                  <div className="mt-2">
                    <StatusChip label="Status: Concluído e Sincronizado" variant="success" />
                  </div>
                )}
              </div>
            </div>

            {feedbackModal.details && feedbackModal.details.length > 0 && (
              <div className="rounded-lg border border-border bg-muted/20 p-3.5 space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Resumo da Operação
                </div>
                <div className="space-y-1.5 divide-y divide-border text-xs">
                  {feedbackModal.details.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center pt-1.5 first:pt-0">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span
                        className={`font-medium text-foreground ${
                          item.code ? 'font-mono tabular-nums text-[11px]' : ''
                        }`}
                      >
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
