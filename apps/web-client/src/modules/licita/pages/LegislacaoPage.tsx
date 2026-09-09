import React, { useCallback, useEffect, useState } from 'react';
import { Card, Button, Badge, RichTextEditor, Select } from '@sysgov/ui';
import { PageHeader, ScreenState, EmptyState, SearchInput } from '@/components/ui';
import { Plus, BookOpen, Trash2, Pencil } from 'lucide-react';
import DOMPurify from 'dompurify';
import { useAuth } from '@/core/auth/useAuth';
import { useCan } from '@/core/rbac/useCan';
import { sysgovApi, type CreateLegalDocumentoInput, type LegalDocumento, type TipoLegalDocumento } from '@sysgov/sdk';

const TIPO_OPTIONS: { value: TipoLegalDocumento; label: string }[] = [
  { value: 'lei', label: 'Lei' },
  { value: 'decreto', label: 'Decreto' },
  { value: 'instrucao_normativa', label: 'Instrução Normativa' },
  { value: 'jurisprudencia', label: 'Jurisprudência' },
  { value: 'outro', label: 'Outro' },
];

const TIPO_LABEL: Record<TipoLegalDocumento, string> = Object.fromEntries(
  TIPO_OPTIONS.map((o) => [o.value, o.label]),
) as Record<TipoLegalDocumento, string>;

const emptyForm: CreateLegalDocumentoInput = {
  tipo: 'decreto',
  numero: '',
  titulo: '',
  ementa: '',
  texto_completo: '',
  tags: [],
};

/**
 * Biblioteca de legislação do Licita — documentos GLOBAIS (mantidos pela
 * SYSTRAT, ex.: a própria Lei 14.133/2021) + documentos do PRÓPRIO tenant
 * (ex.: decreto municipal regulamentando a lei para o âmbito local).
 * Serve hoje como contexto de leitura para o usuário; na Fase 1.5 esse
 * mesmo conteúdo alimenta a IA na elaboração dos artefatos.
 */
export const LegislacaoPage: React.FC = () => {
  const { user } = useAuth();
  const { can } = useCan();
  const [documentos, setDocumentos] = useState<LegalDocumento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<LegalDocumento | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateLegalDocumentoInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const podeGerenciar = can('licita.legislacao.manage') || Boolean(user?.is_platform_admin);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await sysgovApi.licita.listLegislacao({ search });
      setDocumentos(res.data ?? []);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Erro ao carregar a legislação.');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (documento: LegalDocumento) => {
    setEditing(documento);
    setForm({
      tipo: documento.tipo,
      numero: documento.numero ?? '',
      titulo: documento.titulo,
      ementa: documento.ementa ?? '',
      texto_completo: documento.texto_completo,
      tags: documento.tags ?? [],
    });
    setFormError(null);
    setShowForm(true);
  };

  const podeEditar = (documento: LegalDocumento) => (documento.tenant_id === null ? Boolean(user?.is_platform_admin) : podeGerenciar);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        const atualizado = await sysgovApi.licita.updateLegislacao(editing.id, form);
        setDocumentos((prev) => prev.map((d) => (d.id === atualizado.id ? atualizado : d)));
      } else {
        const criado = await sysgovApi.licita.createLegislacao(form);
        setDocumentos((prev) => [criado, ...prev]);
      }
      setShowForm(false);
    } catch (err: any) {
      setFormError(err?.response?.data?.error || err?.message || 'Erro ao salvar o documento.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (documento: LegalDocumento) => {
    if (!confirm(`Excluir "${documento.titulo}"?`)) return;
    await sysgovApi.licita.deleteLegislacao(documento.id);
    setDocumentos((prev) => prev.filter((d) => d.id !== documento.id));
  };

  if (loading) return <ScreenState type="loading" title="Carregando legislação..." />;
  if (error && documentos.length === 0) {
    return <ScreenState type="error" title="Erro ao carregar" description={error} actionLabel="Tentar novamente" onAction={load} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<BookOpen className="h-6 w-6" />}
        title="Biblioteca de Legislação"
        subtitle="Leis, decretos e normas usados como contexto na elaboração dos artefatos do Licita."
        actions={
          podeGerenciar ? (
            <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
              Novo Documento
            </Button>
          ) : undefined
        }
      />

      <Card className="gap-0 py-0">
        <div className="p-3 border-b border-border">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar por título..." />
        </div>
        <div className="p-3 space-y-2">
          {documentos.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="h-10 w-10" />}
              title="Nenhum documento cadastrado"
              description="Cadastre a legislação local para dar contexto à elaboração dos artefatos."
            />
          ) : (
            documentos.map((documento) => (
              <div key={documento.id} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={documento.tenant_id === null ? 'primary' : 'secondary'}>
                      {documento.tenant_id === null ? 'GLOBAL' : 'ÓRGÃO'}
                    </Badge>
                    <Badge variant="neutral">{TIPO_LABEL[documento.tipo]}</Badge>
                    <span className="font-medium text-foreground">{documento.titulo}</span>
                    {documento.numero && <span className="text-xs text-muted-foreground">({documento.numero})</span>}
                  </div>
                  {documento.ementa && <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{documento.ementa}</p>}
                </div>
                {podeEditar(documento) && (
                  <div className="flex shrink-0 gap-1">
                    <Button size="icon-sm" variant="ghost" onClick={() => openEdit(documento)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon-sm" variant="ghost" onClick={() => handleDelete(documento)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </Card>

      {showForm && (
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">{editing ? 'Editar Documento' : 'Novo Documento'}</h2>
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
                  required
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

            {!editing && user?.is_platform_admin && (
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
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" isLoading={saving}>
                Salvar
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
};

/** Sanitização defensiva no cliente antes de exibir HTML persistido — o
 * backend já sanitiza ao salvar, isso é a segunda camada (nunca confiar
 * só de um lado). Hoje não é usado diretamente nesta página (que edita
 * via RichTextEditor, não injeta HTML cru), mas fica disponível para
 * qualquer tela de leitura (ex.: visualização do texto completo). */
export const sanitizeHtml = (html: string): string => DOMPurify.sanitize(html);

export default LegislacaoPage;
