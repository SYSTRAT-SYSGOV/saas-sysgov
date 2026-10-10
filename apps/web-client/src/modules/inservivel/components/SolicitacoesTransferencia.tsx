import React, { useState } from 'react';
import { Check, ClipboardCheck, FileText, X } from 'lucide-react';
import { AlertCard, Button, Card, CardContent, CardHeader, CardTitle, Modal, Skeleton, StatusChip, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tabs, TabsContent, TabsList, TabsTrigger } from '@sysgov/ui';
import { EmptyState } from '@/components/ui';
import { erroApi } from '../../escola/api';
import { ConfirmarModal } from '../../escola/components/ConfirmarModal';
import { useCarga } from '../../escola/useCarga';
import { inservivelApi, type Transferencia } from '../api';
import { abrirArquivo, formatarDataHora, rotuloUnidade, VARIANTE_TRANSFERENCIA } from '../formato';
import type { PropsAba } from '../ModuloInservivelMain';
import { CampoTexto } from './Comuns';

/** Solicitações de transferência — só o Patrimônio vê e decide (spec: Transferência interna entre secretarias). */
export const SolicitacoesTransferencia: React.FC<PropsAba> = ({ avisar }) => {
  const [escopo, setEscopo] = useState<'solicitacoes' | 'historico'>('solicitacoes');
  const [versao, setVersao] = useState(0);
  const [aprovar, setAprovar] = useState<Transferencia | null>(null);
  const [recusar, setRecusar] = useState<Transferencia | null>(null);
  const lista = useCarga(() => inservivelApi.transferencias(escopo), [escopo, versao]);

  const termo = (t: Transferencia) => void inservivelApi.termoTransferencia(t.id).then(abrirArquivo).catch((e) => avisar({ type: 'error', title: 'Não foi possível abrir o termo', message: erroApi(e).mensagem }));

  const corpo = () => {
    if (lista.erro) return <AlertCard priority="danger" title="Não foi possível carregar" description={lista.erro} actionLabel="Tentar novamente" onAction={() => void lista.recarregar()} />;
    if (!lista.dados) return <Skeleton className="h-64 w-full" />;
    const itens = lista.dados.transferencias;
    if (itens.length === 0) return <EmptyState icon={<ClipboardCheck className="h-8 w-8" />} title={escopo === 'solicitacoes' ? 'Nenhuma solicitação pendente' : 'Nenhuma transferência'} />;
    return (
      <Table>
        <TableHeader><TableRow><TableHead>Bem</TableHead><TableHead>De</TableHead><TableHead>Para</TableHead><TableHead>Solicitado</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
        <TableBody>
          {itens.map((t) => (
            <TableRow key={t.id}>
              <TableCell><span className="font-mono tabular-nums">{t.bem.numero_patrimonial}</span><p className="max-w-xs truncate text-sm">{t.bem.descricao}</p></TableCell>
              <TableCell className="text-sm">{rotuloUnidade(t.origem)}<p className="text-xs text-muted-foreground">{t.anunciado_por}</p></TableCell>
              <TableCell className="text-sm">{rotuloUnidade(t.destino)}<p className="text-xs text-muted-foreground">{t.solicitado_por}</p></TableCell>
              <TableCell className="font-mono text-sm tabular-nums">{formatarDataHora(t.data_solicitacao)}</TableCell>
              <TableCell><StatusChip label={t.status_rotulo} variant={VARIANTE_TRANSFERENCIA[t.status]} />{t.decidido_por && <p className="text-xs text-muted-foreground">por {t.decidido_por}</p>}</TableCell>
              <TableCell className="whitespace-nowrap text-right">
                {t.pode_decidir && (<>
                  <Button size="sm" leftIcon={<Check className="h-4 w-4" />} onClick={() => setAprovar(t)}>Aprovar</Button>
                  <Button size="sm" variant="outline" leftIcon={<X className="h-4 w-4" />} onClick={() => setRecusar(t)} className="ml-1">Recusar</Button>
                </>)}
                {t.status === 'aceito' && <Button size="sm" variant="outline" leftIcon={<FileText className="h-4 w-4" />} onClick={() => termo(t)}>Termo</Button>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
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
          try { await inservivelApi.aprovar(aprovar.id); avisar({ type: 'success', title: 'Transferência aprovada', message: aprovar.bem.numero_patrimonial }); setVersao((v) => v + 1); } catch (e) { avisar({ type: 'error', title: 'Não foi possível aprovar', message: erroApi(e).mensagem }); }
        }} />
      <RecusarModal transferencia={recusar} onFechar={() => setRecusar(null)} onRecusada={() => { avisar({ type: 'success', title: 'Solicitação recusada', message: 'O bem voltou à vitrine.' }); setRecusar(null); setVersao((v) => v + 1); }} />
    </Card>
  );
};

const RecusarModal: React.FC<{ transferencia: Transferencia | null; onFechar: () => void; onRecusada: () => void }> = ({ transferencia, onFechar, onRecusada }) => {
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const fechar = () => { setMotivo(''); setErro(null); onFechar(); };
  const enviar = async () => {
    if (!transferencia) return;
    setEnviando(true); setErro(null);
    try { await inservivelApi.recusar(transferencia.id, motivo.trim()); setMotivo(''); onRecusada(); } catch (e) { setErro(erroApi(e).mensagem); } finally { setEnviando(false); }
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
