import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { Card, CardContent, Button, Select } from '@sysgov/ui';
import { MapPin, Plus, Pencil, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { ScreenState } from '@/components/ui/ScreenState';
import { EmptyState } from '@/components/ui/EmptyState';
import { DataTable } from '@/components/ui/DataTable';
import { SearchInput } from '@/components/ui/SearchInput';
import { ConfirmDialog } from '@/components/ui';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { vistoriaApi } from '../api';
import type { LocalFiscalizavel, TipoLocalFiscalizavel } from '../api';
import { TIPO_LOCAL_LABELS, TIPO_LOCAL_OPTIONS } from '../constants';
import { LocalFiscalizavelFormPage } from '../pages/LocalFiscalizavelFormPage';

export const LocaisFiscalizaveisView: React.FC = () => {
  const [locais, setLocais] = useState<LocalFiscalizavel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('');
  const [excluindo, setExcluindo] = useState<LocalFiscalizavel | null>(null);
  const [excluirErro, setExcluirErro] = useState<string | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const formParam = searchParams.get('form');
  const formLocalId = formParam === null || formParam === 'novo' ? null : Number(formParam);
  const mostrarForm = formParam !== null;

  const abrirCriar = () => setSearchParams({ form: 'novo' });
  const abrirEditar = (id: number) => setSearchParams({ form: String(id) });
  const fecharForm = () => {
    searchParams.delete('form');
    setSearchParams(searchParams);
  };

  const carregar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // DataTable pagina no cliente — busca um lote grande de uma vez, mesmo padrão de Requerimentos.
      const res = await vistoriaApi.listarLocais({
        tipo: (filtroTipo as TipoLocalFiscalizavel) || undefined,
        per_page: 200,
      });
      setLocais(res.data.data);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Erro ao carregar locais fiscalizáveis'));
    } finally {
      setLoading(false);
    }
  }, [filtroTipo]);

  useEffect(() => { carregar(); }, [carregar]);

  const locaisFiltrados = useMemo(() => {
    if (!searchTerm) return locais;
    const term = searchTerm.toLowerCase();
    return locais.filter((l) =>
      l.nome.toLowerCase().includes(term) ||
      l.endereco?.toLowerCase().includes(term) ||
      l.proprietario?.nome.toLowerCase().includes(term),
    );
  }, [locais, searchTerm]);

  const confirmarExclusao = async () => {
    if (!excluindo) return;
    setExcluirErro(null);
    try {
      await vistoriaApi.excluirLocal(excluindo.id);
      setExcluindo(null);
      carregar();
    } catch (err) {
      setExcluirErro(getApiErrorMessage(err, 'Erro ao excluir local fiscalizável'));
    }
  };

  const columns: ColumnDef<LocalFiscalizavel>[] = [
    {
      accessorKey: 'nome',
      header: 'Nome',
      cell: ({ getValue, row }) => (
        <div className="min-w-0">
          <p className="text-sm font-medium truncate max-w-xs">{getValue() as string}</p>
          <p className="text-xs text-muted-foreground">{row.original.proprietario?.nome ?? '—'}</p>
        </div>
      ),
    },
    {
      accessorKey: 'tipo',
      header: 'Tipo',
      cell: ({ getValue }) => (
        <span className="text-sm">{TIPO_LOCAL_LABELS[getValue() as TipoLocalFiscalizavel]}</span>
      ),
      size: 180,
    },
    {
      accessorKey: 'endereco',
      header: 'Endereço',
      cell: ({ getValue }) => <span className="text-xs">{(getValue() as string) ?? '—'}</span>,
    },
    {
      id: 'coordenadas',
      header: 'Coordenadas',
      cell: ({ row }) => (
        <span className="text-xs font-mono tabular-nums text-muted-foreground">
          {Number(row.original.latitude).toFixed(5)}, {Number(row.original.longitude).toFixed(5)}
        </span>
      ),
      size: 160,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => abrirEditar(row.original.id)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setExcluindo(row.original)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
      size: 90,
    },
  ];

  if (error) {
    return <ScreenState type="error" title="Erro ao carregar" description={error} actionLabel="Tentar novamente" onAction={carregar} />;
  }

  if (mostrarForm) {
    return (
      <LocalFiscalizavelFormPage
        localId={formLocalId}
        onBack={fecharForm}
        onSaved={() => { fecharForm(); carregar(); }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<MapPin className="h-6 w-6" />}
        title="Locais Fiscalizáveis"
        subtitle="Propriedades, estabelecimentos e eventos sujeitos à fiscalização de campo"
        actions={
          <Button onClick={abrirCriar}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Local
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3">
        <div className="w-full sm:w-64">
          <Select
            label="Tipo"
            value={filtroTipo || null}
            onChange={(v) => setFiltroTipo(v)}
            options={TIPO_LOCAL_OPTIONS}
            placeholder="Todos os tipos"
          />
        </div>
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Buscar por nome, endereço ou proprietário..."
          className="w-full sm:w-72"
        />
      </div>

      {loading ? (
        <ScreenState type="loading" title="Carregando locais fiscalizáveis..." />
      ) : locaisFiltrados.length === 0 ? (
        <EmptyState
          icon={<MapPin className="h-10 w-10" />}
          title="Nenhum local fiscalizável encontrado"
          description="Cadastre um novo local ou ajuste os filtros."
          actionLabel="Novo Local"
          onAction={abrirCriar}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <DataTable columns={columns} data={locaisFiltrados} pageSize={15} />
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={excluindo !== null}
        onClose={() => { setExcluindo(null); setExcluirErro(null); }}
        onConfirm={() => void confirmarExclusao()}
        title={`Excluir "${excluindo?.nome ?? ''}"`}
        description={excluirErro ?? 'Esta ação remove o local fiscalizável do cadastro. Deseja continuar?'}
        confirmLabel="Excluir"
        requireReason={false}
      />
    </div>
  );
};

export default LocaisFiscalizaveisView;
