import React, { useMemo, useRef, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, Search } from 'lucide-react';
import { Button, Card, CardContent, DataTable, Input, Select } from '@sysgov/ui';
import type { Formando } from '../api';
import type { PropsAba } from '../ModuloFormaturaMain';
import { colNome, colNumero, colTurma } from './colunasFormando';
import { useParticipacao } from './useParticipacao';

/** Relação dos alunos das turmas formandas, com a participação marcada aqui mesmo (os dados cadastrais ficam no Escola). */
export const AlunosConsulta: React.FC<PropsAba> = (props) => {
  const { dados } = props;
  const navigate = useNavigate();
  const [busca, setBusca] = useState('');
  const [turmaId, setTurmaId] = useState('todas');
  const participacao = useParticipacao(props);
  // As colunas ficam estáveis (a célula do interruptor não remonta ao gravar); o estado atual vem por ref.
  const participacaoRef = useRef(participacao);
  participacaoRef.current = participacao;
  const turmasFormandas = dados.turmasDoAno.filter((t) => (dados.configuracao?.turmas_ids ?? []).includes(t.id));
  const q = busca.trim().toUpperCase();
  const lista = dados.formandos.filter((f) =>
    (turmaId === 'todas' || String(f.turma_id) === turmaId) &&
    (q === '' || f.nome.includes(q) || (f.cgm ?? '').includes(q)));

  const colunas = useMemo<ColumnDef<Formando, unknown>[]>(() => [
    colNumero,
    colNome,
    {
      id: 'cgm',
      header: 'CGM',
      accessorFn: (f) => f.cgm ?? '',
      cell: ({ row }) => <span className="font-mono tabular-nums">{row.original.cgm ?? '—'}</span>,
      meta: { exportHeader: 'CGM', exportValue: (f) => f.cgm ?? '' },
    },
    colTurma,
    {
      id: 'telefone',
      header: 'Telefone',
      accessorFn: (f) => f.telefone ?? '',
      cell: ({ row }) => <span className="font-mono tabular-nums">{row.original.telefone ?? '—'}</span>,
      meta: { exportHeader: 'Telefone', exportValue: (f) => f.telefone ?? '' },
    },
    {
      id: 'participa',
      header: 'Participa',
      accessorFn: (f) => (f.participa ? 'Sim' : 'Não'),
      cell: ({ row }) => participacaoRef.current.interruptor(row.original),
      meta: { exportHeader: 'Participa', exportValue: (f) => (f.participa ? 'Sim' : 'Não') },
    },
  ], []);

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <Select
            label="Turma"
            value={turmaId}
            onChange={setTurmaId}
            options={[{ value: 'todas', label: 'Todas as turmas formandas' }, ...turmasFormandas.map((t) => ({ value: String(t.id), label: t.nome }))]}
            className="md:w-60"
          />
          <Input label="Buscar" placeholder="Nome ou CGM" value={busca} onChange={(e) => setBusca(e.target.value)} leftIcon={<Search className="h-4 w-4" />} className="md:w-72" />
          <Button variant="outline" className="md:ml-auto" leftIcon={<ExternalLink className="h-4 w-4" />} onClick={() => navigate('/escola')}>Abrir Cadastro Escolar</Button>
        </div>
        <DataTable
          columns={colunas}
          data={lista}
          emptyText="Nenhum aluno encontrado."
          exportable
          exportFileName="formatura-alunos"
          exportTitle="Formatura e Eventos — Alunos"
        />
        {participacao.modais}
      </CardContent>
    </Card>
  );
};
