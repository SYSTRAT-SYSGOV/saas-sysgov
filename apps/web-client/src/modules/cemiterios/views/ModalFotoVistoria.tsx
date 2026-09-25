import React from 'react';
import { Modal, Button } from '@sysgov/ui';
import { X, Calendar, Image as ImageIcon } from 'lucide-react';
import { formatarData } from '../api';
import { Mono } from './comum';

export interface ModalFotoVistoriaProps {
  aberto: boolean;
  fotoUrl: string | null;
  capturadaEm?: string | null;
  onFechar: () => void;
}

export const ModalFotoVistoria: React.FC<ModalFotoVistoriaProps> = ({
  aberto,
  fotoUrl,
  capturadaEm,
  onFechar,
}) => {
  if (!aberto || !fotoUrl) return null;

  return (
    <Modal
      open={aberto}
      onClose={onFechar}
      title="Fotografia de Vistoria Técnica"
      description="Registro fotográfico anexado ao laudo de fiscalização da unidade."
      className="max-w-2xl"
    >
      <div className="space-y-3 py-2 text-xs">
        <div className="w-full bg-black/95 rounded-lg overflow-hidden flex items-center justify-center min-h-[300px] max-h-[500px] border border-border">
          <img
            src={fotoUrl}
            alt="Registro de vistoria"
            className="w-full h-full object-contain max-h-[480px]"
          />
        </div>

        {capturadaEm && (
          <div className="flex items-center justify-between text-muted-foreground pt-1">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-primary" /> Capturada em:
            </span>
            <Mono className="font-semibold text-foreground">{formatarData(capturadaEm)}</Mono>
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-border">
          <Button variant="outline" size="sm" onClick={onFechar}>
            Fechar
          </Button>
        </div>
      </div>
    </Modal>
  );
};
