import React, { useMemo } from 'react';
import { KpiCard, StatusChip } from '@/components/ui';
import { AlertCircle, TrendingDown, Calendar } from 'lucide-react';
import type { DashboardRegularizacao, DashboardRegularizacaoProcesso } from '../api';
import { ESTADO_LABELS, ESTADO_BADGE_VARIANT } from '../hooks/useSucessaoTransicoes';
import { formatarData } from '../api';
import { Mono } from '../views/comum';

interface DashboardRegularizacaoProps {
  dados: DashboardRegularizacao | null;
  carregando: boolean;
  onSelectProcesso?: (p: DashboardRegularizacaoProcesso) => void;
}

export const DashboardRegularizacaoComponent: React.FC<DashboardRegularizacaoProps> = ({
  dados,
  carregando,
  onSelectProcesso,
}) => {
  const total = dados?.total ?? 0;
  const processos = dados?.processos ?? [];
  const vencidos = useMemo(() => processos.filter((p) => p.prazo_vencido).length, [processos]);
  const noPrazo = useMemo(() => processos.filter((p) => !p.prazo_vencido).length, [processos]);

  const colunas = [
    {
      id: 'processo',
      header: 'Processo',
      cell: (row: DashboardRegularizacaoProcesso) => (
        <Mono className="font-bold text-foreground">
          {row.processo_referencia ?? '—'}
        </Mono>
      ),
    },
    {
      id: 'estado',
      header: 'Situação',
      cell: (row: DashboardRegularizacaoProcesso) => (
        <StatusChip
          label={ESTADO_LABELS[row.estado as keyof typeof ESTADO_LABELS] ?? row.estado}
          variant={ESTADO_BADGE_VARIANT[row.estado as keyof typeof ESTADO_BADGE_VARIANT] ?? 'neutral'}
        />
      ),
    },
    {
      id: 'concessao',
      header: 'Concessão / Jazigo',
        cell: (row: DashboardRegularizacaoProcesso) => (
        <div>
          <Mono className="font-semibold text-foreground">
            {row.concessao?.numero ?? '—'}
          </Mono>
          <div className="text-xs text-muted-foreground">
            Jazigo: <Mono>{row.jazigo?.codigo ?? '—'}</Mono>
          </div>
        </div>
      ),
    },
    {
      id: 'falecimento',
      header: 'Falecimento',
      cell: (row: DashboardRegularizacaoProcesso) => (
        <div>
          <span className="text-sm text-foreground font-mono tabular-nums">
            {formatarData(row.data_falecimento)}
          </span>
          <div className="text-xs text-muted-foreground">
            {row.dias_desde_falecimento} dias
          </div>
        </div>
      ),
    },
    {
      id: 'prazo',
      header: 'Prazo Restante',
      cell: (row: DashboardRegularizacaoProcesso) => (
        <span className={`text-xs font-mono tabular-nums font-bold ${
          row.prazo_vencido ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
        }`}>
          {row.prazo_vencido ? 'Vencido' : `${row.dias_restantes_regularizacao} dias`}
        </span>
      ),
    },
    {
      id: 'acoes',
      header: '',
      cell: (row: DashboardRegularizacaoProcesso) => {
        if (!onSelectProcesso) return null;
        return (
          <button
            onClick={() => onSelectProcesso(row)}
            className="text-xs font-medium text-primary hover:underline"
          >
            Ver detalhes
          </button>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          title="Total para Reg."
          value={total}
          icon={<AlertCircle className="h-5 w-5" />}
          iconBgColor="bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
        />
        <KpiCard
          title="No Prazo"
          value={noPrazo}
          icon={<Calendar className="h-5 w-5" />}
          iconBgColor="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
        />
        <KpiCard
          title="Prazo Vencido"
          value={vencidos}
          icon={<TrendingDown className="h-5 w-5" />}
          iconBgColor="bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
        />
      </div>

      {processos.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {colunas.map((col) => (
                  <th key={col.id} className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {processos.map((p) => (
                <tr key={p.id} className="hover:bg-accent/40 transition-colors">
                  {colunas.map((col) => (
                    <td key={col.id} className="px-4 py-3 text-center">
                      {col.cell(p)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {processos.length === 0 && !carregando && (
        <p className="text-sm text-muted-foreground py-4">
          Nenhum processo de regularização pendente.
        </p>
      )}
    </div>
  );
};

export default DashboardRegularizacaoComponent;
