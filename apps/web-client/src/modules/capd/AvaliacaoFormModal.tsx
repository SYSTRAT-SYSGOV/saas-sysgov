import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Badge, Button } from '@sysgov/ui';
import { AlertTriangle, CheckCircle2, Send, Save, ShieldAlert } from 'lucide-react';
import { SysgovApi } from '@sysgov/sdk';
import type { ApiAvaliacao, ApiFator, RespostaFator } from '@sysgov/sdk';
import { ScreenState } from '@/components/ui/ScreenState';

const api = new SysgovApi();

const GRAUS = [
  { valor: 5, label: '5 — Excelente' },
  { valor: 4, label: '4 — Bom' },
  { valor: 3, label: '3 — Regular' },
  { valor: 2, label: '2 — Insuficiente' },
  { valor: 1, label: '1 — Crítico' },
];

interface Props {
  avaliacaoId: number | null;
  open: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
}

/**
 * Formulário real de preenchimento da Avaliação de Desempenho pela
 * Chefia Imediata: Escala Gráfica (grau 1-5 por fator), salvamento de
 * rascunho e submissão final (com Trava Anti-Leniência aplicada pelo
 * backend). F1/F2 (Assiduidade/Disciplina) são calculados
 * automaticamente pela integração de RH e não aparecem para edição.
 */
export const AvaliacaoFormModal: React.FC<Props> = ({ avaliacaoId, open, onClose, onSubmitted }) => {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [avaliacao, setAvaliacao] = useState<ApiAvaliacao | null>(null);
  const [fatores, setFatores] = useState<ApiFator[]>([]);
  const [respostas, setRespostas] = useState<Record<string, RespostaFator>>({});
  const [salvando, setSalvando] = useState(false);
  const [submetendo, setSubmetendo] = useState(false);
  const [sucesso, setSucesso] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !avaliacaoId) {
      setAvaliacao(null);
      setFatores([]);
      setRespostas({});
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
      })
      .catch(() => setErro('Não foi possível carregar os dados desta avaliação.'))
      .finally(() => setLoading(false));
  }, [open, avaliacaoId]);

  const fatoresPendentes = useMemo(
    () => fatores.filter((f) => !respostas[f.codigo]?.grau).length,
    [fatores, respostas]
  );

  const atualizarGrau = (codigo: string, grau: number) => {
    setRespostas((prev) => ({ ...prev, [codigo]: { grau } }));
    setSucesso(null);
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
            <div className="rounded-lg border border-status-warning-border bg-status-warning-bg px-4 py-3 text-xs text-status-warning flex items-start gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Trava Anti-Leniência: graus 1, 2 ou 5 exigem um apontamento prévio no Diário de Bordo (CIT) para o
                fator correspondente, senão a submissão será bloqueada.
              </span>
            </div>

            <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
              {fatores.map((f) => (
                <div key={f.codigo} className="p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-0.5 max-w-md">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-[10px] font-bold">
                        {f.codigo}
                      </Badge>
                      <span className="font-semibold text-xs text-foreground">{f.nome}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{f.descricao}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {GRAUS.map((g) => (
                      <button
                        key={g.valor}
                        type="button"
                        onClick={() => atualizarGrau(f.codigo, g.valor)}
                        className={`px-2.5 py-1.5 rounded-md text-[11px] font-mono font-semibold border transition-colors ${
                          respostas[f.codigo]?.grau === g.valor
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-muted/20 text-muted-foreground border-border hover:bg-muted/40'
                        }`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
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
