import React, { useState } from 'react';
import { AlertTriangle, ArrowLeft, Dices, FileText, Paperclip, Pencil, Plus, Trash2, Trophy, Upload } from 'lucide-react';
import { AlertCard, Button, Card, CardContent, CardHeader, CardTitle, Input, Modal, Skeleton, StatusChip, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@sysgov/ui';
import { EmptyState } from '@/components/ui';
import { erroApi } from '../../escola/api';
import type { Toast } from '../../escola/components/AdminModal';
import { ConfirmarModal } from '../../escola/components/ConfirmarModal';
import { useCarga } from '../../escola/useCarga';
import { inservivelApi, type BemResumo, type Lote, type LoteCard, type StatusLote, type TipoTermo } from '../api';
import {
  abrirArquivo, formatarCentavos, formatarCnpj, formatarData, formatarDataHora, rotuloUnidade, ROTULO_REGRA, ROTULO_TERMO, vazioParaNulo,
  VARIANTE_STATUS_ENTIDADE, VARIANTE_STATUS_LOTE,
} from '../formato';
import { CampoTexto, ChipSituacao, FotoBem } from './Comuns';
import { SeletorBens } from './SeletorBens';

const SORTEADOS: StatusLote[] = ['sorteado', 'entregue', 'baixado'];

/** Tela do lote (spec: Lotes; Sorteio equitativo e auditável; Termos do lote). */
export const LoteDetalhe: React.FC<{ loteId: number; avisar: Toast; onVoltar: () => void }> = ({ loteId, avisar, onVoltar }) => {
  const carga = useCarga(() => inservivelApi.lote(loteId), [loteId]);
  const [patrimonio, setPatrimonio] = useState('');
  const [adicionando, setAdicionando] = useState(false);
  const [selecionar, setSelecionar] = useState(false);
  const [editar, setEditar] = useState(false);
  const [sortear, setSortear] = useState(false);
  const [status, setStatus] = useState<{ valor: StatusLote; rotulo: string } | null>(null);
  const [retirar, setRetirar] = useState<BemResumo | null>(null);
  const [anexar, setAnexar] = useState(false);
  const [excluir, setExcluir] = useState(false);

  if (carga.erro) return <AlertCard priority="danger" title="Não foi possível carregar o lote" description={carga.erro} actionLabel="Voltar" onAction={onVoltar} />;
  if (!carga.dados) return <Skeleton className="h-96 w-full" />;
  const lote = carga.dados;
  const aberto = lote.status === 'aberto';
  const podeEditarBens = lote.permissoes.editar && aberto;
  const sorteado = SORTEADOS.includes(lote.status);

  const executar = async (acao: () => Promise<unknown>, titulo: string, mensagem = `Lote ${lote.numero}`) => {
    try { await acao(); await carga.recarregar(); avisar({ type: 'success', title: titulo, message: mensagem }); } catch (e) { avisar({ type: 'error', title: 'Não foi possível concluir', message: erroApi(e).mensagem }); }
  };
  const abrir = async (baixar: () => Promise<Blob>) => {
    try { abrirArquivo(await baixar()); } catch (e) { avisar({ type: 'error', title: 'Não foi possível abrir o arquivo', message: erroApi(e).mensagem }); }
  };
  const adicionarPatrimonio = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!patrimonio.trim()) return;
    setAdicionando(true);
    await executar(() => inservivelApi.adicionarPorPatrimonio(lote.id, patrimonio.trim()), 'Bem adicionado', `Patrimônio ${patrimonio.trim()}`);
    setPatrimonio('');
    setAdicionando(false);
  };

  return (
    <div className="space-y-4">
      <Button variant="ghost" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={onVoltar}>Voltar aos lotes</Button>

      <Card>
        <CardContent className="space-y-3 py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="font-mono text-2xl font-bold tabular-nums">Lote {lote.numero}</h2>
                <StatusChip label={lote.status_rotulo} variant={VARIANTE_STATUS_LOTE[lote.status]} />
              </div>
              <p className="text-sm text-muted-foreground">{lote.descricao}</p>
              <p className="text-xs text-muted-foreground">Responsável: {lote.responsavel} · criado em <span className="font-mono tabular-nums">{formatarData(lote.data_criacao)}</span>
                {lote.data_sorteio_prevista && <> · sorteio previsto <span className="font-mono tabular-nums">{formatarDataHora(lote.data_sorteio_prevista)}</span></>}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Valor do lote</p>
              <p className="font-mono text-xl font-bold tabular-nums">{formatarCentavos(lote.valor_cents)}</p>
              <p className="text-xs text-muted-foreground"><span className="font-mono tabular-nums">{lote.bens_count}</span> bem(ns)</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 border-t border-border pt-3">
            {lote.permissoes.editar && aberto && <Button variant="outline" leftIcon={<Pencil className="h-4 w-4" />} onClick={() => setEditar(true)}>Editar dados</Button>}
            {lote.permissoes.gerir && lote.proximos_status.map((s) => (
              <Button key={s.valor} variant="outline" onClick={() => setStatus(s)}>{s.valor === 'aberto' ? 'Voltar para Aberto' : `Marcar como ${s.rotulo}`}</Button>
            ))}
            {lote.permissoes.gerir && lote.status === 'publicado' && <Button leftIcon={<Dices className="h-4 w-4" />} onClick={() => setSortear(true)} disabled={lote.inscricoes.length === 0}>Realizar sorteio</Button>}
            {lote.permissoes.gerir && !sorteado && <Button variant="outline" leftIcon={<Trash2 className="h-4 w-4 text-destructive" />} onClick={() => setExcluir(true)}>Excluir lote</Button>}
          </div>
        </CardContent>
      </Card>

      {lote.sorteio && (
        <Card className="border-emerald-300">
          <CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-emerald-600" />Resultado do sorteio</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-lg font-semibold">{lote.sorteio.vencedora.razao_social}</p>
            <p>CNPJ <span className="font-mono tabular-nums">{formatarCnpj(lote.sorteio.vencedora.cnpj)}</span> · realizado em <span className="font-mono tabular-nums">{formatarDataHora(lote.sorteio.data)}</span></p>
            <p>Regra aplicada: <strong>{ROTULO_REGRA[lote.sorteio.regra]}</strong></p>
            {lote.sorteio.semente && <p>Semente: <span className="break-all font-mono text-xs">{lote.sorteio.semente}</span></p>}
            <p className="text-xs text-muted-foreground">Hash de conferência: <span className="break-all font-mono">{lote.sorteio.hash}</span></p>
            <div className="flex flex-wrap gap-2 pt-2">
              {(Object.keys(ROTULO_TERMO) as TipoTermo[]).map((t) => (
                <Button key={t} variant="outline" leftIcon={<FileText className="h-4 w-4" />} onClick={() => void abrir(() => inservivelApi.termoLote(lote.id, t))}>{ROTULO_TERMO[t]}</Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle>Bens do lote</CardTitle>
          {podeEditarBens && (
            <div className="flex flex-wrap gap-2">
              <form className="flex gap-2" onSubmit={adicionarPatrimonio}>
                <Input aria-label="Nº patrimonial para adicionar" placeholder="Nº patrimonial" value={patrimonio} onChange={(e) => setPatrimonio(e.target.value)} className="w-40 font-mono" />
                <Button type="submit" variant="outline" isLoading={adicionando}>Adicionar</Button>
              </form>
              <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setSelecionar(true)}>Selecionar bens</Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {lote.bens.length === 0 ? <EmptyState title="Nenhum bem no lote" description={podeEditarBens ? 'Adicione bens com a situação Inservível.' : undefined} /> : (
            <Table>
              <TableHeader><TableRow><TableHead className="w-14">Foto</TableHead><TableHead>Nº patrimonial</TableHead><TableHead>Descrição</TableHead><TableHead>Secretaria</TableHead><TableHead>Situação</TableHead><TableHead className="text-right">Valor</TableHead>{podeEditarBens && <TableHead className="text-right">Ações</TableHead>}</TableRow></TableHeader>
              <TableBody>
                {lote.bens.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell><FotoBem chave={b.foto_principal_id ? `${b.id}-${b.foto_principal_id}` : null} carregar={() => inservivelApi.foto(b.id, b.foto_principal_id ?? 0)} alt={`Foto do bem ${b.numero_patrimonial}`} className="h-10 w-10" /></TableCell>
                    <TableCell className="font-mono tabular-nums">{b.numero_patrimonial}</TableCell>
                    <TableCell className="max-w-xs truncate">{b.descricao}</TableCell>
                    <TableCell className="text-sm">{rotuloUnidade(b.secretaria, b.setor)}</TableCell>
                    <TableCell><ChipSituacao situacao={b.situacao} /></TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{formatarCentavos(b.valor_referencia_cents)}</TableCell>
                    {podeEditarBens && <TableCell className="text-right"><Button size="icon-sm" variant="ghost" aria-label={`Retirar ${b.numero_patrimonial} do lote`} onClick={() => setRetirar(b)}><Trash2 /></Button></TableCell>}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Entidades inscritas</CardTitle></CardHeader>
        <CardContent>
          {lote.inscricoes.length === 0 ? <p className="text-sm text-muted-foreground">{lote.status === 'publicado' ? 'Nenhuma entidade se inscreveu ainda. As entidades habilitadas se inscrevem pelo portal.' : 'As inscrições abrem quando o lote é publicado.'}</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Entidade</TableHead><TableHead>CNPJ</TableHead><TableHead className="text-right">Lotes recebidos</TableHead><TableHead>Situação</TableHead><TableHead>Inscrita em</TableHead></TableRow></TableHeader>
              <TableBody>
                {lote.inscricoes.map((i) => (
                  <TableRow key={i.entidade_id}>
                    <TableCell>{i.razao_social}
                      {i.bloqueios.length > 0 && <p className="flex items-center gap-1 text-xs text-destructive"><AlertTriangle className="h-3.5 w-3.5" />Documento vencido: {i.bloqueios.map((b) => b.nome).join(', ')} — fica fora do sorteio</p>}
                    </TableCell>
                    <TableCell className="font-mono tabular-nums">{formatarCnpj(i.cnpj)}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{i.lotes_ganhos}</TableCell>
                    <TableCell><StatusChip label={i.status_rotulo} variant={VARIANTE_STATUS_ENTIDADE[i.status]} /></TableCell>
                    <TableCell className="font-mono tabular-nums">{formatarDataHora(i.inscrita_em)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Paperclip className="h-5 w-5 text-primary" />Documentos do lote</CardTitle>
          {lote.permissoes.editar && <Button variant="outline" leftIcon={<Upload className="h-4 w-4" />} onClick={() => setAnexar(true)}>Anexar documento</Button>}
        </CardHeader>
        <CardContent>
          {lote.documentos.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum documento anexado.</p> : (
            <ul className="divide-y divide-border">
              {lote.documentos.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <span className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" />{d.nome}{d.gerado_pelo_sistema && <StatusChip label="Oficial" variant="primary" />}</span>
                  <span className="flex items-center gap-2"><span className="font-mono text-xs tabular-nums text-muted-foreground">{formatarDataHora(d.created_at)}</span>
                    <Button size="sm" variant="ghost" onClick={() => void abrir(() => inservivelApi.documentoLote(lote.id, d.id))}>Abrir</Button></span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <ConfirmarModal aberto={sortear} titulo="Realizar sorteio" rotuloConfirmar="Sortear agora" onFechar={() => setSortear(false)}
        mensagem={<>Sortear o lote <strong>{lote.numero}</strong> entre <strong>{lote.inscricoes.length}</strong> inscrita(s)? Concorrem só as habilitadas e sem documento vencido; o resultado e o relatório oficial ficam registrados e não podem ser desfeitos.</>}
        onConfirmar={() => executar(() => inservivelApi.sortear(lote.id), 'Sorteio realizado')} />
      <ConfirmarModal aberto={status !== null} titulo="Alterar status do lote" onFechar={() => setStatus(null)}
        mensagem={status ? <>Passar o lote <strong>{lote.numero}</strong> para <strong>{status.rotulo}</strong>?{status.valor === 'entregue' && ' Os bens passam à situação Doado.'}{status.valor === 'baixado' && ' Os bens passam à situação Baixado.'}</> : null}
        onConfirmar={() => (status ? executar(() => inservivelApi.alterarStatusLote(lote.id, status.valor), 'Status alterado', status.rotulo) : Promise.resolve())} />
      <ConfirmarModal aberto={retirar !== null} titulo="Retirar bem do lote" perigo rotuloConfirmar="Retirar" onFechar={() => setRetirar(null)}
        mensagem={retirar ? <>Retirar o patrimônio <span className="font-mono">{retirar.numero_patrimonial}</span>? Ele volta à situação Inservível.</> : null}
        onConfirmar={() => (retirar ? executar(() => inservivelApi.retirarBem(lote.id, retirar.id), 'Bem retirado', retirar.numero_patrimonial) : Promise.resolve())} />
      <SelecionarBensModal aberto={selecionar} onFechar={() => setSelecionar(false)}
        onConfirmar={(ids) => executar(() => inservivelApi.adicionarBens(lote.id, ids), 'Bens adicionados', `${ids.length} bem(ns)`).then(() => setSelecionar(false))} />
      <EditarLoteModal lote={editar ? lote : null} onFechar={() => setEditar(false)} onSalvo={() => { setEditar(false); void carga.recarregar(); avisar({ type: 'success', title: 'Lote atualizado', message: lote.numero }); }} />
      <AnexarModal aberto={anexar} onFechar={() => setAnexar(false)}
        onEnviar={(nome, arquivo) => executar(() => inservivelApi.anexarLote(lote.id, nome, arquivo), 'Documento anexado', nome).then(() => setAnexar(false))} />
      <ExcluirLoteModal lote={excluir ? lote : null} onFechar={() => setExcluir(false)} onExcluido={() => { avisar({ type: 'success', title: 'Lote excluído', message: 'Os bens voltaram à situação Inservível.' }); onVoltar(); }} />
    </div>
  );
};

/** Exclusão com a senha do usuário (spec: Lotes). */
export const ExcluirLoteModal: React.FC<{ lote: LoteCard | null; onFechar: () => void; onExcluido: () => void }> = ({ lote, onFechar, onExcluido }) => {
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const fechar = () => { setSenha(''); setErro(null); onFechar(); };
  const confirmar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!lote) return;
    setEnviando(true); setErro(null);
    try { await inservivelApi.excluirLote(lote.id, senha); setSenha(''); onExcluido(); } catch (e) { setErro(erroApi(e).mensagem); } finally { setEnviando(false); }
  };
  return (
    <Modal open={lote !== null} onClose={fechar} title="Excluir lote" size="md"
      footer={<><Button variant="outline" onClick={fechar} disabled={enviando}>Cancelar</Button><Button variant="destructive" type="submit" form="form-excluir-lote" isLoading={enviando} disabled={!senha}>Excluir</Button></>}>
      <form id="form-excluir-lote" onSubmit={confirmar} className="space-y-3 text-sm">
        <p>Excluir o lote <strong className="font-mono">{lote?.numero}</strong>? Os bens voltam à situação Inservível e as inscrições são removidas.</p>
        <Input label="Confirme com a sua senha" type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
        {erro && <AlertCard priority="danger" title="Não foi possível excluir" description={erro} />}
      </form>
    </Modal>
  );
};

const SelecionarBensModal: React.FC<{ aberto: boolean; onFechar: () => void; onConfirmar: (ids: number[]) => Promise<void> }> = ({ aberto, onFechar, onConfirmar }) => {
  const [bens, setBens] = useState<Map<number, BemResumo>>(new Map());
  const [enviando, setEnviando] = useState(false);
  const fechar = () => { setBens(new Map()); onFechar(); };
  return (
    <Modal open={aberto} onClose={fechar} title="Selecionar bens" size="2xl"
      footer={<><Button variant="outline" onClick={fechar}>Cancelar</Button><Button isLoading={enviando} disabled={bens.size === 0}
        onClick={async () => { setEnviando(true); await onConfirmar([...bens.keys()]); setEnviando(false); setBens(new Map()); }}>Adicionar {bens.size > 0 ? `(${bens.size})` : ''}</Button></>}>
      <SeletorBens selecionados={bens} onChange={setBens} />
    </Modal>
  );
};

const EditarLoteModal: React.FC<{ lote: Lote | null; onFechar: () => void; onSalvo: () => void }> = ({ lote, onFechar, onSalvo }) => {
  const [form, setForm] = useState({ numero: '', descricao: '', data_criacao: '', responsavel: '', data_sorteio_prevista: '', observacoes: '' });
  const [atual, setAtual] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  if ((lote?.id ?? null) !== atual) {
    setAtual(lote?.id ?? null);
    if (lote) setForm({ numero: lote.numero, descricao: lote.descricao, data_criacao: lote.data_criacao ?? '', responsavel: lote.responsavel, data_sorteio_prevista: lote.data_sorteio_prevista?.slice(0, 16) ?? '', observacoes: lote.observacoes ?? '' });
    setErro(null);
  }
  const texto = (campo: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [campo]: e.target.value }));
  const salvar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!lote) return;
    setSalvando(true); setErro(null);
    try {
      await inservivelApi.atualizarLote(lote.id, { ...form, data_sorteio_prevista: vazioParaNulo(form.data_sorteio_prevista), observacoes: vazioParaNulo(form.observacoes) });
      onSalvo();
    } catch (e) { setErro(erroApi(e).mensagem); } finally { setSalvando(false); }
  };
  return (
    <Modal open={lote !== null} onClose={onFechar} title="Editar lote" size="xl"
      footer={<><Button variant="outline" onClick={onFechar} disabled={salvando}>Cancelar</Button><Button type="submit" form="form-editar-lote" isLoading={salvando}>Salvar</Button></>}>
      <form id="form-editar-lote" onSubmit={salvar} className="space-y-3">
        {erro && <AlertCard priority="danger" title="Não foi possível salvar" description={erro} />}
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Número *" value={form.numero} onChange={texto('numero')} required className="font-mono" />
          <Input label="Data de criação *" type="date" value={form.data_criacao} onChange={texto('data_criacao')} required className="font-mono" />
          <Input label="Sorteio previsto" type="datetime-local" value={form.data_sorteio_prevista} onChange={texto('data_sorteio_prevista')} className="font-mono" />
        </div>
        <Input label="Responsável *" value={form.responsavel} onChange={texto('responsavel')} required />
        <CampoTexto rotulo="Descrição *" value={form.descricao} onChange={texto('descricao')} required rows={2} />
        <CampoTexto rotulo="Observações" value={form.observacoes} onChange={texto('observacoes')} rows={2} />
      </form>
    </Modal>
  );
};

const AnexarModal: React.FC<{ aberto: boolean; onFechar: () => void; onEnviar: (nome: string, arquivo: File) => Promise<void> }> = ({ aberto, onFechar, onEnviar }) => {
  const [nome, setNome] = useState('');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const fechar = () => { setNome(''); setArquivo(null); onFechar(); };
  return (
    <Modal open={aberto} onClose={fechar} title="Anexar documento ao lote" size="md"
      footer={<><Button variant="outline" onClick={fechar}>Cancelar</Button><Button isLoading={enviando} disabled={!nome.trim() || !arquivo}
        onClick={async () => { if (!arquivo) return; setEnviando(true); await onEnviar(nome.trim(), arquivo); setEnviando(false); setNome(''); setArquivo(null); }}>Enviar</Button></>}>
      <div className="space-y-3">
        <Input label="Nome do documento *" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Termo de entrega assinado" />
        <label className="block space-y-1 text-sm font-medium">Arquivo (PDF, JPEG ou PNG, até 10 MB)
          <input type="file" accept="application/pdf,image/jpeg,image/png" className="block w-full text-sm" onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} />
        </label>
      </div>
    </Modal>
  );
};
