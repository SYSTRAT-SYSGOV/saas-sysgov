import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Button, Card, CardContent, Input, Select, StatusChip, Switch, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@sysgov/ui';
import { formatarCentavos } from '@/lib/formatacao';
import { erroApi, formaturaApi } from '../api';
import { situacaoDoFormando } from '../formato';
import type { PropsAba } from '../ModuloFormaturaMain';
import { ConfirmarModal } from '../../escola/components/ConfirmarModal';
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº</TableHead><TableHead>Nome</TableHead><TableHead>Turma</TableHead><TableHead>Participa</TableHead>
                <TableHead className="text-right">Convidados</TableHead><TableHead className="text-right">Devido</TableHead>
                <TableHead className="text-right">Pago</TableHead><TableHead className="text-right">Saldo</TableHead>
                <TableHead>Situação</TableHead><TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.length === 0 && (
                <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground">Nenhum aluno encontrado.</TableCell></TableRow>
              )}
              {lista.map((f) => {
                const s = situacaoDoFormando(f);
                return (
                  <TableRow key={f.aluno_id}>
                    <TableCell className="font-mono tabular-nums">{f.numero ?? '—'}</TableCell>
                    <TableCell className="font-medium">
                      {f.nome}
                      {f.situacao_aluno === 'transferido' && <StatusChip label="Transferido" variant="danger" className="ml-2" />}
                      {f.situacao_aluno === 'remanejado' && <StatusChip label="Remanejado" variant="info" className="ml-2" />}
                    </TableCell>
                    <TableCell>{f.turma}</TableCell>
                    <TableCell>
                      {participacao.interruptor(f)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{f.participa ? f.convidados : '—'}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{formatarCentavos(f.valor_devido_centavos)}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{formatarCentavos(f.total_pago_centavos)}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{formatarCentavos(f.saldo_devedor_centavos)}</TableCell>
                    <TableCell><StatusChip label={s.rotulo} variant={s.variante} /></TableCell>
                    <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => participacao.abrirFicha(f)}>Ficha</Button></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
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
