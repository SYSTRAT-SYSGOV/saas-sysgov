import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Dialog } from '@sysgov/ui';
import type { ApiFieldError } from '@/lib/apiErrors';

export interface ValidationErrorModalProps {
  open: boolean;
  onClose: () => void;
  /** Lista de erros de campo (ver `getApiValidationErrors`). */
  errors: ApiFieldError[];
  title?: string;
  description?: string;
}

/**
 * Modal padrão para erro de validação de formulário (422 do backend).
 *
 * Em vez de cada tela devolver a mensagem crua do Laravel num alerta
 * inline (ex.: "The selected campos.0.tipo is invalid. (and 1 more
 * error)" — ilegível pro usuário do órgão e sem indicar QUAL campo
 * obrigatório falhou), esta modal lista um item por campo com erro,
 * chamando a atenção pra correção necessária antes de tentar salvar de
 * novo. Use com `getApiValidationErrors(err)` no catch do `handleSave`:
 *
 * ```tsx
 * const errs = getApiValidationErrors(err);
 * if (errs) { setValidationErrors(errs); return; }
 * setSaveError(getApiErrorMessage(err));
 * ```
 */
export const ValidationErrorModal: React.FC<ValidationErrorModalProps> = ({
  open,
  onClose,
  errors,
  title = 'Verifique os campos destacados',
  description = 'Não foi possível salvar porque alguns campos precisam de atenção:',
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      icon={<AlertTriangle className="h-5 w-5 text-destructive" />}
      size="sm"
      footer={
        <button
          onClick={onClose}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Entendi
        </button>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">{description}</p>
        <ul className="space-y-2">
          {errors.map((error, index) => (
            <li
              key={`${error.field}-${index}`}
              className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error.message}</span>
            </li>
          ))}
        </ul>
      </div>
    </Dialog>
  );
};

export default ValidationErrorModal;
