import React, { useMemo, useRef, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowLeftRight, Ban, FileText, Handshake, Megaphone, Search } from 'lucide-react';
import { AlertCard, Button, Card, CardContent, CardHeader, CardTitle, Input, Modal, Skeleton, StatusChip, Tabs, TabsContent, TabsList, TabsTrigger, DataTable } from '@sysgov/ui';
import { EmptyState } from '@/components/ui';
import { erroApi } from '../../escola/api';
import { ConfirmarModal } from '../../escola/components/ConfirmarModal';
import { useCarga } from '../../escola/useCarga';
import { inservivelApi, type BemResumo, type Transferencia } from '../api';
import { abrirArquivo, formatarCentavos, formatarDataHora, rotuloUnidade, vazioParaNulo, VARIANTE_TRANSFERENCIA } from '../formato';
import type { PropsAba } from '../ModuloInservivelMain';
import { CampoTexto, ChipSituacao, FotoBem } from './Comuns';
import { useFormValidationModal } from '@/lib/useFormValidationModal';
import { colunaAcoes } from '@/lib/colunaAcoes';

/** Transferência interna (spec: Transferência interna entre secretarias): vitrine, minhas e anúncio. */
export const TransferenciaInterna: React.FC<PropsAba> = ({ permissoes, avisar }) => {
  const [escopo, setEscopo] = useState<'vitrine' | 'minhas'>('vitrine');
  const { tratarErro } = useFormValidationModal();
  const [versao, setVersao] = useState(0);
  const [anunciar, setAnunciar] = useState(false);
  const [confirmar, setConfirmar] = useState<{ acao: 'solicitar' | 'cancelar'; t: Transferencia } | null>(null);
  const lista = useCarga(() => inservivelApi.transferencias(escopo), [escopo, versao]);

  // Colunas estáveis (a foto não recarrega a cada render); avisar vem por ref.
  const ctx = useRef({ avisar });
  ctx.current = { avisar };
  const colunas = useMemo<ColumnDef<Transferencia, unknown>[]>(() => [
    colunaAcoes<Transferencia>((t) => `Ações da transferência de ${t.bem.numero_patrimonial}`, (t) => [
      ...(t.pode_solicitar ? [{ key: 'solicitar', label: 'Solicitar', icon: <Handshake className="h-3.5 w-3.5" />, onSelect: () => setConfirmar({ acao: 'solicitar', t }) }] : []),
      ...(t.pode_cancelar ? [{ key: 'cancelar', label: 'Cancelar anúncio', icon: <Ban className="h-3.5 w-3.5" />, onSelect: () => setConfirmar({ acao: 'cancelar', t }) }] : []),
      ...(t.status === 'aceito' ? [{ key: 'termo', label: 'Termo', icon: <FileText className="h-3.5 w-3.5" />, onSelect: () => void inservivelApi.termoTransferencia(t.id).then(abrirArquivo).catch((e) => ctx.current.avisar({ type: 'error', title: 'Não foi possível abrir o termo', message: erroApi(e).mensagem })) }] : []),
    ]),
    {
      id: 'foto', header: 'Foto', enableSorting: false,
      cell: ({ row }) => <FotoBem chave={row.original.bem.foto_principal_id ? `${row.original.bem.id}-${row.original.bem.foto_principal_id}` : null} carregar={() => inservivelApi.foto(row.original.bem.id, row.original.bem.foto_principal_id ?? 0)} alt={`Foto do bem ${row.original.bem.numero_patrimonial}`} className="h-10 w-10" />,
      meta: { exportIgnore: true },
    },
    {
      id: 'bem', header: 'Bem', accessorFn: (t) => t.bem.numero_patrimonial,
      cell: ({ row }) => <span><span className="font-mono tabular-nums">{row.original.bem.numero_patrimonial}</span><p className="max-w-xs truncate text-sm">{row.original.bem.descricao}</p>{row.original.observacao && <p className="text-xs text-muted-foreground">{row.original.observacao}</p>}</span>,
      meta: { exportHeader: 'Bem', exportValue: (t) => `${t.bem.numero_patrimonial} — ${t.bem.descricao}` },
    },
    { id: 'origem', header: 'Origem', accessorFn: (t) => rotuloUnidade(t.origem), meta: { exportHeader: 'Origem', exportValue: (t) => rotuloUnidade(t.origem) } },
    { id: 'destino', header: 'Destino', accessorFn: (t) => rotuloUnidade(t.destino), meta: { exportHeader: 'Destino', exportValue: (t) => rotuloUnidade(t.destino) } },
    {
      id: 'status', header: 'Status', accessorKey: 'status_rotulo',
      cell: ({ row }) => <span><StatusChip label={row.original.status_rotulo} variant={VARIANTE_TRANSFERENCIA[row.original.status]} />{row.original.motivo_recusa && <p className="text-xs text-muted-foreground">Motivo: {row.original.motivo_recusa}</p>}</span>,
      meta: { exportHeader: 'Status', exportValue: (t) => t.status_rotulo },
    },
    {
      id: 'anunciado', header: 'Anunciado', accessorKey: 'data_anuncio',
      cell: ({ row }) => <span className="font-mono text-sm tabular-nums">{formatarDataHora(row.original.data_anuncio)}<p className="font-sans text-xs text-muted-foreground">{row.original.anunciado_por}</p></span>,
      meta: { exportHeader: 'Anunciado', exportValue: (t) => formatarDataHora(t.data_anuncio) },
    },
  ], []);

  const corpo = () => {
    if (lista.erro) return <AlertCard priority="danger" title="Não foi possível carregar" description={lista.erro} actionLabel="Tentar novamente" onAction={() => void lista.recarregar()} />;
    if (!lista.dados) return <Skeleton className="h-64 w-full" />;
    const itens = lista.dados.transferencias;
    if (itens.length === 0) {
      return <EmptyState icon={<ArrowLeftRight className="h-8 w-8" />} title={escopo === 'vitrine' ? 'Nenhum bem anunciado' : 'Nenhuma transferência sua'} description={escopo === 'vitrine' ? 'Os bens que as secretarias disponibilizam aparecem aqui.' : undefined} />;
    }
    return (
      <DataTable
        columns={colunas}
        data={itens}
        emptyText="Nenhuma transferência."
        exportable
        exportFileName={`inservivel-transferencia-${escopo}`}
        exportTitle="Bens inservíveis — Transferência interna"
      />
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2"><ArrowLeftRight className="h-5 w-5 text-primary" />Transferência interna</CardTitle>
        <div className="flex items-center gap-3">
          {lista.dados && <span className="text-sm text-muted-foreground">Sua secretaria: <strong>{lista.dados.minha_secretaria ? rotuloUnidade(lista.dados.minha_secretaria) : 'sem lotação no Organograma'}</strong></span>}
          {permissoes.transferencias && <Button leftIcon={<Megaphone className="h-4 w-4" />} onClick={() => setAnunciar(true)}>Anunciar bem</Button>}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={escopo} onValueChange={(v) => setEscopo(v as 'vitrine' | 'minhas')}>
          <TabsList><TabsTrigger value="vitrine">Bens disponíveis</TabsTrigger><TabsTrigger value="minhas">Minhas transferências</TabsTrigger></TabsList>
          <TabsContent value="vitrine">{escopo === 'vitrine' && corpo()}</TabsContent>
          <TabsContent value="minhas">{escopo === 'minhas' && corpo()}</TabsContent>
        </Tabs>
      </CardContent>
      <AnunciarModal aberto={anunciar} onFechar={() => setAnunciar(false)} onAnunciado={(b) => { setAnunciar(false); avisar({ type: 'success', title: 'Bem anunciado', message: b }); setVersao((v) => v + 1); }} />
      <ConfirmarModal aberto={confirmar !== null} titulo={confirmar?.acao === 'solicitar' ? 'Solicitar bem' : 'Cancelar anúncio'} onFechar={() => setConfirmar(null)}
        rotuloConfirmar={confirmar?.acao === 'solicitar' ? 'Solicitar' : 'Cancelar anúncio'} perigo={confirmar?.acao === 'cancelar'}
        mensagem={confirmar ? (confirmar.acao === 'solicitar'
          ? <>Solicitar o bem <span className="font-mono">{confirmar.t.bem.numero_patrimonial}</span> para a sua secretaria? O pedido vai para aprovação do Patrimônio.</>
          : <>Cancelar o anúncio do bem <span className="font-mono">{confirmar.t.bem.numero_patrimonial}</span>? Ele volta à situação anterior.</>) : null}
        onConfirmar={async () => {
          if (!confirmar) return;
          try {
            if (confirmar.acao === 'solicitar') await inservivelApi.solicitar(confirmar.t.id); else await inservivelApi.cancelar(confirmar.t.id);
            avisar({ type: 'success', title: confirmar.acao === 'solicitar' ? 'Solicitação enviada' : 'Anúncio cancelado', message: confirmar.t.bem.numero_patrimonial });
            setVersao((v) => v + 1);
          } catch (e) { if (!tratarErro(e)) avisar({ type: 'error', title: 'Não foi possível concluir', message: erroApi(e).mensagem }); }
        }} />
    </Card>
  );
};

const AnunciarModal: React.FC<{ aberto: boolean; onFechar: () => void; onAnunciado: (patrimonio: string) => void }> = ({ aberto, onFechar, onAnunciado }) => {
  const [busca, setBusca] = useState('');
  const [aplicada, setAplicada] = useState('');
  const [escolhido, setEscolhido] = useState<BemResumo | null>(null);
  const [observacao, setObservacao] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const bens = useCarga(() => (aberto ? inservivelApi.anunciaveis(aplicada || undefined) : Promise.resolve(null)), [aberto, aplicada]);
  const fechar = () => { setEscolhido(null); setObservacao(''); setErro(null); onFechar(); };
  const enviar = async () => {
    if (!escolhido) return;
    setEnviando(true); setErro(null);
    try { await inservivelApi.anunciar(escolhido.id, vazioParaNulo(observacao)); onAnunciado(escolhido.numero_patrimonial); setEscolhido(null); setObservacao(''); } catch (e) { setErro(erroApi(e).mensagem); } finally { setEnviando(false); }
  };
  return (
    <Modal open={aberto} onClose={fechar} title="Anunciar bem para outras secretarias" icon={<Megaphone className="h-5 w-5" />} size="xl"
      footer={<><Button variant="outline" onClick={fechar} disabled={enviando}>Cancelar</Button><Button onClick={() => void enviar()} isLoading={enviando} disabled={!escolhido}>Anunciar</Button></>}>
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Bens disponíveis ou inservíveis {bens.dados?.minha_secretaria ? <>da <strong>{rotuloUnidade(bens.dados.minha_secretaria)}</strong></> : 'da sua secretaria'}. Enquanto anunciado, o bem não entra em lotes de doação.</p>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); setAplicada(busca); }}>
          <Input aria-label="Buscar bem" placeholder="Nº patrimonial ou descrição" value={busca} onChange={(e) => setBusca(e.target.value)} className="flex-1" />
          <Button type="submit" variant="outline" leftIcon={<Search className="h-4 w-4" />}>Buscar</Button>
        </form>
        <div className="max-h-64 overflow-y-auto rounded-md border border-border">
          {!bens.dados ? <Skeleton className="h-32 w-full" /> : bens.dados.bens.length === 0 ? <p className="p-4 text-sm text-muted-foreground">Nenhum bem disponível para anunciar.</p> : (
            <ul className="divide-y divide-border">
              {bens.dados.bens.map((b) => (
                <li key={b.id}>
                  <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-muted">
                    <input type="radio" name="bem-anunciar" checked={escolhido?.id === b.id} onChange={() => setEscolhido(b)} className="accent-primary" />
                    <span className="w-24 font-mono tabular-nums">{b.numero_patrimonial}</span>
                    <span className="flex-1 truncate">{b.descricao}</span>
                    <ChipSituacao situacao={b.situacao} />
                    <span className="font-mono tabular-nums">{formatarCentavos(b.valor_referencia_cents)}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
        <CampoTexto rotulo="Observação (opcional)" value={observacao} onChange={(e) => setObservacao(e.target.value)} rows={2} maxLength={2000} />
        {erro && <AlertCard priority="danger" title="Não foi possível anunciar" description={erro} />}
      </div>
    </Modal>
  );
};
