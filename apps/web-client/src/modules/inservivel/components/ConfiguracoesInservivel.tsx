import React, { useState } from 'react';
import { Copy, FileSpreadsheet, Gavel, Landmark, Link2, ListChecks, Plus, Save, Trash2, Upload } from 'lucide-react';
import { AlertCard, Button, Card, CardContent, CardHeader, CardTitle, Input, Skeleton, Switch, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@sysgov/ui';
import { erroApi } from '../../escola/api';
import { useCarga } from '../../escola/useCarga';
import { inservivelApi, type Configuracao, type DocumentoExigido, type ResultadoImportacao } from '../api';
import { vazioParaNulo } from '../formato';
import type { PropsAba } from '../ModuloInservivelMain';

/** Configurações (spec: Configurações e importação; D10, D13). */
export const ConfiguracoesInservivel: React.FC<PropsAba> = ({ avisar }) => {
  const carga = useCarga(() => inservivelApi.configuracao(), []);
  if (carga.erro) return <AlertCard priority="danger" title="Não foi possível carregar as configurações" description={carga.erro} actionLabel="Tentar novamente" onAction={() => void carga.recarregar()} />;
  if (!carga.dados) return <Skeleton className="h-96 w-full" />;
  return (
    <div className="space-y-4">
      <LinkPublico caminho={carga.dados.caminho_cadastro_publico} avisar={avisar} />
      <FormConfiguracao inicial={carga.dados} avisar={avisar} onSalvo={carga.definir} />
      <Importacao avisar={avisar} />
    </div>
  );
};

const LinkPublico: React.FC<{ caminho: string; avisar: PropsAba['avisar'] }> = ({ caminho, avisar }) => {
  const link = `${window.location.origin}${caminho}`;
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Link2 className="h-5 w-5 text-primary" />Cadastro público das entidades</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground">Divulgue este endereço para as entidades sem fins lucrativos se cadastrarem e enviarem os documentos. Depois elas entram pelo login normal.</p>
        <div className="flex gap-2">
          <Input aria-label="Link do cadastro público" readOnly value={link} className="flex-1 font-mono text-xs" />
          <Button variant="outline" leftIcon={<Copy className="h-4 w-4" />} onClick={() => void navigator.clipboard?.writeText(link).then(() => avisar({ type: 'success', title: 'Link copiado', message: link }))}>Copiar</Button>
        </div>
      </CardContent>
    </Card>
  );
};

const FormConfiguracao: React.FC<{ inicial: Configuracao; avisar: PropsAba['avisar']; onSalvo: (c: Configuracao) => void }> = ({ inicial, avisar, onSalvo }) => {
  const [form, setForm] = useState({
    doador_nome: inicial.doador_nome ?? '', doador_cnpj: inicial.doador_cnpj ?? '', doador_cidade: inicial.doador_cidade ?? '', doador_uf: inicial.doador_uf ?? '',
    foro: inicial.foro ?? '', responsavel_nome: inicial.responsavel_nome ?? '', responsavel_cargo: inicial.responsavel_cargo ?? '',
  });
  const [legislacao, setLegislacao] = useState<string[]>(inicial.legislacao.length > 0 ? inicial.legislacao : ['']);
  const [documentos, setDocumentos] = useState<DocumentoExigido[]>(inicial.documentos_exigidos);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const texto = (campo: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [campo]: e.target.value }));

  const salvar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSalvando(true); setErro(null);
    try {
      const c = await inservivelApi.salvarConfiguracao({
        doador_nome: vazioParaNulo(form.doador_nome), doador_cnpj: vazioParaNulo(form.doador_cnpj), doador_cidade: vazioParaNulo(form.doador_cidade),
        doador_uf: vazioParaNulo(form.doador_uf.toUpperCase()), foro: vazioParaNulo(form.foro), responsavel_nome: vazioParaNulo(form.responsavel_nome),
        responsavel_cargo: vazioParaNulo(form.responsavel_cargo), legislacao: legislacao.filter((l) => l.trim() !== ''), documentos_exigidos: documentos,
      });
      onSalvo(c);
      setDocumentos(c.documentos_exigidos);
      avisar({ type: 'success', title: 'Configurações salvas', message: 'Os próximos termos usam os novos dados.' });
    } catch (e) { setErro(erroApi(e).mensagem); } finally { setSalvando(false); }
  };

  return (
    <form onSubmit={salvar} className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Landmark className="h-5 w-5 text-primary" />Doador (aparece nos termos)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_14rem]">
            <Input label="Nome do órgão doador" value={form.doador_nome} onChange={texto('doador_nome')} placeholder="Ex.: Município de Exemplo" />
            <Input label="CNPJ" value={form.doador_cnpj} onChange={texto('doador_cnpj')} className="font-mono tabular-nums" />
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_6rem_1fr]">
            <Input label="Cidade" value={form.doador_cidade} onChange={texto('doador_cidade')} />
            <Input label="UF" value={form.doador_uf} onChange={texto('doador_uf')} maxLength={2} />
            <Input label="Foro (comarca)" value={form.foro} onChange={texto('foro')} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Responsável pelo Patrimônio" value={form.responsavel_nome} onChange={texto('responsavel_nome')} />
            <Input label="Cargo" value={form.responsavel_cargo} onChange={texto('responsavel_cargo')} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between"><CardTitle className="flex items-center gap-2"><Gavel className="h-5 w-5 text-primary" />Legislação citada no termo de doação</CardTitle>
          <Button type="button" variant="outline" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setLegislacao((l) => [...l, ''])}>Adicionar</Button></CardHeader>
        <CardContent className="space-y-2">
          {legislacao.map((l, i) => (
            <div key={i} className="flex gap-2">
              <Input aria-label={`Norma ${i + 1}`} value={l} onChange={(e) => setLegislacao((lista) => lista.map((x, j) => (j === i ? e.target.value : x)))} placeholder="Ex.: na Lei Municipal nº 100/2025" className="flex-1" />
              <Button type="button" variant="ghost" size="icon" aria-label={`Remover norma ${i + 1}`} onClick={() => setLegislacao((lista) => lista.filter((_, j) => j !== i))}><Trash2 /></Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between"><CardTitle className="flex items-center gap-2"><ListChecks className="h-5 w-5 text-primary" />Documentos exigidos das entidades</CardTitle>
          <Button type="button" variant="outline" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setDocumentos((d) => [...d, { chave: '', nome: '', obrigatorio: true }])}>Adicionar</Button></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Documento</TableHead><TableHead className="w-40">Obrigatório</TableHead><TableHead className="w-16" /></TableRow></TableHeader>
            <TableBody>
              {documentos.map((d, i) => (
                <TableRow key={d.chave || `novo-${i}`}>
                  <TableCell><Input aria-label={`Nome do documento ${i + 1}`} value={d.nome} onChange={(e) => setDocumentos((l) => l.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)))} required /></TableCell>
                  <TableCell><Switch checked={d.obrigatorio} onCheckedChange={(v) => setDocumentos((l) => l.map((x, j) => (j === i ? { ...x, obrigatorio: v } : x)))} aria-label={`${d.nome} obrigatório`} /></TableCell>
                  <TableCell><Button type="button" variant="ghost" size="icon-sm" aria-label={`Remover ${d.nome}`} onClick={() => setDocumentos((l) => l.filter((_, j) => j !== i))} disabled={documentos.length <= 1}><Trash2 /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="mt-2 text-xs text-muted-foreground">Documento obrigatório com validade vencida bloqueia a participação da entidade nos lotes.</p>
        </CardContent>
      </Card>

      {erro && <AlertCard priority="danger" title="Não foi possível salvar" description={erro} />}
      <div className="flex justify-end"><Button type="submit" leftIcon={<Save className="h-4 w-4" />} isLoading={salvando}>Salvar configurações</Button></div>
    </form>
  );
};

const Importacao: React.FC<{ avisar: PropsAba['avisar'] }> = ({ avisar }) => {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [resultado, setResultado] = useState<ResultadoImportacao | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const enviar = async () => {
    if (!arquivo) return;
    setEnviando(true); setErro(null); setResultado(null);
    try { const r = await inservivelApi.importar(arquivo); setResultado(r); avisar({ type: 'success', title: 'Importação concluída', message: `${r.criados} criado(s), ${r.atualizados} atualizado(s)` }); } catch (e) { setErro(erroApi(e).mensagem); } finally { setEnviando(false); }
  };
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5 text-primary" />Importar planilha patrimonial (CSV)</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">Aceita o relatório do sistema patrimonial em CSV (separado por vírgula ou ponto e vírgula). O bem é criado ou completado pelo nº patrimonial; o centro de custo precisa existir no Organograma. Bens novos entram como Inservível.</p>
        <div className="flex flex-wrap items-center gap-2">
          <input type="file" accept=".csv,text/csv,text/plain" aria-label="Planilha CSV" className="text-sm" onChange={(e) => { setArquivo(e.target.files?.[0] ?? null); setResultado(null); }} />
          <Button leftIcon={<Upload className="h-4 w-4" />} onClick={() => void enviar()} isLoading={enviando} disabled={!arquivo}>Importar</Button>
        </div>
        {erro && <AlertCard priority="danger" title="Não foi possível importar" description={erro} />}
        {resultado && (
          <div className="space-y-2">
            <p className="text-sm">Criados: <strong className="font-mono">{resultado.criados}</strong> · Atualizados: <strong className="font-mono">{resultado.atualizados}</strong> · Sem alteração: <strong className="font-mono">{resultado.sem_alteracao}</strong>
              {resultado.estados_criados + resultado.categorias_criadas > 0 && <> · Parâmetros criados: <strong className="font-mono">{resultado.estados_criados + resultado.categorias_criadas}</strong></>}</p>
            {resultado.pendencias.length > 0 && (
              <>
                <AlertCard priority="warning" title={`${resultado.pendencias.length} linha(s) não importada(s)`} description="Ajuste o Organograma ou a planilha e importe de novo: a importação é idempotente pelo nº patrimonial." />
                <div className="max-h-72 overflow-y-auto">
                  <Table>
                    <TableHeader><TableRow><TableHead className="w-20">Linha</TableHead><TableHead className="w-32">Patrimônio</TableHead><TableHead>Motivo</TableHead></TableRow></TableHeader>
                    <TableBody>{resultado.pendencias.map((p) => <TableRow key={p.linha}><TableCell className="font-mono tabular-nums">{p.linha}</TableCell><TableCell className="font-mono">{p.patrimonio ?? '—'}</TableCell><TableCell className="text-sm">{p.motivo}</TableCell></TableRow>)}</TableBody>
                  </Table>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
