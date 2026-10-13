import React, { useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Download, FileText, Paperclip, Pencil, Plus, Trash2, Wallet } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertCard, Button, Card, CardContent, CardHeader, CardTitle, Input, KpiCard, Modal, Select, Skeleton, StatusChip, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Textarea } from '@sysgov/ui';
import { EmptyState } from '@/components/ui';
import { formatarCentavos, paraCentavos } from '@/lib/formatacao';
import { erroApi } from '../../escola/api';
import { ConfirmarModal } from '../../escola/components/ConfirmarModal';
import { useCarga } from '../../escola/useCarga';
import { campanhaApi, type FiltrosFinanceiro, type Lancamento, type MunicipioLinha, type OpcoesFinanceiro, type TipoLancamento } from '../api';
import { abrirArquivo, formatarData, formatarDocumento, salvarArquivo } from '../formato';
import type { PropsAba } from '../ModuloCampanhaMain';
import { SelectMunicipio, nomeDoMunicipio, useMunicipiosDaCampanha, vazioParaNulo } from './Comuns';

const opcoesDe = (r: Record<string, string>) => Object.entries(r).map(([value, label]) => ({ value, label }));

/** Livro-caixa com os campos da prestação de contas (spec: Livro-caixa…; Comprovantes anexados). Só com financeiro.view. */
export const FinanceiroCampanha: React.FC<PropsAba> = ({ campanha, permissoes, avisar, alterou, versao }) => {
  const municipios = useMunicipiosDaCampanha(campanha.id);
  const opcoes = useCarga(() => campanhaApi.opcoesFinanceiro(), [campanha.id]);
  const [filtros, setFiltros] = useState<FiltrosFinanceiro>({ pagina: 1 });
  const chave = JSON.stringify(filtros);
  const resumo = useCarga(() => campanhaApi.resumoFinanceiro({ ...filtros, pagina: undefined }), [campanha.id, versao, chave]);
  const lista = useCarga(() => campanhaApi.lancamentos(filtros), [campanha.id, versao, chave]);
  const [editando, setEditando] = useState<Lancamento | 'novo' | null>(null);
  const [excluir, setExcluir] = useState<Lancamento | null>(null);
  const [exportando, setExportando] = useState(false);
  const mudar = (parcial: Partial<FiltrosFinanceiro>) => setFiltros((f) => ({ ...f, ...parcial, pagina: 1 }));

  if (opcoes.erro) return <AlertCard priority="danger" title="Não foi possível abrir o financeiro" description={opcoes.erro} actionLabel="Tentar novamente" onAction={() => void opcoes.recarregar()} />;
  if (!opcoes.dados) return <Skeleton className="h-96 w-full" />;
  const o = opcoes.dados;
  const rotuloCategoria = (l: Lancamento) => o.categorias[l.tipo]?.[l.categoria] ?? l.categoria;

  const exportar = async () => {
    setExportando(true);
    try { salvarArquivo(await campanhaApi.exportarFinanceiro(filtros), `livro-caixa-${new Date().toISOString().slice(0, 10)}.csv`); } catch (e) { avisar({ type: 'error', title: 'Não foi possível exportar', message: erroApi(e).mensagem }); } finally { setExportando(false); }
  };
  const verComprovante = async (l: Lancamento) => {
    try { abrirArquivo(await campanhaApi.comprovante(l.id)); } catch (e) { avisar({ type: 'error', title: 'Não foi possível abrir o comprovante', message: erroApi(e).mensagem }); }
  };
  const r = resumo.dados;
  const pagina = lista.dados?.pagina ?? 1;
  const paginas = lista.dados ? Math.max(1, Math.ceil(lista.dados.total / lista.dados.por_pagina)) : 1;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard title="Receitas" value={r ? formatarCentavos(r.receitas_centavos) : '…'} icon={<ArrowUpCircle className="h-5 w-5" />} className="font-mono tabular-nums" />
        <KpiCard title="Despesas" value={r ? formatarCentavos(r.despesas_centavos) : '…'} icon={<ArrowDownCircle className="h-5 w-5" />} className="font-mono tabular-nums" />
        <KpiCard title="Saldo em caixa" value={r ? formatarCentavos(r.saldo_centavos) : '…'} subtitle={r ? `${r.lancamentos} lançamento(s)` : undefined} icon={<Wallet className="h-5 w-5" />} className="font-mono tabular-nums" />
      </div>

      {r && r.por_categoria.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Despesas por categoria</CardTitle></CardHeader>
            <CardContent className="h-64 text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={r.por_categoria.filter((c) => c.tipo === 'despesa')} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => formatarCentavos(Number(v)).replace(',00', '')} />
                  <YAxis type="category" dataKey="rotulo" tick={{ fontSize: 11 }} width={150} />
                  <Tooltip formatter={(v) => formatarCentavos(Number(v))} contentStyle={{ fontSize: 12 }} />
                  <Bar dataKey="total_centavos" name="Despesa" fill="#e52207" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Receitas por origem do recurso</CardTitle></CardHeader>
            <CardContent>
              {r.por_origem.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma receita no período.</p> : (
                <Table><TableBody>{r.por_origem.map((x) => <TableRow key={x.origem ?? 'sem'}><TableCell>{x.rotulo}</TableCell><TableCell className="text-right font-mono tabular-nums">{formatarCentavos(x.total_centavos)}</TableCell></TableRow>)}</TableBody></Table>
              )}
              <p className="mt-3 text-xs font-semibold text-muted-foreground">Por centro de custo</p>
              <Table><TableBody>{r.por_municipio.slice(0, 6).map((m) => <TableRow key={m.codigo_ibge ?? 0}><TableCell>{m.municipio}</TableCell><TableCell className="text-right font-mono text-xs tabular-nums text-muted-foreground">+{formatarCentavos(m.receitas_centavos)}</TableCell><TableCell className="text-right font-mono tabular-nums">−{formatarCentavos(m.despesas_centavos)}</TableCell></TableRow>)}</TableBody></Table>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardContent className="space-y-3 py-4">
          <div className="grid items-end gap-2 md:grid-cols-3 xl:grid-cols-[9rem_9rem_9rem_12rem_14rem_1fr]">
            <Input label="De" type="date" value={filtros.de ?? ''} onChange={(e) => mudar({ de: e.target.value || undefined })} />
            <Input label="Até" type="date" value={filtros.ate ?? ''} onChange={(e) => mudar({ ate: e.target.value || undefined })} />
            <Select label="Tipo" value={filtros.tipo ?? 'todos'} onChange={(v) => mudar({ tipo: v === 'todos' ? undefined : (v as TipoLancamento), categoria: undefined })} options={[{ value: 'todos', label: 'Todos' }, { value: 'receita', label: 'Receitas' }, { value: 'despesa', label: 'Despesas' }]} />
            <Select label="Origem do recurso" value={filtros.origem_recurso ?? 'todas'} onChange={(v) => mudar({ origem_recurso: v === 'todas' ? undefined : String(v) })} options={[{ value: 'todas', label: 'Todas' }, ...opcoesDe(o.origens)]} />
            <Select label="Centro de custo" value={filtros.codigo_ibge ?? 'todos'} onChange={(v) => mudar({ codigo_ibge: v === 'todos' ? undefined : Number(v) })}
              options={[{ value: 'todos', label: 'Todos' }, { value: 0, label: 'Campanha geral' }, ...(municipios.dados ?? []).map((m) => ({ value: m.codigo_ibge, label: m.nome }))]} />
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" leftIcon={<Download className="h-4 w-4" />} isLoading={exportando} onClick={() => void exportar()}>Planilha (TSE)</Button>
              {permissoes.financeiroGerir && <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setEditando('novo')}>Lançar</Button>}
            </div>
          </div>
          {lista.erro ? <AlertCard priority="danger" title="Não foi possível carregar o extrato" description={lista.erro} actionLabel="Tentar novamente" onAction={() => void lista.recarregar()} />
            : !lista.dados ? <Skeleton className="h-48 w-full" />
              : lista.dados.total === 0 ? <EmptyState icon={<Wallet className="h-8 w-8" />} title="Nenhum lançamento" description="Registre as receitas e despesas da campanha." />
                : (
                  <>
                    <Table>
                      <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Tipo</TableHead><TableHead>Categoria</TableHead><TableHead>Doador / fornecedor</TableHead><TableHead>Centro de custo</TableHead><TableHead>Documento</TableHead><TableHead className="text-right">Valor</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {lista.dados.lancamentos.map((l) => (
                          <TableRow key={l.id}>
                            <TableCell className="font-mono text-sm tabular-nums">{formatarData(l.data)}</TableCell>
                            <TableCell><StatusChip variant={l.tipo === 'receita' ? 'success' : 'danger'} label={l.tipo === 'receita' ? 'Receita' : 'Despesa'} /></TableCell>
                            <TableCell className="text-sm">{rotuloCategoria(l)}{l.origem_recurso && <p className="text-xs text-muted-foreground">{o.origens[l.origem_recurso]}</p>}</TableCell>
                            <TableCell className="text-sm">{l.contraparte_nome ?? '—'}{l.contraparte_documento && <p className="font-mono text-xs tabular-nums text-muted-foreground">{formatarDocumento(l.contraparte_documento)}</p>}</TableCell>
                            <TableCell className="text-sm">{l.codigo_ibge ? nomeDoMunicipio(municipios.dados, l.codigo_ibge) : 'Campanha geral'}</TableCell>
                            <TableCell className="font-mono text-xs tabular-nums">{l.tipo === 'receita' ? (l.recibo_eleitoral ?? '—') : [l.documento_fiscal_tipo ? o.documentos_fiscais[l.documento_fiscal_tipo] : null, l.documento_fiscal_numero].filter(Boolean).join(' ') || '—'}</TableCell>
                            <TableCell className={`text-right font-mono tabular-nums ${l.tipo === 'despesa' ? 'text-destructive' : ''}`}>{l.tipo === 'despesa' ? '−' : ''}{formatarCentavos(l.valor_centavos)}</TableCell>
                            <TableCell className="whitespace-nowrap text-right">
                              {l.tem_comprovante && <Button size="icon-sm" variant="ghost" aria-label="Ver comprovante" onClick={() => void verComprovante(l)}><FileText /></Button>}
                              <Button size="icon-sm" variant="ghost" aria-label="Abrir lançamento" onClick={() => setEditando(l)}><Pencil /></Button>
                              {permissoes.financeiroGerir && <Button size="icon-sm" variant="ghost" aria-label="Excluir lançamento" onClick={() => setExcluir(l)}><Trash2 /></Button>}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
                      <Button size="sm" variant="outline" disabled={pagina <= 1} onClick={() => setFiltros((f) => ({ ...f, pagina: pagina - 1 }))}>Anterior</Button>
                      <span className="font-mono tabular-nums">{pagina} / {paginas}</span>
                      <Button size="sm" variant="outline" disabled={pagina >= paginas} onClick={() => setFiltros((f) => ({ ...f, pagina: pagina + 1 }))}>Próxima</Button>
                    </div>
                  </>
                )}
        </CardContent>
      </Card>

      <LancamentoModal registro={editando} opcoes={o} municipios={municipios.dados} somenteLeitura={!permissoes.financeiroGerir} avisar={avisar}
        onFechar={() => setEditando(null)} onSalvo={() => { setEditando(null); avisar({ type: 'success', title: 'Lançamento salvo', message: 'O livro-caixa foi atualizado.' }); alterou(); }} />
      <ConfirmarModal aberto={excluir !== null} titulo="Excluir lançamento" perigo rotuloConfirmar="Excluir"
        mensagem={<>Excluir o lançamento de <strong className="font-mono">{excluir ? formatarCentavos(excluir.valor_centavos) : ''}</strong>? O comprovante fica guardado.</>}
        onFechar={() => setExcluir(null)}
        onConfirmar={async () => {
          if (!excluir) return;
          try { await campanhaApi.excluirLancamento(excluir.id); alterou(); } catch (e) { avisar({ type: 'error', title: 'Não foi possível excluir', message: erroApi(e).mensagem }); }
        }} />
    </div>
  );
};

const VAZIO = { tipo: 'despesa' as TipoLancamento, categoria: '', valor: '', data: new Date().toISOString().slice(0, 10), forma_pagamento: 'pix', codigo_ibge: null as number | null, contraparte_nome: '', contraparte_documento: '', origem_recurso: '', recibo_eleitoral: '', documento_fiscal_tipo: '', documento_fiscal_numero: '', observacoes: '' };

const LancamentoModal: React.FC<{ registro: Lancamento | 'novo' | null; opcoes: OpcoesFinanceiro; municipios: MunicipioLinha[] | null; somenteLeitura: boolean; avisar: PropsAba['avisar']; onFechar: () => void; onSalvo: () => void }> = ({ registro, opcoes, municipios, somenteLeitura, avisar, onFechar, onSalvo }) => {
  const [form, setForm] = useState(VAZIO);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [atual, setAtual] = useState<Lancamento | 'novo' | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  if (registro !== atual) {
    setAtual(registro);
    setForm(registro && registro !== 'novo' ? {
      tipo: registro.tipo, categoria: registro.categoria, valor: formatarCentavos(registro.valor_centavos).replace('R$ ', ''), data: registro.data, forma_pagamento: registro.forma_pagamento,
      codigo_ibge: registro.codigo_ibge, contraparte_nome: registro.contraparte_nome ?? '', contraparte_documento: registro.contraparte_documento ?? '', origem_recurso: registro.origem_recurso ?? '',
      recibo_eleitoral: registro.recibo_eleitoral ?? '', documento_fiscal_tipo: registro.documento_fiscal_tipo ?? '', documento_fiscal_numero: registro.documento_fiscal_numero ?? '', observacoes: registro.observacoes ?? '',
    } : VAZIO);
    setArquivo(null);
    setErro(null);
  }
  const texto = (campo: keyof typeof VAZIO) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [campo]: e.target.value }));
  const receita = form.tipo === 'receita';
  const ro = somenteLeitura;

  const salvar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const valor = paraCentavos(form.valor);
    if (!valor) { setErro('Informe o valor em reais (ex.: 1.250,00).'); return; }
    if (!form.categoria) { setErro('Escolha a categoria.'); return; }
    setSalvando(true);
    setErro(null);
    try {
      const salvo = await campanhaApi.salvarLancamento(registro && registro !== 'novo' ? registro.id : null, {
        tipo: form.tipo, categoria: form.categoria, valor_centavos: valor, data: form.data, forma_pagamento: form.forma_pagamento, codigo_ibge: form.codigo_ibge,
        contraparte_nome: vazioParaNulo(form.contraparte_nome), contraparte_documento: vazioParaNulo(form.contraparte_documento), origem_recurso: form.origem_recurso || null,
        recibo_eleitoral: receita ? vazioParaNulo(form.recibo_eleitoral) : null, documento_fiscal_tipo: receita ? null : form.documento_fiscal_tipo || null,
        documento_fiscal_numero: receita ? null : vazioParaNulo(form.documento_fiscal_numero), observacoes: vazioParaNulo(form.observacoes),
      });
      if (arquivo) {
        try { await campanhaApi.enviarComprovante(salvo.id, arquivo); } catch (e) { avisar({ type: 'error', title: 'Lançamento salvo, mas o comprovante não foi enviado', message: erroApi(e).mensagem }); }
      }
      onSalvo();
    } catch (e) {
      setErro(erroApi(e).mensagem);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal open={registro !== null} onClose={onFechar} title={registro === 'novo' ? 'Lançamento de caixa' : 'Lançamento'} icon={<Wallet className="h-5 w-5" />} size="lg"
      footer={<><Button variant="outline" onClick={onFechar} disabled={salvando}>{ro ? 'Fechar' : 'Cancelar'}</Button>{!ro && <Button type="submit" form="form-lancamento" isLoading={salvando}>Salvar</Button>}</>}>
      <form id="form-lancamento" onSubmit={salvar} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-4">
          <Select label="Tipo *" value={form.tipo} disabled={ro} onChange={(v) => setForm((f) => ({ ...f, tipo: v as TipoLancamento, categoria: '' }))} options={[{ value: 'despesa', label: 'Despesa (saída)' }, { value: 'receita', label: 'Receita (entrada)' }]} />
          <Select label="Categoria *" value={form.categoria || null} placeholder="Escolha" disabled={ro} onChange={(v) => setForm((f) => ({ ...f, categoria: String(v) }))} options={opcoesDe(opcoes.categorias[form.tipo])} />
          <Input label="Valor (R$) *" value={form.valor} onChange={texto('valor')} inputMode="decimal" required disabled={ro} className="font-mono tabular-nums" />
          <Input label="Data *" type="date" value={form.data} onChange={texto('data')} required disabled={ro} />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Select label="Forma de pagamento *" value={form.forma_pagamento} disabled={ro} onChange={(v) => setForm((f) => ({ ...f, forma_pagamento: String(v) }))} options={opcoesDe(opcoes.formas)} />
          <Select label={receita ? 'Origem do recurso *' : 'Origem do recurso'} value={form.origem_recurso || 'nenhuma'} disabled={ro} onChange={(v) => setForm((f) => ({ ...f, origem_recurso: v === 'nenhuma' ? '' : String(v) }))} options={[{ value: 'nenhuma', label: 'Não informada' }, ...opcoesDe(opcoes.origens)]} />
          <SelectMunicipio label="Centro de custo" municipios={municipios} value={form.codigo_ibge} onChange={(v) => setForm((f) => ({ ...f, codigo_ibge: v }))} opcional rotuloVazio="Campanha geral" disabled={ro} />
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_14rem]">
          <Input label={receita ? 'Doador' : 'Fornecedor'} value={form.contraparte_nome} onChange={texto('contraparte_nome')} maxLength={200} disabled={ro} />
          <Input label="CPF / CNPJ" value={form.contraparte_documento} onChange={texto('contraparte_documento')} maxLength={20} disabled={ro} className="font-mono tabular-nums" />
        </div>
        {receita ? (
          <Input label="Número do recibo eleitoral" value={form.recibo_eleitoral} onChange={texto('recibo_eleitoral')} maxLength={60} disabled={ro} className="font-mono tabular-nums" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <Select label="Documento fiscal" value={form.documento_fiscal_tipo || 'nenhum'} disabled={ro} onChange={(v) => setForm((f) => ({ ...f, documento_fiscal_tipo: v === 'nenhum' ? '' : String(v) }))} options={[{ value: 'nenhum', label: 'Nenhum' }, ...opcoesDe(opcoes.documentos_fiscais)]} />
            <Input label="Número do documento" value={form.documento_fiscal_numero} onChange={texto('documento_fiscal_numero')} maxLength={60} disabled={ro} className="font-mono tabular-nums" />
          </div>
        )}
        <label className="block space-y-1 text-sm font-medium">Observações<Textarea rows={2} value={form.observacoes} onChange={texto('observacoes')} maxLength={5000} disabled={ro} /></label>
        {!ro && (
          <label className="flex items-center gap-2 text-sm font-medium"><Paperclip className="h-4 w-4" />Comprovante (PDF ou imagem, até 10 MB)
            <input type="file" accept="application/pdf,image/*" onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} className="text-xs" />
          </label>
        )}
        {registro !== 'novo' && registro?.tem_comprovante && <p className="text-xs text-muted-foreground">Já há um comprovante; enviar outro substitui o atual.</p>}
        {erro && <p className="text-sm font-medium text-destructive" role="alert">{erro}</p>}
      </form>
    </Modal>
  );
};
