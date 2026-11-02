import React, { useEffect, useMemo, useState } from 'react';
import { Copy, Pencil, Plus, RotateCcw, Save, Star, Trash2 } from 'lucide-react';
import { Badge, Button, Card, CardContent, ConfirmDialog, Input, Modal, Select, Switch, Textarea, useFormValidationModal } from '@sysgov/ui';
import type { Toast } from '../../escola/components/AdminModal';
import { EstadoCarga } from '../../escola/components/AdminModal';
import { useCarga } from '../../escola/useCarga';
import { mensagemDeErro, transporteApi, type AjusteCampo, type CampoLeiaute, type LeiauteImportacao, type TipoCampoCenso } from '../api';

const TIPOS: { valor: TipoCampoCenso; rotulo: string }[] = [
  { valor: 'texto', rotulo: 'Texto' }, { valor: 'numero', rotulo: 'Número' }, { valor: 'data', rotulo: 'Data' },
  { valor: 'booleano', rotulo: 'Sim/não' }, { valor: 'codigo', rotulo: 'Código (com rótulos)' },
];

const mapaParaTexto = (mapa: Record<string, string> | null): string => Object.entries(mapa ?? {}).map(([k, v]) => `${k}=${v}`).join('\n');

function textoParaMapa(texto: string): Record<string, string> | null {
  const mapa: Record<string, string> = {};
  texto.split('\n').forEach((linha) => {
    const i = linha.indexOf('=');
    if (i > 0 && linha.slice(i + 1).trim() !== '') mapa[linha.slice(0, i).trim()] = linha.slice(i + 1).trim();
  });
  return Object.keys(mapa).length > 0 ? mapa : null;
}

/** O que enviar de cada campo: o servidor ignora o que não pode mudar num campo nativo. */
function ajusteDe(c: CampoLeiaute): AjusteCampo {
  const base: AjusteCampo = { chave: c.chave, posicao: c.posicao, rotulo: c.rotulo, ativo: c.ativo };
  if (c.tipo === 'codigo') base.mapa = c.mapa;
  if (c.tipo === 'data') base.formato = c.formato;
  if (c.tipo === 'booleano') base.valor_verdadeiro = c.valor_verdadeiro;
  return c.nativo ? base : { ...base, registro: c.registro, tipo: c.tipo, sensivel: c.sensivel };
}

/**
 * Leiaute de importação do Educacenso: o Inep muda as colunas todo ano, então o órgão ajusta a posição, desativa
 * ("exclui") campos que saíram e cria os que entraram. Campo nativo desativado pode ser restaurado; campo criado
 * pelo órgão é excluído de vez. Campos necessários para reconhecer o aluno ficam travados.
 */
export const LeiauteImportacaoTela: React.FC<{ avisar: Toast }> = ({ avisar }) => {
  const lista = useCarga(() => transporteApi.leiautesImportacao(), []);
  const [id, setId] = useState<number | null>(null);
  const [leiaute, setLeiaute] = useState<LeiauteImportacao | null>(null);
  const [campos, setCampos] = useState<CampoLeiaute[]>([]);
  const [cabecalho, setCabecalho] = useState({ nome: '', ano_censo: '', delimitador: '|', codificacao: 'ISO-8859-1' });
  const [editando, setEditando] = useState<CampoLeiaute | 'novo' | null>(null);
  const [duplicando, setDuplicando] = useState(false);
  const [restaurando, setRestaurando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [sujo, setSujo] = useState(false);

  const aplicar = (l: LeiauteImportacao) => {
    setLeiaute(l);
    setCampos(l.campos ?? []);
    setCabecalho({ nome: l.nome, ano_censo: String(l.ano_censo), delimitador: l.delimitador, codificacao: l.codificacao });
    setSujo(false);
  };

  const carregar = async (alvo: number) => {
    setErro(null);
    try { aplicar(await transporteApi.leiauteImportacao(alvo)); setId(alvo); } catch (e) { setErro(mensagemDeErro(e)); }
  };

  useEffect(() => {
    if (id === null && lista.dados && lista.dados.length > 0) void carregar((lista.dados.find((l) => l.padrao) ?? lista.dados[0]).id);
  }, [lista.dados, id]);

  const executar = async (acao: () => Promise<void>) => {
    setErro(null);
    setOcupado(true);
    try { await acao(); } catch (e) { setErro(mensagemDeErro(e)); } finally { setOcupado(false); }
  };

  const mudar = (chave: string, mudanca: Partial<CampoLeiaute>) => {
    setCampos((cs) => cs.map((c) => (c.chave === chave ? { ...c, ...mudanca } : c)));
    setSujo(true);
  };

  const salvar = () => executar(async () => {
    if (!leiaute) return;
    const salvo = await transporteApi.salvarLeiauteImportacao(leiaute.id, {
      nome: cabecalho.nome.trim(), ano_censo: Number(cabecalho.ano_censo), delimitador: cabecalho.delimitador, codificacao: cabecalho.codificacao,
      campos: campos.map(ajusteDe),
    });
    aplicar(salvo);
    void lista.recarregar();
    avisar({ type: 'success', title: 'Leiaute', message: 'Leiaute salvo.' });
  });

  const grupos = useMemo(() => {
    const porRegistro = new Map<string, CampoLeiaute[]>();
    campos.forEach((c) => porRegistro.set(c.registro, [...(porRegistro.get(c.registro) ?? []), c]));
    return [...porRegistro.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [campos]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 p-4">
          <h2 className="text-sm font-semibold">Leiaute de importação do Educacenso</h2>
          <p className="text-sm text-muted-foreground">
            O leiaute de fábrica é o do Educacenso 2023. O Inep muda as colunas todo ano: ajuste a <strong>coluna</strong> de cada campo, <strong>desative</strong> o que saiu do arquivo
            e <strong>adicione</strong> o que entrou. Use “Testar leiaute” na aba Importar para conferir as colunas com um arquivo antes de importar.
          </p>
          <EstadoCarga carregando={lista.carregando && !lista.dados} erro={lista.erro} onTentar={() => void lista.recarregar()} />
          {lista.dados && (
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-72">
                <Select label="Leiaute" value={String(id ?? '')} onChange={(v) => void carregar(Number(v))}
                  options={lista.dados.map((l) => ({ value: String(l.id), label: `${l.nome}${l.padrao ? ' (padrão)' : ''}` }))} />
              </div>
              <Button variant="outline" onClick={() => setDuplicando(true)} disabled={!leiaute}><Copy className="mr-1 h-4 w-4" />Duplicar para novo ano</Button>
              {leiaute && !leiaute.padrao && <Button variant="outline" onClick={() => void executar(async () => { await transporteApi.padraoLeiauteImportacao(leiaute.id); void lista.recarregar(); void carregar(leiaute.id); })}><Star className="mr-1 h-4 w-4" />Definir como padrão</Button>}
              {leiaute && !leiaute.padrao && <Button variant="outline" onClick={() => setExcluindo(true)}><Trash2 className="mr-1 h-4 w-4" />Excluir leiaute</Button>}
            </div>
          )}
          {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
        </CardContent>
      </Card>

      {leiaute && (
        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="grid gap-3 sm:grid-cols-4">
              <Input label="Nome do leiaute" value={cabecalho.nome} maxLength={100} onChange={(e) => { setCabecalho((c) => ({ ...c, nome: e.target.value })); setSujo(true); }} />
              <Input label="Ano do Censo" type="number" value={cabecalho.ano_censo} className="font-mono tabular-nums" onChange={(e) => { setCabecalho((c) => ({ ...c, ano_censo: e.target.value })); setSujo(true); }} />
              <Input label="Delimitador" value={cabecalho.delimitador} maxLength={1} className="font-mono" onChange={(e) => { setCabecalho((c) => ({ ...c, delimitador: e.target.value })); setSujo(true); }} />
              <Select label="Codificação" value={cabecalho.codificacao} onChange={(v) => { setCabecalho((c) => ({ ...c, codificacao: v })); setSujo(true); }}
                options={(leiaute.codificacoes ?? ['ISO-8859-1', 'UTF-8', 'Windows-1252']).map((c) => ({ value: c, label: c }))} />
            </div>

            {grupos.map(([registro, lcs]) => (
              <section key={registro} className="space-y-1" aria-label={`Registro ${registro}`}>
                <h3 className="text-sm font-semibold">Registro {registro} — {lcs[0].registro_nome}</h3>
                <div className="overflow-auto rounded border border-border">
                  <table className="w-full text-sm">
                    <caption className="sr-only">Campos do registro {registro}</caption>
                    <thead><tr className="text-left text-xs uppercase text-muted-foreground">
                      <th className="px-2 py-1">Campo</th><th className="w-28 px-2 py-1">Coluna</th><th className="px-2 py-1">Tipo</th><th className="px-2 py-1">Ativo</th><th className="px-2 py-1"><span className="sr-only">Ações</span></th>
                    </tr></thead>
                    <tbody>
                      {lcs.map((c) => (
                        <tr key={c.chave} className={`border-t border-border ${c.ativo ? '' : 'text-muted-foreground'}`}>
                          <td className="px-2 py-1">
                            {c.rotulo}
                            <span className="ml-2 inline-flex flex-wrap gap-1 align-middle">
                              {c.travado && <Badge variant="secondary">necessário</Badge>}
                              {c.sensivel && <Badge variant="destructive">sensível</Badge>}
                              {!c.nativo && <Badge variant="outline">criado pelo órgão</Badge>}
                              {c.nativo && c.posicao_padrao !== null && c.posicao !== c.posicao_padrao && <Badge variant="outline">padrão: {c.posicao_padrao}</Badge>}
                            </span>
                          </td>
                          <td className="px-2 py-1">
                            <input type="number" min={1} max={300} value={c.posicao} aria-label={`Coluna de ${c.rotulo}`} disabled={ocupado}
                              className="w-20 rounded border border-input bg-background px-2 py-1 font-mono tabular-nums"
                              onChange={(e) => mudar(c.chave, { posicao: Number(e.target.value) })} />
                          </td>
                          <td className="px-2 py-1">{TIPOS.find((t) => t.valor === c.tipo)?.rotulo}</td>
                          <td className="px-2 py-1">
                            {c.nativo
                              ? <Switch checked={c.ativo} disabled={c.travado} onCheckedChange={(v) => mudar(c.chave, { ativo: v })} aria-label={`${c.rotulo} ativo`} />
                              : <Switch checked={c.ativo} onCheckedChange={(v) => mudar(c.chave, { ativo: v })} aria-label={`${c.rotulo} ativo`} />}
                          </td>
                          <td className="whitespace-nowrap px-2 py-1 text-right">
                            <Button variant="ghost" size="sm" onClick={() => setEditando(c)} aria-label={`Detalhes de ${c.rotulo}`}><Pencil className="h-4 w-4" /></Button>
                            {!c.nativo && <Button variant="ghost" size="sm" aria-label={`Excluir ${c.rotulo}`} onClick={() => { setCampos((cs) => cs.filter((x) => x.chave !== c.chave)); setSujo(true); }}><Trash2 className="h-4 w-4" /></Button>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={() => setEditando('novo')}><Plus className="mr-1 h-4 w-4" />Adicionar campo</Button>
              <Button variant="outline" onClick={() => setRestaurando(true)}><RotateCcw className="mr-1 h-4 w-4" />Restaurar padrão de fábrica</Button>
              <Button onClick={() => void salvar()} isLoading={ocupado} disabled={!sujo}><Save className="mr-1 h-4 w-4" />Salvar alterações</Button>
              {sujo && <span className="text-sm text-muted-foreground">Há alterações não salvas.</span>}
            </div>
          </CardContent>
        </Card>
      )}

      {editando && leiaute && (
        <CampoModal campo={editando === 'novo' ? null : editando} registros={leiaute.registros ?? {}} formatos={leiaute.formatos_data ?? ['d/m/Y']}
          existentes={campos.map((c) => c.chave)} aoFechar={() => setEditando(null)}
          aoSalvar={(novo) => {
            setCampos((cs) => (editando === 'novo' ? [...cs, novo] : cs.map((c) => (c.chave === novo.chave ? novo : c))));
            setSujo(true);
            setEditando(null);
          }} />
      )}
      {duplicando && leiaute && (
        <DuplicarModal origem={leiaute} aoFechar={() => setDuplicando(false)} aoDuplicar={async (nome, ano) => {
          const novo = await transporteApi.duplicarLeiauteImportacao({ nome, ano_censo: ano, copiar_de: leiaute.id });
          setDuplicando(false);
          void lista.recarregar();
          aplicar(novo);
          setId(novo.id);
          avisar({ type: 'success', title: 'Leiaute', message: `Leiaute "${novo.nome}" criado.` });
        }} />
      )}
      <ConfirmDialog open={restaurando} onClose={() => setRestaurando(false)} title="Restaurar o padrão de fábrica"
        description="Descarta todos os ajustes de coluna e os campos criados neste leiaute e volta ao Educacenso 2023. Confirmar?" confirmLabel="Restaurar" requireReason={false}
        onConfirm={() => { setRestaurando(false); if (leiaute) void executar(async () => { aplicar(await transporteApi.restaurarLeiauteImportacao(leiaute.id)); avisar({ type: 'success', title: 'Leiaute', message: 'Padrão de fábrica restaurado.' }); }); }} />
      <ConfirmDialog open={excluindo} onClose={() => setExcluindo(false)} title="Excluir leiaute"
        description={`Excluir o leiaute "${leiaute?.nome ?? ''}"? As importações já feitas não são afetadas.`} confirmLabel="Excluir" requireReason={false}
        onConfirm={() => { setExcluindo(false); if (leiaute) void executar(async () => { await transporteApi.excluirLeiauteImportacao(leiaute.id); setId(null); setLeiaute(null); void lista.recarregar(); }); }} />
    </div>
  );
};

const CampoModal: React.FC<{
  campo: CampoLeiaute | null; registros: Record<string, string>; formatos: string[]; existentes: string[];
  aoFechar: () => void; aoSalvar: (c: CampoLeiaute) => void;
}> = ({ campo, registros, formatos, existentes, aoFechar, aoSalvar }) => {
  const novo = campo === null;
  const [d, setD] = useState({
    chave: campo?.chave ?? '', registro: campo?.registro ?? ('30' in registros ? '30' : Object.keys(registros)[0] ?? '30'), rotulo: campo?.rotulo ?? '', posicao: String(campo?.posicao ?? ''),
    tipo: (campo?.tipo ?? 'texto') as TipoCampoCenso, sensivel: campo?.sensivel ?? false, mapa: mapaParaTexto(campo?.mapa ?? null),
    formato: campo?.formato ?? 'd/m/Y', verdadeiro: campo?.valor_verdadeiro ?? '1',
  });
  const { modal, invalidar } = useFormValidationModal();
  const set = <K extends keyof typeof d>(k: K, v: (typeof d)[K]) => setD((x) => ({ ...x, [k]: v }));
  const tipo = d.tipo;

  const confirmar = () => {
    const faltando: [string, string][] = [];
    if (novo && !/^[a-z][a-z0-9_]{1,39}$/.test(d.chave)) faltando.push(['Chave', 'Use letras minúsculas, números e sublinhado, começando por letra (2 a 40 caracteres).']);
    if (novo && existentes.includes(d.chave)) faltando.push(['Chave', 'Já existe um campo com esta chave.']);
    if (!d.rotulo.trim()) faltando.push(['Rótulo', 'Informe o nome do campo.']);
    const p = Number(d.posicao);
    if (!Number.isInteger(p) || p < 1 || p > 300) faltando.push(['Coluna', 'Informe a coluna (posição) de 1 a 300. A coluna 0 é o tipo do registro.']);
    if (faltando.length > 0) return invalidar(faltando);
    const mapa = tipo === 'codigo' ? textoParaMapa(d.mapa) : null;
    aoSalvar(campo
      ? { ...campo, posicao: p, rotulo: d.rotulo.trim(), mapa, formato: d.formato, valor_verdadeiro: d.verdadeiro }
      : {
        chave: d.chave, registro: d.registro, registro_nome: registros[d.registro] ?? d.registro, posicao: p, posicao_padrao: null, rotulo: d.rotulo.trim(),
        tipo: d.tipo, destino: 'extra', ativo: true, ativo_padrao: true, travado: false, sensivel: d.sensivel, nativo: false, mapa, formato: d.formato, valor_verdadeiro: d.verdadeiro,
      });
  };

  return (
    <Modal open onClose={aoFechar} title={novo ? 'Adicionar campo' : `Detalhes de ${campo.rotulo}`} size="lg"
      footer={<><Button variant="outline" onClick={aoFechar}>Cancelar</Button><Button onClick={confirmar}>{novo ? 'Adicionar' : 'Aplicar'}</Button></>}>
      {modal}
      <div className="space-y-4">
        {novo && <p className="text-sm text-muted-foreground">O valor lido desta coluna é guardado como dado extra do aluno, da escola ou da turma (conforme o registro), sem alterar o cadastro.</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          {novo && <Input label="Chave *" value={d.chave} maxLength={40} className="font-mono" onChange={(e) => set('chave', e.target.value.toLowerCase())} />}
          <Input label="Rótulo *" value={d.rotulo} maxLength={100} onChange={(e) => set('rotulo', e.target.value)} />
          {novo && <Select label="Registro *" value={d.registro} onChange={(v) => set('registro', v)} options={Object.entries(registros).sort(([a], [b]) => a.localeCompare(b)).map(([k, nome]) => ({ value: k, label: `${k} — ${nome}` }))} />}
          <Input label="Coluna *" type="number" value={d.posicao} className="font-mono tabular-nums" onChange={(e) => set('posicao', e.target.value)} />
          {novo && <Select label="Tipo *" value={d.tipo} onChange={(v) => set('tipo', v as TipoCampoCenso)} options={TIPOS.map((t) => ({ value: t.valor, label: t.rotulo }))} />}
          {tipo === 'data' && <Select label="Formato da data" value={d.formato} onChange={(v) => set('formato', v)} options={formatos.map((f) => ({ value: f, label: f }))} />}
          {tipo === 'booleano' && <Input label="Valor que significa “sim”" value={d.verdadeiro} maxLength={10} className="font-mono" onChange={(e) => set('verdadeiro', e.target.value)} />}
        </div>
        {tipo === 'codigo' && (
          <label className="block space-y-1 text-sm">
            <span className="font-semibold">Códigos e rótulos (um por linha, <code>código=rótulo</code>)</span>
            <Textarea value={d.mapa} rows={5} className="font-mono" onChange={(e) => set('mapa', e.target.value)} />
          </label>
        )}
        {novo && <label className="flex items-center gap-2 text-sm"><Switch checked={d.sensivel} onCheckedChange={(v) => set('sensivel', v)} aria-label="Campo sensível" />Dado sensível (mascarado no teste e nunca exibido em listagem)</label>}
        {campo?.travado && <p className="text-xs text-muted-foreground">Este campo é necessário para reconhecer o aluno: só a coluna pode mudar.</p>}
      </div>
    </Modal>
  );
};

const DuplicarModal: React.FC<{ origem: LeiauteImportacao; aoFechar: () => void; aoDuplicar: (nome: string, ano: number) => Promise<void> }> = ({ origem, aoFechar, aoDuplicar }) => {
  const [nome, setNome] = useState(`Educacenso ${origem.ano_censo + 1}`);
  const [ano, setAno] = useState(String(origem.ano_censo + 1));
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const confirmar = async () => {
    setErro(null);
    setOcupado(true);
    try { await aoDuplicar(nome.trim(), Number(ano)); } catch (e) { setErro(mensagemDeErro(e)); } finally { setOcupado(false); }
  };
  return (
    <Modal open onClose={aoFechar} title="Duplicar para novo ano" size="md"
      footer={<><Button variant="outline" onClick={aoFechar}>Cancelar</Button><Button onClick={() => void confirmar()} isLoading={ocupado}>Duplicar</Button></>}>
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">A cópia nasce com os mesmos ajustes de “{origem.nome}” e pode ser alterada sem afetar o original.</p>
        <Input label="Nome do novo leiaute" value={nome} maxLength={100} onChange={(e) => setNome(e.target.value)} />
        <Input label="Ano do Censo" type="number" value={ano} className="font-mono tabular-nums" onChange={(e) => setAno(e.target.value)} />
        {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
      </div>
    </Modal>
  );
};
