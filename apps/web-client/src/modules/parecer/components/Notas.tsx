import React, { useEffect, useRef, useState } from 'react';
import { Badge, Button, Card, Input, ScreenState, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@sysgov/ui';
import { SERIES, formatarNota, lerNota, parecerApi, type TelaNotas } from '../api';
import { AbasTurma, Aviso, Botoes, EscolherTurma, mensagemDeErro, useParecer, type Mensagem } from './comum';

const fmt1 = (n: number) => n.toFixed(1).replace('.', ',');

/** Notas (notas.php): 0 a 10 por matéria, nos trimestres com nota da série; também por planilha CSV. */
const Notas: React.FC<{ turmaId?: number }> = ({ turmaId }) => {
  const { ir } = useParecer();
  if (!turmaId) return <EscolherTurma texto="Escolha a turma para lançar ou consultar as notas." onEscolher={(t) => ir({ aba: 'notas', turmaId: t.turma_id })} />;
  return <NotasDaTurma key={turmaId} turmaId={turmaId} />;
};

const NotasDaTurma: React.FC<{ turmaId: number }> = ({ turmaId }) => {
  const { ir, catalogo } = useParecer();
  const [materia, setMateria] = useState<string | undefined>();
  const [tela, setTela] = useState<TelaNotas | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<Mensagem>(null);
  const [salvando, setSalvando] = useState(false);
  const [turma, setTurma] = useState<{ id: number; nome: string; serie: number; turno: string | null } | null>(null);
  const arquivo = useRef<HTMLInputElement>(null);

  const carregar = () =>
    parecerApi
      .notas(turmaId, materia)
      .then((t) => {
        setTela(t);
        setErro(null);
        const v: Record<string, string> = {};
        t.alunos.forEach((a) => t.trimestres.forEach((tri) => (v[`${a.id}-${tri}`] = formatarNota(t.notas[a.id]?.[tri]))));
        setValores(v);
      })
      .catch((e: unknown) => setErro(mensagemDeErro(e)?.texto ?? 'Erro'));
  useEffect(() => {
    void carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turmaId, materia]);
  useEffect(() => {
    parecerApi.alunos(turmaId).then((d) => setTurma({ id: d.turma.id, nome: d.turma.nome, serie: d.turma.serie, turno: d.turma.turno })).catch(() => undefined);
  }, [turmaId]);

  const cabecalho = turma && <AbasTurma turma={turma} atual="notas" />;
  if (erro !== null) return <ScreenState type="error" title="Não foi possível abrir as notas" description={erro} />;
  if (tela === null) return <ScreenState type="loading" />;

  if (tela.trimestres.length === 0) {
    return (
      <div className="space-y-4">
        {cabecalho}
        <Card className="space-y-3 p-4">
          <p>O {SERIES[tela.serie]} não tem notas: a avaliação é feita só pelo parecer descritivo.</p>
          <Button onClick={() => ir({ aba: 'inicio', tela: 'alunos', turmaId })}>Ir para os pareceres</Button>
        </Card>
      </div>
    );
  }

  const media = tela.media_aprovacao;
  const qtd = tela.trimestres.length;
  const situacao = (alunoId: number) => {
    const ns = tela.trimestres.map((t) => lerNota(valores[`${alunoId}-${t}`] ?? '')).filter((n): n is number => typeof n === 'number');
    if (ns.length === 0) return { media: null as number | null, el: null as React.ReactNode };
    const soma = ns.reduce((s, n) => s + n, 0);
    const m = soma / ns.length;
    if (ns.length < qtd) {
      const falta = media * qtd - soma;
      return { media: m, el: falta > 0 ? <small>faltam <b className="text-rose-600">{fmt1(falta)}</b> pts</small> : <Badge variant="success">Média atingida</Badge> };
    }
    return { media: m, el: m >= media ? <Badge variant="success">Aprovado</Badge> : <Badge variant="danger">Reprovado</Badge> };
  };

  const salvar = async () => {
    const notas: Record<number, Record<number, number | null>> = {};
    const invalidas: string[] = [];
    tela.alunos.filter((a) => a.situacao === 'ativo').forEach((a) =>
      tela.trimestres.forEach((t) => {
        const n = lerNota(valores[`${a.id}-${t}`] ?? '');
        if (n === undefined) invalidas.push(a.nome);
        else (notas[a.id] ??= {})[t] = n;
      }),
    );
    setSalvando(true);
    try {
      const r = await parecerApi.lancarNotas(turmaId, tela.materia, notas);
      setMsg({ tipo: invalidas.length ? 'erro' : 'ok', texto: `${r.gravadas} nota(s) gravada(s).${invalidas.length ? ' Atenção — nota inválida ignorada (use 0 a 10).' : ''}` });
      await carregar();
    } catch (e) {
      setMsg(mensagemDeErro(e));
    } finally {
      setSalvando(false);
    }
  };

  const importar = async (f: File | undefined) => {
    if (!f) return;
    try {
      const r = await parecerApi.importarNotas(turmaId, tela.materia, f);
      setMsg({ tipo: r.erros.length ? 'erro' : 'ok', texto: `${r.gravadas} nota(s) gravada(s).${r.erros.length ? ` Atenção — ${r.erros.slice(0, 6).join('; ')}` : ''}` });
      await carregar();
    } catch (e) {
      setMsg(mensagemDeErro(e));
    } finally {
      if (arquivo.current) arquivo.current.value = '';
    }
  };

  /** Enter desce para o aluno de baixo (mesmo trimestre), como numa planilha. */
  const enter = (e: React.KeyboardEvent<HTMLInputElement>, idx: number, t: number) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const ativos = tela.alunos.filter((a) => a.situacao === 'ativo');
    const prox = ativos[idx + 1];
    if (prox) (document.getElementById(`nota-${prox.id}-${t}`) as HTMLInputElement | null)?.select();
  };

  const ativos = tela.alunos.filter((a) => a.situacao === 'ativo');
  return (
    <div className="space-y-4">
      {cabecalho}
      <Botoes rotulo="Matéria" atual={tela.materia} onChange={(m) => setMateria(m)} itens={tela.materias.map((m) => [m, catalogo.materias[m]])} />
      <p className="text-sm text-muted-foreground">
        {qtd === 1
          ? `No ${SERIES[tela.serie]} só há nota no ${tela.trimestres[0]}º trimestre (os outros são avaliados pelo parecer). Nota de 0 a 10 (pode usar vírgula); aprovado com ${formatarNota(media)}. Deixe vazio para apagar a nota.`
          : `Notas de 0 a 10 (pode usar vírgula). Aprovado com média ${formatarNota(media)} — soma de ${formatarNota(media * 3)} pontos nos três trimestres. Deixe vazio para apagar a nota.`}
      </p>
      <Aviso msg={msg} onFechar={() => setMsg(null)} />
      {tela.alunos.length === 0 ? (
        <ScreenState type="empty" title="Nenhum aluno nesta turma." />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">Nº</TableHead>
                <TableHead>Aluno</TableHead>
                {tela.trimestres.map((t) => (
                  <TableHead key={t} className="w-24 text-right">
                    {t}º tri
                  </TableHead>
                ))}
                <TableHead className="text-right">Média</TableHead>
                <TableHead className="text-right">Situação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tela.alunos.map((a) => {
                const ativo = a.situacao === 'ativo';
                const s = situacao(a.id);
                return (
                  <TableRow key={a.id} className={ativo ? undefined : 'opacity-60'}>
                    <TableCell className="text-right font-mono tabular-nums">{a.numero ?? ''}</TableCell>
                    <TableCell>
                      {a.nome}
                      {!ativo && <small className="text-muted-foreground"> ({a.situacao})</small>}
                    </TableCell>
                    {tela.trimestres.map((t) => {
                      const v = valores[`${a.id}-${t}`] ?? '';
                      return (
                        <TableCell key={t} className="text-right">
                          {ativo ? (
                            <Input
                              id={`nota-${a.id}-${t}`}
                              value={v}
                              inputMode="decimal"
                              autoComplete="off"
                              aria-label={`${t}º trimestre de ${a.nome}`}
                              aria-invalid={lerNota(v) === undefined}
                              className="ml-auto h-8 w-20 text-right font-mono tabular-nums"
                              onChange={(e) => setValores((x) => ({ ...x, [`${a.id}-${t}`]: e.target.value }))}
                              onKeyDown={(e) => enter(e, ativos.indexOf(a), t)}
                            />
                          ) : (
                            <span className="font-mono tabular-nums">{v}</span>
                          )}
                        </TableCell>
                      );
                    })}
                    <TableCell className={`text-right font-mono tabular-nums ${s.media !== null && s.media < media ? 'text-rose-600' : 'text-emerald-600'}`}>{s.media === null ? '' : fmt1(s.media)}</TableCell>
                    <TableCell className="text-right">{s.el}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="sticky bottom-0 border-t border-border bg-background py-3">
            <Button onClick={() => void salvar()} disabled={salvando}>
              {salvando ? 'Salvando…' : 'Salvar notas'}
            </Button>
          </div>
          <Card className="space-y-2 p-4">
            <h3 className="font-semibold">Lançar por planilha</h3>
            <p className="text-sm text-muted-foreground">
              1. Baixe a planilha de {catalogo.materias[tela.materia]} (já vem com os alunos e as notas lançadas) · 2. Preencha {qtd === 1 ? `a coluna nota_${tela.trimestres[0]}tri` : 'as colunas nota_1tri, nota_2tri e nota_3tri'} · 3. Salve como <b>CSV</b> e envie aqui. Célula vazia não apaga nota já lançada.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => void parecerApi.baixarPlanilhaNotas(turmaId, tela.materia).catch((e: unknown) => setMsg(mensagemDeErro(e)))}>
                ⬇ Baixar planilha
              </Button>
              <Input ref={arquivo} type="file" accept=".csv,text/csv" aria-label="Planilha CSV de notas" className="max-w-xs" onChange={(e) => void importar(e.target.files?.[0])} />
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default Notas;
