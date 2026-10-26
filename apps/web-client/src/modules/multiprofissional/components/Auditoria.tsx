import React, { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Card, CardContent, DataTable, Select } from '@sysgov/ui';
import { EstadoCarga } from '../../escola/components/AdminModal';
import { useCarga } from '../../escola/useCarga';
import { multiApi, type RegistroAuditoria } from '../api';

export const ACOES: Record<string, string> = {
  'atendimento.registrado': 'Registrou atendimento',
  'atendimento.alterado': 'Alterou atendimento',
  'atendimento.excluido': 'Excluiu atendimento',
  'acompanhado.criado': 'Iniciou acompanhamento',
  'acompanhado.alterado': 'Alterou a ficha do acompanhado',
  'laudo.anexado': 'Anexou laudo',
  'laudo.baixado': 'Abriu laudo',
  'laudo.removido': 'Removeu laudo',
  'profissional.criado': 'Cadastrou profissional',
  'profissional.alterado': 'Alterou profissional',
  'profissional.desativado': 'Desativou profissional',
  'profissional.excluido': 'Excluiu profissional',
  'equipe.criada': 'Criou equipe',
  'equipe.alterada': 'Alterou equipe',
  'equipe.desativada': 'Desativou equipe',
  'equipe.excluida': 'Excluiu equipe',
  'cadastros.padroes_carregados': 'Carregou itens padrão',
};

/** Ação de cadastro simples: "cargos.criado" → "Cargos: criado". */
function rotulo(acao: string): string {
  if (ACOES[acao]) return ACOES[acao];
  const [tipo, verbo] = acao.split('.');
  const nomes: Record<string, string> = { cargos: 'Cargo', condicoes: 'Condição', 'tipos-atendimento': 'Tipo de atendimento' };
  return nomes[tipo] ? `${nomes[tipo]}: ${verbo}` : acao;
}

function resumo(d: Record<string, unknown> | null): string {
  if (!d) return '';
  if (d.descricao) return String(d.descricao);
  if (d.nome) return String(d.nome);
  if (d.data_hora) return new Date(String(d.data_hora)).toLocaleString('pt-BR');
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
  { id: 'acao', header: 'Ação', accessorFn: (r) => rotulo(r.acao), meta: { exportHeader: 'Ação', exportValue: (r) => rotulo(r.acao) } },
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
    accessorFn: (r) => resumo(r.detalhes),
    cell: ({ row }) => <span className="text-xs">{resumo(row.original.detalhes)}</span>,
    meta: { exportHeader: 'Detalhes', exportValue: (r) => resumo(r.detalhes) },
  },
];

/** Trilha de auditoria do módulo (audit_logs, imutável). Paginada no servidor. */
export const AuditoriaMulti: React.FC = () => {
  const [acao, setAcao] = useState('todas');
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(50);
  const carga = useCarga(() => multiApi.auditoria({ acao: acao === 'todas' ? undefined : acao, page: pagina, per_page: porPagina }), [acao, pagina, porPagina]);
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
