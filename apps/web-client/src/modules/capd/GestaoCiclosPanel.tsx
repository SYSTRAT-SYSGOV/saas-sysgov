import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Card,
  Button,
  Input,
  Modal,
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
} from 'lucide-react';
import { SysgovApi } from '@sysgov/sdk';
import type { ApiCiclo } from '@sysgov/sdk';

const api = new SysgovApi();

const STATUS_VARIANT: Record<string, 'success' | 'primary' | 'neutral' | 'warning'> = {
  aberto: 'primary',
  homologado: 'success',
  encerrado: 'neutral',
  em_recurso: 'warning',
};

const STATUS_LABEL: Record<string, string> = {
  aberto: 'Em Andamento',
  homologado: 'Homologado',
  encerrado: 'Encerrado',
  em_recurso: 'Em Fase Recursal',
};

export const GestaoCiclosPanel: React.FC = () => {
  const [loading, setLoading]                       = useState<boolean>(true);
  const [ciclos, setCiclos]                         = useState<ApiCiclo[]>([]);
  const [search, setSearch]                         = useState<string>('');
  const [erro, setErro]                             = useState<string | null>(null);
  const [sucesso, setSucesso]                       = useState<string | null>(null);

  // Modal de abertura de ciclo
  const [showModalNovoCiclo, setShowModalNovoCiclo] = useState<boolean>(false);
  const [formAno, setFormAno]                       = useState<number>(new Date().getFullYear());
  const [formNome, setFormNome]                     = useState<string>('');
  const [formDataInicio, setFormDataInicio]         = useState<string>(`${new Date().getFullYear()}-01-01`);
  const [formDataFim, setFormDataFim]               = useState<string>(`${new Date().getFullYear()}-12-31`);
  const [formDataLimitePreenchimento, setFormDataLimitePreenchimento] = useState<string>('');
  const [formDataLimiteRecurso, setFormDataLimiteRecurso]             = useState<string>('');
  const [formEtapa, setFormEtapa]                   = useState<number>(1);
  const [saving, setSaving]                         = useState<boolean>(false);

  // Modal de Elegibilidade
  const [showModalElegibilidade, setShowModalElegibilidade] = useState<boolean>(false);
  const [selectedCiclo, setSelectedCiclo]           = useState<ApiCiclo | null>(null);
  const [elegibilidadeData, setElegibilidadeData]   = useState<any>(null);
  const [loadingElegibilidade, setLoadingElegibilidade] = useState<boolean>(false);

  // Modal de Confirmação de Encerramento (sem window.confirm)
  const [encerramentoModal, setEncerramentoModal]   = useState<{
    open: boolean;
    ciclo: ApiCiclo | null;
    abrirProximo: boolean;
  }>({ open: false, ciclo: null, abrirProximo: false });
  const [encerrando, setEncerrando]                 = useState<boolean>(false);

  const fetchCiclos = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const data = await api.capd.listCiclos();
      setCiclos(data);
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
        cadencia_automatica: true,
        status: 'aberto',
      });
      setShowModalNovoCiclo(false);
      setSucesso('Novo ciclo de 12 meses aberto com sucesso!');
      await fetchCiclos();
    } catch (err: any) {
      setErro(err.message || 'Falha ao abrir novo ciclo.');
    } finally {
      setSaving(false);
    }
  };

  const confirmarEncerramento = async () => {
    if (!encerramentoModal.ciclo) return;
    setEncerrando(true);
    setErro(null);
    try {
      await api.capd.encerrarCiclo(encerramentoModal.ciclo.id, encerramentoModal.abrirProximo);
      setSucesso(
        encerramentoModal.abrirProximo
          ? `Ciclo encerrado e ciclo subsequente (Etapa ${((encerramentoModal.ciclo.etapa_cadencia || 1) % 3) + 1}) aberto com sucesso!`
          : 'Ciclo encerrado com sucesso!'
      );
      setEncerramentoModal({ open: false, ciclo: null, abrirProximo: false });
      await fetchCiclos();
    } catch (err: any) {
      setErro(err.message || 'Não foi possível encerrar o ciclo.');
    } finally {
      setEncerrando(false);
    }
  };

  const handleVerElegibilidade = async (ciclo: ApiCiclo) => {
    setSelectedCiclo(ciclo);
    setShowModalElegibilidade(true);
    setLoadingElegibilidade(true);
    try {
      const res = await api.capd.getElegibilidadeCiclo(ciclo.id);
      setElegibilidadeData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingElegibilidade(false);
    }
  };

  const filteredCiclos = useMemo(() => {
    if (!search.trim()) return ciclos;
    const term = search.toLowerCase();
    return ciclos.filter(c =>
      c.nome.toLowerCase().includes(term) ||
      String(c.ano_competencia || c.ano_referencia).includes(term)
    );
  }, [ciclos, search]);

  const columns = useMemo<ColumnDef<ApiCiclo, any>[]>(() => [
    {
      id: 'ano',
      header: 'Ano / Nome do Ciclo',
      size: 260,
      meta: {
        sortValue: c => c.ano_competencia || c.ano_referencia || 0,
        exportValue: c => `${c.nome} (${c.ano_competencia || c.ano_referencia})`,
      },
      cell: ({ row }) => {
        const c = row.original;
        const ano = c.ano_competencia || c.ano_referencia;
        return (
          <div>
            <span className="font-semibold text-foreground text-sm block">
              {c.nome}
            </span>
            <span className="font-mono text-xs text-muted-foreground tabular-nums">
              Competência: {ano}
            </span>
          </div>
        );
      },
    },
    {
      id: 'etapa',
      header: 'Cadência Trienal',
      size: 150,
      meta: {
        sortValue: c => c.etapa_cadencia || 1,
        exportValue: c => `Etapa ${c.etapa_cadencia || 1} de 3`,
      },
      cell: ({ row }) => {
        const etapa = row.original.etapa_cadencia || 1;
        return (
          <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold px-2 py-1 rounded-md bg-accent text-accent-foreground border border-border">
            Etapa {etapa} de 3
          </span>
        );
      },
    },
    {
      id: 'vigencia',
      header: 'Período de Vigência',
      size: 190,
      cell: ({ row }) => {
        const c = row.original;
        const ini = c.data_inicio || c.data_inicio_avaliacao;
        const fim = c.data_fim || c.data_fim_avaliacao;
        return (
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            {ini} até {fim}
          </span>
        );
      },
    },
    {
      id: 'limite_preenchimento',
      header: 'Limite Preenchimento',
      size: 160,
      cell: ({ row }) => (
        <span className="font-mono text-xs tabular-nums text-foreground">
          {row.original.data_limite_preenchimento || 'Regulamento'}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      size: 140,
      meta: {
        sortValue: c => c.status,
        exportValue: c => STATUS_LABEL[c.status] ?? c.status,
      },
      cell: ({ row }) => {
        const s = row.original.status;
        return (
          <StatusChip
            label={STATUS_LABEL[s] ?? s}
            variant={STATUS_VARIANT[s] ?? 'neutral'}
          />
        );
      },
    },
    {
      id: 'acoes',
      header: '',
      size: 240,
      enableSorting: false,
      cell: ({ row }) => {
        const c = row.original;
        const isAtivo = c.status !== 'encerrado';
        return (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8"
              onClick={() => handleVerElegibilidade(c)}
              title="Consultar Elegibilidade"
            >
              <Users className="h-3.5 w-3.5 mr-1 text-primary" />
              Elegibilidade
            </Button>

            {isAtivo && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 text-muted-foreground hover:text-foreground"
                  onClick={() => setEncerramentoModal({ open: true, ciclo: c, abrirProximo: false })}
                >
                  Encerrar
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="text-xs h-8"
                  onClick={() => setEncerramentoModal({ open: true, ciclo: c, abrirProximo: true })}
                >
                  Encerrar & N+1
                </Button>
              </>
            )}
          </div>
        );
      },
    },
  ], []);

  return (
    <div className="space-y-6">
      {/* PageHeader Canônico */}
      <PageHeader
        icon={<Calendar className="h-6 w-6" />}
        title="Gestão de Ciclos de Avaliação"
        subtitle="Cadência anual de 12 meses — triênio probatório de 3 avaliações com roll-over automático e verificação de elegibilidade"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchCiclos}
              disabled={loading}
              title="Recarregar"
            >
              <RotateCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                const nextAno = ciclos.length > 0 ? (ciclos[0].ano_competencia || 2026) + 1 : new Date().getFullYear();
                setFormAno(nextAno);
                setFormNome(`Ciclo de Desempenho ${nextAno}`);
                setFormDataInicio(`${nextAno}-01-01`);
                setFormDataFim(`${nextAno}-12-31`);
                setShowModalNovoCiclo(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Abrir Novo Ciclo
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
        <ScreenState type="loading" title="Carregando Ciclos de Avaliação..." />
      ) : (
        <Card className="gap-0 py-0">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <div className="w-full sm:w-80">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Buscar por nome ou ano de competência..."
              />
            </div>
            <span className="text-xs text-muted-foreground font-mono">
              Total de ciclos: {filteredCiclos.length}
            </span>
          </div>

          <div className="p-3">
            {filteredCiclos.length === 0 ? (
              <EmptyState
                icon={<Calendar className="h-10 w-10" />}
                title="Nenhum ciclo encontrado"
                description="Abra um novo ciclo de avaliação para iniciar o período avaliativo anual do município."
                actionLabel="Abrir Novo Ciclo"
                onAction={() => setShowModalNovoCiclo(true)}
              />
            ) : (
              <DataTable
                columns={columns}
                data={filteredCiclos}
                emptyText="Nenhum ciclo encontrado."
                pageSize={10}
                fixedLayout
              />
            )}
          </div>
        </Card>
      )}

      {/* ── Modal: Abertura de Novo Ciclo ────────────────────────────── */}
      <Modal
        open={showModalNovoCiclo}
        onClose={() => setShowModalNovoCiclo(false)}
        title="Abertura de Novo Ciclo de 12 Meses"
        size="md"
      >
        <form onSubmit={handleCriarCiclo} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Nome do Ciclo *
            </label>
            <Input
              value={formNome}
              onChange={(e) => setFormNome(e.target.value)}
              placeholder="Ex.: Ciclo de Avaliação de Desempenho 2027"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Ano de Competência *
              </label>
              <Input
                type="number"
                value={formAno}
                onChange={(e) => setFormAno(Number(e.target.value))}
                className="font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Etapa da Cadência (1 a 3) *
              </label>
              <Input
                type="number"
                min="1"
                max="3"
                value={formEtapa}
                onChange={(e) => setFormEtapa(Number(e.target.value))}
                className="font-mono"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Início da Vigência *
              </label>
              <Input
                type="date"
                value={formDataInicio}
                onChange={(e) => setFormDataInicio(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Fim da Vigência *
              </label>
              <Input
                type="date"
                value={formDataFim}
                onChange={(e) => setFormDataFim(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Limite Preenchimento
              </label>
              <Input
                type="date"
                value={formDataLimitePreenchimento}
                onChange={(e) => setFormDataLimitePreenchimento(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Limite Recursal
              </label>
              <Input
                type="date"
                value={formDataLimiteRecurso}
                onChange={(e) => setFormDataLimiteRecurso(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="ghost" size="sm" type="button" onClick={() => setShowModalNovoCiclo(false)}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={saving}>
              {saving ? 'Criando...' : 'Abrir Ciclo'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Modal: Confirmação de Encerramento (sem window.confirm) ───── */}
      <Modal
        open={encerramentoModal.open}
        onClose={() => setEncerramentoModal({ open: false, ciclo: null, abrirProximo: false })}
        title="Confirmar Encerramento do Ciclo"
        size="sm"
      >
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">
                {encerramentoModal.abrirProximo ? 'Encerrar e Abrir Próxima Etapa?' : 'Encerrar Ciclo Avaliativo?'}
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                {encerramentoModal.abrirProximo
                  ? `O ciclo ${encerramentoModal.ciclo?.nome} será encerrado e o ciclo de 12 meses seguinte será provisionado automaticamente.`
                  : `O ciclo ${encerramentoModal.ciclo?.nome} será marcado como encerrado.`}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEncerramentoModal({ open: false, ciclo: null, abrirProximo: false })}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={confirmarEncerramento}
              disabled={encerrando}
            >
              {encerrando ? 'Encerrando...' : 'Confirmar Encerramento'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Modal: Elegibilidade e Bloqueios ─────────────────────────── */}
      <Modal
        open={showModalElegibilidade}
        onClose={() => setShowModalElegibilidade(false)}
        title={`Elegibilidade & Bloqueios — ${selectedCiclo?.nome ?? ''}`}
        size="lg"
      >
        {loadingElegibilidade ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            Verificando regras de elegibilidade e afastamentos...
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-muted/40 rounded-lg border border-border text-center">
                <span className="text-xs text-muted-foreground block">Total Verificado</span>
                <span className="text-xl font-bold font-mono text-foreground">
                  {elegibilidadeData?.total_analisados ?? 0}
                </span>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-center">
                <span className="text-xs text-emerald-600 dark:text-emerald-400 block">Elegíveis</span>
                <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {elegibilidadeData?.elegiveis?.length ?? 0}
                </span>
              </div>
              <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20 text-center">
                <span className="text-xs text-destructive block">Bloqueados / Afastados</span>
                <span className="text-xl font-bold font-mono text-destructive">
                  {elegibilidadeData?.bloqueados?.length ?? 0}
                </span>
              </div>
            </div>

            {elegibilidadeData?.bloqueados && elegibilidadeData.bloqueados.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide">
                  Servidores com Impeditivo Legal ou Afastamento Superior a 90 dias
                </h4>
                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                  {elegibilidadeData.bloqueados.map((item: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-background border border-border text-xs">
                      <div>
                        <span className="font-semibold text-foreground">{item.servidor_nome}</span>
                        <span className="text-muted-foreground ml-2 font-mono">Matrícula: {item.matricula}</span>
                      </div>
                      <span className="text-destructive font-medium">{item.motivo}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default GestaoCiclosPanel;
