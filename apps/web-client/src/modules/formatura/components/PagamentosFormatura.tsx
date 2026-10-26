import React, { useMemo, useRef, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Trash2 } from 'lucide-react';
import { ActionsMenu, Button, Card, CardContent, DataTable, Input, Skeleton, StatusChip } from '@sysgov/ui';
import { formatarCentavos, formatarData } from '@/lib/formatacao';
import { useCarga } from '../../escola/useCarga';
import { erroApi, formaturaApi, type PagamentoDoAno, type Periodo } from '../api';
import { periodoInvalido, periodoParaApi, recebidoDosParticipantes, ROTULO_FORMA } from '../formato';
import type { PropsAba } from '../ModuloFormaturaMain';
import { ConfirmarModal } from '../../escola/components/ConfirmarModal';
import { RegistrarPagamentoModal } from './RegistrarPagamentoModal';
import { useFormValidationModal } from '@/lib/useFormValidationModal';

/** Pagamentos do ano letivo (D12), com filtro de período, registro e estorno. */
export const PagamentosFormatura: React.FC<PropsAba> = ({ ano, dados, recarregar, avisar, permissoes }) => {
  const [inicio, setInicio] = useState('');
  const { tratarErro } = useFormValidationModal();
  const [fim, setFim] = useState('');
  const [periodo, setPeriodo] = useState<Periodo>({});
  const [registrando, setRegistrando] = useState(false);
  const [estornar, setEstornar] = useState<PagamentoDoAno | null>(null);
  // `dados` muda de referência a cada recarga do módulo, o que refaz esta busca.
  const lista = useCarga(() => formaturaApi.pagamentos(ano, periodo), [ano, periodo, dados]);
  const total = recebidoDosParticipantes(lista.dados ?? []);
  const invalido = periodoInvalido(inicio, fim);

  // Colunas estáveis; a permissão atual vem por ref.
  const podePagarRef = useRef(permissoes.pagar);
  podePagarRef.current = permissoes.pagar;
  const colunas = useMemo<ColumnDef<PagamentoDoAno, unknown>[]>(() => [
    {
      id: 'acoes',
      header: '',
      size: 56,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-center">
          <ActionsMenu
            triggerLabel="Ações do pagamento"
            items={podePagarRef.current ? [{ key: 'estornar', label: 'Estornar', icon: <Trash2 className="h-3.5 w-3.5" />, onSelect: () => setEstornar(row.original) }] : []}
          />
        </div>
      ),
    },
    {
      id: 'data',
      header: 'Data',
      accessorKey: 'data_pagamento',
      cell: ({ row }) => <span className="font-mono tabular-nums">{formatarData(row.original.data_pagamento)}</span>,
      meta: { exportHeader: 'Data', exportValue: (p) => formatarData(p.data_pagamento) },
    },
    {
      id: 'formando',
      header: 'Formando',
      accessorKey: 'aluno_nome',
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.aluno_nome}
          {!row.original.participa && <StatusChip label="Não participa — fora do recebido" variant="neutral" className="ml-2" />}
        </span>
      ),
      meta: { exportHeader: 'Formando', exportValue: (p) => p.aluno_nome },
    },
    { id: 'turma', header: 'Turma', accessorFn: (p) => p.turma ?? '', meta: { exportHeader: 'Turma', exportValue: (p) => p.turma ?? '' } },
    {
      id: 'parcela',
      header: 'Parcela',
      accessorKey: 'numero_parcela',
      cell: ({ row }) => <span className="font-mono tabular-nums">{row.original.numero_parcela}</span>,
      meta: { exportHeader: 'Parcela', exportValue: (p) => p.numero_parcela },
    },
    {
      id: 'forma',
      header: 'Forma',
      accessorFn: (p) => ROTULO_FORMA[p.forma_pagamento],
      meta: { exportHeader: 'Forma', exportValue: (p) => ROTULO_FORMA[p.forma_pagamento] },
    },
    {
      id: 'valor',
      header: 'Valor',
      accessorKey: 'valor_centavos',
      cell: ({ row }) => <span className="block text-right font-mono tabular-nums">{formatarCentavos(row.original.valor_centavos)}</span>,
      meta: { exportHeader: 'Valor', exportValue: (p) => formatarCentavos(p.valor_centavos) },
    },
  ], []);

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
            <>
              <DataTable
                columns={colunas}
                data={lista.dados}
                emptyText="Nenhum pagamento no período."
                exportable
                exportFileName="formatura-pagamentos"
                exportTitle="Formatura e Eventos — Pagamentos"
              />
              <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm font-medium text-foreground">
                <span>Recebido ({lista.dados.filter((p) => p.participa).length} lançamentos de participantes)</span>
                <span className="font-mono tabular-nums">{formatarCentavos(total)}</span>
              </div>
            </>
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
            if (!tratarErro(e)) avisar({ type: 'error', title: 'Estorno não realizado', message: erroApi(e).mensagem });
          }
        }}
      />
    </div>
  );
};
