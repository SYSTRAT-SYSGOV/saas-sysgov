import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Badge, Button, Card } from '@sysgov/ui';
import { AlertTriangle, CheckCircle2, Send, Save, ShieldAlert, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
import { SysgovApi } from '@sysgov/sdk';
import type { ApiAvaliacao, ApiDiarioBordo, ApiFator, RespostaFator } from '@sysgov/sdk';
import { ScreenState } from '@/components/ui/ScreenState';

const api = new SysgovApi();

const GRAUS = [
  { valor: 5, label: '5 — Excelente', tone: 'success' as const },
  { valor: 4, label: '4 — Bom', tone: 'success' as const },
  { valor: 3, label: '3 — Regular', tone: 'warning' as const },
  { valor: 2, label: '2 — Insuficiente', tone: 'danger' as const },
  { valor: 1, label: '1 — Crítico', tone: 'danger' as const },
];

const GRAUS_EXTREMOS = [1, 2, 5];

const JUSTIFICATIVA_MIN = 20;

const toneClasses: Record<string, string> = {
  success: 'bg-status-success text-white border-status-success',
  warning: 'bg-status-warning text-white border-status-warning',
  danger: 'bg-status-danger text-white border-status-danger',
};

interface Props {
  avaliacaoId: number | null;
  open: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
}

/**
 * Formulário real de preenchimento da Avaliação de Desempenho pela
 * Chefia Imediata: Escala Gráfica (grau 1-5 por fator), justificativa
 * obrigatória para notas extremas (1, 2, 5), anotações do Diário de
 * Bordo (CIT) do avaliado buscadas automaticamente por fator, e
 * submissão final (com Trava Anti-Leniência aplicada pelo backend).
 * F1/F2 (Assiduidade/Disciplina) são calculados automaticamente pela
 * integração de RH e não aparecem para edição.
 */
export const AvaliacaoFormModal: React.FC<Props> = ({ avaliacaoId, open, onClose, onSubmitted }) => {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [avaliacao, setAvaliacao] = useState<ApiAvaliacao | null>(null);
  const [fatores, setFatores] = useState<ApiFator[]>([]);
  const [respostas, setRespostas] = useState<Record<string, RespostaFator>>({});
  const [anotacoesCit, setAnotacoesCit] = useState<ApiDiarioBordo[]>([]);
  const [citExpandido, setCitExpandido] = useState<Record<string, boolean>>({});
  const [anexandoEvidencia, setAnexandoEvidencia] = useState<number | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [submetendo, setSubmetendo] = useState(false);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const recarregarCit = (cicloId: number, servidorId: number) => {
    api.capd
      .listDiarioBordo({ ciclo_id: cicloId, servidor_id: servidorId })
      .then((res) => setAnotacoesCit(res.data || []))
      .catch(() => setAnotacoesCit([]));
  };

  useEffect(() => {
    if (!open || !avaliacaoId) {
      setAvaliacao(null);
      setFatores([]);
      setRespostas({});
      setAnotacoesCit([]);
      setCitExpandido({});
      setErro(null);
      setSucesso(null);
      return;
    }

    setLoading(true);
    setErro(null);
    setSucesso(null);

    Promise.all([api.capd.getAvaliacao(avaliacaoId), api.capd.listFatores()])
      .then(([av, todosFatores]) => {
        setAvaliacao(av);
        setRespostas(av.respostas_fatores || {});
        setFatores(todosFatores.filter((f) => f.ativo && !f.automatizado));
        recarregarCit(av.ciclo_id, av.servidor_id);
      })
      .catch(() => setErro('Não foi possível carregar os dados desta avaliação.'))
      .finally(() => setLoading(false));
  }, [open, avaliacaoId]);

  const anotacoesPorFator = useMemo(() => {
    const mapa: Record<number, ApiDiarioBordo[]> = {};
    for (const a of anotacoesCit) {
      if (!mapa[a.fator_id]) mapa[a.fator_id] = [];
      mapa[a.fator_id].push(a);
    }
    return mapa;
  }, [anotacoesCit]);

  const fatoresPendentes = useMemo(
    () => fatores.filter((f) => !respostas[f.codigo]?.grau).length,
    [fatores, respostas]
  );

  const fatoresSemJustificativa = useMemo(
    () =>
      fatores.filter(
        (f) =>
          GRAUS_EXTREMOS.includes(respostas[f.codigo]?.grau) &&
          (respostas[f.codigo]?.justificativa || '').trim().length < JUSTIFICATIVA_MIN
      ),
    [fatores, respostas]
  );

  const totalFatores = fatores.length;
  const progresso = totalFatores > 0 ? Math.round(((totalFatores - fatoresPendentes) / totalFatores) * 100) : 0;

  const atualizarGrau = (codigo: string, grau: number) => {
    setRespostas((prev) => ({
      ...prev,
      [codigo]: { ...prev[codigo], grau, justificativa: GRAUS_EXTREMOS.includes(grau) ? prev[codigo]?.justificativa : undefined },
    }));
    setSucesso(null);
  };

  const atualizarJustificativa = (codigo: string, justificativa: string) => {
    setRespostas((prev) => ({ ...prev, [codigo]: { ...prev[codigo], justificativa } }));
    setSucesso(null);
  };

  const vincularIncidente = (codigo: string, incidente: ApiDiarioBordo) => {
    setRespostas((prev) => {
      const atual = prev[codigo];
      const jaVinculado = atual?.diario_bordo_id === incidente.id;
      return {
        ...prev,
        [codigo]: {
          ...atual,
          diario_bordo_id: jaVinculado ? undefined : incidente.id,
          justificativa: jaVinculado ? atual?.justificativa : incidente.descricao_fato,
        },
      };
    });
    setSucesso(null);
  };

  const anexarEvidencia = async (incidente: ApiDiarioBordo, file: File) => {
    if (!avaliacao) return;
    setAnexandoEvidencia(incidente.id);
    try {
      await api.capd.uploadEvidencia(incidente.id, file);
      recarregarCit(avaliacao.ciclo_id, avaliacao.servidor_id);
    } catch (e: any) {
      setErro(e?.response?.data?.message || 'Erro ao anexar evidência ao incidente CIT.');
    } finally {
      setAnexandoEvidencia(null);
    }
  };

  const toggleCit = (codigo: string) => {
    setCitExpandido((prev) => ({ ...prev, [codigo]: !prev[codigo] }));
  };

  const salvarRascunho = async () => {
    if (!avaliacaoId) return;
    setSalvando(true);
    setErro(null);
    try {
      await api.capd.salvarRascunho(avaliacaoId, respostas);
      setSucesso('Rascunho salvo com sucesso.');
    } catch (e: any) {
      setErro(e?.response?.data?.message || 'Erro ao salvar rascunho.');
    } finally {
      setSalvando(false);
    }
  };

  const submeter = async () => {
    if (!avaliacaoId) return;
    if (fatoresSemJustificativa.length > 0) {
      setErro(
        `Notas 1, 2 ou 5 exigem justificativa (mínimo ${JUSTIFICATIVA_MIN} caracteres): pendente em ${fatoresSemJustificativa
          .map((f) => f.codigo)
          .join(', ')}.`
      );
      return;
    }
    setSubmetendo(true);
    setErro(null);
    try {
      // Garante que o rascunho está persistido antes de submeter.
      await api.capd.salvarRascunho(avaliacaoId, respostas);
      await api.capd.submeterAvaliacao(avaliacaoId);
      setSucesso('Avaliação submetida com sucesso.');
      onSubmitted?.();
      onClose();
    } catch (e: any) {
      setErro(
        e?.response?.data?.message ||
          'Erro ao submeter avaliação. Notas extremas (graus 1, 2 ou 5) exigem um apontamento prévio no Diário de Bordo (CIT).'
      );
    } finally {
      setSubmetendo(false);
    }
  };

  const nomeServidor = avaliacao?.servidor?.nome_completo || avaliacao?.servidorData?.nome_completo;

  return (
    <Modal open={open} onClose={onClose} title="Preenchimento da Avaliação de Desempenho" size="lg">
      <div className="space-y-4 py-2">
        {loading && <ScreenState type="loading" title="Carregando formulário de avaliação..." />}

        {!loading && erro && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs text-destructive flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{erro}</span>
          </div>
        )}

        {!loading && sucesso && (
          <div className="rounded-lg border border-status-success-border bg-status-success-bg px-4 py-3 text-xs text-status-success flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{sucesso}</span>
          </div>
        )}

        {!loading && avaliacao && (
          <>
            <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {nomeServidor || `Servidor #${avaliacao.servidor_id}`}
                </p>
                <p className="text-[11px] text-muted-foreground font-mono">
                  Ciclo #{avaliacao.ciclo_id}
                  {avaliacao.ciclo?.ano_referencia ? ` — ${avaliacao.ciclo.ano_referencia}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 min-w-[160px]">
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${progresso}%` }}
                  />
                </div>
                <span className="text-[11px] font-mono font-semibold text-foreground">{progresso}%</span>
              </div>
            </div>

            <div className="rounded-lg border border-status-warning-border bg-status-warning-bg px-4 py-3 text-xs text-status-warning flex items-start gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Trava Anti-Leniência: graus 1, 2 ou 5 exigem um apontamento prévio no Diário de Bordo (CIT) para o
                fator correspondente e uma justificativa escrita, senão a submissão será bloqueada.
              </span>
            </div>

            <div className="space-y-3">
              {fatores.map((f) => {
                const resposta = respostas[f.codigo];
                const grauSelecionado = resposta?.grau;
                const ehExtremo = GRAUS_EXTREMOS.includes(grauSelecionado as number);
                const anotacoesFator = anotacoesPorFator[f.id] || [];
                const expandido = !!citExpandido[f.codigo];
                const justificativaCurta =
                  ehExtremo && (resposta?.justificativa || '').trim().length < JUSTIFICATIVA_MIN;

                return (
                  <Card key={f.codigo} className="p-3 gap-3">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="space-y-0.5 max-w-md">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="font-mono text-[10px] font-bold">
                            {f.codigo}
                          </Badge>
                          <span className="font-semibold text-xs text-foreground">{f.nome}</span>
                          {anotacoesFator.length > 0 && (
                            <button
                              type="button"
                              onClick={() => toggleCit(f.codigo)}
                              className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/30 px-2 py-0.5 text-[10px] font-mono font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
                            >
                              <BookOpen className="h-3 w-3" />
                              {anotacoesFator.length} apontamento(s) CIT
                              {expandido ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </button>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground">{f.descricao}</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {GRAUS.map((g) => {
                          const selecionado = grauSelecionado === g.valor;
                          return (
                            <button
                              key={g.valor}
                              type="button"
                              onClick={() => atualizarGrau(f.codigo, g.valor)}
                              className={`px-2.5 py-1.5 rounded-md text-[11px] font-mono font-semibold border transition-colors ${
                                selecionado
                                  ? toneClasses[g.tone]
                                  : 'bg-muted/20 text-muted-foreground border-border hover:bg-muted/40'
                              }`}
                            >
                              {g.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {anotacoesFator.length > 0 && expandido && (
                      <div className="rounded-md border border-border bg-muted/10 divide-y divide-border">
                        {anotacoesFator.map((a) => {
                          const vinculado = resposta?.diario_bordo_id === a.id;
                          return (
                            <div key={a.id} className="p-2 flex items-start gap-2 text-[11px]">
                              <Badge
                                variant={a.tipo === 'positivo' ? 'success' : 'danger'}
                                className="text-[9px] shrink-0"
                              >
                                {a.tipo === 'positivo' ? 'Positivo' : 'Negativo'}
                              </Badge>
                              <div className="min-w-0 flex-1">
                                <p className="font-mono text-muted-foreground">
                                  {new Date(a.data_ocorrencia).toLocaleDateString('pt-BR')}
                                </p>
                                <p className="text-foreground">{a.descricao_fato}</p>
                              </div>
                              {ehExtremo && (
                                <button
                                  type="button"
                                  onClick={() => vincularIncidente(f.codigo, a)}
                                  className={`shrink-0 rounded-md border px-2 py-1 text-[10px] font-mono font-semibold transition-colors ${
                                    vinculado
                                      ? 'bg-status-success text-white border-status-success'
                                      : 'bg-muted/20 text-muted-foreground border-border hover:bg-muted/40'
                                  }`}
                                >
                                  {vinculado ? 'Vinculado ✓' : 'Vincular'}
                                </button>
                              )}
                              {(a.evidencias?.length ?? 0) === 0 && (
                                <label className="shrink-0 rounded-md border border-border px-2 py-1 text-[10px] font-mono font-semibold text-muted-foreground hover:bg-muted/40 cursor-pointer transition-colors">
                                  {anexandoEvidencia === a.id ? 'Enviando...' : 'Anexar evidência'}
                                  <input
                                    type="file"
                                    accept=".pdf,.png,.jpg,.jpeg"
                                    className="hidden"
                                    disabled={anexandoEvidencia === a.id}
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) anexarEvidencia(a, file);
                                      e.target.value = '';
                                    }}
                                  />
                                </label>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {ehExtremo && (
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[11px] font-semibold text-foreground">
                            Justificativa da nota (obrigatória para graus 1, 2 e 5):
                          </label>
                          <span
                            className={`text-[10px] font-mono font-medium ${
                              (resposta?.justificativa || '').trim().length >= JUSTIFICATIVA_MIN
                                ? 'text-status-success'
                                : 'text-status-warning'
                            }`}
                          >
                            {(resposta?.justificativa || '').trim().length}/{JUSTIFICATIVA_MIN}
                          </span>
                        </div>
                        <textarea
                          rows={2}
                          value={resposta?.justificativa || ''}
                          onChange={(e) => atualizarJustificativa(f.codigo, e.target.value)}
                          placeholder="Descreva os fatos observáveis que fundamentam esta nota, referenciando os apontamentos do Diário de Bordo quando houver..."
                          className={`w-full rounded-md border bg-background p-2 text-xs focus:ring-2 focus:ring-primary focus:outline-hidden ${
                            justificativaCurta ? 'border-status-warning-border' : 'border-input'
                          }`}
                        />
                        {!anotacoesFator.some((a) => (a.evidencias?.length ?? 0) > 0) && (
                          <p className="text-[10px] text-status-warning mt-1">
                            Nenhum apontamento CIT com evidência documental anexada foi encontrado para este fator
                            — a submissão será bloqueada pela Trava Anti-Leniência até que um seja registrado com
                            evidência (PDF, PNG ou JPG).
                          </p>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>

            <p className="text-[11px] text-muted-foreground">
              F1 (Assiduidade) e F2 (Disciplina) são calculados automaticamente pela integração de RH no momento da
              submissão e não aparecem aqui.
              {fatoresPendentes > 0 && (
                <span className="text-status-warning font-medium">
                  {' '}
                  {fatoresPendentes} fator(es) ainda sem grau atribuído.
                </span>
              )}
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button variant="outline" size="sm" onClick={onClose}>
                Fechar
              </Button>
              <Button variant="outline" size="sm" onClick={salvarRascunho} disabled={salvando || submetendo}>
                <Save className="h-3.5 w-3.5 mr-1.5" />
                {salvando ? 'Salvando...' : 'Salvar Rascunho'}
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={submeter}
                disabled={submetendo || salvando || fatoresPendentes > 0}
              >
                <Send className="h-3.5 w-3.5 mr-1.5" />
                {submetendo ? 'Submetendo...' : 'Submeter Avaliação'}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default AvaliacaoFormModal;
