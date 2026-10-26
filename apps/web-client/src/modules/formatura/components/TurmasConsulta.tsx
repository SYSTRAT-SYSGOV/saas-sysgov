import React, { useMemo, useRef, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, Users } from 'lucide-react';
import { ActionsMenu, Button, Card, CardContent, CardHeader, CardTitle, DataTable } from '@sysgov/ui';
import { formatarCentavos } from '@/lib/formatacao';
import type { Formando } from '../api';
import type { PropsAba } from '../ModuloFormaturaMain';
import { colMoeda, colNome, colNumero, colSituacao } from './colunasFormando';

type LinhaTurma = { id: number; nome: string; turno: string; alunos: number; participantes: number; arrecadado: number };

const colunasParticipantes: ColumnDef<Formando, unknown>[] = [
  colNumero,
  colNome,
  {
    id: 'convidados',
    header: 'Convidados',
    accessorKey: 'convidados',
    cell: ({ row }) => <span className="block text-right font-mono tabular-nums">{row.original.convidados}</span>,
    meta: { exportHeader: 'Convidados', exportValue: (f) => f.convidados },
  },
  colMoeda('pago', 'Pago', 'total_pago_centavos'),
  colMoeda('saldo', 'Saldo', 'saldo_devedor_centavos'),
  colSituacao,
];

/** Turmas formandas do Cadastro Escolar (sem criar/editar aqui), com os participantes de cada uma. */
export const TurmasConsulta: React.FC<PropsAba> = ({ dados }) => {
  const navigate = useNavigate();
  const [aberta, setAberta] = useState<number | null>(null);
  const abertaRef = useRef(aberta);
  abertaRef.current = aberta;
  const ids = dados.configuracao?.turmas_ids ?? [];
  const turmas = dados.turmasDoAno.filter((t) => ids.includes(t.id));

  const linhas = useMemo<LinhaTurma[]>(() => turmas.map((t) => {
    const daTurma = dados.formandos.filter((f) => f.turma_id === t.id);
    const participantes = daTurma.filter((f) => f.participa);
    return {
      id: t.id, nome: t.nome, turno: t.turno?.nome ?? '—', alunos: daTurma.length, participantes: participantes.length,
      arrecadado: participantes.reduce((s, f) => s + f.total_pago_centavos, 0),
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [dados.formandos, dados.turmasDoAno, dados.configuracao]);

  const colunas = useMemo<ColumnDef<LinhaTurma, unknown>[]>(() => [
    {
      id: 'acoes',
      header: '',
      size: 150,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-center">
          <ActionsMenu
            triggerLabel="Ações da turma"
            items={[{
              key: 'participantes',
              label: abertaRef.current === row.original.id ? 'Ocultar participantes' : 'Ver participantes',
              icon: <Users className="h-3.5 w-3.5" />,
              onSelect: () => setAberta(abertaRef.current === row.original.id ? null : row.original.id),
            }]}
          />
        </div>
      ),
    },
    { id: 'turma', header: 'Turma', accessorKey: 'nome', cell: ({ row }) => <span className="font-medium">{row.original.nome}</span>, meta: { exportHeader: 'Turma', exportValue: (t) => t.nome } },
    { id: 'turno', header: 'Turno', accessorKey: 'turno', meta: { exportHeader: 'Turno', exportValue: (t) => t.turno } },
    {
      id: 'alunos',
      header: 'Alunos',
      accessorKey: 'alunos',
      cell: ({ row }) => <span className="block text-right font-mono tabular-nums">{row.original.alunos}</span>,
      meta: { exportHeader: 'Alunos', exportValue: (t) => t.alunos },
    },
    {
      id: 'participantes',
      header: 'Participantes',
      accessorKey: 'participantes',
      cell: ({ row }) => <span className="block text-right font-mono tabular-nums">{row.original.participantes}</span>,
      meta: { exportHeader: 'Participantes', exportValue: (t) => t.participantes },
    },
    {
      id: 'arrecadado',
      header: 'Arrecadado',
      accessorKey: 'arrecadado',
      cell: ({ row }) => <span className="block text-right font-mono tabular-nums">{formatarCentavos(row.original.arrecadado)}</span>,
      meta: { exportHeader: 'Arrecadado', exportValue: (t) => formatarCentavos(t.arrecadado) },
    },
  ], []);

  const turmaAberta = turmas.find((t) => t.id === aberta);
  const participantes = turmaAberta ? dados.formandos.filter((f) => f.turma_id === turmaAberta.id && f.participa) : [];

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Turmas e alunos são mantidos no Cadastro Escolar.</p>
          <Button variant="outline" leftIcon={<ExternalLink className="h-4 w-4" />} onClick={() => navigate('/escola')}>Abrir Cadastro Escolar</Button>
        </div>
        <DataTable
          columns={colunas}
          data={linhas}
          emptyText="Nenhuma turma formanda."
          exportable
          exportFileName="formatura-turmas"
          exportTitle="Formatura e Eventos — Turmas"
        />
        {turmaAberta && (
          <Card>
            <CardHeader><CardTitle>Participantes — {turmaAberta.nome}</CardTitle></CardHeader>
            <CardContent className="p-0">
              <DataTable
                columns={colunasParticipantes}
                data={participantes}
                emptyText="Nenhum aluno participando nesta turma."
                exportable
                exportFileName={`formatura-participantes-${turmaAberta.nome}`}
                exportTitle={`Formatura e Eventos — Participantes ${turmaAberta.nome}`}
              />
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
};
