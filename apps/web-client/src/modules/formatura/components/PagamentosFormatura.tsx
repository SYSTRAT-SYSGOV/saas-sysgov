import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button, Card, CardContent, Input, Skeleton, StatusChip, Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@sysgov/ui';
import { formatarCentavos, formatarData } from '@/lib/formatacao';
import { useCarga } from '../../escola/useCarga';
import { erroApi, formaturaApi, type PagamentoDoAno, type Periodo } from '../api';
import { periodoInvalido, periodoParaApi, recebidoDosParticipantes, ROTULO_FORMA } from '../formato';
import type { PropsAba } from '../ModuloFormaturaMain';
import { ConfirmarModal } from '../../escola/components/ConfirmarModal';
import { RegistrarPagamentoModal } from './RegistrarPagamentoModal';

/** Pagamentos do ano letivo (D12), com filtro de período, registro e estorno. */
export const PagamentosFormatura: React.FC<PropsAba> = ({ ano, dados, recarregar, avisar, permissoes }) => {
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [periodo, setPeriodo] = useState<Periodo>({});
  const [registrando, setRegistrando] = useState(false);
  const [estornar, setEstornar] = useState<PagamentoDoAno | null>(null);
  // `dados` muda de referência a cada recarga do módulo, o que refaz esta busca.
  const lista = useCarga(() => formaturaApi.pagamentos(ano, periodo), [ano, periodo, dados]);
  const total = recebidoDosParticipantes(lista.dados ?? []);
  const invalido = periodoInvalido(inicio, fim);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-col gap-3 py-4 md:flex-row md:items-end">
          <Input label="De" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} className="font-mono tabular-nums md:w-44" />
          <Input label="Até" type="date" value={fim} onChange={(e) => setFim(e.target.value)} error={invalido ? 'Data final antes da inicial' : undefined} className="font-mono tabular-nums md:w-44" />
          <Button variant="outline" disabled={invalido} onClick={() => setPeriodo(periodoParaApi(inicio, fim))}>Filtrar</Button>
          {(periodo.data_inicio || periodo.data_fim) && (
            <Button variant="ghost" onClick={() => { setInicio(''); setFim(''); setPeriodo({}); }}>Limpar</Button>
          )}
          {permissoes.pagar && <Button variant="primary" className="md:ml-auto" onClick={() => setRegistrando(true)}>Registrar pagamento</Button>}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {lista.erro ? (
            <p className="p-4 text-sm text-destructive">{lista.erro}</p>
          ) : !lista.dados ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead><TableHead>Formando</TableHead><TableHead>Turma</TableHead><TableHead>Parcela</TableHead>
                  <TableHead>Forma</TableHead><TableHead className="text-right">Valor</TableHead><TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.dados.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Nenhum pagamento no período.</TableCell></TableRow>
                )}
                {lista.dados.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono tabular-nums">{formatarData(p.data_pagamento)}</TableCell>
                    <TableCell className="font-medium">
                      {p.aluno_nome}
                      {!p.participa && <StatusChip label="Não participa — fora do recebido" variant="neutral" className="ml-2" />}
                    </TableCell>
                    <TableCell>{p.turma ?? '—'}</TableCell>
                    <TableCell className="font-mono tabular-nums">{p.numero_parcela}</TableCell>
                    <TableCell>{ROTULO_FORMA[p.forma_pagamento]}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{formatarCentavos(p.valor_centavos)}</TableCell>
                    <TableCell className="text-right">
                      {permissoes.pagar && <Button size="xs" variant="ghost" aria-label="Estornar pagamento" onClick={() => setEstornar(p)}><Trash2 /></Button>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={5}>Recebido ({lista.dados.filter((p) => p.participa).length} lançamentos de participantes)</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{formatarCentavos(total)}</TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </CardContent>
      </Card>

      {dados.configuracao && (
        <RegistrarPagamentoModal
          aberto={registrando}
          ano={ano}
          configuracao={dados.configuracao}
          formandos={dados.formandos}
          avisar={avisar}
          onFechar={() => setRegistrando(false)}
          onRegistrado={recarregar}
        />
      )}
      <ConfirmarModal
        aberto={estornar !== null}
        titulo="Estornar pagamento"
        perigo
        rotuloConfirmar="Estornar"
        mensagem={estornar && <>Estornar a parcela {estornar.numero_parcela} de {estornar.aluno_nome} (<strong className="font-mono">{formatarCentavos(estornar.valor_centavos)}</strong>)?</>}
        onFechar={() => setEstornar(null)}
        onConfirmar={async () => {
          if (!estornar) return;
          try {
            await formaturaApi.estornarPagamento(estornar.id);
            avisar({ type: 'success', title: 'Pagamento estornado', message: 'Totais atualizados.' });
            await recarregar();
          } catch (e) {
            avisar({ type: 'error', title: 'Estorno não realizado', message: erroApi(e).mensagem });
          }
        }}
      />
    </div>
  );
};
