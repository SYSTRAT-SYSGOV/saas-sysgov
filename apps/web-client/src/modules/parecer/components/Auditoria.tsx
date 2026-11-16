import React, { useState } from 'react';
import { Badge, Button, Card, Field, Input, ScreenState, Select, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@sysgov/ui';
import { parecerApi, type RegistroAuditoria } from '../api';
import { Carga, useCarga } from './comum';

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

/** Auditoria (auditoria.php): padrão, últimos 30 dias. */
const Auditoria: React.FC = () => {
  const [f, setF] = useState<{ de?: string; ate?: string; quem?: number; recurso: string; texto: string; page: number }>({ recurso: '', texto: '', page: 1 });
  const [texto, setTexto] = useState('');
  const carga = useCarga(() => parecerApi.auditoria({ ...f, quem: f.quem || undefined, recurso: f.recurso || undefined, texto: f.texto || undefined }), [f]);

  return (
    <Carga carga={carga}>
      {(d) => (
        <div className="space-y-4">
          <Card className="flex flex-wrap items-end gap-3 p-4">
            <Field label="De">
              <Input type="date" value={f.de ?? d.de} onChange={(e) => setF({ ...f, de: e.target.value, page: 1 })} className="font-mono" />
            </Field>
            <Field label="Até">
              <Input type="date" value={f.ate ?? d.ate} onChange={(e) => setF({ ...f, ate: e.target.value, page: 1 })} className="font-mono" />
            </Field>
            <div className="w-52">
              <Select label="Quem" value={f.quem ?? 0} onChange={(v) => setF({ ...f, quem: Number(v), page: 1 })} options={[{ value: 0, label: 'Todos' }, ...d.pessoas.map((p) => ({ value: p.id, label: p.name }))]} />
            </div>
            <div className="w-44">
              <Select label="Assunto" value={f.recurso} onChange={(v) => setF({ ...f, recurso: v, page: 1 })} options={RECURSOS.map(([v, l]) => ({ value: v, label: l }))} />
            </div>
            <form
              className="flex items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                setF({ ...f, texto, page: 1 });
              }}
            >
              <Field label="Texto">
                <Input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="nome do aluno, habilidade…" />
              </Field>
              <Button type="submit" variant="outline">
                Filtrar
              </Button>
            </form>
          </Card>
          <p className="text-sm text-muted-foreground">
            <span className="font-mono tabular-nums">{d.total}</span> registro(s) entre <span className="font-mono">{d.de.split('-').reverse().join('/')}</span> e <span className="font-mono">{d.ate.split('-').reverse().join('/')}</span>.
          </p>
          {d.data.length === 0 ? (
            <ScreenState type="empty" title="Nenhum registro no período." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quando</TableHead>
                  <TableHead>Quem</TableHead>
                  <TableHead>Assunto</TableHead>
                  <TableHead>O que aconteceu</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {d.data.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap font-mono text-xs tabular-nums">{new Date(r.data).toLocaleString('pt-BR')}</TableCell>
                    <TableCell>{r.usuario ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant="neutral">{ROTULO[r.acao.split('.')[0]] ?? r.acao}</Badge>
                    </TableCell>
                    <TableCell>
                      <div>{r.descricao ?? r.acao}</div>
                      {detalhes(r).length > 0 && (
                        <ul className="mt-1 list-inside list-disc text-xs text-muted-foreground">
                          {detalhes(r).slice(0, 12).map((l, i) => (
                            <li key={i}>{l}</li>
                          ))}
                        </ul>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {d.last_page > 1 && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={d.current_page <= 1} onClick={() => setF({ ...f, page: d.current_page - 1 })}>
                ‹ Anterior
              </Button>
              <span className="font-mono text-sm tabular-nums">
                {d.current_page} / {d.last_page}
              </span>
              <Button variant="outline" size="sm" disabled={d.current_page >= d.last_page} onClick={() => setF({ ...f, page: d.current_page + 1 })}>
                Próxima ›
              </Button>
            </div>
          )}
        </div>
      )}
    </Carga>
  );
};

export default Auditoria;
