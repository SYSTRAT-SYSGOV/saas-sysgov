import React, { useEffect, useState } from 'react';
import { Modal, Badge, Button } from '@sysgov/ui';
import { FileText, AlertTriangle } from 'lucide-react';
import { SysgovApi } from '@sysgov/sdk';
import type { ApiEspelhoAvaliacao } from '@sysgov/sdk';
import { ScreenState } from '@/components/ui/ScreenState';
import { StatusChip } from '@/components/ui/StatusChip';

const api = new SysgovApi();

interface Props {
  avaliacaoId: number | null;
  open: boolean;
  onClose: () => void;
}

/**
 * Visualização somente-leitura do Espelho Funcional de uma avaliação —
 * reutilizável por qualquer portal (Chefia, Comissão, RH) que precise
 * abrir o detalhe de uma avaliação sem poder editá-la.
 */
export const EspelhoAvaliacaoModal: React.FC<Props> = ({ avaliacaoId, open, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [espelho, setEspelho] = useState<ApiEspelhoAvaliacao | null>(null);

  useEffect(() => {
    if (!open || !avaliacaoId) {
      setEspelho(null);
      setErro(null);
      return;
    }
    setLoading(true);
    setErro(null);
    api.capd
      .obterEspelhoAvaliacao(avaliacaoId)
      .then(setEspelho)
      .catch(() => setErro('Não foi possível carregar o espelho desta avaliação.'))
      .finally(() => setLoading(false));
  }, [open, avaliacaoId]);

  return (
    <Modal open={open} onClose={onClose} title="Espelho Funcional da Avaliação" size="lg">
      <div className="space-y-4 py-2">
        {loading && <ScreenState type="loading" title="Carregando espelho da avaliação..." />}

        {!loading && erro && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{erro}</span>
          </div>
        )}

        {!loading && !erro && espelho && (
          <div className="space-y-4 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
              <div>
                <div className="font-semibold text-sm text-foreground">
                  {espelho.servidor?.nome || `Servidor #${espelho.avaliacao_id}`}
                </div>
                <div className="text-muted-foreground">
                  Matrícula: {espelho.servidor?.matricula || '—'} · Ciclo: {espelho.ciclo?.nome || `#${espelho.ciclo?.id}`}
                </div>
                <div className="text-muted-foreground">
                  Avaliador: {espelho.avaliador?.nome || '—'}
                </div>
              </div>
              <div className="text-right space-y-1">
                <div className="font-mono text-lg font-bold tabular-nums">
                  {espelho.nota_final}
                </div>
                <StatusChip
                  label={espelho.elegivel_progressao ? 'Apto à Progressão' : 'Inapto'}
                  variant={espelho.elegivel_progressao ? 'success' : 'danger'}
                />
              </div>
            </div>

            <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
              {espelho.fatores.map((f) => {
                // A API pode retornar `nota` como objeto {grau, pontos} quando a
                // resposta bruta do fator não tem a chave `nota` explícita.
                const notaExibida =
                  f.nota !== null && typeof f.nota === 'object'
                    ? (f.nota as any).pontos ?? '—'
                    : f.nota ?? '—';
                const grauExibido = f.grau ?? (f.nota !== null && typeof f.nota === 'object' ? (f.nota as any).grau : null);

                return (
                  <div key={f.codigo} className="p-3 flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-[10px] font-bold">
                          {f.codigo}
                        </Badge>
                        <span className="font-medium text-foreground">{f.nome}</span>
                      </div>
                      {f.descricao && <p className="text-muted-foreground">{f.descricao}</p>}
                      {f.justificativa && (
                        <p className="text-muted-foreground italic">"{f.justificativa}"</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold tabular-nums">{notaExibida}</div>
                      {grauExibido != null && <div className="text-[10px] text-muted-foreground">Grau {grauExibido}</div>}
                    </div>
                  </div>
                );
              })}
            </div>

            {espelho.parecer_avaliador && (
              <div className="rounded-lg border border-border p-3 space-y-1">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" /> Parecer do Avaliador
                </div>
                <p className="text-muted-foreground">{espelho.parecer_avaliador}</p>
              </div>
            )}

            {espelho.devolutiva_realizada && (
              <div className="rounded-lg border border-status-success-border bg-status-success-bg p-3 space-y-1 text-status-success">
                <div className="font-semibold">Devolutiva Presencial Realizada</div>
                {espelho.devolutiva_em && (
                  <p>Em {new Date(espelho.devolutiva_em).toLocaleDateString('pt-BR')}</p>
                )}
                {espelho.devolutiva_resumo && <p>{espelho.devolutiva_resumo}</p>}
              </div>
            )}
          </div>
        )}

        {!loading && !erro && !espelho && (
          <p className="text-xs text-muted-foreground">Nenhuma avaliação selecionada.</p>
        )}

        <div className="flex justify-end pt-2 border-t border-border">
          <Button size="sm" variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default EspelhoAvaliacaoModal;
