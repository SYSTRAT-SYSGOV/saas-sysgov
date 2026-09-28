import React, { useState, useCallback } from 'react';
import { Button, Modal, Field } from '@/components/ui';
import { useCan } from '@/core/rbac/useCan';
import { cemiteriosApi, type Sucessao, type EstadoSucessao } from '../api';
import { useAcao, ErroBox } from '../views/comum';
import {
  transicoesValidas,
  TRANSICAO_LABELS,
  ESTADO_LABELS,
  ESTADO_BADGE_VARIANT,
} from '../hooks/useSucessaoTransicoes';
import { StatusChip } from '@/components/ui';

interface SucessaoActionsProps {
  sucessao: Sucessao;
  onAction?: () => void;
}

export const SucessaoActions: React.FC<SucessaoActionsProps> = ({ sucessao, onAction }) => {
  const { can } = useCan();
  const podeTransitionar = can('cemiterios.sucessao.transition');
  const { executar, erro, enviando } = useAcao();
  const [modalTransicao, setModalTransicao] = useState<{ para: EstadoSucessao } | null>(null);
  const [motivo, setMotivo] = useState('');

  const transicoes = transicoesValidas(sucessao.estado);

  const handleTransicao = useCallback(async () => {
    if (!modalTransicao || !motivo.trim()) return;
    await executar(async () =>
      cemiteriosApi.transicionarSucessao(sucessao.id, {
        para: modalTransicao.para,
        motivo: motivo,
        lock_version: sucessao.lock_version,
      })
    );
    setModalTransicao(null);
    setMotivo('');
    onAction?.();
  }, [modalTransicao, motivo, sucessao, executar, onAction]);

  if (!podeTransitionar) return null;
  if (transicoes.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Ações Disponíveis</h3>
        <StatusChip
          label={ESTADO_LABELS[sucessao.estado] ?? sucessao.estado}
          variant={ESTADO_BADGE_VARIANT[sucessao.estado] ?? 'neutral'}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {transicoes.map((para) => {
          const label = TRANSICAO_LABELS[sucessao.estado]?.[para] ?? para;
          return (
            <Button
              key={para}
              size="sm"
              variant="outline"
              onClick={() => {
                setModalTransicao({ para });
                setMotivo('');
              }}
            >
              {label}
            </Button>
          );
        })}
      </div>

      <ErroBox erro={erro} />

      <Modal
        open={modalTransicao !== null}
        onClose={() => {
          setModalTransicao(null);
          setMotivo('');
        }}
        title="Confirmar Transição de Estado"
        description={
          modalTransicao
            ? `Transicionar de "${ESTADO_LABELS[sucessao.estado] ?? sucessao.estado}" para "${ESTADO_LABELS[modalTransicao.para] ?? modalTransicao.para}"`
            : ''
        }
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setModalTransicao(null);
                setMotivo('');
              }}
            >
              Cancelar
            </Button>
            <Button size="sm" onClick={handleTransicao} disabled={enviando || !motivo.trim()}>
              {enviando ? 'Processando…' : 'Confirmar'}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Field label="Motivo / Fundamentalização" required>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Descreva o motivo da transição..."
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y min-h-[100px]"
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
};

export default SucessaoActions;
