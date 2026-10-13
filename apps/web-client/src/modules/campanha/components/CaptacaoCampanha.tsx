import React, { useState } from 'react';
import { Copy, Link2, Plus, Printer, QrCode, Trash2 } from 'lucide-react';
import { AlertCard, Button, Card, CardContent, Input, Modal, Select, Skeleton, Switch, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@sysgov/ui';
import { EmptyState } from '@/components/ui';
import { erroApi } from '../../escola/api';
import { ConfirmarModal } from '../../escola/components/ConfirmarModal';
import { useCarga } from '../../escola/useCarga';
import { campanhaApi, type CampanhaAtual, type LinkCaptacao } from '../api';
import { formatarNumero } from '../formato';
import type { PropsAba } from '../ModuloCampanhaMain';
import { vazioParaNulo } from './Comuns';

const escapar = (t: string): string => t.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
const svgComoImagem = (svg: string): string => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

/** Cartão para imprimir (janela própria, sem o painel em volta): candidato, chamada, QR e endereço. */
function imprimirCartao(link: LinkCaptacao, svg: string, campanha: CampanhaAtual): void {
  const janela = window.open('', '_blank', 'width=480,height=640');
  if (!janela) return;
  const quem = campanha.candidato?.nome_urna ?? campanha.nome;
  const numero = campanha.candidato?.numero ? ` · ${campanha.candidato.numero}` : '';
  janela.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Cartão de cadastro</title>
<style>body{font-family:Inter,Arial,sans-serif;margin:0;display:flex;justify-content:center}
.cartao{width:9cm;border:1px solid #cbd5e1;border-radius:10px;padding:16px;text-align:center;margin:16px}
h1{font-size:18px;margin:0;color:#0c326f}p{font-size:12px;margin:6px 0;color:#334155}img{width:6cm;height:6cm}
.url{font-family:monospace;font-size:9px;word-break:break-all;color:#64748b}@media print{.cartao{margin:0}}</style></head>
<body><div class="cartao"><h1>${escapar(quem)}${escapar(numero)}</h1><p>${escapar(campanha.cargo)} · ${campanha.ano}</p>
<p><strong>Apoie! Aponte a câmera do celular e faça seu cadastro.</strong></p><img src="${svgComoImagem(svg)}" alt="QR Code">
<p>Indicação: ${escapar(link.responsavel)}</p><p class="url">${escapar(link.url)}</p></div>
<script>window.onload=function(){window.print()}</script></body></html>`);
  janela.document.close();
}

/** Links de captação por coordenador ou cabo, com QR Code, cartão e contagem (spec: Links de captação de eleitores). */
export const CaptacaoCampanha: React.FC<PropsAba> = ({ campanha, avisar, alterou, versao }) => {
  const dados = useCarga(() => campanhaApi.links(), [campanha.id, versao]);
  const [novo, setNovo] = useState(false);
  const [qr, setQr] = useState<{ link: LinkCaptacao; svg: string } | null>(null);
  const [excluir, setExcluir] = useState<LinkCaptacao | null>(null);

  if (dados.erro) return <AlertCard priority="danger" title="Não foi possível carregar os links" description={dados.erro} actionLabel="Tentar novamente" onAction={() => void dados.recarregar()} />;
  if (!dados.dados) return <Skeleton className="h-64 w-full" />;

  const mostrarQr = async (link: LinkCaptacao) => {
    try { setQr({ link, svg: await campanhaApi.qrcode(link.id) }); } catch (e) { avisar({ type: 'error', title: 'Não foi possível gerar o QR Code', message: erroApi(e).mensagem }); }
  };
  const copiar = async (link: LinkCaptacao) => {
    try { await navigator.clipboard.writeText(link.url); avisar({ type: 'success', title: 'Link copiado', message: link.responsavel }); } catch { avisar({ type: 'error', title: 'Não foi possível copiar', message: link.url }); }
  };
  const alternar = async (link: LinkCaptacao, ativo: boolean) => {
    try { await campanhaApi.atualizarLink(link.id, { ativo }); alterou(); } catch (e) { avisar({ type: 'error', title: 'Não foi possível alterar o link', message: erroApi(e).mensagem }); }
  };

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-muted-foreground">Cada coordenador ou cabo eleitoral divulga o seu link (ou o QR Code). O eleitor se cadastra pelo celular, aceitando o termo de privacidade da campanha.</p>
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setNovo(true)}>Novo link</Button>
        </div>
        {dados.dados.length === 0 ? <EmptyState icon={<Link2 className="h-8 w-8" />} title="Nenhum link de captação" description="Crie um link para um coordenador ou cabo eleitoral." /> : (
          <Table>
            <TableHeader><TableRow><TableHead>Responsável</TableHead><TableHead>Descrição</TableHead><TableHead>Código</TableHead><TableHead className="text-right">Cadastros</TableHead><TableHead>Ativo</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
            <TableBody>
              {dados.dados.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.responsavel}<p className="text-xs text-muted-foreground">{l.tipo === 'cabo' ? 'Cabo eleitoral' : 'Coordenador'}</p></TableCell>
                  <TableCell className="text-sm">{l.descricao ?? '—'}</TableCell>
                  <TableCell className="font-mono text-xs tabular-nums">{l.codigo}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{formatarNumero(l.cadastros)}</TableCell>
                  <TableCell><Switch checked={l.ativo} onCheckedChange={(v) => void alternar(l, v)} label={`Link de ${l.responsavel} ativo`} /></TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    <Button size="icon-sm" variant="ghost" aria-label={`QR Code de ${l.responsavel}`} onClick={() => void mostrarQr(l)}><QrCode /></Button>
                    <Button size="icon-sm" variant="ghost" aria-label={`Copiar link de ${l.responsavel}`} onClick={() => void copiar(l)}><Copy /></Button>
                    {l.cadastros === 0 && <Button size="icon-sm" variant="ghost" aria-label={`Excluir link de ${l.responsavel}`} onClick={() => setExcluir(l)}><Trash2 /></Button>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <NovoLinkModal aberto={novo} campanhaId={campanha.id} onFechar={() => setNovo(false)} onSalvo={(l) => { setNovo(false); avisar({ type: 'success', title: 'Link criado', message: l.responsavel }); alterou(); }} />
      <Modal open={qr !== null} onClose={() => setQr(null)} title="QR Code de captação" icon={<QrCode className="h-5 w-5" />}
        footer={<><Button variant="outline" onClick={() => setQr(null)}>Fechar</Button>{qr && <Button leftIcon={<Printer className="h-4 w-4" />} onClick={() => imprimirCartao(qr.link, qr.svg, campanha)}>Imprimir cartão</Button>}</>}>
        {qr && (
          <div className="space-y-2 text-center">
            <img src={svgComoImagem(qr.svg)} alt={`QR Code do link de ${qr.link.responsavel}`} className="mx-auto h-56 w-56" />
            <p className="text-sm">{qr.link.responsavel}{qr.link.descricao ? ` — ${qr.link.descricao}` : ''}</p>
            <p className="break-all font-mono text-xs text-muted-foreground">{qr.link.url}</p>
          </div>
        )}
      </Modal>
      <ConfirmarModal aberto={excluir !== null} titulo="Excluir link" mensagem={<>Excluir o link de <strong>{excluir?.responsavel}</strong>? Ele deixa de funcionar.</>} rotuloConfirmar="Excluir" perigo onFechar={() => setExcluir(null)}
        onConfirmar={async () => {
          if (!excluir) return;
          try { await campanhaApi.excluirLink(excluir.id); alterou(); } catch (e) { avisar({ type: 'error', title: 'Não foi possível excluir', message: erroApi(e).mensagem }); }
        }} />
    </Card>
  );
};

const NovoLinkModal: React.FC<{ aberto: boolean; campanhaId: number; onFechar: () => void; onSalvo: (l: LinkCaptacao) => void }> = ({ aberto, campanhaId, onFechar, onSalvo }) => {
  const equipe = useCarga(async () => (aberto ? Promise.all([campanhaApi.coordenadores(), campanhaApi.cabos()]) : null), [campanhaId, aberto]);
  const [tipo, setTipo] = useState<'cabo' | 'coordenador'>('cabo');
  const [responsavel, setResponsavel] = useState<number | null>(null);
  const [descricao, setDescricao] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [coordenadores, cabos] = equipe.dados ?? [[], []];
  const opcoes = (tipo === 'cabo' ? cabos : coordenadores).map((p) => ({ value: p.id, label: p.nome }));

  const salvar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (responsavel === null) { setErro('Escolha o responsável.'); return; }
    setSalvando(true);
    setErro(null);
    try {
      const link = await campanhaApi.criarLink({ tipo, ...(tipo === 'cabo' ? { cabo_id: responsavel } : { coordenador_id: responsavel }), descricao: vazioParaNulo(descricao) });
      setResponsavel(null);
      setDescricao('');
      onSalvo(link);
    } catch (e) {
      setErro(erroApi(e).mensagem);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal open={aberto} onClose={onFechar} title="Novo link de captação" icon={<Link2 className="h-5 w-5" />}
      footer={<><Button variant="outline" onClick={onFechar} disabled={salvando}>Cancelar</Button><Button type="submit" form="form-link" isLoading={salvando}>Criar link</Button></>}>
      <form id="form-link" onSubmit={salvar} className="space-y-3">
        <Select label="Tipo de responsável" value={tipo} onChange={(v) => { setTipo(v as 'cabo' | 'coordenador'); setResponsavel(null); }} options={[{ value: 'cabo', label: 'Cabo eleitoral' }, { value: 'coordenador', label: 'Coordenador' }]} />
        <Select label="Responsável *" value={responsavel} placeholder={opcoes.length ? 'Escolha' : 'Cadastre a equipe antes'} loading={equipe.dados === null} onChange={(v) => setResponsavel(Number(v))} options={opcoes} />
        <Input label="Descrição (opcional)" placeholder="Ex.: Feira do bairro" value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={150} />
        {erro && <p className="text-sm font-medium text-destructive" role="alert">{erro}</p>}
      </form>
    </Modal>
  );
};
