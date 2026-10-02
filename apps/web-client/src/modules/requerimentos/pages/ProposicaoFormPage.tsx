import React, { useEffect, useState } from 'react';
import { Card, Button, Input, Select, Textarea, Switch } from '@sysgov/ui';
import type { SelectOption } from '@sysgov/ui';
import { PageHeader, ScreenState, ValidationErrorModal } from '@/components/ui';
import { ArrowLeft, FileText, AlertCircle } from 'lucide-react';
import { getApiErrorMessage, getApiValidationErrors, type ApiFieldError } from '@/lib/apiErrors';
import { requerimentosApi } from '../api';
import type { Proposicao, TipoInstrumento } from '../api';

interface ProposicaoFormPageProps {
  /** null cria uma proposição nova; um número carrega a proposição para edição. */
  proposicaoId: number | null;
  tipos: TipoInstrumento[];
  onBack: () => void;
  onSaved: (proposicao: Proposicao) => void;
}

interface FormState {
  tipo_slug: string;
  ementa: string;
  justificativa: string;
  conteudo: string;
  area_tematica: string;
  dispositivos_legais: string;
  poder_origem: 'camara' | 'prefeitura';
  partido_bancada: string;
  visibilidade_publica: boolean;
}

const emptyForm: FormState = {
  tipo_slug: '',
  ementa: '',
  justificativa: '',
  conteudo: '',
  area_tematica: '',
  dispositivos_legais: '',
  poder_origem: 'camara',
  partido_bancada: '',
  visibilidade_publica: true,
};

/**
 * Tela cheia de criação/edição de proposição — mesmo padrão de
 * LegislacaoDetailPage.tsx (Licita): um componente único para os dois
 * modos, navegação por `onBack`/`onSaved` em vez de rota própria. Substitui
 * o antigo `CriarProposicaoModal`, apertado demais pro tamanho do formulário.
 * Tipo de instrumento, número e Poder de origem são fixados no protocolo e
 * não editam (ver `ProposicaoService::atualizar` no backend).
 */
export const ProposicaoFormPage: React.FC<ProposicaoFormPageProps> = ({ proposicaoId, tipos, onBack, onSaved }) => {
  const editando = proposicaoId !== null;
  const [loading, setLoading] = useState(editando);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [numero, setNumero] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ApiFieldError[] | null>(null);

  useEffect(() => {
    if (proposicaoId === null) return;
    let cancelado = false;
    setLoading(true);
    setLoadError(null);
    requerimentosApi
      .getProposicao(proposicaoId)
      .then((res) => {
        if (cancelado) return;
        const p = res.data;
        setNumero(p.numero);
        setForm({
          tipo_slug: p.tipo_instrumento?.slug ?? '',
          ementa: p.ementa,
          justificativa: p.justificativa ?? '',
          conteudo: p.conteudo ?? '',
          area_tematica: p.area_tematica ?? '',
          dispositivos_legais: p.dispositivos_legais ?? '',
          poder_origem: p.poder_origem as 'camara' | 'prefeitura',
          partido_bancada: p.partido_bancada ?? '',
          visibilidade_publica: p.visibilidade_publica,
        });
      })
      .catch((err: unknown) => {
        if (cancelado) return;
        setLoadError(getApiErrorMessage(err, 'Erro ao carregar a proposição.'));
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });
    return () => {
      cancelado = true;
    };
  }, [proposicaoId]);

  const tipoSelecionado = tipos.find((t) => t.slug === form.tipo_slug);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    setValidationErrors(null);
    try {
      const proposicao = editando
        ? (
            await requerimentosApi.atualizarProposicao(proposicaoId, {
              ementa: form.ementa,
              justificativa: form.justificativa || null,
              conteudo: form.conteudo || null,
              area_tematica: form.area_tematica || null,
              dispositivos_legais: form.dispositivos_legais || null,
              partido_bancada: form.partido_bancada || null,
              visibilidade_publica: form.visibilidade_publica,
            })
          ).data
        : (
            await requerimentosApi.criarProposicao({
              tipo_slug: form.tipo_slug,
              ementa: form.ementa,
              justificativa: form.justificativa || undefined,
              conteudo: form.conteudo || undefined,
              area_tematica: form.area_tematica || undefined,
              dispositivos_legais: form.dispositivos_legais || undefined,
              poder_origem: form.poder_origem,
              partido_bancada: form.partido_bancada || undefined,
              visibilidade_publica: form.visibilidade_publica,
            })
          ).data;
      onSaved(proposicao);
    } catch (err) {
      const fieldErrors = getApiValidationErrors(err);
      if (fieldErrors) {
        setValidationErrors(fieldErrors);
      } else {
        setFormError(getApiErrorMessage(err, 'Erro ao salvar a proposição.'));
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <ScreenState type="loading" title="Carregando proposição..." />;
  if (loadError) {
    return <ScreenState type="error" title="Erro ao carregar" description={loadError} actionLabel="Voltar" onAction={onBack} />;
  }

  const tipoOptions: SelectOption[] = tipos.filter((t) => t.ativo).map((t) => ({ value: t.slug, label: t.nome }));
  const podeEnviar = form.tipo_slug !== '' && form.ementa.trim().length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<FileText className="h-6 w-6" />}
        title={editando ? `Editar ${numero}` : 'Nova Proposição'}
        subtitle={
          editando
            ? 'Os dados de protocolo (tipo, número e Poder de origem) não podem ser alterados.'
            : 'Preencha os dados para protocolar uma nova proposição legislativa.'
        }
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

      <Card className="p-6 space-y-5">
        {formError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Tipo de Instrumento *</label>
              {editando ? (
                <p className="text-sm text-muted-foreground px-3 py-2 rounded-lg border border-input bg-muted/40">
                  {tipoSelecionado?.nome ?? form.tipo_slug}
                </p>
              ) : (
                <Select
                  value={form.tipo_slug}
                  onChange={(val) => {
                    const tipo = tipos.find((t) => t.slug === val);
                    setForm((f) => ({ ...f, tipo_slug: val, poder_origem: tipo?.poder_origem ?? f.poder_origem }));
                  }}
                  options={tipoOptions}
                  placeholder="Selecione o tipo..."
                />
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Poder de Origem</label>
              {editando ? (
                <p className="text-sm text-muted-foreground px-3 py-2 rounded-lg border border-input bg-muted/40">
                  {form.poder_origem === 'camara' ? 'Câmara Municipal' : 'Prefeitura Municipal'}
                </p>
              ) : (
                <Select
                  value={form.poder_origem}
                  onChange={(val) => setForm((f) => ({ ...f, poder_origem: val as 'camara' | 'prefeitura' }))}
                  options={[
                    { value: 'camara', label: 'Câmara Municipal' },
                    { value: 'prefeitura', label: 'Prefeitura Municipal' },
                  ]}
                />
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Ementa *</label>
            <Input
              value={form.ementa}
              onChange={(e) => setForm((f) => ({ ...f, ementa: e.target.value }))}
              placeholder="Resumo da proposição (até 500 caracteres)"
              maxLength={500}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Justificativa</label>
            <Textarea
              value={form.justificativa}
              onChange={(e) => setForm((f) => ({ ...f, justificativa: e.target.value }))}
              placeholder="Justificativa da proposição..."
              rows={4}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Conteúdo / Texto Integral</label>
            <Textarea
              value={form.conteudo}
              onChange={(e) => setForm((f) => ({ ...f, conteudo: e.target.value }))}
              placeholder="Texto integral da proposição (ex.: artigo 1º, artigo 2º...)"
              rows={10}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Área Temática</label>
              <Input
                value={form.area_tematica}
                onChange={(e) => setForm((f) => ({ ...f, area_tematica: e.target.value }))}
                placeholder="Ex.: saúde, educação..."
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Dispositivos Legais</label>
              <Input
                value={form.dispositivos_legais}
                onChange={(e) => setForm((f) => ({ ...f, dispositivos_legais: e.target.value }))}
                placeholder="Leis correlatas..."
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Partido / Bancada</label>
              <Input
                value={form.partido_bancada}
                onChange={(e) => setForm((f) => ({ ...f, partido_bancada: e.target.value }))}
                placeholder="Ex.: Bancada da Saúde"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              checked={form.visibilidade_publica}
              onCheckedChange={(v) => setForm((f) => ({ ...f, visibilidade_publica: v }))}
            />
            <label className="text-sm">Visibilidade pública (Portal da Transparência)</label>
          </div>

          {!editando && tipoSelecionado?.prazo_regimental_dias && (
            <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" />
              Prazo regimental para este tipo: {tipoSelecionado.prazo_regimental_dias} dias
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onBack} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!podeEnviar || saving} isLoading={saving}>
              {editando ? 'Salvar alterações' : 'Protocolar'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default ProposicaoFormPage;
