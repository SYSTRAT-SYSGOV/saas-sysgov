import React, { useEffect, useState } from 'react';
import { Button, Dialog } from '@sysgov/ui';
import { Plus, Trash2 } from 'lucide-react';
import type { MembroEquipePlanejamento } from '@sysgov/sdk';
import { getApiErrorMessage, getApiValidationErrors, type ApiFieldError } from '@/lib/apiErrors';
import { ValidationErrorModal } from '@/components/ui';

const emptyMembro: MembroEquipePlanejamento = { nome: '', cargo: '', matricula: '' };

interface AlterarEquipePlanejamentoModalProps {
  open: boolean;
  equipeAtual: MembroEquipePlanejamento[];
  onClose: () => void;
  onSalvar: (equipe: MembroEquipePlanejamento[]) => Promise<void>;
}

/**
 * Só usado pelo aprovador enquanto o DFD está em revisão (RN em
 * DfdPolicy::alterarEquipe) — via de correção rápida da equipe de
 * planejamento indicada pelo requisitante sem precisar rejeitar o DFD
 * inteiro. Deliberadamente separado do DfdForm: mexe só nesse campo, com
 * seu próprio endpoint e registro no histórico (ver DfdService).
 */
export const AlterarEquipePlanejamentoModal: React.FC<AlterarEquipePlanejamentoModalProps> = ({
  open,
  equipeAtual,
  onClose,
  onSalvar,
}) => {
  const [equipe, setEquipe] = useState<MembroEquipePlanejamento[]>(equipeAtual);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ApiFieldError[] | null>(null);

  // Reabre sempre com os dados atuais do DFD — evita reaproveitar estado de
  // uma abertura anterior do modal (ex.: se o aprovador cancelou no meio).
  useEffect(() => {
    if (open) {
      setEquipe(equipeAtual.length > 0 ? equipeAtual : [{ ...emptyMembro }, { ...emptyMembro }]);
      setError(null);
      setValidationErrors(null);
    }
  }, [open, equipeAtual]);

  const updateMembro = (index: number, patch: Partial<MembroEquipePlanejamento>) => {
    setEquipe((prev) => prev.map((m, i) => (i === index ? { ...m, ...patch } : m)));
  };

  const handleSalvar = async () => {
    setError(null);
    setValidationErrors(null);
    setSaving(true);
    try {
      await onSalvar(equipe.filter((m) => m.nome && m.cargo && m.matricula));
    } catch (err) {
      const fieldErrors = getApiValidationErrors(err);
      if (fieldErrors) {
        setValidationErrors(fieldErrors);
      } else {
        setError(getApiErrorMessage(err, 'Erro ao alterar a equipe de planejamento.'));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Alterar Equipe de Planejamento"
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSalvar} isLoading={saving}>
            Salvar Equipe
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Como aprovador, você pode corrigir a equipe de planejamento indicada pelo requisitante antes de decidir
          sobre este DFD — sem precisar rejeitá-lo. A alteração fica registrada no histórico do documento.
        </p>

        <ValidationErrorModal
          open={validationErrors !== null}
          onClose={() => setValidationErrors(null)}
          errors={validationErrors ?? []}
        />
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">
            Equipe <span className="font-normal text-muted-foreground">(mínimo 2 pessoas)</span>
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            leftIcon={<Plus className="h-3.5 w-3.5" />}
            onClick={() => setEquipe((prev) => [...prev, { ...emptyMembro }])}
          >
            Adicionar
          </Button>
        </div>

        <div className="space-y-2">
          {equipe.map((membro, index) => (
            <div key={index} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_120px_auto] gap-2 items-center">
              <input
                type="text"
                placeholder="Nome"
                value={membro.nome}
                onChange={(e) => updateMembro(index, { nome: e.target.value })}
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <input
                type="text"
                placeholder="Cargo/Função"
                value={membro.cargo}
                onChange={(e) => updateMembro(index, { cargo: e.target.value })}
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <input
                type="text"
                placeholder="Matrícula"
                value={membro.matricula}
                onChange={(e) => updateMembro(index, { matricula: e.target.value })}
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {/* Nunca deixa remover abaixo de 2 — mínimo exigido pelo backend (ver DfdController). */}
              {equipe.length > 2 && (
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => setEquipe((prev) => prev.filter((_, i) => i !== index))}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </Dialog>
  );
};

export default AlterarEquipePlanejamentoModal;
