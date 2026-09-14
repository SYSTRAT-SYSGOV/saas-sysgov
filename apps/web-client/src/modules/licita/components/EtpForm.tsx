import React, { useState } from 'react';
import { Button } from '@sysgov/ui';
import { Plus, Trash2 } from 'lucide-react';
import type { CampoConfig, CreateEtpInput, MembroEquipePlanejamento } from '@sysgov/sdk';
import { CamposExtrasFields } from './CamposExtrasFields';
import { RichTextEditorWithIa } from './RichTextEditorWithIa';
import { ValidationErrorModal } from '@/components/ui';
import { getApiErrorMessage, getApiValidationErrors, type ApiFieldError } from '@/lib/apiErrors';

const emptyMembro: MembroEquipePlanejamento = { nome: '', cargo: '', matricula: '' };

interface EtpFormProps {
  initialValue?: Partial<CreateEtpInput>;
  /** Objeto do processo — só para dar contexto à sugestão de IA, não é salvo pelo ETP (esse campo é do DFD). */
  objetoProcesso?: string | null;
  disabled?: boolean;
  submitLabel: string;
  onSubmit: (data: CreateEtpInput) => Promise<void> | void;
  /** Campos extras configurados pelo órgão para o ETP (ver CamposConfiguracaoPage). */
  camposExtras?: CampoConfig[];
}

/**
 * Formulário do ETP — mais simples que o DfdForm: o conteúdo é um único
 * texto rico estruturado (art. 18, §1º da Lei 14.133/2021), não campos
 * fixos por inciso; só a equipe de planejamento e os campos extras
 * configuráveis têm estrutura própria, igual ao DFD.
 */
export const EtpForm: React.FC<EtpFormProps> = ({
  initialValue,
  objetoProcesso,
  disabled,
  submitLabel,
  onSubmit,
  camposExtras = [],
}) => {
  const [conteudo, setConteudo] = useState(initialValue?.conteudo ?? '');
  const [equipe, setEquipe] = useState<MembroEquipePlanejamento[]>(
    initialValue?.equipe_planejamento && initialValue.equipe_planejamento.length > 0
      ? initialValue.equipe_planejamento
      : [{ ...emptyMembro }, { ...emptyMembro }],
  );
  const [camposExtrasValores, setCamposExtrasValores] = useState<Record<string, unknown>>(
    initialValue?.campos_extras ?? {},
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ApiFieldError[] | null>(null);
  // Mesma lógica do DfdForm: vira false assim que o usuário mexe manualmente
  // no conteúdo depois de aceitar uma sugestão de IA.
  const [conteudoGeradoPorIa, setConteudoGeradoPorIa] = useState(initialValue?.gerado_por_ia ?? false);

  const handleConteudoChange = (value: string) => {
    setConteudo(value);
    setConteudoGeradoPorIa(false);
  };

  const updateMembro = (index: number, patch: Partial<MembroEquipePlanejamento>) => {
    setEquipe((prev) => prev.map((m, i) => (i === index ? { ...m, ...patch } : m)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setValidationErrors(null);
    setSaving(true);
    try {
      await onSubmit({
        conteudo,
        equipe_planejamento: equipe.filter((m) => m.nome && m.cargo && m.matricula),
        campos_extras: camposExtrasValores,
        gerado_por_ia: conteudoGeradoPorIa,
      });
    } catch (err) {
      const fieldErrors = getApiValidationErrors(err);
      if (fieldErrors) {
        setValidationErrors(fieldErrors);
      } else {
        setError(getApiErrorMessage(err, 'Erro ao salvar o ETP.'));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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

      <div>
        <RichTextEditorWithIa
          label="Estudo Técnico Preliminar *"
          value={conteudo}
          onChange={handleConteudoChange}
          disabled={disabled}
          minHeight={400}
          placeholder="Descreva a necessidade, os requisitos da contratação, o levantamento de mercado, a solução escolhida, a estimativa de quantidades e valor, o alinhamento com o PCA e os demais elementos do art. 18, §1º da Lei 14.133/2021."
          campo="Estudo Técnico Preliminar (ETP)"
          contexto={objetoProcesso ? `Objeto do processo: ${objetoProcesso}` : undefined}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-foreground">
            Equipe de Planejamento <span className="font-normal text-muted-foreground">(mínimo 2 pessoas)</span>
          </label>
          {!disabled && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => setEquipe((prev) => [...prev, { ...emptyMembro }])}
            >
              Adicionar
            </Button>
          )}
        </div>
        <div className="space-y-2">
          {equipe.map((membro, index) => (
            <div key={index} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_120px_auto] gap-2 items-center">
              <input
                type="text"
                disabled={disabled}
                placeholder="Nome"
                value={membro.nome}
                onChange={(e) => updateMembro(index, { nome: e.target.value })}
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <input
                type="text"
                disabled={disabled}
                placeholder="Cargo/Função"
                value={membro.cargo}
                onChange={(e) => updateMembro(index, { cargo: e.target.value })}
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <input
                type="text"
                disabled={disabled}
                placeholder="Matrícula"
                value={membro.matricula}
                onChange={(e) => updateMembro(index, { matricula: e.target.value })}
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono text-foreground disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {!disabled && equipe.length > 2 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setEquipe((prev) => prev.filter((_, i) => i !== index))}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      {camposExtras.length > 0 && (
        <CamposExtrasFields
          campos={camposExtras}
          valores={camposExtrasValores}
          onChange={setCamposExtrasValores}
          disabled={disabled}
        />
      )}

      {!disabled && (
        <div className="flex justify-end gap-2 pt-2">
          <Button type="submit" variant="primary" isLoading={saving}>
            {submitLabel}
          </Button>
        </div>
      )}
    </form>
  );
};

export default EtpForm;
