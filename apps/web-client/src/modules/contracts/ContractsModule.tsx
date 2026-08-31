import React, { useCallback, useEffect, useState } from 'react';
import { useTenant } from '@/core/tenant/useTenant';
import { Plus, Download, Loader2 } from 'lucide-react';
import {
  Card,
  Button,
  StatusChip,
  StatusVariant,
  Table,
  TableHead,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
} from '@/components/ui';
import { formatCurrencyBRL } from '@/config/theme';
import { apiClient } from '@/core/api/client';

interface ContractApiResponse {
  id: number;
  number: string;
  title: string;
  contract_type: string;
  supplier_name: string;
  supplier_cnpj: string;
  starts_at: string;
  ends_at: string;
  amount_cents: number;
  total_addenda_amount_cents: number;
  status: string;
}

interface ContractsResponse {
  data: ContractApiResponse[];
  total: number;
  current_page: number;
  per_page: number;
}

interface Toast {
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
}

const statusVariantMap: Record<string, StatusVariant> = {
  draft: 'info',
  active: 'success',
  in_renewal: 'warning',
  suspended: 'warning',
  ended: 'neutral',
  cancelled: 'danger',
};

const statusLabelMap: Record<string, string> = {
  draft: 'Rascunho',
  active: 'Regular',
  in_renewal: 'Em Renovação',
  suspended: 'Suspenso',
  ended: 'Encerrado',
  cancelled: 'Cancelado',
};

export const ContractsModule: React.FC = () => {
  const { tenant } = useTenant();
  const [contracts, setContracts] = useState<ContractApiResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = useCallback((t: Toast) => {
    setToasts((prev) => [...prev, t]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x !== t)), 5000);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<ContractsResponse>('/contracts');
      setContracts(res.data?.data ?? []);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Erro ao carregar contratos.';
      setError(msg);
      notify({ type: 'error', title: 'Erro', message: msg });
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    load();
  }, [load]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-6">
      <Card className="!p-5 sm:!p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-[36px] sm:leading-[40px] font-bold text-[#0c326f] tracking-tight">
                Contratos Administrativos & Aditivos
              </h1>
              <StatusChip label="Fiscalização Ativa" variant="success" />
            </div>
            <p className="text-xs sm:text-sm text-gov-text-secondary mt-1">
              Fiscalização, aditivos, reajustes e cronogramas financeiros de{' '}
              <strong className="text-gov-text-primary">{tenant?.name}</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" size="md" leftIcon={<Download className="w-4 h-4" />}>
              Exportar
            </Button>
            <Button variant="primary" size="md" leftIcon={<Plus className="w-4 h-4" />}>
              Novo Contrato
            </Button>
          </div>
        </div>
      </Card>

      {loading && contracts.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-gov-primary animate-spin" />
        </div>
      ) : error && contracts.length === 0 ? (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-300 text-rose-800 text-sm">
          {error}
        </div>
      ) : contracts.length === 0 ? (
        <Card className="!p-8 text-center text-gov-text-muted">
          Nenhum contrato encontrado.
        </Card>
      ) : (
        <Table>
          <TableHead>
            <tr>
              <TableHeaderCell>Contrato / Objeto</TableHeaderCell>
              <TableHeaderCell>Contratada / CNPJ</TableHeaderCell>
              <TableHeaderCell className="text-right">Valor Global</TableHeaderCell>
              <TableHeaderCell className="text-right">Executado</TableHeaderCell>
              <TableHeaderCell className="text-center">Término Vigência</TableHeaderCell>
              <TableHeaderCell className="text-center">Status</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {contracts.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <span className="font-mono font-bold text-gov-text-primary">{c.number}</span>
                  <span className="block text-gov-text-muted text-[11px] truncate max-w-[280px]">{c.title}</span>
                </TableCell>
                <TableCell>
                  <span className="font-medium text-gov-text-primary">{c.supplier_name ?? '-'}</span>
                  <span className="block font-mono text-[11px] text-gov-text-muted tabular-nums">
                    {c.supplier_cnpj ?? '-'}
                  </span>
                </TableCell>
                <TableCell isTechnical className="text-right font-bold text-gov-text-primary">
                  {formatCurrencyBRL(c.amount_cents / 100)}
                </TableCell>
                <TableCell isTechnical className="text-right text-gov-text-secondary">
                  {formatCurrencyBRL((c.amount_cents + c.total_addenda_amount_cents) / 100)}
                </TableCell>
                <TableCell isTechnical className="text-center text-gov-text-secondary">
                  {formatDate(c.ends_at)}
                </TableCell>
                <TableCell className="text-center">
                  <StatusChip
                    label={statusLabelMap[c.status] ?? c.status}
                    variant={statusVariantMap[c.status] ?? 'secondary'}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {toasts.map((t, i) => (
        <div
          key={i}
          className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm ${
            t.type === 'success' ? 'bg-emerald-600 text-white' :
            t.type === 'error' ? 'bg-rose-600 text-white' :
            t.type === 'warning' ? 'bg-amber-500 text-white' :
            'bg-blue-600 text-white'
          }`}
        >
          <strong className="block text-xs font-bold uppercase">{t.title}</strong>
          {t.message}
        </div>
      ))}
    </div>
  );
};

export default ContractsModule;
