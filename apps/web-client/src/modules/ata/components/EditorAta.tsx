import React, { useEffect, useState } from 'react';
import { ArrowLeft, Bot, CheckCircle2, Download, Eye, Lock, Mic, MicOff, PenLine, Printer, Save, ShieldCheck } from 'lucide-react';
import DOMPurify from 'dompurify';
import { Button, Card, CardContent, Modal, RichTextEditor, Select, StatusChip } from '@sysgov/ui';
import type { Toast } from '../../escola/components/AdminModal';
import { EstadoCarga } from '../../escola/components/AdminModal';
import { useCarga } from '../../escola/useCarga';
import { ataApi, baixarBlob, mensagemDeErro, type AtaDetalhe, type Opcoes } from '../api';
import { VARIANTE_STATUS } from './PainelAtas';
import { AssinarModal } from './AssinarModal';
import { VisualizadorPdf } from './VisualizadorPdf';
import { useDitado } from './useDitado';
import { useGravacaoIa } from './useGravacaoIa';

/** Acrescenta um trecho ditado ao fim do último parágrafo (ou num parágrafo novo). */
export function anexarDitado(html: string, texto: string): string {
  const seguro = texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const fim = html.lastIndexOf('</p>');
  if (fim >= 0 && fim === html.trimEnd().length - 4) return `${html.slice(0, fim)} ${seguro}</p>`;
  return `${html}<p>${seguro}</p>`;
}

/** Texto da IA: o texto anterior fica em vermelho (para revisão) e o gerado entra em preto, como no sistema anterior. */
export function anexarIa(html: string, gerado: string): string {
  const anterior = html.replace(/<p>\s*(<br\s*\/?>)?\s*<\/p>/g, '').trim();
  const marcado = anterior ? `<div style="color: #ef4444">${anterior}</div>` : '';
  return `${marcado}<p><strong>[Texto gerado pelo Assistente IA]</strong></p>${gerado}`;
}

/**
 * Editor da ata — padrão de ata: em redação o texto é livre (escrita, voz, IA); "Salvar rascunho" TRAVA o texto
 * e a ata segue só para Assinar (quem assinou sai da seleção), Preview do PDF, Imprimir e Finalizar e salvar PDF.
 */
export const EditorAta: React.FC<{ id: number; opcoes: Opcoes; avisar: Toast; aoVoltar: () => void }> = ({ id, opcoes, avisar, aoVoltar }) => {
  const carga = useCarga(() => ataApi.obter(id), [id]);
  const [html, setHtml] = useState('');
  const [sujo, setSujo] = useState(false);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [pdf, setPdf] = useState<{ blob: Blob; titulo: string; imprimir: boolean } | null>(null);
  const [assinar, setAssinar] = useState(false);
  const [confirmar, setConfirmar] = useState<'rascunho' | 'finalizar' | null>(null);
  const [modoIa, setModoIa] = useState('2');
  const [avisoIa, setAvisoIa] = useState(false);
  const ata = carga.dados;

  useEffect(() => {
    if (ata) {
      setHtml(ata.conteudo_html ?? '');
      setSujo(false);
    }
  }, [ata]);

  const erro = (e: unknown, titulo = 'Não foi possível concluir') => avisar({ type: 'error', title: titulo, message: mensagemDeErro(e) });
  const atualizar = (nova: AtaDetalhe) => carga.definir(nova);
  const editar = (novo: string) => {
    setHtml(novo);
    setSujo(true);
  };

  const ditado = useDitado((t) => editar(anexarDitado(html, t)), (m) => avisar({ type: 'warning', title: 'Digitação por voz', message: m }));
  const gravacao = useGravacaoIa();

  if (!ata) return <EstadoCarga carregando={carga.carregando} erro={carga.erro} onTentar={() => void carga.recarregar()} />;

  const pendentes = ata.participantes.filter((p) => !p.assinou).length;
  const podeFinalizar = ata.status === 'rascunho' && pendentes === 0;

  const executar = async (rotulo: string, acao: () => Promise<void>) => {
    setOcupado(rotulo);
    try {
      await acao();
    } catch (e) {
      erro(e);
    } finally {
      setOcupado(null);
    }
  };

  const salvarTexto = () => executar('texto', async () => {
    atualizar(await ataApi.salvarTexto(id, html));
    avisar({ type: 'success', title: 'Texto salvo', message: 'Você pode continuar editando.' });
  });

  const salvarRascunho = () => executar('rascunho', async () => {
    setConfirmar(null);
    if (ditado.ativo) ditado.parar();
    atualizar(await ataApi.salvarRascunho(id, html));
    avisar({ type: 'success', title: 'Rascunho salvo', message: 'O texto foi travado. Agora colha as assinaturas e finalize.' });
  });

  const abrirPdf = (imprimir: boolean) => executar(imprimir ? 'imprimir' : 'preview', async () => {
    if (sujo && ata.editavel) atualizar(await ataApi.salvarTexto(id, html));
    const blob = ata.tem_pdf ? await ataApi.pdf(id) : await ataApi.previewPdf(id);
    setPdf({ blob, titulo: ata.tem_pdf ? `Ata nº ${ata.numero}` : 'Preview do PDF (rascunho)', imprimir });
  });

  const finalizar = () => executar('finalizar', async () => {
    setConfirmar(null);
    const nova = await ataApi.finalizar(id);
    atualizar(nova);
    baixarBlob(await ataApi.pdf(id), `ata-${nova.numero.replace('/', '-')}.pdf`);
    avisar({ type: 'success', title: 'Ata finalizada', message: 'O PDF oficial foi gerado, guardado e baixado.' });
  });

  const baixar = () => executar('baixar', async () => baixarBlob(await ataApi.pdf(id), `ata-${ata.numero.replace('/', '-')}.pdf`));

  const iniciarIa = async () => {
    setAvisoIa(false);
    try {
      await gravacao.iniciar();
    } catch (e) {
      avisar({ type: 'error', title: 'Microfone', message: `Não foi possível acessar o microfone: ${(e as Error).message}` });
    }
  };

  const concluirIa = () => executar('ia', async () => {
    const blocos = await gravacao.parar();
    if (blocos.length === 0) return;
    const texto = await ataApi.gerarComIa(id, Number(modoIa), blocos);
    editar(anexarIa(html, texto));
    avisar({ type: 'success', title: 'Assistente IA', message: 'Texto gerado. Revise: o texto anterior ficou em vermelho.' });
  });

  return (
    <div className="space-y-4">
      <Card className="print:hidden">
        <CardContent className="flex flex-wrap items-center gap-2 p-3">
          <Button variant="outline" onClick={aoVoltar}><ArrowLeft className="mr-1 h-4 w-4" />Voltar</Button>
          <div className="mr-auto min-w-0 px-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold tabular-nums">Ata nº {ata.numero}</span>
              <StatusChip label={ata.status_rotulo} variant={VARIANTE_STATUS[ata.status]} />
              {ata.sigilosa && <StatusChip label="Sigilosa" variant="warning" icon={<Lock className="h-3 w-3" />} />}
            </div>
            <div className="truncate text-sm text-muted-foreground">{ata.titulo} · {ata.secretaria.nome}</div>
          </div>

          {ata.editavel && (
            <>
              <Button variant="outline" onClick={() => void salvarTexto()} isLoading={ocupado === 'texto'} disabled={!sujo}><Save className="mr-1 h-4 w-4" />Salvar texto</Button>
              <Button variant="secondary" onClick={() => setConfirmar('rascunho')} isLoading={ocupado === 'rascunho'}><Lock className="mr-1 h-4 w-4" />Salvar rascunho</Button>
            </>
          )}
          {ata.aceita_assinatura && (
            <Button variant="success" onClick={() => setAssinar(true)} disabled={pendentes === 0}><PenLine className="mr-1 h-4 w-4" />Assinar ({pendentes})</Button>
          )}
          <Button variant="outline" onClick={() => void abrirPdf(false)} isLoading={ocupado === 'preview'}><Eye className="mr-1 h-4 w-4" />{ata.tem_pdf ? 'Ver PDF' : 'Preview PDF'}</Button>
          <Button variant="outline" onClick={() => void abrirPdf(true)} isLoading={ocupado === 'imprimir'}><Printer className="mr-1 h-4 w-4" />Imprimir</Button>
          {ata.status !== 'finalizada' ? (
            <Button onClick={() => setConfirmar('finalizar')} disabled={!podeFinalizar} isLoading={ocupado === 'finalizar'}
              title={podeFinalizar ? undefined : ata.status === 'em_redacao' ? 'Salve o rascunho antes de finalizar' : 'Colha todas as assinaturas para finalizar'}>
              <CheckCircle2 className="mr-1 h-4 w-4" />Finalizar e salvar PDF
            </Button>
          ) : (
            <Button onClick={() => void baixar()} isLoading={ocupado === 'baixar'}><Download className="mr-1 h-4 w-4" />Baixar PDF</Button>
          )}
        </CardContent>
      </Card>

      {ata.status === 'rascunho' && (
        <div role="status" className="flex items-start gap-2 rounded-md border border-sky-300 bg-sky-50 p-3 text-sm text-sky-900 dark:bg-sky-950/30 dark:text-sky-200">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Rascunho salvo: o texto está travado e não pode mais ser alterado. {pendentes > 0 ? `Faltam ${pendentes} assinatura(s).` : 'Todas as assinaturas foram colhidas — já é possível finalizar.'}</span>
        </div>
      )}
      {ata.status === 'finalizada' && (
        <div role="status" className="flex items-start gap-2 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Ata finalizada. Código de validação: <span className="font-mono font-semibold">{ata.codigo_validacao}</span></span>
        </div>
      )}

      <Card>
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div className="text-center">
            <h2 className="text-lg font-bold uppercase">{ata.titulo}</h2>
            <p className="text-sm">{ata.secretaria.nome}</p>
            <p className="font-mono text-sm font-semibold tabular-nums">Ata nº {ata.numero}{ata.tipo ? ` · ${ata.tipo.nome}` : ''}</p>
          </div>

          {ata.editavel && (
            <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 p-2">
              <Button variant={ditado.ativo ? 'destructive' : 'outline'} size="sm" onClick={() => (ditado.ativo ? ditado.parar() : ditado.iniciar())} disabled={!ditado.suportado}
                title={ditado.suportado ? undefined : 'Este navegador não oferece digitação por voz'}>
                {ditado.ativo ? <><MicOff className="mr-1 h-4 w-4" />Parar ditado</> : <><Mic className="mr-1 h-4 w-4" />Digitação por voz</>}
              </Button>
              {!gravacao.gravando ? (
                <Button size="sm" onClick={() => setAvisoIa(true)} disabled={!ata.ia_disponivel || ocupado === 'ia'} isLoading={ocupado === 'ia'}
                  title={ata.ia_disponivel ? undefined : 'Assistente IA não configurado neste servidor (GEMINI_API_KEY)'}>
                  <Bot className="mr-1 h-4 w-4" />Assistente IA
                </Button>
              ) : (
                <div className="flex flex-wrap items-center gap-2 rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white" role="status">
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
                  Gravando reunião… <span className="font-mono tabular-nums">{gravacao.tempo}</span>
                  <div className="w-64 text-foreground"><Select value={modoIa} onChange={setModoIa} options={opcoes.modos_ia.map((m) => ({ value: m.valor, label: `${m.valor} — ${m.rotulo}` }))} /></div>
                  <Button size="sm" variant="destructive" onClick={() => void concluirIa()}>Finalizar e resumir</Button>
                  <Button size="sm" variant="ghost" className="text-white" onClick={gravacao.cancelar}>Descartar</Button>
                </div>
              )}
              {!ata.ia_disponivel && <span className="text-xs text-muted-foreground">Assistente IA indisponível: falta configurar a chave no servidor.</span>}
            </div>
          )}

          {ata.editavel ? (
            <RichTextEditor value={html} onChange={editar} minHeight={420} placeholder="Escreva aqui o conteúdo da ata…" />
          ) : (
            // Texto travado: só leitura, sem editor (o disabled do TinyMCE não trava nesta versão). Sanitizado de novo aqui.
            <div aria-label="Texto da ata" aria-readonly="true" className="min-h-[200px] rounded-md border bg-muted/20 p-4 text-justify font-serif leading-relaxed [&_li]:ml-6 [&_ol]:list-decimal [&_p]:mb-2 [&_ul]:list-disc"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />
          )}

          <div className="grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
            <span><strong>Redator:</strong> {ata.redator}</span>
            <span><strong>Local:</strong> {ata.local || '—'}</span>
            <span><strong>Cidade:</strong> {ata.cidade || '—'}</span>
            <span><strong>Reunião:</strong> <span className="font-mono tabular-nums">{ata.data_reuniao ? new Date(ata.data_reuniao).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</span></span>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold">Assinaturas ({ata.participantes.length - pendentes}/{ata.participantes.length})</h3>
            <ul className="grid gap-2 sm:grid-cols-2">
              {ata.participantes.map((p) => (
                <li key={p.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span>{p.nome}{p.cargo && <span className="block text-xs text-muted-foreground">{p.cargo}</span>}</span>
                  <StatusChip label={p.assinou ? 'Assinou' : 'Pendente'} variant={p.assinou ? 'success' : 'neutral'} />
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {assinar && (
        <AssinarModal ataId={id} aoFechar={() => setAssinar(false)} aoAssinar={async (nome) => {
          avisar({ type: 'success', title: 'Assinatura registrada', message: `${nome} assinou a ata.` });
          await carga.recarregar();
        }} />
      )}

      {pdf && <VisualizadorPdf blob={pdf.blob} titulo={pdf.titulo} imprimirAoAbrir={pdf.imprimir} aoFechar={() => setPdf(null)} />}

      <Modal open={avisoIa} onClose={() => setAvisoIa(false)} title="Assistente IA" size="md"
        footer={<><Button variant="outline" onClick={() => setAvisoIa(false)}>Cancelar</Button><Button onClick={() => void iniciarIa()}><Mic className="mr-1 h-4 w-4" />Começar a gravar</Button></>}>
        <p className="text-sm">O áudio da reunião será gravado e enviado ao serviço de IA (Google Gemini) para gerar o texto. O áudio não fica guardado no sistema. Avise os participantes de que a reunião está sendo gravada.</p>
      </Modal>

      <Modal open={confirmar === 'rascunho'} onClose={() => setConfirmar(null)} title="Salvar rascunho?" size="md"
        footer={<><Button variant="outline" onClick={() => setConfirmar(null)}>Continuar editando</Button><Button onClick={() => void salvarRascunho()} isLoading={ocupado === 'rascunho'}><Lock className="mr-1 h-4 w-4" />Salvar e travar o texto</Button></>}>
        <p className="text-sm">Depois de salvo em rascunho, <strong>o texto, os dados e os participantes ficam travados</strong> e não podem mais ser alterados. A ata seguirá apenas para assinaturas e finalização.</p>
      </Modal>

      <Modal open={confirmar === 'finalizar'} onClose={() => setConfirmar(null)} title="Finalizar a ata?" size="md"
        footer={<><Button variant="outline" onClick={() => setConfirmar(null)}>Cancelar</Button><Button onClick={() => void finalizar()} isLoading={ocupado === 'finalizar'}>Sim, finalizar e gerar o PDF</Button></>}>
        <p className="text-sm">O PDF oficial será gerado com o código de validação e a ata <strong>não poderá mais ser alterada nem excluída</strong>.</p>
      </Modal>
    </div>
  );
};
