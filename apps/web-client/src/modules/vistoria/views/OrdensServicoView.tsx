import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { Card, CardContent, Button, Select } from '@sysgov/ui';
import { StatusChip } from '@/components/ui';
import { ClipboardList, Plus } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { ScreenState } from '@/components/ui/ScreenState';
import { EmptyState } from '@/components/ui/EmptyState';
import { DataTable } from '@/components/ui/DataTable';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { vistoriaApi } from '../api';
import type { OrdemServico, StatusOrdemServico, CriticidadeOrdemServico } from '../api';
import {
  TIPO_ACAO_LABELS,
  CRITICIDADE_LABELS,
  CRITICIDADE_VARIANTS,
  CRITICIDADE_OPTIONS,
  STATUS_ORDEM_LABELS,
  STATUS_ORDEM_VARIANTS,
  STATUS_ORDEM_OPTIONS,
} from '../constants';
import { OrdemServicoFormPage } from '../pages/OrdemServicoFormPage';

export const OrdensServicoView: React.FC = () => {
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<string>('');
  const [filtroCriticidade, setFiltroCriticidade] = useState<string>('');

  const [searchParams, setSearchParams] = useSearchParams();
  const mostrarForm = searchParams.get('form') === 'novo';

  const abrirCriar = () => setSearchParams({ form: 'novo' });
  const fecharForm = () => {
    searchParams.delete('form');
    setSearchParams(searchParams);
  };

  const carregar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // DataTable pagina no cliente — busca um lote grande de uma vez, mesmo padrão de Locais
      // Fiscalizáveis. A API já escopa por usuário: chefia vê o tenant todo, fiscal só as próprias.
      const res = await vistoriaApi.listarOrdensServico({
        status: (filtroStatus as StatusOrdemServico) || undefined,
        criticidade: (filtroCriticidade as CriticidadeOrdemServico) || undefined,
        per_page: 200,
      });
      setOrdens(res.data.data);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Erro ao carregar ordens de serviço'));
    } finally {
      setLoading(false);
    }
  }, [filtroStatus, filtroCriticidade]);

  useEffect(() => { carregar(); }, [carregar]);

  const columns: ColumnDef<OrdemServico>[] = useMemo(() => [
    {
      accessorKey: 'local',
      header: 'Local',
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="text-sm font-medium truncate max-w-xs">{row.original.local?.nome ?? '—'}</p>
          <p className="text-xs text-muted-foreground">{row.original.org_unit?.name ?? '—'}</p>
        </div>
      ),
    },
    {
      accessorKey: 'tipo_acao',
      header: 'Tipo de Ação',
      cell: ({ getValue }) => <span className="text-sm">{TIPO_ACAO_LABELS[getValue() as keyof typeof TIPO_ACAO_LABELS]}</span>,
      size: 180,
    },
    {
      accessorKey: 'criticidade',
      header: 'Criticidade',
      cell: ({ getValue }) => {
        const criticidade = getValue() as CriticidadeOrdemServico;
        return <StatusChip label={CRITICIDADE_LABELS[criticidade]} variant={CRITICIDADE_VARIANTS[criticidade]} />;
      },
      size: 130,
    },
    {
      accessorKey: 'data_prevista',
      header: 'Data Prevista',
      cell: ({ getValue }) => {
        // A API serializa `data_prevista` (cast `date`) como datetime ISO (ex.: 2026-12-11T03:00:00.000000Z);
        // extrai só a parte da data pra evitar que a conversão de timezone no browser mude o dia exibido.
        const [ano, mes, dia] = (getValue() as string).slice(0, 10).split('-');
        return <span className="text-xs font-mono tabular-nums">{`${dia}/${mes}/${ano}`}</span>;
      },
      size: 110,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => {
        const status = getValue() as StatusOrdemServico;
        return <StatusChip label={STATUS_ORDEM_LABELS[status]} variant={STATUS_ORDEM_VARIANTS[status]} />;
      },
      size: 140,
    },
    {
      accessorKey: 'fiscal',
      header: 'Fiscal',
      cell: ({ row }) => <span className="text-sm">{row.original.fiscal?.name ?? 'A distribuir'}</span>,
      size: 160,
    },
  ], []);

  if (error) {
    return <ScreenState type="error" title="Erro ao carregar" description={error} actionLabel="Tentar novamente" onAction={carregar} />;
  }

  if (mostrarForm) {
    return (
      <OrdemServicoFormPage
        onBack={fecharForm}
        onSaved={() => { fecharForm(); carregar(); }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<ClipboardList className="h-6 w-6" />}
        title="Ordens de Serviço"
        subtitle="Planejamento e agenda de vistorias — chefia vê todas, fiscal vê as próprias"
        actions={
          <Button onClick={abrirCriar}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Ordem de Serviço
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
        <div className="w-full sm:w-56">
          <Select
            label="Status"
            value={filtroStatus || null}
            onChange={setFiltroStatus}
            options={STATUS_ORDEM_OPTIONS}
            placeholder="Todos os status"
          />
        </div>
        <div className="w-full sm:w-56">
          <Select
            label="Criticidade"
            value={filtroCriticidade || null}
            onChange={setFiltroCriticidade}
            options={CRITICIDADE_OPTIONS}
            placeholder="Todas as criticidades"
          />
        </div>
      </div>

      {loading ? (
        <ScreenState type="loading" title="Carregando ordens de serviço..." />
      ) : ordens.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-10 w-10" />}
          title="Nenhuma ordem de serviço encontrada"
          description="Crie uma nova ordem de serviço ou ajuste os filtros."
          actionLabel="Nova Ordem de Serviço"
          onAction={abrirCriar}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <DataTable columns={columns} data={ordens} pageSize={15} />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OrdensServicoView;
