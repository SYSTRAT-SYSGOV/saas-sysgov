import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, Button, Badge } from '@sysgov/ui';
import { PageHeader, ScreenState, EmptyState, SearchInput, DataTable } from '@/components/ui';
import { Plus, BookOpen, Trash2, Pencil, FileDown } from 'lucide-react';
import DOMPurify from 'dompurify';
import { useAuth } from '@/core/auth/useAuth';
import { useCan } from '@/core/rbac/useCan';
import { useTenant } from '@/core/tenant/useTenant';
import { sysgovApi, type LegalDocumento, type TipoLegalDocumento } from '@sysgov/sdk';
import type { ColumnDef } from '@tanstack/react-table';
import { abrirJanelaPdf } from '../utils/gerarDfdPdf';
import { gerarLegislacaoPdf } from '../utils/gerarLegislacaoPdf';

const TIPO_LABEL: Record<TipoLegalDocumento, string> = {
  lei: 'Lei',
  decreto: 'Decreto',
  instrucao_normativa: 'Instrução Normativa',
  jurisprudencia: 'Jurisprudência',
  outro: 'Outro',
};

interface LegislacaoPageProps {
  onNovoDocumento: () => void;
  onEditarDocumento: (documento: LegalDocumento) => void;
}

/**
 * Biblioteca de legislação do Licita — documentos GLOBAIS (mantidos pela
 * SYSTRAT, ex.: a própria Lei 14.133/2021) + documentos do PRÓPRIO tenant
 * (ex.: decreto municipal regulamentando a lei para o âmbito local).
 * Serve hoje como contexto de leitura para o usuário; na Fase 1.5 esse
 * mesmo conteúdo alimenta a IA na elaboração dos artefatos.
 *
 * Cadastro/edição abrem em tela cheia (LegislacaoDetailPage), mesmo padrão
 * do DFD do Processo — não mais inline nesta mesma página.
 */
export const LegislacaoPage: React.FC<LegislacaoPageProps> = ({ onNovoDocumento, onEditarDocumento }) => {
  const { user } = useAuth();
  const { can } = useCan();
  const { tenant } = useTenant();
  const [documentos, setDocumentos] = useState<LegalDocumento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [pdfError, setPdfError] = useState<string | null>(null);

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

  const podeEditar = (documento: LegalDocumento) => (documento.tenant_id === null ? Boolean(user?.is_platform_admin) : podeGerenciar);

  const handleDelete = async (documento: LegalDocumento) => {
    if (!confirm(`Excluir "${documento.titulo}"?`)) return;
    await sysgovApi.licita.deleteLegislacao(documento.id);
    setDocumentos((prev) => prev.filter((d) => d.id !== documento.id));
  };

  const handleGerarPdf = (documento: LegalDocumento) => {
    // Precisa abrir a janela AQUI, síncrono, ainda dentro do clique — do
    // contrário o navegador não reconhece como resposta direta a um gesto
    // do usuário e bloqueia o popup silenciosamente (mesma observação do
    // PDF do DFD, ver gerarDfdPdf.ts). Como o documento já está carregado
    // na lista (sem precisar buscar de novo), não há nada assíncrono aqui.
    const janela = abrirJanelaPdf();
    if (!janela) {
      setPdfError('O navegador bloqueou a aba do PDF. Permita pop-ups para este site e tente novamente.');
      return;
    }
    setPdfError(null);
    gerarLegislacaoPdf(janela, documento, tenant?.name ?? '');
  };

  const columns = useMemo<ColumnDef<LegalDocumento, any>[]>(
    () => [
      {
        id: 'acoes',
        header: '',
        size: 130,
        cell: ({ row }) => {
          const documento = row.original;
          return (
            <div className="flex justify-center gap-1">
              <Button
                size="icon-sm"
                variant="ghost"
                title="Baixar PDF"
                onClick={(e) => {
                  e.stopPropagation();
                  handleGerarPdf(documento);
                }}
              >
                <FileDown className="h-3.5 w-3.5" />
              </Button>
              {podeEditar(documento) && (
                <>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    title="Editar"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditarDocumento(documento);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    title="Excluir"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(documento);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </>
              )}
            </div>
          );
        },
      },
      {
        id: 'escopo',
        header: 'Escopo',
        size: 110,
        meta: {
          exportValue: (d) => (d.tenant_id === null ? 'Global' : 'Órgão'),
        },
        cell: ({ row }) => (
          <Badge variant={row.original.tenant_id === null ? 'primary' : 'secondary'}>
            {row.original.tenant_id === null ? 'GLOBAL' : 'ÓRGÃO'}
          </Badge>
        ),
      },
      {
        id: 'tipo',
        header: 'Tipo',
        size: 160,
        meta: {
          exportValue: (d) => TIPO_LABEL[d.tipo],
        },
        cell: ({ row }) => <Badge variant="neutral">{TIPO_LABEL[row.original.tipo]}</Badge>,
      },
      {
        id: 'numero',
        header: 'Número',
        size: 150,
        meta: {
          exportValue: (d) => d.numero ?? '',
        },
        cell: ({ row }) => (
          <span className="font-mono text-xs tabular-nums text-muted-foreground">{row.original.numero || '—'}</span>
        ),
      },
      {
        id: 'titulo',
        header: 'Título',
        size: 420,
        meta: {
          exportValue: (d) => d.titulo,
        },
        cell: ({ row }) => (
          <span className="block truncate text-left font-medium text-foreground" title={row.original.titulo}>
            {row.original.titulo}
          </span>
        ),
      },
      {
        id: 'ementa',
        header: 'Ementa',
        size: 300,
        meta: {
          exportValue: (d) => d.ementa ?? '',
        },
        cell: ({ row }) => (
          <span className="block truncate text-left text-muted-foreground" title={row.original.ementa ?? undefined}>
            {row.original.ementa || '—'}
          </span>
        ),
      },
    ],
    [podeGerenciar, user?.is_platform_admin, onEditarDocumento, handleGerarPdf],
  );

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
            <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={onNovoDocumento}>
              Novo Documento
            </Button>
          ) : undefined
        }
      />

      {pdfError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {pdfError}
        </div>
      )}

      <Card className="gap-0 py-0">
        <div className="p-3 border-b border-border">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar por título..." />
        </div>
        <div className="p-3">
          {documentos.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="h-10 w-10" />}
              title="Nenhum documento cadastrado"
              description="Cadastre a legislação local para dar contexto à elaboração dos artefatos."
            />
          ) : (
            <DataTable
              columns={columns}
              data={documentos}
              emptyText="Nenhum documento encontrado."
              pageSize={10}
              onRowClick={(documento) => podeEditar(documento) && onEditarDocumento(documento)}
              fixedLayout
              resizableColumns
              pageSizeSelector
              exportable
              exportFileName="legislacao-licita"
              exportTitle="Licita — Biblioteca de Legislação"
            />
          )}
        </div>
      </Card>
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
