import React, { useState } from 'react';
import { AlertTriangle, Building2, CalendarDays, FileText, Package, Trophy, Upload } from 'lucide-react';
import { AlertCard, Button, Card, CardContent, CardHeader, CardTitle, Input, Modal, Skeleton, StatusChip, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tabs, TabsContent, TabsList, TabsTrigger } from '@sysgov/ui';
import { EmptyState } from '@/components/ui';
import { erroApi } from '../../escola/api';
import type { Toast } from '../../escola/components/AdminModal';
import { ConfirmarModal } from '../../escola/components/ConfirmarModal';
import { useCarga } from '../../escola/useCarga';
import { portalApi, type DocumentoExigido, type Entidade, type LotePortal, type TipoTermo } from '../api';
import { CamposEntidadeForm, type FormEntidade } from '../components/CamposEntidadeForm';
import { FotoBem } from '../components/Comuns';
import { dadosEdicao, entidadeParaForm } from '../components/EntidadeFicha';
import {
  abrirArquivo, formatarCentavos, formatarCnpj, formatarData, formatarDataHora, ROTULO_DOCUMENTO, ROTULO_TERMO, textoValidade, VARIANTE_DOCUMENTO,
  VARIANTE_STATUS_ENTIDADE, VARIANTE_STATUS_LOTE,
} from '../formato';

/** Portal da entidade (spec: Portal da entidade; Validade dos documentos; D7, D14). */
export const PortalEntidade: React.FC<{ avisar: Toast }> = ({ avisar }) => {
  const me = useCarga(() => portalApi.me(), []);
  const [aba, setAba] = useState('lotes');
  const [reenviar, setReenviar] = useState<DocumentoExigido | null>(null);

  if (me.erro) return <AlertCard priority="danger" title="Não foi possível abrir o portal" description={me.erro} actionLabel="Tentar novamente" onAction={() => void me.recarregar()} />;
  if (!me.dados) return <Skeleton className="h-96 w-full" />;
  const e = me.dados;
  const exigidoPorTipo = new Map(e.documentos_exigidos.map((d) => [d.chave, d]));

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 py-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase text-muted-foreground">Portal da entidade</p>
              <h1 className="flex items-center gap-2 text-xl font-bold"><Building2 className="h-5 w-5 text-primary" />{e.razao_social}</h1>
              <p className="text-sm text-muted-foreground">{e.nome_fantasia} · CNPJ <span className="font-mono tabular-nums">{formatarCnpj(e.cnpj)}</span></p>
            </div>
            <StatusChip label={e.status_rotulo} variant={VARIANTE_STATUS_ENTIDADE[e.status]} />
          </div>
          {e.mensagem_status && <AlertCard priority={e.status === 'reprovada' || e.status === 'desabilitada' ? 'danger' : 'info'} title="Situação do cadastro" description={e.mensagem_status} />}
          {e.motivo_reprovacao && <AlertCard priority="warning" title="Pendências apontadas pelo Patrimônio" description={e.motivo_reprovacao} />}
          {[...e.alertas_documentos].map((a) => (
            <div key={a.tipo} className={`flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between ${a.vencido ? 'border-destructive/50 bg-destructive/5' : 'border-amber-300 bg-amber-50 dark:bg-amber-950/30'}`} role="alert">
              <p className="flex items-center gap-2 text-sm"><AlertTriangle className={`h-4 w-4 ${a.vencido ? 'text-destructive' : 'text-amber-600'}`} />
                <span><strong>{a.nome}</strong> {textoValidade(a.validade)} (<span className="font-mono tabular-nums">{formatarData(a.validade)}</span>).{a.vencido && ' Enquanto não for atualizado, a entidade não participa dos lotes.'}</span></p>
              <Button size="sm" variant={a.vencido ? 'destructive' : 'outline'} leftIcon={<Upload className="h-4 w-4" />} onClick={() => setReenviar(exigidoPorTipo.get(a.tipo) ?? { chave: a.tipo, nome: a.nome, obrigatorio: true })}>Reenviar</Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Tabs value={aba} onValueChange={setAba}>
        <TabsList><TabsTrigger value="lotes">Lotes</TabsTrigger><TabsTrigger value="documentos">Documentos</TabsTrigger><TabsTrigger value="cadastro">Meu cadastro</TabsTrigger></TabsList>
        <TabsContent value="lotes">{aba === 'lotes' && <LotesPortal entidade={e} avisar={avisar} />}</TabsContent>
        <TabsContent value="documentos">{aba === 'documentos' && <DocumentosPortal entidade={e} avisar={avisar} onReenviar={setReenviar} />}</TabsContent>
        <TabsContent value="cadastro">{aba === 'cadastro' && <CadastroPortal entidade={e} avisar={avisar} onSalvo={me.definir} />}</TabsContent>
      </Tabs>

      <EnviarDocumentoModal documento={reenviar} onFechar={() => setReenviar(null)}
        onEnviado={(n) => { me.definir(n); setReenviar(null); avisar({ type: 'success', title: 'Documento enviado', message: 'Ele volta para análise do Patrimônio.' }); }} />
    </div>
  );
};

const LotesPortal: React.FC<{ entidade: Entidade; avisar: Toast }> = ({ entidade, avisar }) => {
  const [versao, setVersao] = useState(0);
  const lista = useCarga(() => portalApi.lotes(), [versao]);
  const [aberto, setAberto] = useState<number | null>(null);
  const [acao, setAcao] = useState<{ tipo: 'participar' | 'desistir'; lote: LotePortal } | null>(null);
  const bloqueada = entidade.bloqueios.length > 0;

  if (lista.erro) return <AlertCard priority="danger" title="Não foi possível carregar os lotes" description={lista.erro} />;
  if (!lista.dados) return <Skeleton className="h-64 w-full" />;
  if (!lista.dados.liberado) return <AlertCard priority="info" title="Lotes indisponíveis" description={lista.dados.mensagem ?? 'Os lotes ficam disponíveis depois da habilitação.'} />;
  if (lista.dados.lotes.length === 0) return <EmptyState icon={<Package className="h-8 w-8" />} title="Nenhum lote publicado" description="Quando a prefeitura publicar um lote, ele aparece aqui para inscrição." />;

  const abrir = async (loteId: number, tipo: TipoTermo) => {
    try { abrirArquivo(await portalApi.termo(loteId, tipo)); } catch (e) { avisar({ type: 'error', title: 'Não foi possível abrir o termo', message: erroApi(e).mensagem }); }
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {lista.dados.lotes.map((l) => (
        <Card key={l.id} className={`flex flex-col ${l.vencedora ? 'border-emerald-400' : ''}`}>
          <CardContent className="flex flex-1 flex-col gap-3 py-4">
            <div className="flex items-start justify-between"><p className="font-mono text-lg font-bold tabular-nums">Lote {l.numero}</p><StatusChip label={l.status_rotulo} variant={VARIANTE_STATUS_LOTE[l.status]} /></div>
            <p className="line-clamp-2 text-sm text-muted-foreground">{l.descricao}</p>
            <p className="text-sm"><span className="font-mono tabular-nums">{l.bens_count}</span> bem(ns) · <span className="font-mono tabular-nums">{formatarCentavos(l.valor_cents)}</span></p>
            {l.data_sorteio_prevista && <p className="flex items-center gap-1 text-xs text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" />Sorteio previsto: <span className="font-mono tabular-nums">{formatarDataHora(l.data_sorteio_prevista)}</span></p>}
            {l.inscrita && !l.sorteado && <StatusChip label="Inscrita" variant="info" />}
            {l.vencedora && <p className="flex items-center gap-2 font-semibold text-emerald-700"><Trophy className="h-4 w-4" />Sua entidade foi contemplada!</p>}
            {l.sorteado && !l.vencedora && l.inscrita && <p className="text-sm text-muted-foreground">Lote sorteado para outra entidade.</p>}
            <div className="mt-auto flex flex-wrap gap-2 pt-2">
              <Button variant="outline" onClick={() => setAberto(l.id)}>Ver bens</Button>
              {l.pode_participar && !l.inscrita && <Button onClick={() => setAcao({ tipo: 'participar', lote: l })} disabled={bloqueada} title={bloqueada ? 'Documento obrigatório vencido' : undefined}>Participar</Button>}
              {l.pode_participar && l.inscrita && <Button variant="ghost" onClick={() => setAcao({ tipo: 'desistir', lote: l })}>Desistir</Button>}
            </div>
            {l.vencedora && (
              <div className="flex flex-wrap gap-1 border-t border-border pt-2">
                {(Object.keys(ROTULO_TERMO) as TipoTermo[]).map((t) => <Button key={t} size="sm" variant="ghost" leftIcon={<FileText className="h-4 w-4" />} onClick={() => void abrir(l.id, t)}>{ROTULO_TERMO[t]}</Button>)}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
      <BensDoLoteModal loteId={aberto} onFechar={() => setAberto(null)} />
      <ConfirmarModal aberto={acao !== null} titulo={acao?.tipo === 'participar' ? 'Participar do lote' : 'Desistir do lote'} rotuloConfirmar={acao?.tipo === 'participar' ? 'Participar' : 'Desistir'}
        perigo={acao?.tipo === 'desistir'} onFechar={() => setAcao(null)}
        mensagem={acao ? (acao.tipo === 'participar'
          ? <>Inscrever a entidade no lote <strong className="font-mono">{acao.lote.numero}</strong>? Se houver mais de uma inscrita, vence quem recebeu menos lotes; havendo empate, há sorteio auditável.</>
          : <>Retirar a inscrição do lote <strong className="font-mono">{acao.lote.numero}</strong>?</>) : null}
        onConfirmar={async () => {
          if (!acao) return;
          try {
            if (acao.tipo === 'participar') await portalApi.participar(acao.lote.id); else await portalApi.desistir(acao.lote.id);
            avisar({ type: 'success', title: acao.tipo === 'participar' ? 'Inscrição realizada' : 'Inscrição removida', message: `Lote ${acao.lote.numero}` });
            setVersao((v) => v + 1);
          } catch (e) { avisar({ type: 'error', title: 'Não foi possível concluir', message: erroApi(e).mensagem }); }
        }} />
    </div>
  );
};

const BensDoLoteModal: React.FC<{ loteId: number | null; onFechar: () => void }> = ({ loteId, onFechar }) => {
  const carga = useCarga(() => (loteId === null ? Promise.resolve(null) : portalApi.lote(loteId)), [loteId]);
  const l = carga.dados;
  return (
    <Modal open={loteId !== null} onClose={onFechar} title={l ? `Lote ${l.numero}` : 'Lote'} size="2xl" footer={<Button onClick={onFechar}>Fechar</Button>}>
      {carga.erro && <AlertCard priority="danger" title="Não foi possível carregar o lote" description={carga.erro} />}
      {!l && !carga.erro && <Skeleton className="h-64 w-full" />}
      {l && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{l.descricao}</p>
          <Table>
            <TableHeader><TableRow><TableHead className="w-20">Foto</TableHead><TableHead>Patrimônio</TableHead><TableHead>Descrição</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader>
            <TableBody>
              {(l.bens ?? []).map((b) => (
                <TableRow key={b.id}>
                  <TableCell><FotoBem chave={b.foto_principal_id ? `${l.id}-${b.id}-${b.foto_principal_id}` : null} carregar={() => portalApi.foto(l.id, b.id, b.foto_principal_id ?? 0)} alt={`Foto do bem ${b.numero_patrimonial}`} className="h-14 w-14" /></TableCell>
                  <TableCell className="font-mono tabular-nums">{b.numero_patrimonial}</TableCell>
                  <TableCell>{b.descricao}</TableCell>
                  <TableCell className="text-sm">{b.estado_conservacao?.nome ?? '—'}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{formatarCentavos(b.valor_referencia_cents)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Modal>
  );
};

const DocumentosPortal: React.FC<{ entidade: Entidade; avisar: Toast; onReenviar: (d: DocumentoExigido) => void }> = ({ entidade, avisar, onReenviar }) => {
  const ultimo = new Map<string, Entidade['documentos'][number]>();
  [...entidade.documentos].sort((a, b) => b.id - a.id).forEach((d) => { if (!ultimo.has(d.tipo)) ultimo.set(d.tipo, d); });
  const abrir = async (id: number) => {
    try { abrirArquivo(await portalApi.documento(id)); } catch (e) { avisar({ type: 'error', title: 'Não foi possível abrir', message: erroApi(e).mensagem }); }
  };
  return (
    <Card>
      <CardHeader><CardTitle>Documentos da entidade</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>Documento</TableHead><TableHead>Enviado</TableHead><TableHead>Validade</TableHead><TableHead>Análise</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {entidade.documentos_exigidos.map((ex) => {
              const d = ultimo.get(ex.chave);
              return (
                <TableRow key={ex.chave}>
                  <TableCell>{ex.nome}{ex.obrigatorio ? ' *' : ''}{d?.observacao_prefeitura && <p className="text-xs text-muted-foreground">Prefeitura: {d.observacao_prefeitura}</p>}</TableCell>
                  <TableCell className="font-mono tabular-nums">{d ? formatarData(d.data_envio) : '—'}</TableCell>
                  <TableCell className="font-mono tabular-nums">{d?.validade ? <>{formatarData(d.validade)}<span className="block font-sans text-xs text-muted-foreground">{textoValidade(d.validade)}</span></> : '—'}</TableCell>
                  <TableCell>{d ? <StatusChip label={ROTULO_DOCUMENTO[d.situacao]} variant={VARIANTE_DOCUMENTO[d.situacao]} /> : <StatusChip label="Não enviado" variant={ex.obrigatorio ? 'danger' : 'neutral'} />}</TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    {d && <Button size="sm" variant="ghost" onClick={() => void abrir(d.id)}>Abrir</Button>}
                    <Button size="sm" variant="outline" leftIcon={<Upload className="h-4 w-4" />} onClick={() => onReenviar(ex)}>{d ? 'Reenviar' : 'Enviar'}</Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

const CadastroPortal: React.FC<{ entidade: Entidade; avisar: Toast; onSalvo: (e: Entidade) => void }> = ({ entidade, avisar, onSalvo }) => {
  const [form, setForm] = useState<FormEntidade>(entidadeParaForm(entidade));
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const salvar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSalvando(true); setErro(null);
    try { onSalvo(await portalApi.atualizar(dadosEdicao(form, false))); avisar({ type: 'success', title: 'Cadastro atualizado', message: entidade.razao_social }); } catch (e) { setErro(erroApi(e).mensagem); } finally { setSalvando(false); }
  };
  return (
    <Card>
      <CardContent className="py-4">
        <form onSubmit={salvar} className="space-y-4">
          <p className="text-xs text-muted-foreground">CNPJ e e-mail de acesso não mudam por aqui; fale com o Patrimônio se precisar. O CPF atual é {entidade.cpf_representante_mascarado}; preencha só para trocar.</p>
          <CamposEntidadeForm form={form} onChange={setForm} bloquear={['cnpj', 'email']} cpfOpcional />
          {erro && <AlertCard priority="danger" title="Não foi possível salvar" description={erro} />}
          <div className="flex justify-end"><Button type="submit" isLoading={salvando}>Salvar alterações</Button></div>
        </form>
      </CardContent>
    </Card>
  );
};

const EnviarDocumentoModal: React.FC<{ documento: DocumentoExigido | null; onFechar: () => void; onEnviado: (e: Entidade) => void }> = ({ documento, onFechar, onEnviado }) => {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [validade, setValidade] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const fechar = () => { setArquivo(null); setValidade(''); setErro(null); onFechar(); };
  const enviar = async () => {
    if (!documento || !arquivo) return;
    setEnviando(true); setErro(null);
    try { onEnviado(await portalApi.enviarDocumento(documento.chave, arquivo, validade || null)); setArquivo(null); setValidade(''); } catch (e) { setErro(erroApi(e).mensagem); } finally { setEnviando(false); }
  };
  return (
    <Modal open={documento !== null} onClose={fechar} title={`Enviar: ${documento?.nome ?? ''}`} size="md"
      footer={<><Button variant="outline" onClick={fechar} disabled={enviando}>Cancelar</Button><Button onClick={() => void enviar()} isLoading={enviando} disabled={!arquivo}>Enviar</Button></>}>
      <div className="space-y-3">
        <label className="block space-y-1 text-sm font-medium">Arquivo (PDF, JPEG ou PNG, até 5 MB)
          <input type="file" accept="application/pdf,image/jpeg,image/png" className="block w-full text-sm font-normal" onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} />
        </label>
        <Input label="Validade do documento (se houver)" type="date" value={validade} onChange={(e) => setValidade(e.target.value)} className="font-mono" />
        {erro && <AlertCard priority="danger" title="Não foi possível enviar" description={erro} />}
      </div>
    </Modal>
  );
};
