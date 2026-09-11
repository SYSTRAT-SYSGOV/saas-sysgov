import React, { useEffect, useState } from 'react';
import { Card, Button, RichTextEditor, Select } from '@sysgov/ui';
import { PageHeader, ScreenState, ValidationErrorModal } from '@/components/ui';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { useAuth } from '@/core/auth/useAuth';
import { getApiErrorMessage, getApiValidationErrors, type ApiFieldError } from '@/lib/apiErrors';
import { sysgovApi, type CreateLegalDocumentoInput, type LegalDocumento, type TipoLegalDocumento } from '@sysgov/sdk';

const TIPO_OPTIONS: { value: TipoLegalDocumento; label: string }[] = [
  { value: 'lei', label: 'Lei' },
  { value: 'decreto', label: 'Decreto' },
  { value: 'instrucao_normativa', label: 'Instrução Normativa' },
  { value: 'jurisprudencia', label: 'Jurisprudência' },
  { value: 'outro', label: 'Outro' },
];

const emptyForm: CreateLegalDocumentoInput = {
  tipo: 'decreto',
  numero: '',
  titulo: '',
  ementa: '',
  texto_completo: '',
  tags: [],
};

interface LegislacaoDetailPageProps {
  /** null cria um documento novo; um número carrega o documento para edição. */
  documentoId: number | null;
  onBack: () => void;
  onSaved: (documento: LegalDocumento) => void;
}

/**
 * Tela cheia de cadastro/edição de documento da Biblioteca de Legislação —
 * mesmo padrão do DfdDetailPage: substitui a grid (e as abas do Licita)
 * em vez de abrir o formulário inline, do jeito que já era feito para o
 * DFD do Processo.
 */
export const LegislacaoDetailPage: React.FC<LegislacaoDetailPageProps> = ({ documentoId, onBack, onSaved }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(documentoId !== null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<CreateLegalDocumentoInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ApiFieldError[] | null>(null);

  useEffect(() => {
    if (documentoId === null) return;
    let cancelado = false;
    setLoading(true);
    setError(null);
    sysgovApi.licita
      .getLegislacao(documentoId)
      .then((documento) => {
        if (cancelado) return;
        setForm({
          tipo: documento.tipo,
          numero: documento.numero ?? '',
          titulo: documento.titulo,
          ementa: documento.ementa ?? '',
          texto_completo: documento.texto_completo,
          tags: documento.tags ?? [],
        });
      })
      .catch((err: any) => {
        if (cancelado) return;
        setError(err?.response?.data?.error || err?.message || 'Erro ao carregar o documento.');
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });
    return () => {
      cancelado = true;
    };
  }, [documentoId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    setValidationErrors(null);
    try {
      const documento =
        documentoId === null
          ? await sysgovApi.licita.createLegislacao(form)
          : await sysgovApi.licita.updateLegislacao(documentoId, form);
      onSaved(documento);
    } catch (err) {
      const fieldErrors = getApiValidationErrors(err);
      if (fieldErrors) {
        setValidationErrors(fieldErrors);
      } else {
        setFormError(getApiErrorMessage(err, 'Erro ao salvar o documento.'));
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <ScreenState type="loading" title="Carregando documento..." />;
  if (error) {
    return <ScreenState type="error" title="Erro ao carregar" description={error} actionLabel="Voltar" onAction={onBack} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<BookOpen className="h-6 w-6" />}
        title={documentoId === null ? 'Novo Documento' : 'Editar Documento'}
        subtitle="Biblioteca de Legislação"
        actions={
          <Button variant="outline" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={onBack}>
            Voltar
          </Button>
        }
      />

      <ValidationErrorModal
        open={validationErrors !== null}
        onClose={() => setValidationErrors(null)}
        errors={validationErrors ?? []}
      />

      <Card className="p-6 space-y-4">
        {formError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {formError}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_200px] gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Título *</label>
              <input
                // Sem `required` nativo — ver comentário equivalente em
                // DfdForm.tsx: bloquearia o submit antes da
                // ValidationErrorModal padrão poder aparecer.
                type="text"
                value={form.titulo}
                onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Tipo *</label>
              <Select
                value={form.tipo}
                onChange={(v) => setForm((f) => ({ ...f, tipo: v as TipoLegalDocumento }))}
                options={TIPO_OPTIONS}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Número</label>
            <input
              type="text"
              value={form.numero ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, numero: e.target.value }))}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Ex.: Decreto 1.234/2024"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Ementa</label>
            <textarea
              value={form.ementa ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, ementa: e.target.value }))}
              rows={2}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Texto Completo *</label>
            <RichTextEditor
              value={form.texto_completo}
              onChange={(html) => setForm((f) => ({ ...f, texto_completo: html }))}
              minHeight={320}
            />
          </div>

          {documentoId === null && user?.is_platform_admin && (
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={Boolean(form.global)}
                onChange={(e) => setForm((f) => ({ ...f, global: e.target.checked }))}
                className="rounded border-input text-primary focus:ring-primary"
              />
              Documento GLOBAL (visível para todos os órgãos da plataforma)
            </label>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onBack}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" isLoading={saving}>
              Salvar
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default LegislacaoDetailPage;
