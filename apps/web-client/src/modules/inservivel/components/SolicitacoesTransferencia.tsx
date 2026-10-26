import React, { useMemo, useRef, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Check, ClipboardCheck, FileText, X } from 'lucide-react';
import { AlertCard, Button, Card, CardContent, CardHeader, CardTitle, Modal, Skeleton, StatusChip, Tabs, TabsContent, TabsList, TabsTrigger, DataTable } from '@sysgov/ui';
import { EmptyState } from '@/components/ui';
import { erroApi } from '../../escola/api';
import { ConfirmarModal } from '../../escola/components/ConfirmarModal';
import { useCarga } from '../../escola/useCarga';
import { inservivelApi, type Transferencia } from '../api';
import { abrirArquivo, formatarDataHora, rotuloUnidade, VARIANTE_TRANSFERENCIA } from '../formato';
import type { PropsAba } from '../ModuloInservivelMain';
import { CampoTexto } from './Comuns';
import { useFormValidationModal } from '@/lib/useFormValidationModal';
import { colunaAcoes } from '@/lib/colunaAcoes';

/** Solicitações de transferência — só o Patrimônio vê e decide (spec: Transferência interna entre secretarias). */
export const SolicitacoesTransferencia: React.FC<PropsAba> = ({ avisar }) => {
  const [escopo, setEscopo] = useState<'solicitacoes' | 'historico'>('solicitacoes');
  const { tratarErro } = useFormValidationModal();
  const [versao, setVersao] = useState(0);
  const [aprovar, setAprovar] = useState<Transferencia | null>(null);
  const [recusar, setRecusar] = useState<Transferencia | null>(null);
  const lista = useCarga(() => inservivelApi.transferencias(escopo), [escopo, versao]);

  const termo = (t: Transferencia) => void inservivelApi.termoTransferencia(t.id).then(abrirArquivo).catch((e) => avisar({ type: 'error', title: 'Não foi possível abrir o termo', message: erroApi(e).mensagem }));

  // Colunas estáveis; o handler do termo vem por ref.
  const ctx = useRef({ termo });
  ctx.current = { termo };
  const colunas = useMemo<ColumnDef<Transferencia, unknown>[]>(() => [
    colunaAcoes<Transferencia>((t) => `Ações da transferência de ${t.bem.numero_patrimonial}`, (t) => [
      ...(t.pode_decidir ? [
        { key: 'aprovar', label: 'Aprovar', icon: <Check className="h-3.5 w-3.5" />, onSelect: () => setAprovar(t) },
        { key: 'recusar', label: 'Recusar', icon: <X className="h-3.5 w-3.5" />, onSelect: () => setRecusar(t) },
      ] : []),
      ...(t.status === 'aceito' ? [{ key: 'termo', label: 'Termo', icon: <FileText className="h-3.5 w-3.5" />, onSelect: () => ctx.current.termo(t) }] : []),
    ]),
    {
      id: 'bem', header: 'Bem', accessorFn: (t) => t.bem.numero_patrimonial,
      cell: ({ row }) => <span><span className="font-mono tabular-nums">{row.original.bem.numero_patrimonial}</span><p className="max-w-xs truncate text-sm">{row.original.bem.descricao}</p></span>,
      meta: { exportHeader: 'Bem', exportValue: (t) => `${t.bem.numero_patrimonial} — ${t.bem.descricao}` },
    },
    {
      id: 'de', header: 'De', accessorFn: (t) => rotuloUnidade(t.origem),
      cell: ({ row }) => <span className="text-sm">{rotuloUnidade(row.original.origem)}<p className="text-xs text-muted-foreground">{row.original.anunciado_por}</p></span>,
      meta: { exportHeader: 'De', exportValue: (t) => rotuloUnidade(t.origem) },
    },
    {
      id: 'para', header: 'Para', accessorFn: (t) => rotuloUnidade(t.destino),
      cell: ({ row }) => <span className="text-sm">{rotuloUnidade(row.original.destino)}<p className="text-xs text-muted-foreground">{row.original.solicitado_por}</p></span>,
      meta: { exportHeader: 'Para', exportValue: (t) => rotuloUnidade(t.destino) },
    },
    {
      id: 'solicitado', header: 'Solicitado', accessorKey: 'data_solicitacao',
      cell: ({ row }) => <span className="font-mono text-sm tabular-nums">{formatarDataHora(row.original.data_solicitacao)}</span>,
      meta: { exportHeader: 'Solicitado', exportValue: (t) => formatarDataHora(t.data_solicitacao) },
    },
    {
      id: 'status', header: 'Status', accessorKey: 'status_rotulo',
      cell: ({ row }) => <span><StatusChip label={row.original.status_rotulo} variant={VARIANTE_TRANSFERENCIA[row.original.status]} />{row.original.decidido_por && <p className="text-xs text-muted-foreground">por {row.original.decidido_por}</p>}</span>,
      meta: { exportHeader: 'Status', exportValue: (t) => t.status_rotulo },
    },
  ], []);

  const corpo = () => {
    if (lista.erro) return <AlertCard priority="danger" title="Não foi possível carregar" description={lista.erro} actionLabel="Tentar novamente" onAction={() => void lista.recarregar()} />;
    if (!lista.dados) return <Skeleton className="h-64 w-full" />;
    const itens = lista.dados.transferencias;
    if (itens.length === 0) return <EmptyState icon={<ClipboardCheck className="h-8 w-8" />} title={escopo === 'solicitacoes' ? 'Nenhuma solicitação pendente' : 'Nenhuma transferência'} />;
    return (
      <DataTable
        columns={colunas}
        data={itens}
        emptyText="Nenhuma transferência."
        exportable
        exportFileName={`inservivel-transferencias-${escopo}`}
        exportTitle="Bens inservíveis — Solicitações de transferência"
      />
    );
  };

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-primary" />Solicitações de transferência</CardTitle></CardHeader>
      <CardContent>
        <Tabs value={escopo} onValueChange={(v) => setEscopo(v as 'solicitacoes' | 'historico')}>
          <TabsList><TabsTrigger value="solicitacoes">Aguardando aprovação</TabsTrigger><TabsTrigger value="historico">Histórico</TabsTrigger></TabsList>
          <TabsContent value="solicitacoes">{escopo === 'solicitacoes' && corpo()}</TabsContent>
          <TabsContent value="historico">{escopo === 'historico' && corpo()}</TabsContent>
        </Tabs>
      </CardContent>
      <ConfirmarModal aberto={aprovar !== null} titulo="Aprovar transferência" rotuloConfirmar="Aprovar" onFechar={() => setAprovar(null)}
        mensagem={aprovar ? <>O bem <span className="font-mono">{aprovar.bem.numero_patrimonial}</span> passa de <strong>{rotuloUnidade(aprovar.origem)}</strong> para <strong>{rotuloUnidade(aprovar.destino)}</strong> e fica Disponível.</> : null}
        onConfirmar={async () => {
          if (!aprovar) return;
          try { await inservivelApi.aprovar(aprovar.id); avisar({ type: 'success', title: 'Transferência aprovada', message: aprovar.bem.numero_patrimonial }); setVersao((v) => v + 1); } catch (e) { if (!tratarErro(e)) avisar({ type: 'error', title: 'Não foi possível aprovar', message: erroApi(e).mensagem }); }
        }} />
      <RecusarModal transferencia={recusar} onFechar={() => setRecusar(null)} onRecusada={() => { avisar({ type: 'success', title: 'Solicitação recusada', message: 'O bem voltou à vitrine.' }); setRecusar(null); setVersao((v) => v + 1); }} />
    </Card>
  );
};

const RecusarModal: React.FC<{ transferencia: Transferencia | null; onFechar: () => void; onRecusada: () => void }> = ({ transferencia, onFechar, onRecusada }) => {
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const { tratarErro } = useFormValidationModal();
  const [enviando, setEnviando] = useState(false);
  const fechar = () => { setMotivo(''); setErro(null); onFechar(); };
  const enviar = async () => {
    if (!transferencia) return;
    setEnviando(true); setErro(null);
    try { await inservivelApi.recusar(transferencia.id, motivo.trim()); setMotivo(''); onRecusada(); } catch (e) { if (!tratarErro(e)) setErro(erroApi(e).mensagem); } finally { setEnviando(false); }
  };
  return (
    <Modal open={transferencia !== null} onClose={fechar} title="Recusar solicitação" size="md"
      footer={<><Button variant="outline" onClick={fechar} disabled={enviando}>Cancelar</Button><Button variant="destructive" onClick={() => void enviar()} isLoading={enviando} disabled={!motivo.trim()}>Recusar</Button></>}>
      <div className="space-y-3">
        <p className="text-sm">O pedido fica no histórico e o bem volta a ser anunciado.</p>
        <CampoTexto rotulo="Motivo *" value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} maxLength={2000} />
        {erro && <AlertCard priority="danger" title="Não foi possível recusar" description={erro} />}
      </div>
    </Modal>
  );
};
