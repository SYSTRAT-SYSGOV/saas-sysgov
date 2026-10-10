import React, { useState } from 'react';
import { Button, Modal } from '@sysgov/ui';

/** Confirmação composta de Modal + Button (substitui window.confirm). */
export const ConfirmarModal: React.FC<{
  aberto: boolean;
  titulo: string;
  mensagem: React.ReactNode;
  rotuloConfirmar?: string;
  perigo?: boolean;
  onConfirmar: () => Promise<void>;
  onFechar: () => void;
}> = ({ aberto, titulo, mensagem, rotuloConfirmar = 'Confirmar', perigo = false, onConfirmar, onFechar }) => {
  const [enviando, setEnviando] = useState(false);
  const confirmar = async () => {
    setEnviando(true);
    try {
      await onConfirmar();
      onFechar();
    } finally {
      setEnviando(false);
    }
  };
  return (
    <Modal
      open={aberto}
      onClose={onFechar}
      title={titulo}
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onFechar} disabled={enviando}>Cancelar</Button>
          <Button variant={perigo ? 'destructive' : 'primary'} onClick={confirmar} isLoading={enviando}>{rotuloConfirmar}</Button>
        </>
      }
    >
      <div className="text-sm text-muted-foreground">{mensagem}</div>
    </Modal>
  );
};
