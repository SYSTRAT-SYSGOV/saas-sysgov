import React, { useMemo, useRef, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useNavigate } from 'react-router-dom';
import { CheckSquare, ExternalLink, School, Users, XSquare } from 'lucide-react';
import { ActionsMenu, Button, Card, CardContent, CardHeader, CardTitle, DataTable, StatusChip } from '@sysgov/ui';
import { EmptyState } from '@/components/ui';
import { erroApi, type Turma } from '../../escola/api';
import { ConfirmarModal } from '../../escola/components/ConfirmarModal';
import { passeioApi, type Inscricao } from '../api';
import type { PropsAba } from '../ModuloPasseioMain';

type LinhaTurma = { turma: Turma; alunos: number | null; vao: number; termos: number; pagos: number };

const colunasInscritos: ColumnDef<Inscricao, unknown>[] = [
  {
    id: 'aluno',
    header: 'Aluno',
    accessorFn: (i) => i.aluno?.nome ?? '',
    meta: { exportHeader: 'Aluno', exportValue: (i) => i.aluno?.nome ?? '' },
  },
  {
    id: 'vai',
    header: 'Situação',
    accessorFn: (i) => (i.vai ? 'Vai' : 'Não vai'),
    cell: ({ row }) => <StatusChip label={row.original.vai ? 'Vai' : 'Não vai'} variant={row.original.vai ? 'success' : 'neutral'} />,
    meta: { exportHeader: 'Situação', exportValue: (i) => (i.vai ? 'Vai' : 'Não vai') },
  },
];

/**
 * Turmas do Cadastro Escolar no ano letivo do passeio (sem criar/editar aqui): inscritos por turma e
 * marcar/desmarcar a turma inteira numa só operação (D18).
 */
export const TurmasPasseio: React.FC<PropsAba> = ({ ativo, dados, recarregar, avisar, permissoes }) => {
  const navigate = useNavigate();
  const [aberta, setAberta] = useState<number | null>(null);
  const [lote, setLote] = useState<{ turma: Turma; vai: boolean } | null>(null);
  const ano = ativo.data_passeio.slice(0, 4);

  // Colunas estáveis; o estado atual (turma aberta, permissão) vem por ref.
  const ctx = useRef({ aberta, permissoes });
  ctx.current = { aberta, permissoes };

  const linhas = useMemo<LinhaTurma[]>(() => dados.turmas.map((t) => {
    const vao = dados.inscricoes.filter((i) => i.aluno?.turma_id === t.id && i.vai);
    return { turma: t, alunos: t.total_alunos ?? null, vao: vao.length, termos: vao.filter((i) => i.autorizacao_entregue).length, pagos: vao.filter((i) => i.pago).length };
  }), [dados.turmas, dados.inscricoes]);

  const colunas = useMemo<ColumnDef<LinhaTurma, unknown>[]>(() => [
    {
      id: 'acoes',
      header: '',
      size: 56,
      enableSorting: false,
      cell: ({ row }) => {
        const { turma, vao } = row.original;
        const { aberta: atual, permissoes: perm } = ctx.current;
        return (
          <div className="flex justify-center">
            <ActionsMenu
              triggerLabel={`Ações da turma ${turma.nome}`}
              items={[
                { key: 'inscritos', label: atual === turma.id ? 'Ocultar inscritos' : 'Ver inscritos', icon: <Users className="h-3.5 w-3.5" />, onSelect: () => setAberta(atual === turma.id ? null : turma.id) },
                ...(perm.passeios ? [
                  { key: 'marcar', label: 'Marcar turma inteira', icon: <CheckSquare className="h-3.5 w-3.5" />, onSelect: () => setLote({ turma, vai: true }) },
                  { key: 'desmarcar', label: 'Desmarcar turma inteira', icon: <XSquare className="h-3.5 w-3.5" />, disabled: vao === 0, onSelect: () => setLote({ turma, vai: false }) },
                ] : []),
              ]}
            />
          </div>
        );
      },
    },
    { id: 'turma', header: 'Turma', accessorFn: (l) => l.turma.nome, cell: ({ row }) => <span className="font-medium">{row.original.turma.nome}</span>, meta: { exportHeader: 'Turma', exportValue: (l) => l.turma.nome } },
    { id: 'turno', header: 'Turno', accessorFn: (l) => l.turma.turno?.nome ?? '—', meta: { exportHeader: 'Turno', exportValue: (l) => l.turma.turno?.nome ?? '—' } },
    {
      id: 'alunos',
      header: 'Alunos',
      accessorFn: (l) => l.alunos ?? -1,
      cell: ({ row }) => <span className="block text-right font-mono tabular-nums">{row.original.alunos ?? '—'}</span>,
      meta: { exportHeader: 'Alunos', exportValue: (l) => l.alunos ?? '' },
    },
    { id: 'vao', header: 'Vão', accessorKey: 'vao', cell: ({ row }) => <span className="block text-right font-mono tabular-nums">{row.original.vao}</span>, meta: { exportHeader: 'Vão', exportValue: (l) => l.vao } },
    { id: 'termos', header: 'Termos', accessorKey: 'termos', cell: ({ row }) => <span className="block text-right font-mono tabular-nums">{row.original.termos}</span>, meta: { exportHeader: 'Termos', exportValue: (l) => l.termos } },
    { id: 'pagos', header: 'Pagos', accessorKey: 'pagos', cell: ({ row }) => <span className="block text-right font-mono tabular-nums">{row.original.pagos}</span>, meta: { exportHeader: 'Pagos', exportValue: (l) => l.pagos } },
  ], []);

  const turmaAberta = dados.turmas.find((t) => t.id === aberta);
  const inscritos = turmaAberta ? dados.inscricoes.filter((i) => i.aluno?.turma_id === turmaAberta.id) : [];

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-muted-foreground">Turmas e alunos de <span className="font-mono tabular-nums">{ano}</span> são mantidos no Cadastro Escolar. Transferidos não participam.</p>
          <Button variant="outline" leftIcon={<ExternalLink className="h-4 w-4" />} onClick={() => navigate('/escola')}>Abrir Cadastro Escolar</Button>
        </div>
        {dados.turmas.length === 0 ? (
          <EmptyState icon={<School className="h-8 w-8" />} title={`Nenhuma turma em ${ano}`} description="Cadastre as turmas do ano letivo do passeio no Cadastro Escolar." />
        ) : (
          <DataTable
            columns={colunas}
            data={linhas}
            emptyText="Nenhuma turma."
            exportable
            exportFileName="passeio-turmas"
            exportTitle="Passeio — Turmas"
          />
        )}
        {turmaAberta && (
          <Card>
            <CardHeader><CardTitle>Inscritos — {turmaAberta.nome}</CardTitle></CardHeader>
            <CardContent className="p-0">
              <DataTable
                columns={colunasInscritos}
                data={inscritos}
                emptyText="Nenhum aluno desta turma inscrito."
                exportable
                exportFileName={`passeio-inscritos-${turmaAberta.nome}`}
                exportTitle={`Passeio — Inscritos ${turmaAberta.nome}`}
              />
            </CardContent>
          </Card>
        )}
      </CardContent>

      <ConfirmarModal
        aberto={lote !== null}
        titulo={lote?.vai ? 'Marcar a turma inteira' : 'Desmarcar a turma inteira'}
        mensagem={lote?.vai
          ? <>Todos os alunos da turma <strong>{lote.turma.nome}</strong> (menos os transferidos) passam a ir ao passeio; quem não estava inscrito é inscrito.</>
          : <>Todos os alunos da turma <strong>{lote?.turma.nome}</strong> deixam de ir ao passeio e perdem o assento marcado. As outras turmas não mudam.</>}
        rotuloConfirmar={lote?.vai ? 'Marcar' : 'Desmarcar'}
        perigo={lote?.vai === false}
        onFechar={() => setLote(null)}
        onConfirmar={async () => {
          if (!lote) return;
          try {
            const r = await passeioApi.inscricoesEmLote(ativo.id, lote.turma.id, lote.vai);
            avisar({ type: 'success', title: 'Turma atualizada', message: `${lote.turma.nome}: ${r.afetadas} aluno(s) ${lote.vai ? 'marcados' : 'desmarcados'}.` });
            await recarregar();
          } catch (e) {
            avisar({ type: 'error', title: 'Não foi possível atualizar a turma', message: erroApi(e).mensagem });
          }
        }}
      />
    </Card>
  );
};
