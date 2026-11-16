import React, { useEffect, useMemo, useState } from 'react';
import { Button, Card, ScreenState, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Textarea } from '@sysgov/ui';
import { SERIES, idade, parecerApi, type CodigoMateria, type Conceito, type TelaAvaliacao } from '../api';
import { Aviso, BotaoWhats, Botoes, FotoAluno, corTurno, mensagemDeErro, useParecer, type Mensagem } from './comum';

const CONCEITOS: Conceito[] = ['A', 'EP', 'NA'];
const VARIANTE: Record<Conceito, 'success' | 'secondary' | 'destructive'> = { A: 'success', EP: 'secondary', NA: 'destructive' };
const COR_MINI: Record<Conceito, string> = {
  A: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
  EP: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
  NA: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300',
};

const Mini: React.FC<{ c?: Conceito }> = ({ c }) =>
  c ? <span className={`inline-block rounded px-1.5 py-0.5 font-mono text-xs font-bold ${COR_MINI[c]}`}>{c}</span> : <span className="text-muted-foreground">–</span>;

/** Avaliar (avaliar.php): conceitos por habilidade e observação; grava sozinho ao trocar de matéria, trimestre ou aluno. */
const Avaliar: React.FC<{ alunoId: number; materiaInicial?: string }> = ({ alunoId, materiaInicial }) => {
  const { ir, imprimir, catalogo } = useParecer();
  const [tri, setTri] = useState(1);
  const [materia, setMateria] = useState<string | undefined>(materiaInicial);
  const [tela, setTela] = useState<TelaAvaliacao | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [conceitos, setConceitos] = useState<Record<number, string>>({});
  const [obs, setObs] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<Mensagem>(null);

  useEffect(() => {
    let ativo = true;
    parecerApi
      .avaliacao(alunoId, tri, materia)
      .then((t) => {
        if (!ativo) return;
        setTela(t);
        setErro(null);
        setConceitos(Object.fromEntries(t.habilidades.map((h) => [h.id, h.conceitos[String(t.tri) as '1'] ?? ''])));
        setObs(t.observacao);
      })
      .catch((e: unknown) => ativo && setErro(mensagemDeErro(e)?.texto ?? 'Erro'));
    return () => {
      ativo = false;
    };
  }, [alunoId, tri, materia]);

  const inicial = useMemo(
    () => (tela ? JSON.stringify([Object.fromEntries(tela.habilidades.map((h) => [h.id, h.conceitos[String(tela.tri) as '1'] ?? ''])), tela.observacao]) : ''),
    [tela],
  );
  const alterado = tela !== null && tela.tri > 0 && JSON.stringify([conceitos, obs]) !== inicial;

  // Aviso do navegador ao sair com alterações não salvas.
  useEffect(() => {
    if (!alterado) return undefined;
    const aviso = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', aviso);
    return () => window.removeEventListener('beforeunload', aviso);
  }, [alterado]);

  if (erro !== null) return <ScreenState type="error" title="Não foi possível abrir a avaliação" description={erro} />;
  if (tela === null) return <ScreenState type="loading" />;
  const { aluno } = tela;

  const salvar = async (): Promise<boolean> => {
    if (!alterado) return true;
    setSalvando(true);
    try {
      await parecerApi.salvarAvaliacao(aluno.id, { tri: tela.tri, materia: tela.materia, conceitos, observacao: obs });
      setMsg({ tipo: 'ok', texto: 'Avaliação salva.' });
      return true;
    } catch (e) {
      setMsg(mensagemDeErro(e));
      return false;
    } finally {
      setSalvando(false);
    }
  };
  /** Salvamento automático antes de navegar (como o PHP). */
  const depoisDeSalvar = (acao: () => void) => async () => {
    if (await salvar()) acao();
  };
  const recarregar = () => {
    setTela(null);
    parecerApi.avaliacao(alunoId, tri, materia).then((t) => {
      setTela(t);
      setConceitos(Object.fromEntries(t.habilidades.map((h) => [h.id, h.conceitos[String(t.tri) as '1'] ?? ''])));
      setObs(t.observacao);
    }).catch((e: unknown) => setErro(mensagemDeErro(e)?.texto ?? 'Erro'));
  };

  const proxMat = tela.materias[tela.materias.indexOf(tela.materia) + 1] as CodigoMateria | undefined;
  const nomeMat = catalogo.materias[tela.materia];

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center gap-4 border-l-4 p-4" style={{ borderLeftColor: corTurno(aluno.turno) }}>
        <FotoAluno id={aluno.id} nome={aluno.nome} temFoto={aluno.tem_foto} tamanho="h-14 w-14" />
        <div className="min-w-0 flex-1">
          <div className="text-lg font-semibold">{aluno.nome}</div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <strong className="text-foreground">
              {SERIES[aluno.serie]} · {aluno.turma}
            </strong>
            <span>{aluno.turno}</span>
            <span title={aluno.nascimento ?? undefined}>{idade(aluno.nascimento) ? `🎂 ${idade(aluno.nascimento)}` : 'idade não informada'}</span>
            <BotaoWhats tel={aluno.celular} rotulo="Responsável" />
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Button variant="outline" size="sm" onClick={depoisDeSalvar(() => ir({ aba: 'inicio', tela: 'alunos', turmaId: aluno.turma_id }))}>
          ← Voltar à turma
        </Button>
        {tela.anterior !== null && (
          <Button variant="outline" size="sm" onClick={depoisDeSalvar(() => ir({ aba: 'inicio', tela: 'avaliar', alunoId: tela.anterior as number, materia: tela.materia }))}>
            ‹ Aluno anterior
          </Button>
        )}
        {tela.proximo !== null && (
          <Button variant="outline" size="sm" onClick={depoisDeSalvar(() => ir({ aba: 'inicio', tela: 'avaliar', alunoId: tela.proximo as number, materia: tela.materia }))}>
            Próximo aluno ›
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={depoisDeSalvar(() => imprimir({ alunoId: aluno.id, tri: Math.max(1, tela.tri) }))}>
          🖨 Imprimir parecer
        </Button>
        <Button variant="outline" size="sm" onClick={depoisDeSalvar(() => ir({ aba: 'ocorrencias', alunoId: aluno.id, turmaId: aluno.turma_id }))}>
          Ocorrências
        </Button>
      </div>

      <Aviso msg={msg} onFechar={() => setMsg(null)} />

      <Botoes
        rotulo="Trimestre"
        atual={tela.tri}
        onChange={(t) => void depoisDeSalvar(() => setTri(t))()}
        itens={[[1, '1º trimestre'], [2, '2º trimestre'], [3, '3º trimestre'], [0, '☰ Geral']]}
      />
      <Botoes
        rotulo="Matéria"
        atual={tela.materia}
        onChange={(m) => void depoisDeSalvar(() => setMateria(m))()}
        itens={tela.materias.map((m) => {
          const p = tela.progresso[m];
          const completo = p && p.feitos >= p.total;
          return [m, <span key={m}>{catalogo.materias[m]} <small className={`font-mono tabular-nums ${completo ? 'text-emerald-600 dark:text-emerald-400' : 'opacity-70'}`}>{p?.feitos ?? 0}/{p?.total ?? 0}</small></span>];
        })}
      />
      <p className="text-xs text-muted-foreground">A = Atingiu · EP = Em processo · NA = Não atingiu</p>

      {tela.habilidades.length === 0 ? (
        <ScreenState
          type="empty"
          title={tela.tri === 0 ? `Nenhuma habilidade de ${nomeMat} no ${SERIES[aluno.serie]}.` : `Nenhuma habilidade de ${nomeMat} marcada para o ${tela.tri}º trimestre no ${SERIES[aluno.serie]}.`}
          actionLabel="Ver conteúdos"
          onAction={() => ir({ aba: 'conteudos', serie: aluno.serie, materia: tela.materia })}
        />
      ) : tela.tri === 0 ? (
        <>
          <p className="text-sm text-muted-foreground">Visão geral dos três trimestres (só consulta). Para lançar ou mudar um conceito, abra o trimestre. Célula cinza = habilidade não trabalhada naquele trimestre.</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Habilidade</TableHead>
                {[1, 2, 3].map((t) => (
                  <TableHead key={t} className="w-28 text-center">
                    {t}º trimestre
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {tela.habilidades.map((h) => (
                <TableRow key={h.id}>
                  <TableCell>{h.descricao}</TableCell>
                  {(['1', '2', '3'] as const).map((t) => (
                    <TableCell key={t} className={`text-center ${h.trimestres.includes(t) ? '' : 'bg-muted'}`} title={h.trimestres.includes(t) ? undefined : 'Não trabalhada neste trimestre'}>
                      <Mini c={h.conceitos[t]} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <section className="space-y-2" aria-labelledby="obs-geral">
            <h3 id="obs-geral" className="text-sm font-medium">
              Observações de {nomeMat} <small className="font-normal text-muted-foreground">(só consulta; para escrever ou mudar, abra o trimestre)</small>
            </h3>
            {([1, 2, 3] as const).map((t) => {
              const texto = tela.observacoes?.[String(t) as '1'];
              return (
                <Card key={t} className="gap-1 p-3 text-sm">
                  <div className="font-medium">{t}º trimestre</div>
                  {texto ? <p className="whitespace-pre-wrap">{texto}</p> : <p className="text-muted-foreground">Sem observação.</p>}
                </Card>
              );
            })}
          </section>
        </>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void salvar().then((ok) => ok && recarregar());
          }}
          className="space-y-4"
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Habilidade</TableHead>
                {tela.colunas.map((t) => (
                  <TableHead key={t} className={`text-center ${t === tela.tri ? 'w-56' : 'w-24'}`}>
                    {t}º trimestre
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {tela.habilidades.map((h) => (
                <TableRow key={h.id}>
                  <TableCell>{h.descricao}</TableCell>
                  {tela.colunas.map((t) =>
                    t === tela.tri ? (
                      <TableCell key={t} className="text-center">
                        <div className="inline-flex gap-1" role="radiogroup" aria-label={`Conceito: ${h.descricao}`}>
                          {CONCEITOS.map((c) => (
                            <Button
                              key={c}
                              type="button"
                              size="xs"
                              role="radio"
                              aria-checked={conceitos[h.id] === c}
                              title={catalogo.conceitos[c]}
                              variant={conceitos[h.id] === c ? VARIANTE[c] : 'outline'}
                              onClick={() => setConceitos((v) => ({ ...v, [h.id]: c }))}
                              className="min-w-9 font-mono"
                            >
                              {c}
                            </Button>
                          ))}
                          <Button type="button" size="xs" role="radio" aria-checked={!conceitos[h.id]} title="Sem avaliação" variant={!conceitos[h.id] ? 'secondary' : 'ghost'} onClick={() => setConceitos((v) => ({ ...v, [h.id]: '' }))}>
                            –
                          </Button>
                        </div>
                      </TableCell>
                    ) : (
                      <TableCell key={t} className="text-center">
                        {h.trimestres.includes(String(t)) && <Mini c={h.conceitos[String(t) as '1']} />}
                      </TableCell>
                    ),
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <label className="block space-y-1 text-sm font-medium">
            <span>
              Observação de {nomeMat} – {tela.tri}º trimestre <small className="font-normal text-muted-foreground">(entra no fim do texto da matéria no parecer impresso)</small>
            </span>
            <Textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={4} maxLength={2000} placeholder="Escreva aqui as observações sobre o aluno neste trimestre..." spellCheck lang="pt-BR" />
          </label>
          <div className="sticky bottom-0 flex flex-wrap gap-2 border-t border-border bg-background py-3">
            <Button type="submit" disabled={salvando}>
              {salvando ? 'Salvando…' : 'Salvar'}
            </Button>
            {proxMat && (
              <Button type="button" variant="outline" disabled={salvando} onClick={() => void depoisDeSalvar(() => setMateria(proxMat))()}>
                Salvar e ir para {catalogo.materias[proxMat]}
              </Button>
            )}
            {alterado && <span className="self-center text-xs text-amber-700 dark:text-amber-400">Alterações não salvas</span>}
          </div>
        </form>
      )}
    </div>
  );
};

export default Avaliar;
