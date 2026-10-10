import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, Search } from 'lucide-react';
import { Button, Card, CardContent, Input, Select, StatusChip, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@sysgov/ui';
import type { PropsAba } from '../ModuloFormaturaMain';
import { useParticipacao } from './useParticipacao';

/** Relação dos alunos das turmas formandas, com a participação marcada aqui mesmo (os dados cadastrais ficam no Escola). */
export const AlunosConsulta: React.FC<PropsAba> = (props) => {
  const { dados } = props;
  const navigate = useNavigate();
  const [busca, setBusca] = useState('');
  const [turmaId, setTurmaId] = useState('todas');
  const participacao = useParticipacao(props);
  const turmasFormandas = dados.turmasDoAno.filter((t) => (dados.configuracao?.turmas_ids ?? []).includes(t.id));
  const q = busca.trim().toUpperCase();
  const lista = dados.formandos.filter((f) =>
    (turmaId === 'todas' || String(f.turma_id) === turmaId) &&
    (q === '' || f.nome.includes(q) || (f.cgm ?? '').includes(q)));

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
        <Table>
          <TableHeader><TableRow><TableHead>Nº</TableHead><TableHead>Nome</TableHead><TableHead>CGM</TableHead><TableHead>Turma</TableHead><TableHead>Telefone</TableHead><TableHead>Participa</TableHead></TableRow></TableHeader>
          <TableBody>
            {lista.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Nenhum aluno encontrado.</TableCell></TableRow>}
            {lista.map((f) => (
              <TableRow key={f.aluno_id}>
                <TableCell className="font-mono tabular-nums">{f.numero ?? '—'}</TableCell>
                <TableCell className="font-medium">
                  {f.nome}
                  {f.situacao_aluno === 'transferido' && <StatusChip label="Transferido" variant="danger" className="ml-2" />}
                  {f.situacao_aluno === 'remanejado' && <StatusChip label="Remanejado" variant="info" className="ml-2" />}
                </TableCell>
                <TableCell className="font-mono tabular-nums">{f.cgm ?? '—'}</TableCell>
                <TableCell>{f.turma}</TableCell>
                <TableCell className="font-mono tabular-nums">{f.telefone ?? '—'}</TableCell>
                <TableCell>{participacao.interruptor(f)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {participacao.modais}
      </CardContent>
    </Card>
  );
};
