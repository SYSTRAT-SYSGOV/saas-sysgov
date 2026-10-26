import React, { useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Badge, Button, Card, Input, Select, DataTable } from '@sysgov/ui';
import { History } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { meioAmbienteApi, erroApi, type RegistroAuditoria, type TipoReferenciaAuditoria, type TrilhaAuditoria } from '../api';

const TIPOS: { value: TipoReferenciaAuditoria; label: string }[] = [
  { value: 'processo_licenciamento', label: 'Processo de licenciamento' },
  { value: 'auto_infracao', label: 'Auto de infração ambiental' },
];

/** Campos que mudaram entre `antes` e `depois` — num registro de criação (sem `antes`), nenhum. */
export function camposAlterados(registro: RegistroAuditoria): Array<{ campo: string; de: unknown; para: unknown }> {
  if (!registro.antes || !registro.depois) return [];
  const ignorar = new Set(['updated_at']);
  return Object.keys(registro.depois)
    .filter((campo) => !ignorar.has(campo) && JSON.stringify(registro.antes?.[campo]) !== JSON.stringify(registro.depois?.[campo]))
    .map((campo) => ({ campo, de: registro.antes?.[campo] ?? null, para: registro.depois?.[campo] ?? null }));
}

function formatarValor(valor: unknown): string {
  if (valor === null || valor === undefined) return '—';
  return typeof valor === 'object' ? JSON.stringify(valor) : String(valor);
}

const textoAlteracoes = (r: RegistroAuditoria) => {
  const a = camposAlterados(r);
  return a.length === 0 ? '' : a.map((x) => `${x.campo}: ${formatarValor(x.de)} → ${formatarValor(x.para)}`).join('; ');
};

const colunasTrilha: ColumnDef<RegistroAuditoria, unknown>[] = [
  {
    id: 'data', header: 'Data/hora', accessorKey: 'registrado_em',
    cell: ({ row }) => <span className="font-mono tabular-nums">{new Date(row.original.registrado_em).toLocaleString('pt-BR')}</span>,
    meta: { exportHeader: 'Data/hora', exportValue: (r) => new Date(r.registrado_em).toLocaleString('pt-BR') },
  },
  { id: 'usuario', header: 'Usuário', accessorFn: (r) => r.usuario?.nome ?? 'Sistema', meta: { exportHeader: 'Usuário', exportValue: (r) => r.usuario?.nome ?? 'Sistema' } },
  {
    id: 'acao', header: 'Ação', accessorKey: 'acao',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        {row.original.modulo === 'vistoria' && <Badge variant="info">Vistoria</Badge>}
        <span className="font-mono text-xs">{row.original.acao}</span>
      </div>
    ),
    meta: { exportHeader: 'Ação', exportValue: (r) => r.acao },
  },
  {
    id: 'recurso', header: 'Recurso', accessorKey: 'recurso',
    cell: ({ row }) => <span className="font-mono text-xs">{row.original.recurso}</span>,
    meta: { exportHeader: 'Recurso', exportValue: (r) => r.recurso },
  },
  {
    id: 'alteracoes', header: 'Alterações', enableSorting: false,
    cell: ({ row }) => {
      const alterados = camposAlterados(row.original);
      return alterados.length === 0 ? '—' : (
        <span className="text-xs">
          {alterados.map((a) => (
            <div key={a.campo}><span className="font-semibold">{a.campo}</span>: <span className="font-mono">{formatarValor(a.de)}</span> → <span className="font-mono">{formatarValor(a.para)}</span></div>
          ))}
        </span>
      );
    },
    meta: { exportHeader: 'Alterações', exportValue: textoAlteracoes },
  },
];

/**
 * Trilha de auditoria consolidada de um processo de licenciamento ou de um auto de
 * infração (incluindo o processo sancionatório do módulo Vistoria), em ordem
 * cronológica. Mesma convenção das telas de Fiscalização: a referência é informada
 * pelo número interno (ID).
 */
export const AuditoriaView: React.FC = () => {
  const [tipo, setTipo] = useState<TipoReferenciaAuditoria>('processo_licenciamento');
  const [id, setId] = useState('');
  const [consultando, setConsultando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [trilha, setTrilha] = useState<TrilhaAuditoria | null>(null);

  const consultar = async () => {
    setConsultando(true);
    setErro(null);
    setTrilha(null);
    try {
      setTrilha(await meioAmbienteApi.obterTrilhaAuditoria(tipo, Number(id)));
    } catch (e) {
      setErro(erroApi(e).mensagem);
    } finally {
      setConsultando(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-6">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold"><History className="h-4 w-4" /> Consultar Trilha de Auditoria</h3>

        {erro && <div className="mb-4 rounded-md bg-rose-950/60 p-3 text-sm text-rose-400">{erro}</div>}

        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Referência" value={tipo} onChange={(v) => setTipo(v as TipoReferenciaAuditoria)} options={TIPOS} />
          <Input label="ID" type="number" value={id} onChange={(e) => setId(e.target.value)} />
        </div>

        <Button className="mt-4" onClick={consultar} disabled={consultando || id === ''}>
          {consultando ? 'Consultando...' : 'Consultar'}
        </Button>
      </Card>

      {trilha && (
        <Card className="p-6">
          <h3 className="mb-4 text-sm font-semibold">
            Trilha de <span className="font-mono tabular-nums">{trilha.referencia.numero}</span> — {trilha.auditoria.length} registro(s)
          </h3>

          {trilha.auditoria.length === 0 ? (
            <EmptyState icon={<History className="h-8 w-8" />} title="Nenhum registro de auditoria" />
          ) : (
            <DataTable
              columns={colunasTrilha}
              data={trilha.auditoria}
              emptyText="Nenhum registro de auditoria."
              exportable
              exportFileName={`auditoria-${tipo}-${trilha.referencia.numero}`}
              exportTitle={`Meio Ambiente — Trilha de auditoria ${trilha.referencia.numero}`}
            />
          )}
        </Card>
      )}
    </div>
  );
};

export default AuditoriaView;
