import React, { useEffect, useState } from 'react';
import { Button, Card, ConfirmDialog, Input, ScreenState, Select, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@sysgov/ui';
import { dataBr, hojeIso, parecerApi, type ChamadaDia } from '../api';
import { AbasTurma, Aviso, BotaoWhats, Botoes, Carga, EscolherTurma, FotoAluno, mensagemDeErro, useCarga, useParecer, type Mensagem } from './comum';

const MESES_ABREV = ['', 'jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];
const MESES = ['', 'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

/** Frequência diária (frequencia.php): C/F por aluno; cada falta conta as aulas do dia. */
const Frequencia: React.FC<{ turmaId?: number }> = ({ turmaId }) => {
  const { ir } = useParecer();
  if (!turmaId) return <EscolherTurma texto="Escolha a turma para fazer a chamada ou consultar a frequência." onEscolher={(t) => ir({ aba: 'frequencia', turmaId: t.turma_id })} />;
  return <FrequenciaDaTurma key={turmaId} turmaId={turmaId} />;
};

const FrequenciaDaTurma: React.FC<{ turmaId: number }> = ({ turmaId }) => {
  const [aba, setAba] = useState<'alunos' | 'aulas'>('alunos');
  const [data, setData] = useState(hojeIso());
  const turma = useCarga(() => parecerApi.alunos(turmaId), [turmaId]);

  return (
    <div className="space-y-4">
      {turma.dados && <AbasTurma turma={{ id: turmaId, nome: turma.dados.turma.nome, serie: turma.dados.turma.serie, turno: turma.dados.turma.turno }} atual="frequencia" />}
      <Botoes rotulo="Consultar" atual={aba} onChange={setAba} itens={[['alunos', '🎓 Alunos'], ['aulas', '📅 Aulas']]} />
      {aba === 'alunos' ? (
        <Grade
          turmaId={turmaId}
          escola={turma.dados?.turma.nome ?? ''}
          onEditarDia={(d) => {
            setData(d);
            setAba('aulas');
          }}
        />
      ) : (
        <Chamada turmaId={turmaId} data={data} onData={setData} />
      )}
    </div>
  );
};

/** Aba Alunos: grade de dias do período, faltas em aulas e % de frequência (abaixo de 75% em vermelho). */
const Grade: React.FC<{ turmaId: number; escola: string; onEditarDia: (d: string) => void }> = ({ turmaId, onEditarDia }) => {
  const [tri, setTri] = useState<string | undefined>();
  const carga = useCarga(() => parecerApi.grade(turmaId, tri), [turmaId, tri]);
  return (
    <Carga carga={carga}>
      {(g) => {
        const mapa = new Map(g.registros.map((r) => [`${r.aluno_id}|${r.data}`, r]));
        return (
          <Card className="space-y-3 p-4">
            <div className="w-48">
              <Select
                value={g.tri}
                onChange={(v) => setTri(v)}
                options={[...Object.keys(g.periodos).map((t) => ({ value: t, label: `${t}º Trimestre` })), { value: 'ano', label: 'Ano todo' }]}
              />
            </div>
            {g.dias.length === 0 ? (
              <ScreenState type="empty" title="Nenhuma chamada lançada neste período." description="Use a aba Aulas para lançar." />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nº</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Situação</TableHead>
                        {g.dias.map((d) => (
                          <TableHead key={d} className="px-1 text-center">
                            <Button variant="ghost" size="icon-xs" title="Editar a chamada deste dia" aria-label={`Editar a chamada de ${dataBr(d)}`} onClick={() => onEditarDia(d)}>
                              ✎
                            </Button>
                            <b className="block font-mono tabular-nums">{d.slice(8, 10)}</b>
                            <small>{MESES_ABREV[Number(d.slice(5, 7))]}</small>
                          </TableHead>
                        ))}
                        <TableHead className="text-right">Faltas*</TableHead>
                        <TableHead className="text-right">Freq.</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {g.alunos.map((a, i) => {
                        let faltas = 0;
                        let aulas = 0;
                        const diasF: string[] = [];
                        const celulas = g.dias.map((d) => {
                          const f = mapa.get(`${a.id}|${d}`);
                          if (f) {
                            faltas += f.faltas;
                            aulas += f.aulas;
                            if (f.status === 'F') diasF.push(dataBr(d).slice(0, 5));
                          }
                          return (
                            <TableCell key={d} className="px-1 text-center">
                              {f ? (
                                <span className={`inline-block w-6 rounded font-mono text-xs font-bold ${f.status === 'F' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'}`}>{f.status}</span>
                              ) : (
                                <span className="text-muted-foreground">–</span>
                              )}
                            </TableCell>
                          );
                        });
                        const pct = aulas ? 100 * (1 - faltas / aulas) : null;
                        return (
                          <TableRow key={a.id}>
                            <TableCell className="font-mono tabular-nums">{a.numero ?? i + 1}</TableCell>
                            <TableCell className="whitespace-nowrap uppercase">{a.nome}</TableCell>
                            <TableCell className="text-xs uppercase">{a.situacao}</TableCell>
                            {celulas}
                            <TableCell className="text-right font-mono tabular-nums">{faltas}</TableCell>
                            <TableCell className={`text-right font-mono tabular-nums ${pct !== null && pct < 75 ? 'font-semibold text-rose-600' : ''}`}>{pct === null ? '–' : `${pct.toFixed(0)}%`}</TableCell>
                            <TableCell>{diasF.length > 0 && <BotaoWhats tel={a.celular} rotulo="Avisar" mensagem={`Olá! ${a.nome} faltou nos dias ${diasF.join(', ')}. Podemos conversar?`} />}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <p className="text-xs text-muted-foreground">* Faltas em aulas: cada dia de falta conta as aulas daquele dia. Frequência abaixo de 75% em vermelho. Clique no ✎ do dia para corrigir a chamada.</p>
              </>
            )}
          </Card>
        );
      }}
    </Carga>
  );
};

/** Aba Aulas: calendário do mês e a chamada do dia. */
const Chamada: React.FC<{ turmaId: number; data: string; onData: (d: string) => void }> = ({ turmaId, data, onData }) => {
  const hoje = hojeIso();
  const [mes, setMes] = useState(data.slice(0, 7));
  const [dia, setDia] = useState<ChamadaDia | null>(null);
  const [status, setStatus] = useState<Record<number, 'C' | 'F'>>({});
  const [aulas, setAulas] = useState('5');
  const [msg, setMsg] = useState<Mensagem>(null);
  const [apagar, setApagar] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const carregar = () =>
    parecerApi
      .chamada(turmaId, data, mes)
      .then((c) => {
        setDia(c);
        setStatus(Object.fromEntries(c.alunos.map((a) => [a.id, a.status])));
        setAulas(String(c.aulas));
      })
      .catch((e: unknown) => setMsg(mensagemDeErro(e)));
  useEffect(() => {
    void carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turmaId, data, mes]);

  const salvar = async () => {
    setSalvando(true);
    try {
      const faltaram = Object.entries(status).filter(([, s]) => s === 'F').map(([id]) => Number(id));
      const r = await parecerApi.salvarChamada(turmaId, data, Math.max(1, Math.min(10, Number(aulas) || 5)), faltaram);
      setMsg({ tipo: 'ok', texto: `Chamada de ${dataBr(data)} salva: ${r.faltas} falta(s).` });
      await carregar();
    } catch (e) {
      setMsg(mensagemDeErro(e));
    } finally {
      setSalvando(false);
    }
  };

  const [a, m] = mes.split('-').map(Number);
  const primeiro = new Date(a, m - 1, 1).getDay();
  const diasNoMes = new Date(a, m, 0).getDate();
  const mover = (delta: number) => {
    const d = new Date(a, m - 1 + delta, 1);
    setMes(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };
  const lancados = new Set(dia?.lancados ?? []);
  const faltas = Object.values(status).filter((s) => s === 'F').length;

  return (
    <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
      <Card className="space-y-3 p-4">
        <div>
          <b className="block">📅 Data da chamada</b>
          <small className="text-muted-foreground">Selecione o dia no calendário abaixo</small>
        </div>
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon-sm" aria-label="Mês anterior" onClick={() => mover(-1)}>
            ‹
          </Button>
          <b className="uppercase">
            {MESES[m]} {a}
          </b>
          <Button variant="ghost" size="icon-sm" aria-label="Próximo mês" disabled={mes >= hoje.slice(0, 7)} onClick={() => mover(1)}>
            ›
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
            <div key={d} className="font-medium text-muted-foreground">
              {d}
            </div>
          ))}
          {Array.from({ length: primeiro }, (_, i) => (
            <div key={`v${i}`} />
          ))}
          {Array.from({ length: diasNoMes }, (_, i) => {
            const dt = `${mes}-${String(i + 1).padStart(2, '0')}`;
            return (
              <Button
                key={dt}
                size="icon-sm"
                disabled={dt > hoje}
                variant={dt === data ? 'primary' : lancados.has(dt) ? 'success' : 'ghost'}
                aria-pressed={dt === data}
                aria-label={`${dataBr(dt)}${lancados.has(dt) ? ', chamada salva' : ''}`}
                onClick={() => onData(dt)}
                className="font-mono tabular-nums"
              >
                {i + 1}
              </Button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">Verde: chamada salva · Azul: dia selecionado</p>
      </Card>

      <Card className="space-y-3 p-4">
        <Aviso msg={msg} onFechar={() => setMsg(null)} />
        {dia === null ? (
          <ScreenState type="loading" />
        ) : dia.alunos.length === 0 ? (
          <ScreenState type="empty" title="Nenhum aluno ativo nesta turma." />
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <b className="font-mono tabular-nums">{dataBr(data)}</b>{' '}
                <span className="text-xs text-muted-foreground">{dia.salvo ? 'chamada já lançada — pode corrigir e salvar de novo' : 'chamada ainda não lançada'}</span>
              </div>
              <label className="text-sm">
                Aulas no dia
                <Input type="number" min={1} max={10} value={aulas} onChange={(e) => setAulas(e.target.value)} className="w-20 font-mono" />
              </label>
              <Button variant="outline" size="sm" onClick={() => setStatus(Object.fromEntries(dia.alunos.map((x) => [x.id, 'C'])))}>
                Todos presentes
              </Button>
              <span className="text-xs text-muted-foreground" aria-live="polite">
                {dia.alunos.length - faltas} presente(s) · {faltas} falta(s)
              </span>
            </div>
            <ul className="divide-y divide-border">
              {dia.alunos.map((al, i) => (
                <li key={al.id} className={`flex flex-wrap items-center gap-3 py-2 ${status[al.id] === 'F' ? 'bg-rose-50/60 dark:bg-rose-950/20' : ''}`}>
                  <span className="w-8 font-mono tabular-nums text-muted-foreground">{String(al.numero ?? i + 1).padStart(2, '0')}</span>
                  <FotoAluno id={al.id} nome={al.nome} temFoto={al.tem_foto} tamanho="h-8 w-8" />
                  <b className="min-w-0 flex-1">{al.nome}</b>
                  {status[al.id] === 'F' && <BotaoWhats tel={al.celular} rotulo="Avisar" mensagem={`Olá! Informamos que ${al.nome} não compareceu à aula em ${dataBr(data)}.`} />}
                  <div className="flex gap-1" role="radiogroup" aria-label={`Presença de ${al.nome}`}>
                    <Button size="sm" role="radio" aria-checked={status[al.id] === 'C'} variant={status[al.id] === 'C' ? 'success' : 'outline'} onClick={() => setStatus((s) => ({ ...s, [al.id]: 'C' }))} title="Compareceu">
                      ✓ C
                    </Button>
                    <Button size="sm" role="radio" aria-checked={status[al.id] === 'F'} variant={status[al.id] === 'F' ? 'destructive' : 'outline'} onClick={() => setStatus((s) => ({ ...s, [al.id]: 'F' }))} title="Faltou">
                      ✕ F
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="sticky bottom-0 flex justify-end gap-2 border-t border-border bg-background py-3">
              {dia.salvo && dia.pode_apagar && (
                <Button variant="outline" onClick={() => setApagar(true)}>
                  Apagar chamada do dia
                </Button>
              )}
              <Button onClick={() => void salvar()} disabled={salvando}>
                {salvando ? 'Salvando…' : 'Salvar chamada'}
              </Button>
            </div>
          </>
        )}
      </Card>
      <ConfirmDialog
        open={apagar}
        onClose={() => setApagar(false)}
        destructive
        title="Apagar a chamada deste dia?"
        description={`A chamada de ${dataBr(data)} será apagada para toda a turma.`}
        confirmLabel="Apagar"
        onConfirm={() => {
          setApagar(false);
          parecerApi
            .apagarChamada(turmaId, data)
            .then(() => {
              setMsg({ tipo: 'ok', texto: 'Chamada do dia apagada.' });
              return carregar();
            })
            .catch((e: unknown) => setMsg(mensagemDeErro(e)));
        }}
      />
    </div>
  );
};

export default Frequencia;
