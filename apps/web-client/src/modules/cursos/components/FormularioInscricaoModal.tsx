import React, { useEffect, useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import { Button, Modal } from '@sysgov/ui';
import type { RespostaInscricaoInput } from '@sysgov/sdk';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { useCamposInscricao } from '../utils/useCamposInscricao';
import { CamposInscricaoForm } from './CamposInscricaoForm';
import { ErroFormulario } from './ErroFormulario';

interface Props {
  open: boolean;
  cursoId: number | null;
  descricao: string;
  onClose: () => void;
  /** Não captura os próprios erros — o modal mostra o que vier daqui e continua aberto. */
  onConfirmar: (respostas: RespostaInscricaoInput[]) => Promise<void>;
}

/** Confirmação de inscrição com os campos extras do curso (design D9), quando existem. */
export const FormularioInscricaoModal: React.FC<Props> = ({ open, cursoId, descricao, onClose, onConfirmar }) => {
  const { campos, carregando, erroCarga, valores, setValor, validar, respostas } = useCamposInscricao(cursoId, open);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (open) setErro(null);
  }, [open]);

  const confirmar = async () => {
    const problema = validar();
    if (problema) {
      setErro(problema);
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      await onConfirmar(respostas());
    } catch (e) {
      setErro(getApiErrorMessage(e, 'Não foi possível concluir a inscrição.'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Confirmar inscrição" icon={<ClipboardCheck className="h-5 w-5" />} size="md">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{descricao}</p>
        <ErroFormulario mensagem={erro ?? erroCarga} />
        {carregando ? (
          <p className="text-sm text-muted-foreground">Carregando formulário...</p>
        ) : campos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma informação adicional é necessária para esta inscrição.</p>
        ) : (
          <CamposInscricaoForm campos={campos} valores={valores} onChange={setValor} />
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={confirmar} isLoading={enviando} disabled={carregando}>
            Confirmar inscrição
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default FormularioInscricaoModal;
