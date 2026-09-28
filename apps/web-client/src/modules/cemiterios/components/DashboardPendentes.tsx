import React, { useMemo } from 'react';
import { KpiCard, StatusChip } from '@/components/ui';
import { AlertCircle, Clock, FileCheck2, FileText } from 'lucide-react';
import type { DashboardPendentes, DashboardPendentesProcesso } from '../api';
import { ESTADO_LABELS, ESTADO_BADGE_VARIANT } from '../hooks/useSucessaoTransicoes';
import { formatarData } from '../api';
import { Mono } from '../views/comum';

interface DashboardPendentesProps {
  dados: DashboardPendentes | null;
  carregando: boolean;
  onSelectProcesso?: (p: DashboardPendentesProcesso) => void;
  parkId?: number | null;
}

export const DashboardPendentesComponent: React.FC<DashboardPendentesProps> = ({
  dados,
  carregando,
  onSelectProcesso,
  parkId,
}) => {
  const resumo = dados?.resumo;
  const processos = dados?.processos ?? [];

  const colunas = useMemo(() => {
    return [
      {
        id: 'processo',
        header: 'Processo',
        cell: (row: DashboardPendentesProcesso) => (
          <Mono className="font-bold text-foreground">
            {row.processo_referencia ?? '—'}
          </Mono>
        ),
      },
      {
        id: 'estado',
        header: 'Situação',
        cell: (row: DashboardPendentesProcesso) => (
          <StatusChip
            label={ESTADO_LABELS[row.estado as keyof typeof ESTADO_LABELS] ?? row.estado}
            variant={ESTADO_BADGE_VARIANT[row.estado as keyof typeof ESTADO_BADGE_VARIANT] ?? 'neutral'}
          />
        ),
      },
      {
        id: 'concessao',
        header: 'Concessão / Jazigo',
        cell: (row: DashboardPendentesProcesso) => (
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
        id: 'titular',
        header: 'Titular Falecido',
        cell: (row: DashboardPendentesProcesso) => (
          <span className="text-sm text-foreground">
            {row.titular_falecido?.nome ?? '—'}
          </span>
        ),
      },
      {
        id: 'dias',
        header: 'Dias em Análise',
        cell: (row: DashboardPendentesProcesso) => (
          <Mono className="font-mono tabular-nums text-center">
            {row.dias_em_analise}
          </Mono>
        ),
      },
      {
        id: 'documentos',
        header: 'Documentos',
        cell: (row: DashboardPendentesProcesso) => (
          <span className="text-xs font-mono tabular-nums">
            {row.documentos_count}/{row.documentos_count + (row.documentos_pendentes?.length ?? 0)}
          </span>
        ),
      },
      {
        id: 'acoes',
        header: '',
        cell: (row: DashboardPendentesProcesso) => {
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
  }, [onSelectProcesso]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Pendentes"
          value={resumo?.total ?? 0}
          icon={<AlertCircle className="h-5 w-5" />}
          iconBgColor="bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
        />
        <KpiCard
          title="Em Análise"
          value={resumo?.em_analise ?? 0}
          icon={<Clock className="h-5 w-5" />}
          iconBgColor="bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
        />
        <KpiCard
          title="Aguardando Documentos"
          value={resumo?.aguardando_documentos ?? 0}
          icon={<FileText className="h-5 w-5" />}
          iconBgColor="bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300"
        />
        <KpiCard
          title="Validados"
          value={resumo?.validada ?? 0}
          icon={<FileCheck2 className="h-5 w-5" />}
          iconBgColor="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
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
          Nenhum processo pendente de análise nesta necrópole.
        </p>
      )}
    </div>
  );
};

export default DashboardPendentesComponent;
