import React, { useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Badge, Button, DataTable, Field, Input, Select } from '@sysgov/ui';
import { parecerApi, type RegistroAuditoria } from '../api';
import { ALTURA_CONTROLE, BarraFiltros, Carga, useCarga } from './comum';

const RECURSOS: [string, string][] = [
  ['', 'Todos'],
  ['avaliacao', 'Avaliação'],
  ['observacao', 'Observação'],
  ['notas', 'Notas'],
  ['frequencia', 'Frequência'],
  ['ocorrencia', 'Ocorrência'],
  ['habilidade', 'Conteúdo'],
  ['turma', 'Turma'],
];
const ROTULO = Object.fromEntries(RECURSOS);

/** Mudanças legíveis (antes → depois), como detalhesAud do PHP. */
function detalhes(r: RegistroAuditoria): string[] {
  const linhas: string[] = [];
  const mud = (r.depois?.mudancas ?? []) as { habilidade?: string; aluno_id?: number; trimestre?: number; antes?: unknown; depois?: unknown }[];
  if (Array.isArray(mud)) {
    mud.forEach((m) => linhas.push(`${m.habilidade ?? (m.aluno_id ? `aluno ${m.aluno_id}${m.trimestre ? `, ${m.trimestre}º tri` : ''}` : '')}: ${String(m.antes ?? '–')} → ${String(m.depois ?? '–')}`));
  }
  if (r.antes && r.depois && !Array.isArray(r.depois.mudancas)) {
    Object.entries(r.depois).forEach(([k, v]) => {
      if (k === 'descricao' || typeof v === 'object') return;
      const a = (r.antes as Record<string, unknown>)[k];
      if (String(a ?? '') !== String(v ?? '')) linhas.push(`${k.replace(/_/g, ' ')}: ${String(a ?? '')} → ${String(v ?? '')}`);
    });
  }
  return linhas;
}

/** Colunas da grade. Sem ordenação: o servidor já entrega do mais recente ao mais antigo, página a página. */
const COLUNAS: ColumnDef<RegistroAuditoria>[] = [
  {
    id: 'quando',
    header: 'Quando',
    enableSorting: false,
    cell: ({ row }) => <span className="whitespace-nowrap font-mono text-xs tabular-nums">{new Date(row.original.data).toLocaleString('pt-BR')}</span>,
  },
  { id: 'quem', header: 'Quem', enableSorting: false, cell: ({ row }) => row.original.usuario ?? '—' },
  {
    id: 'assunto',
    header: 'Assunto',
    enableSorting: false,
    cell: ({ row }) => <Badge variant="neutral">{ROTULO[row.original.acao.split('.')[0]] ?? row.original.acao}</Badge>,
  },
  {
    id: 'o-que-aconteceu',
    header: 'O que aconteceu',
    enableSorting: false,
    cell: ({ row }) => {
      const r = row.original;
      const linhas = detalhes(r);
      return (
        <div className="text-left">
          <div>{r.descricao ?? r.acao}</div>
          {linhas.length > 0 && (
            <ul className="mt-1 list-inside list-disc text-xs text-muted-foreground">
              {linhas.slice(0, 12).map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
          )}
        </div>
      );
    },
  },
];

/** Auditoria (auditoria.php): padrão, últimos 30 dias. */
const Auditoria: React.FC = () => {
  const [f, setF] = useState<{ de?: string; ate?: string; quem?: number; recurso: string; texto: string; page: number }>({ recurso: '', texto: '', page: 1 });
  const [texto, setTexto] = useState('');
  const carga = useCarga(() => parecerApi.auditoria({ ...f, quem: f.quem || undefined, recurso: f.recurso || undefined, texto: f.texto || undefined }), [f]);

  return (
    <Carga carga={carga}>
      {(d) => (
        <div className="space-y-4">
          <BarraFiltros>
            <Field label="De">
              <Input type="date" value={f.de ?? d.de} onChange={(e) => setF({ ...f, de: e.target.value, page: 1 })} className={`${ALTURA_CONTROLE} font-mono`} />
            </Field>
            <Field label="Até">
              <Input type="date" value={f.ate ?? d.ate} onChange={(e) => setF({ ...f, ate: e.target.value, page: 1 })} className={`${ALTURA_CONTROLE} font-mono`} />
            </Field>
            <Select label="Quem" value={f.quem ?? 0} onChange={(v) => setF({ ...f, quem: Number(v), page: 1 })} options={[{ value: 0, label: 'Todos' }, ...d.pessoas.map((p) => ({ value: p.id, label: p.name }))]} />
            <Select label="Assunto" value={f.recurso} onChange={(v) => setF({ ...f, recurso: v, page: 1 })} options={RECURSOS.map(([v, l]) => ({ value: v, label: l }))} />
            <form
              className="flex items-end gap-2 sm:col-span-2 lg:col-span-4"
              onSubmit={(e) => {
                e.preventDefault();
                setF({ ...f, texto, page: 1 });
              }}
            >
              <Field label="Texto" className="flex-1">
                <Input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="nome do aluno, habilidade…" className={ALTURA_CONTROLE} />
              </Field>
              <Button type="submit" variant="outline" className={ALTURA_CONTROLE}>
                Filtrar
              </Button>
            </form>
          </BarraFiltros>
          <p className="text-sm text-muted-foreground">
            <span className="font-mono tabular-nums">{d.total}</span> registro(s) entre <span className="font-mono">{d.de.split('-').reverse().join('/')}</span> e <span className="font-mono">{d.ate.split('-').reverse().join('/')}</span>.
          </p>
          <DataTable
            columns={COLUNAS}
            data={d.data}
            emptyText="Nenhum registro no período."
            pageSizeSelector={false}
            paginationState={{ currentPage: d.current_page, totalPages: d.last_page, onPageChange: (page) => setF({ ...f, page }), total: d.total, perPage: 100 }}
          />
        </div>
      )}
    </Carga>
  );
};

export default Auditoria;
