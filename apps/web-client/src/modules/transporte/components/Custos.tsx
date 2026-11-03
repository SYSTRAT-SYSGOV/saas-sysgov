import React, { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Copy, Download, Eye, Save } from 'lucide-react';
import { Badge, Button, Card, CardContent, ConfirmDialog, DataTable, Input, Modal, Select, Tabs, TabsContent, TabsList, TabsTrigger } from '@sysgov/ui';
import type { Toast } from '../../escola/components/AdminModal';
import { EstadoCarga } from '../../escola/components/AdminModal';
import { useCarga } from '../../escola/useCarga';
import { mensagemDeErro, transporteApi, type CustoRota, type GrupoCusto, type Opcoes, type ParametroCusto } from '../api';
import { km, reais, ROTULO_COMPONENTE_CUSTO, ROTULO_MODAL } from '../formato';

const TODAS = 'todas';

function entregar(blob: Blob, nome: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Custo estimado das rotas, parâmetros do cálculo e relatório (design D-C1 a D-C8). */
export const Custos: React.FC<{ opcoes: Opcoes; avisar: Toast }> = ({ opcoes, avisar }) => {
  const [ano, setAno] = useState(String(opcoes.anos_letivos[0] ?? new Date().getFullYear()));
  const p = opcoes.permissoes;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-40"><Select label="Ano letivo" value={ano} onChange={setAno} options={opcoes.anos_letivos.map((a) => ({ value: String(a), label: String(a) }))} /></div>
          </div>
          <p role="note" className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            O custo é uma <strong>estimativa</strong> calculada a partir dos parâmetros que o órgão informa, no modelo de custos de transporte escolar usado pelo SETE (estilo FNDE/GEIPOT).
            O modelo ainda <strong>não foi conferido com a planilha oficial</strong>: use para comparar rotas e acompanhar contratos, não como valor oficial. Quando um parâmetro obrigatório não foi informado, a rota aparece como “incompleta”.
          </p>
        </CardContent>
      </Card>
      <Tabs defaultValue="rotas">
        <TabsList>
          <TabsTrigger value="rotas">Custo das rotas</TabsTrigger>
          <TabsTrigger value="parametros">Parâmetros</TabsTrigger>
          <TabsTrigger value="relatorio">Relatório</TabsTrigger>
        </TabsList>
        <TabsContent value="rotas"><CustoDasRotas ano={Number(ano)} opcoes={opcoes} /></TabsContent>
        <TabsContent value="parametros"><Parametros ano={Number(ano)} anos={opcoes.anos_letivos} podeEditar={p.gerenciar_parametros_custo} avisar={avisar} /></TabsContent>
        <TabsContent value="relatorio"><Relatorio ano={Number(ano)} avisar={avisar} /></TabsContent>
      </Tabs>
    </div>
  );
};

const CustoDasRotas: React.FC<{ ano: number; opcoes: Opcoes }> = ({ ano, opcoes }) => {
  const [escola, setEscola] = useState(TODAS);
  const carga = useCarga(() => transporteApi.custosRotas(ano, escola === TODAS ? undefined : Number(escola)), [ano, escola]);
  const [detalhe, setDetalhe] = useState<number | null>(null);

  const colunas = useMemo<ColumnDef<CustoRota>[]>(() => [
    { id: 'rota', header: 'Rota', accessorFn: (r) => r.rota, meta: { exportHeader: 'Rota', exportValue: (r: CustoRota) => r.rota } },
    { id: 'escola', header: 'Escola', accessorFn: (r) => r.escola ?? '', meta: { exportHeader: 'Escola', exportValue: (r: CustoRota) => r.escola ?? '' } },
    { id: 'modal', header: 'Modal', accessorFn: (r) => (r.modal ? ROTULO_MODAL[r.modal] : 'Sem veículo'), meta: { exportHeader: 'Modal', exportValue: (r: CustoRota) => (r.modal ? ROTULO_MODAL[r.modal] : '') } },
    { id: 'alunos', header: 'Alunos', accessorFn: (r) => r.alunos, cell: ({ row }) => <span className="font-mono tabular-nums">{row.original.alunos}</span>, meta: { exportHeader: 'Alunos', exportValue: (r: CustoRota) => String(r.alunos) } },
    { id: 'mensal', header: 'Custo no mês', accessorFn: (r) => r.custo_mensal ?? 0, cell: ({ row }) => <span className="font-mono tabular-nums">{reais(row.original.custo_mensal)}</span>, meta: { exportHeader: 'Custo no mês', exportValue: (r: CustoRota) => reais(r.custo_mensal) } },
    { id: 'aluno', header: 'Por aluno no ano', accessorFn: (r) => r.custo_por_aluno_ano ?? 0, cell: ({ row }) => <span className="font-mono tabular-nums">{reais(row.original.custo_por_aluno_ano)}</span>, meta: { exportHeader: 'Por aluno no ano', exportValue: (r: CustoRota) => reais(r.custo_por_aluno_ano) } },
    {
      id: 'situacao', header: 'Cálculo', accessorFn: (r) => (r.completo ? 'Completo' : 'Incompleto'),
      cell: ({ row }) => (row.original.completo ? <Badge variant="outline">Completo</Badge> : <Badge variant="destructive">Incompleto ({row.original.faltando.length})</Badge>),
      meta: { exportHeader: 'Cálculo', exportValue: (r: CustoRota) => (r.completo ? 'Completo' : 'Incompleto') },
    },
    {
      id: 'acoes', header: () => <span className="sr-only">Ações</span>, enableSorting: false,
      cell: ({ row }) => <Button variant="ghost" size="sm" aria-label={`Detalhar o custo de ${row.original.rota}`} onClick={() => setDetalhe(row.original.rota_id)}><Eye className="h-4 w-4" /></Button>,
    },
  ], []);

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="w-72"><Select label="Escola" value={escola} onChange={setEscola} options={[{ value: TODAS, label: 'Todas' }, ...opcoes.escolas.map((e) => ({ value: String(e.id), label: e.nome }))]} /></div>
        <EstadoCarga carregando={carga.carregando && !carga.dados} erro={carga.erro} onTentar={() => void carga.recarregar()} />
        {carga.dados && <DataTable columns={colunas} data={carga.dados} emptyText="Nenhuma rota neste ano letivo." exportable exportFileName={`transporte-custos-${ano}`} exportTitle="Transporte Escolar — Custo das rotas" />}
      </CardContent>
      {detalhe !== null && <DetalheCusto rotaId={detalhe} ano={ano} aoFechar={() => setDetalhe(null)} />}
    </Card>
  );
};

const DetalheCusto: React.FC<{ rotaId: number; ano: number; aoFechar: () => void }> = ({ rotaId, ano, aoFechar }) => {
  const [simulacao, setSimulacao] = useState<Record<string, string>>({});
  const [chave, setChave] = useState('');
  const [valor, setValor] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const carga = useCarga(() => transporteApi.custoRota(rotaId, simulacao), [rotaId, simulacao]);
  const parametros = useCarga(() => transporteApi.parametrosCusto(ano), [ano]);
  const r = carga.dados;

  const simular = () => {
    setErro(null);
    if (!chave || valor.trim() === '') { setErro('Escolha o parâmetro e informe o valor da simulação.'); return; }
    setSimulacao((s) => ({ ...s, [chave]: valor.trim() }));
    setValor('');
  };

  return (
    <Modal open onClose={aoFechar} title={r ? `Custo da rota ${r.rota}` : 'Custo da rota'} size="2xl" footer={<Button variant="outline" onClick={aoFechar}>Fechar</Button>}>
      <div className="space-y-4">
        <EstadoCarga carregando={carga.carregando && !carga.dados} erro={carga.erro} onTentar={() => void carga.recarregar()} />
        {r && (
          <>
            <p className="flex flex-wrap items-center gap-2 text-sm">
              {r.modal ? <Badge variant="outline">{ROTULO_MODAL[r.modal]}</Badge> : <Badge variant="secondary">Sem veículo</Badge>}
              <span>{r.escola} · {km(r.km_viagem)} por percurso · <strong className="font-mono tabular-nums">{r.alunos}</strong> aluno(s)</span>
              {r.simulado && <Badge variant="secondary">Simulação — nada foi salvo</Badge>}
            </p>
            {!r.completo && (
              <div role="alert" className="rounded border border-destructive/30 bg-destructive/10 p-3 text-sm">
                <strong>Cálculo incompleto.</strong> Falta informar:
                <ul className="ml-5 list-disc">{r.faltando.map((f) => <li key={f.chave}>{f.rotulo}</li>)}</ul>
              </div>
            )}
            {r.completo && (
              <>
                <ul className="grid gap-2 sm:grid-cols-4">
                  <li className="rounded border border-border p-2 text-sm">Custo no mês<strong className="block font-mono text-lg tabular-nums">{reais(r.custo_mensal)}</strong></li>
                  <li className="rounded border border-border p-2 text-sm">Custo no ano<strong className="block font-mono text-lg tabular-nums">{reais(r.custo_anual)}</strong></li>
                  <li className="rounded border border-border p-2 text-sm">Por km<strong className="block font-mono text-lg tabular-nums">{reais(r.custo_por_km)}</strong></li>
                  <li className="rounded border border-border p-2 text-sm">Por aluno no ano<strong className="block font-mono text-lg tabular-nums">{r.custo_por_aluno_ano === null || r.custo_por_aluno_ano === undefined ? 'sem alunos' : reais(r.custo_por_aluno_ano)}</strong></li>
                </ul>
                <div className="grid gap-4 sm:grid-cols-2">
                  <TabelaComponentes titulo="Custo fixo por mês" itens={r.fixo ?? {}} total={r.custo_fixo_mensal ?? null} formato={reais} />
                  <TabelaComponentes titulo="Custo variável por km" itens={r.variavel ?? {}} total={r.custo_variavel_km ?? null} formato={(v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 3 }).format(v)} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Distância: {km(r.km_mes ?? 0)} por mês e {km(r.km_ano ?? 0)} por ano. Mês = fixo + variável × km do mês; ano = fixo × meses de custo fixo + variável × km do ano.
                </p>
              </>
            )}
            {r.comparativo && (
              <div className="rounded border border-border p-3 text-sm" role="region" aria-label="Contratado e estimado">
                <h3 className="font-semibold">Contratado × estimado (por mês)</h3>
                <p>
                  Contratado <strong className="font-mono tabular-nums">{reais(r.comparativo.contratado)}</strong> · estimado <strong className="font-mono tabular-nums">{reais(r.comparativo.estimado)}</strong> ·
                  diferença <strong className="font-mono tabular-nums">{reais(r.comparativo.diferenca)}</strong>
                  {r.comparativo.percentual !== null && <> ({r.comparativo.percentual.toLocaleString('pt-BR')} %)</>}
                  {r.comparativo.acima_do_limite && <Badge variant="destructive" className="ml-2">Contrato acima do limite</Badge>}
                </p>
              </div>
            )}
            <fieldset className="space-y-2 rounded border border-border p-3">
              <legend className="px-1 text-sm font-semibold">Simular</legend>
              <div className="flex flex-wrap items-end gap-2">
                <div className="w-72">
                  <Select label="Parâmetro" value={chave} onChange={setChave} placeholder="Escolha…"
                    options={(parametros.dados?.parametros ?? []).filter((x) => x.escopo === 'comum' || x.escopo === (r.modal === 'aquaviario' ? 'aqua' : 'rod')).map((x) => ({ value: x.chave, label: `${x.rotulo} (${x.unidade})` }))} />
                </div>
                <div className="w-40"><Input label="Valor" inputMode="decimal" value={valor} className="font-mono tabular-nums" onChange={(e) => setValor(e.target.value)} /></div>
                <Button variant="outline" onClick={simular}>Simular</Button>
                {r.simulado && <Button variant="ghost" onClick={() => setSimulacao({})}>Limpar simulação</Button>}
              </div>
              {Object.entries(simulacao).length > 0 && <p className="text-xs text-muted-foreground">Em simulação: {Object.entries(simulacao).map(([k, v]) => `${parametros.dados?.parametros.find((x) => x.chave === k)?.rotulo ?? k} = ${v}`).join('; ')}</p>}
              {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
            </fieldset>
          </>
        )}
      </div>
    </Modal>
  );
};

const TabelaComponentes: React.FC<{ titulo: string; itens: Record<string, number>; total: number | null; formato: (v: number) => string }> = ({ titulo, itens, total, formato }) => (
  <table className="w-full text-sm">
    <caption className="pb-1 text-left font-semibold">{titulo}</caption>
    <tbody>
      {Object.entries(itens).map(([k, v]) => (
        <tr key={k} className="border-t border-border"><td className="py-1">{ROTULO_COMPONENTE_CUSTO[k] ?? k}</td><td className="py-1 text-right font-mono tabular-nums">{formato(v)}</td></tr>
      ))}
      <tr className="border-t-2 border-border font-semibold"><td className="py-1">Total</td><td className="py-1 text-right font-mono tabular-nums">{total === null ? '—' : formato(total)}</td></tr>
    </tbody>
  </table>
);

const Parametros: React.FC<{ ano: number; anos: number[]; podeEditar: boolean; avisar: Toast }> = ({ ano, anos, podeEditar, avisar }) => {
  const carga = useCarga(() => transporteApi.parametrosCusto(ano), [ano]);
  const [edicao, setEdicao] = useState<Record<string, string>>({});
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [origem, setOrigem] = useState(String(anos.find((a) => a !== ano) ?? ano - 1));
  const [confirmarCopia, setConfirmarCopia] = useState(false);

  const texto = (x: ParametroCusto): string => edicao[x.chave] ?? (x.valor === null ? '' : String(x.valor).replace('.', ','));
  const alterados = Object.keys(edicao).length;

  const salvar = async () => {
    setErro(null);
    setOcupado(true);
    try {
      const valores: Record<string, string | null> = {};
      Object.entries(edicao).forEach(([k, v]) => { valores[k] = v.trim() === '' ? null : v.trim(); });
      await transporteApi.salvarParametrosCusto(ano, valores);
      setEdicao({});
      await carga.recarregar();
      avisar({ type: 'success', title: 'Custos', message: `Parâmetros de ${ano} salvos.` });
    } catch (e) { setErro(mensagemDeErro(e)); } finally { setOcupado(false); }
  };

  const copiar = async (sobrescrever: boolean) => {
    setErro(null);
    setOcupado(true);
    try {
      const n = await transporteApi.copiarParametrosCusto(Number(origem), ano, sobrescrever);
      setEdicao({});
      await carga.recarregar();
      avisar({ type: 'success', title: 'Custos', message: `${n} parâmetro(s) copiados de ${origem}.` });
    } catch (e) {
      const conflito = (e as { response?: { status?: number } })?.response?.status === 409;
      if (conflito) setConfirmarCopia(true); else setErro(mensagemDeErro(e));
    } finally { setOcupado(false); }
  };

  const dados = carga.dados;

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <EstadoCarga carregando={carga.carregando && !dados} erro={carga.erro} onTentar={() => void carga.recarregar()} />
        {dados && (
          <>
            {podeEditar && (
              <div className="flex flex-wrap items-end gap-3">
                <div className="w-40"><Select label="Copiar do ano" value={origem} onChange={setOrigem} options={Array.from(new Set([...anos, ano - 1, ano + 1])).filter((a) => a !== ano).sort().map((a) => ({ value: String(a), label: String(a) }))} /></div>
                <Button variant="outline" onClick={() => void copiar(false)} disabled={ocupado}><Copy className="mr-1 h-4 w-4" />Copiar para {ano}</Button>
              </div>
            )}
            {Object.entries(dados.grupos).map(([grupo, rotulo]) => {
              const itens = dados.parametros.filter((x) => x.grupo === grupo);
              if (itens.length === 0) return null;
              return (
                <fieldset key={grupo} className="space-y-2">
                  <legend className="text-sm font-semibold">{rotulo}</legend>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {itens.map((x) => (
                      <div key={x.chave} className="space-y-1">
                        <Input label={`${x.rotulo}${x.obrigatorio ? ' *' : ''} (${x.unidade})`} inputMode="decimal" value={texto(x)} disabled={!podeEditar || ocupado}
                          className="font-mono tabular-nums" onChange={(e) => setEdicao((s) => ({ ...s, [x.chave]: e.target.value }))} />
                        <p className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                          {x.escopo !== 'comum' && <Badge variant="outline">{x.escopo === 'rod' ? 'Rodoviário' : 'Aquaviário'}</Badge>}
                          {x.origem === 'padrao' && <Badge variant="secondary">padrão</Badge>}
                          {x.ajuda}
                        </p>
                      </div>
                    ))}
                  </div>
                </fieldset>
              );
            })}
            {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
            {podeEditar ? (
              <div className="flex items-center gap-3">
                <Button onClick={() => void salvar()} isLoading={ocupado} disabled={alterados === 0}><Save className="mr-1 h-4 w-4" />Salvar parâmetros de {ano}</Button>
                {alterados > 0 && <span className="text-sm text-muted-foreground">{alterados} alteração(ões) não salva(s). Campo vazio volta ao padrão.</span>}
              </div>
            ) : <p className="text-sm text-muted-foreground">Você pode consultar os parâmetros, mas não alterá-los.</p>}
          </>
        )}
      </CardContent>
      <ConfirmDialog open={confirmarCopia} onClose={() => setConfirmarCopia(false)} title="Sobrescrever parâmetros"
        description={`${ano} já tem parâmetros informados. Copiar de ${origem} substitui todos eles. Confirmar?`} confirmLabel="Sobrescrever" requireReason={false}
        onConfirm={() => { setConfirmarCopia(false); void copiar(true); }} />
    </Card>
  );
};

const Relatorio: React.FC<{ ano: number; avisar: Toast }> = ({ ano, avisar }) => {
  const carga = useCarga(() => transporteApi.relatorioCustos(ano), [ano]);
  const [ocupado, setOcupado] = useState(false);
  const r = carga.dados;

  const baixar = async () => {
    setOcupado(true);
    try { const a = await transporteApi.baixarCustos(ano); entregar(a.blob, a.nome); } catch (e) { avisar({ type: 'error', title: 'Custos', message: mensagemDeErro(e) }); } finally { setOcupado(false); }
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <EstadoCarga carregando={carga.carregando && !r} erro={carga.erro} onTentar={() => void carga.recarregar()} />
        {r && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <ul className="grid flex-1 gap-2 sm:grid-cols-4">
                <li className="rounded border border-border p-2 text-sm">Rotas<strong className="block font-mono text-lg tabular-nums">{r.totais.rotas}</strong></li>
                <li className="rounded border border-border p-2 text-sm">Com cálculo completo<strong className="block font-mono text-lg tabular-nums">{r.totais.completas}</strong></li>
                <li className="rounded border border-border p-2 text-sm">Custo anual (completas)<strong className="block font-mono text-lg tabular-nums">{reais(r.totais.custo_anual)}</strong></li>
                <li className="rounded border border-border p-2 text-sm">Por aluno no ano<strong className="block font-mono text-lg tabular-nums">{reais(r.totais.custo_por_aluno_ano)}</strong></li>
              </ul>
              <Button variant="outline" onClick={() => void baixar()} disabled={ocupado}><Download className="mr-1 h-4 w-4" />Baixar CSV</Button>
            </div>
            {r.totais.incompletas > 0 && <p className="text-sm text-muted-foreground">{r.totais.incompletas} rota(s) com cálculo incompleto não entram nos totais.</p>}
            <TabelaGrupo titulo="Por escola" grupos={r.por_escola} />
            <TabelaGrupo titulo="Por empresa" grupos={r.por_empresa} />
          </>
        )}
      </CardContent>
    </Card>
  );
};

const TabelaGrupo: React.FC<{ titulo: string; grupos: GrupoCusto[] }> = ({ titulo, grupos }) => (
  <div className="overflow-auto rounded border border-border">
    <table className="w-full text-sm">
      <caption className="p-2 text-left font-semibold">{titulo}</caption>
      <thead><tr className="text-left text-xs uppercase text-muted-foreground"><th className="px-2 py-1">Nome</th><th className="px-2 py-1 text-right">Rotas</th><th className="px-2 py-1 text-right">Incompletas</th><th className="px-2 py-1 text-right">Alunos</th><th className="px-2 py-1 text-right">Custo anual</th><th className="px-2 py-1 text-right">Por aluno</th></tr></thead>
      <tbody>
        {grupos.length === 0 && <tr><td colSpan={6} className="px-2 py-2 text-muted-foreground">Sem rotas.</td></tr>}
        {grupos.map((g) => (
          <tr key={`${g.id}-${g.nome}`} className="border-t border-border">
            <td className="px-2 py-1">{g.nome}</td><td className="px-2 py-1 text-right font-mono tabular-nums">{g.rotas}</td><td className="px-2 py-1 text-right font-mono tabular-nums">{g.incompletas}</td>
            <td className="px-2 py-1 text-right font-mono tabular-nums">{g.alunos}</td><td className="px-2 py-1 text-right font-mono tabular-nums">{reais(g.custo_anual)}</td><td className="px-2 py-1 text-right font-mono tabular-nums">{reais(g.custo_por_aluno_ano)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
