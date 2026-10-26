import React, { useMemo, useRef, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { FileText, Search } from 'lucide-react';
import { ActionsMenu, Button, Card, CardContent, DataTable, Input, Select, Switch } from '@sysgov/ui';
import { erroApi, formaturaApi, type Formando } from '../api';
import type { PropsAba } from '../ModuloFormaturaMain';
import { ConfirmarModal } from '../../escola/components/ConfirmarModal';
import { colMoeda, colNome, colNumero, colSituacao, colTurma } from './colunasFormando';
import { useParticipacao } from './useParticipacao';

type Lote = { turmaId: number; turma: string; participa: boolean };

/** Alunos das turmas formandas: participação (individual ou por turma), situação financeira e ficha. */
export const FormandosFormatura: React.FC<PropsAba> = (props) => {
  const { ano, dados, recarregar, avisar, permissoes } = props;
  const [turmaId, setTurmaId] = useState<string>('todas');
  const [busca, setBusca] = useState('');
  // Por padrão só os participantes; desligando, aparecem todos os alunos das turmas formandas.
  const [soParticipantes, setSoParticipantes] = useState(true);
  const [lote, setLote] = useState<Lote | null>(null);
  const participacao = useParticipacao(props);

  const turmasFormandas = dados.turmasDoAno.filter((t) => (dados.configuracao?.turmas_ids ?? []).includes(t.id));
  // Os nomes vêm em maiúsculas do Cadastro Escolar.
  const lista = useMemo(() => {
    const q = busca.trim().toUpperCase();
    return dados.formandos.filter((f) =>
      (turmaId === 'todas' || String(f.turma_id) === turmaId) &&
      (!soParticipantes || f.participa) &&
      (q === '' || f.nome.includes(q) || (f.cgm ?? '').includes(q)));
  }, [dados.formandos, turmaId, busca, soParticipantes]);

  const turmaEscolhida = turmasFormandas.find((t) => String(t.id) === turmaId);

  // As colunas ficam estáveis (a célula do interruptor não remonta ao gravar); o estado atual vem por ref.
  const participacaoRef = useRef(participacao);
  participacaoRef.current = participacao;
  const colunas = useMemo<ColumnDef<Formando, unknown>[]>(() => [
    {
      id: 'acoes',
      header: '',
      size: 56,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-center">
          <ActionsMenu
            triggerLabel="Ações do formando"
            items={[{ key: 'ficha', label: 'Ficha', icon: <FileText className="h-3.5 w-3.5" />, onSelect: () => participacaoRef.current.abrirFicha(row.original) }]}
          />
        </div>
      ),
    },
    colNumero,
    colNome,
    colTurma,
    {
      id: 'participa',
      header: 'Participa',
      accessorFn: (f) => (f.participa ? 'Sim' : 'Não'),
      cell: ({ row }) => participacaoRef.current.interruptor(row.original),
      meta: { exportHeader: 'Participa', exportValue: (f) => (f.participa ? 'Sim' : 'Não') },
    },
    {
      id: 'convidados',
      header: 'Convidados',
      accessorFn: (f) => (f.participa ? f.convidados : -1),
      cell: ({ row }) => <span className="block text-right font-mono tabular-nums">{row.original.participa ? row.original.convidados : '—'}</span>,
      meta: { exportHeader: 'Convidados', exportValue: (f) => (f.participa ? f.convidados : '') },
    },
    colMoeda('devido', 'Devido', 'valor_devido_centavos'),
    colMoeda('pago', 'Pago', 'total_pago_centavos'),
    colMoeda('saldo', 'Saldo', 'saldo_devedor_centavos'),
    colSituacao,
  ], []);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-col gap-3 py-4 lg:flex-row lg:items-end">
          <Select
            label="Turma"
            value={turmaId}
            onChange={setTurmaId}
            options={[{ value: 'todas', label: 'Todas as turmas formandas' }, ...turmasFormandas.map((t) => ({ value: String(t.id), label: t.nome }))]}
            className="lg:w-60"
          />
          <Input label="Buscar" placeholder="Nome ou CGM" value={busca} onChange={(e) => setBusca(e.target.value)} leftIcon={<Search className="h-4 w-4" />} className="lg:w-72" />
          <label className="flex items-center gap-2 text-sm text-foreground">
            <Switch checked={soParticipantes} onCheckedChange={setSoParticipantes} label="Somente participantes" /> Somente participantes
          </label>
          {permissoes.editarFormandos && turmaEscolhida && (
            <div className="flex gap-2 lg:ml-auto">
              <Button variant="outline" onClick={() => setLote({ turmaId: turmaEscolhida.id, turma: turmaEscolhida.nome, participa: true })}>Marcar todos da turma</Button>
              <Button variant="outline" onClick={() => setLote({ turmaId: turmaEscolhida.id, turma: turmaEscolhida.nome, participa: false })}>Desmarcar todos</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={colunas}
            data={lista}
            emptyText="Nenhum aluno encontrado."
            exportable
            exportFileName="formatura-formandos"
            exportTitle="Formatura e Eventos — Formandos"
          />
        </CardContent>
      </Card>

      {participacao.modais}

      <ConfirmarModal
        aberto={lote !== null}
        titulo={lote?.participa ? 'Marcar a turma inteira' : 'Desmarcar a turma inteira'}
        rotuloConfirmar={lote?.participa ? 'Marcar todos' : 'Desmarcar todos'}
        perigo={lote?.participa === false}
        mensagem={lote && (lote.participa
          ? <>Todos os alunos da turma {lote.turma} passam a participar, com os convidados padrão, <strong>exceto os transferidos</strong>.</>
          : <>Todos os alunos da turma {lote.turma} deixam de participar. Pagamentos já feitos continuam registrados.</>)}
        onFechar={() => setLote(null)}
        onConfirmar={async () => {
          if (!lote) return;
          try {
            await formaturaApi.participacaoEmLote(ano, lote.turmaId, lote.participa);
            avisar({ type: 'success', title: 'Turma atualizada', message: `Participação da turma ${lote.turma} atualizada.` });
            await recarregar();
          } catch (e) {
            avisar({ type: 'error', title: 'Não foi possível atualizar a turma', message: erroApi(e).mensagem });
          }
        }}
      />
    </div>
  );
};
