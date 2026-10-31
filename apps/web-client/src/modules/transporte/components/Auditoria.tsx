import React, { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Card, CardContent, DataTable, Select } from '@sysgov/ui';
import { EstadoCarga } from '../../escola/components/AdminModal';
import { useCarga } from '../../escola/useCarga';
import { transporteApi, type RegistroAuditoria } from '../api';
import { ROTULO_ACAO } from '../formato';

function resumo(r: RegistroAuditoria): string {
  const d = r.depois ?? r.antes;
  if (!d) return '';
  if (d.placa) return String(d.placa);
  if (d.descricao) return String(d.descricao);
  if (d.cnh_numero) return `CNH ${String(d.cnh_numero)}`;
  if (d.contrato_numero) return `Contrato ${String(d.contrato_numero)}`;
  if (d.certificado) return `Certificado ${String(d.certificado)}`;
  return '';
}

const colunas: ColumnDef<RegistroAuditoria, unknown>[] = [
  {
    id: 'data',
    header: 'Data/hora',
    accessorKey: 'data',
    cell: ({ row }) => <span className="whitespace-nowrap font-mono tabular-nums">{new Date(row.original.data).toLocaleString('pt-BR')}</span>,
    meta: { exportHeader: 'Data/hora', exportValue: (r) => new Date(r.data).toLocaleString('pt-BR') },
  },
  { id: 'usuario', header: 'Usuário', accessorFn: (r) => r.usuario ?? '—', meta: { exportHeader: 'Usuário', exportValue: (r) => r.usuario ?? '—' } },
  { id: 'acao', header: 'Ação', accessorFn: (r) => ROTULO_ACAO[r.acao] ?? r.acao, meta: { exportHeader: 'Ação', exportValue: (r) => ROTULO_ACAO[r.acao] ?? r.acao } },
  {
    id: 'recurso',
    header: 'Recurso',
    accessorKey: 'recurso',
    cell: ({ row }) => <span className="font-mono text-xs">{row.original.recurso}</span>,
    meta: { exportHeader: 'Recurso', exportValue: (r) => r.recurso },
  },
  {
    id: 'detalhes',
    header: 'Detalhes',
    accessorFn: (r) => resumo(r),
    cell: ({ row }) => <span className="font-mono text-xs">{resumo(row.original)}</span>,
    meta: { exportHeader: 'Detalhes', exportValue: (r) => resumo(r) },
  },
];

/** Trilha de auditoria do módulo (audit_logs, imutável). Paginada no servidor. */
export const AuditoriaTransporte: React.FC = () => {
  const [acao, setAcao] = useState('todas');
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(50);
  const carga = useCarga(() => transporteApi.auditoria({ acao: acao === 'todas' ? undefined : acao, page: pagina, per_page: porPagina }), [acao, pagina, porPagina]);
  const opcoesAcao = useMemo(() => [{ value: 'todas', label: 'Todas' }, ...Object.entries(ROTULO_ACAO).map(([v, l]) => ({ value: v, label: l }))], []);

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="w-72"><Select label="Ação" value={acao} onChange={(v) => { setAcao(v); setPagina(1); }} options={opcoesAcao} /></div>
        <EstadoCarga carregando={carga.carregando && !carga.dados} erro={carga.erro} onTentar={() => void carga.recarregar()} />
        {carga.dados && (
          <DataTable
            columns={colunas}
            data={carga.dados.data}
            emptyText="Nenhum registro na trilha de auditoria."
            pageSizeOptions={[25, 50, 100]}
            paginationState={{
              currentPage: carga.dados.current_page,
              totalPages: carga.dados.last_page,
              onPageChange: setPagina,
              total: carga.dados.total,
              perPage: porPagina,
              onPerPageChange: (n) => { setPorPagina(n); setPagina(1); },
            }}
          />
        )}
      </CardContent>
    </Card>
  );
};
