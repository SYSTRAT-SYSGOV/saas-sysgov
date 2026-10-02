import React, { useState } from 'react';
import { Modal, Button, Input, Textarea } from '@sysgov/ui';
import { Send, AlertCircle } from 'lucide-react';
import { requerimentosApi } from '../api';
import type { Proposicao } from '../api';
import { getApiErrorMessage } from '@/lib/apiErrors';

interface EncaminharProposicaoModalProps {
  proposicao: Proposicao;
  onClose: () => void;
  onEncaminhado: () => void;
}

const PODER_LABEL: Record<string, string> = {
  camara: 'Câmara Municipal',
  prefeitura: 'Prefeitura Municipal',
};

/**
 * Só existem dois Poderes no sistema — o destino é sempre "o outro", não há
 * motivo pra pedir isso ao usuário. É o primeiro passo da tramitação
 * (protocolado → encaminhado), sem o qual nenhuma proposição criada pela
 * tela avançava de status.
 */
export const EncaminharProposicaoModal: React.FC<EncaminharProposicaoModalProps> = ({
  proposicao,
  onClose,
  onEncaminhado,
}) => {
  const poderDestino = proposicao.poder_origem === 'camara' ? 'prefeitura' : 'camara';
  const prazoPadrao = proposicao.tipo_instrumento?.prazo_regimental_dias ?? 30;

  const [prazoDias, setPrazoDias] = useState(String(prazoPadrao));
  const [observacao, setObservacao] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const handleSubmit = async () => {
    setEnviando(true);
    setErro(null);
    try {
      await requerimentosApi.criarTramitacao({
        proposicao_id: proposicao.id,
        poder_origem: proposicao.poder_origem,
        poder_destino: poderDestino,
        prazo_dias: prazoDias ? Number(prazoDias) : undefined,
        observacao: observacao || undefined,
      });
      onEncaminhado();
    } catch (err: unknown) {
      setErro(getApiErrorMessage(err, 'Erro ao encaminhar a proposição.'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      icon={<Send className="h-5 w-5" />}
      title="Encaminhar Proposição"
      description={`${proposicao.numero} — ${proposicao.ementa}`}
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
          <strong>{PODER_LABEL[proposicao.poder_origem] ?? proposicao.poder_origem}</strong>
          {' → '}
          <strong>{PODER_LABEL[poderDestino]}</strong>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Prazo para resposta (dias)</label>
          <Input
            type="number"
            min={1}
            value={prazoDias}
            onChange={(e) => setPrazoDias(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Observação</label>
          <Textarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Observações sobre o encaminhamento (opcional)..."
            rows={3}
          />
        </div>

        {erro && (
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm text-rose-700 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            {erro}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose} disabled={enviando}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={enviando} isLoading={enviando}>
            <Send className="h-4 w-4 mr-2" />
            Encaminhar
          </Button>
        </div>
      </div>
    </Modal>
  );
};
