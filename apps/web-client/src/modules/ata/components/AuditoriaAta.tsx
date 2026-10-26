import React, { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Card, CardContent, DataTable, Select } from '@sysgov/ui';
import { EstadoCarga } from '../../escola/components/AdminModal';
import { useCarga } from '../../escola/useCarga';
import { ataApi, type RegistroAuditoria } from '../api';

export const ACOES: Record<string, string> = {
  'ata.criada': 'Criou a ata',
  'ata.editada': 'Editou os dados',
  'ata.texto_salvo': 'Salvou o texto',
  'ata.rascunho_salvo': 'Salvou o rascunho (texto travado)',
  'ata.assinada': 'Registrou assinatura',
  'ata.finalizada': 'Finalizou e gerou o PDF',
  'ata.pdf_baixado': 'Abriu/baixou o PDF',
  'ata.sigilosa_acessada': 'Abriu ata sigilosa',
  'ata.ia_gerada': 'Usou o Assistente IA',
  'ata.excluida': 'Excluiu a ata',
  'tipo.criado': 'Criou tipo de ata',
  'tipo.editado': 'Editou tipo de ata',
  'tipo.desativado': 'Desativou tipo de ata',
  'tipo.excluido': 'Excluiu tipo de ata',
  'secretaria.configurada': 'Configurou secretaria',
};

function resumo(acao: string, d: Record<string, unknown> | null): string {
  if (!d) return '';
  if (acao === 'ata.assinada') return String(d.participante ?? '');
  if (d.titulo) return `${String(d.numero ?? '').padStart(2, '0')}/${String(d.ano ?? '')} — ${String(d.titulo)}`;
  if (d.nome) return String(d.nome);
  if (d.codigo) return String(d.codigo);
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
  {
    id: 'usuario',
    header: 'Usuário',
    accessorFn: (r) => r.usuario ?? '—',
    meta: { exportHeader: 'Usuário', exportValue: (r) => r.usuario ?? '—' },
  },
  {
    id: 'acao',
    header: 'Ação',
    accessorFn: (r) => ACOES[r.acao] ?? r.acao,
    meta: { exportHeader: 'Ação', exportValue: (r) => ACOES[r.acao] ?? r.acao },
  },
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
    accessorFn: (r) => resumo(r.acao, r.detalhes),
    cell: ({ row }) => <span className="text-xs">{resumo(row.original.acao, row.original.detalhes)}</span>,
    meta: { exportHeader: 'Detalhes', exportValue: (r) => resumo(r.acao, r.detalhes) },
  },
];

/** Trilha de auditoria do módulo (audit_logs, imutável). Paginada no servidor. */
export const AuditoriaAta: React.FC = () => {
  const [acao, setAcao] = useState('todas');
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(50);
  const carga = useCarga(() => ataApi.auditoria({ acao: acao === 'todas' ? undefined : acao, page: pagina, per_page: porPagina }), [acao, pagina, porPagina]);
  const opcoesAcao = useMemo(() => [{ value: 'todas', label: 'Todas' }, ...Object.entries(ACOES).map(([v, l]) => ({ value: v, label: l }))], []);

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
