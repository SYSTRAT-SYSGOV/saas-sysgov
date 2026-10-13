import React, { useState } from 'react';
import { ArrowLeftRight, Megaphone, Search } from 'lucide-react';
import { AlertCard, Button, Card, CardContent, CardHeader, CardTitle, Input, Modal, Skeleton, StatusChip, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tabs, TabsContent, TabsList, TabsTrigger } from '@sysgov/ui';
import { EmptyState } from '@/components/ui';
import { erroApi } from '../../escola/api';
import { ConfirmarModal } from '../../escola/components/ConfirmarModal';
import { useCarga } from '../../escola/useCarga';
import { inservivelApi, type BemResumo, type Transferencia } from '../api';
import { abrirArquivo, formatarCentavos, formatarDataHora, rotuloUnidade, vazioParaNulo, VARIANTE_TRANSFERENCIA } from '../formato';
import type { PropsAba } from '../ModuloInservivelMain';
import { CampoTexto, ChipSituacao, FotoBem } from './Comuns';

/** Transferência interna (spec: Transferência interna entre secretarias): vitrine, minhas e anúncio. */
export const TransferenciaInterna: React.FC<PropsAba> = ({ permissoes, avisar }) => {
  const [escopo, setEscopo] = useState<'vitrine' | 'minhas'>('vitrine');
  const [versao, setVersao] = useState(0);
  const [anunciar, setAnunciar] = useState(false);
  const [confirmar, setConfirmar] = useState<{ acao: 'solicitar' | 'cancelar'; t: Transferencia } | null>(null);
  const lista = useCarga(() => inservivelApi.transferencias(escopo), [escopo, versao]);

  const corpo = () => {
    if (lista.erro) return <AlertCard priority="danger" title="Não foi possível carregar" description={lista.erro} actionLabel="Tentar novamente" onAction={() => void lista.recarregar()} />;
    if (!lista.dados) return <Skeleton className="h-64 w-full" />;
    const itens = lista.dados.transferencias;
    if (itens.length === 0) {
      return <EmptyState icon={<ArrowLeftRight className="h-8 w-8" />} title={escopo === 'vitrine' ? 'Nenhum bem anunciado' : 'Nenhuma transferência sua'} description={escopo === 'vitrine' ? 'Os bens que as secretarias disponibilizam aparecem aqui.' : undefined} />;
    }
    return (
      <Table>
        <TableHeader><TableRow><TableHead className="w-14">Foto</TableHead><TableHead>Bem</TableHead><TableHead>Origem</TableHead><TableHead>Destino</TableHead><TableHead>Status</TableHead><TableHead>Anunciado</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
        <TableBody>
          {itens.map((t) => (
            <TableRow key={t.id}>
              <TableCell><FotoBem chave={t.bem.foto_principal_id ? `${t.bem.id}-${t.bem.foto_principal_id}` : null} carregar={() => inservivelApi.foto(t.bem.id, t.bem.foto_principal_id ?? 0)} alt={`Foto do bem ${t.bem.numero_patrimonial}`} className="h-10 w-10" /></TableCell>
              <TableCell><span className="font-mono tabular-nums">{t.bem.numero_patrimonial}</span><p className="max-w-xs truncate text-sm">{t.bem.descricao}</p>{t.observacao && <p className="text-xs text-muted-foreground">{t.observacao}</p>}</TableCell>
              <TableCell className="text-sm">{rotuloUnidade(t.origem)}</TableCell>
              <TableCell className="text-sm">{rotuloUnidade(t.destino)}</TableCell>
              <TableCell><StatusChip label={t.status_rotulo} variant={VARIANTE_TRANSFERENCIA[t.status]} />{t.motivo_recusa && <p className="text-xs text-muted-foreground">Motivo: {t.motivo_recusa}</p>}</TableCell>
              <TableCell className="font-mono text-sm tabular-nums">{formatarDataHora(t.data_anuncio)}<p className="font-sans text-xs text-muted-foreground">{t.anunciado_por}</p></TableCell>
              <TableCell className="whitespace-nowrap text-right">
                {t.pode_solicitar && <Button size="sm" onClick={() => setConfirmar({ acao: 'solicitar', t })}>Solicitar</Button>}
                {t.pode_cancelar && <Button size="sm" variant="ghost" onClick={() => setConfirmar({ acao: 'cancelar', t })}>Cancelar anúncio</Button>}
                {t.status === 'aceito' && <Button size="sm" variant="outline" onClick={() => void inservivelApi.termoTransferencia(t.id).then(abrirArquivo).catch((e) => avisar({ type: 'error', title: 'Não foi possível abrir o termo', message: erroApi(e).mensagem }))}>Termo</Button>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
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
          } catch (e) { avisar({ type: 'error', title: 'Não foi possível concluir', message: erroApi(e).mensagem }); }
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
