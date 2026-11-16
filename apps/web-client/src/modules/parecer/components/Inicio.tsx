import React from 'react';
import { Button, Card, KpiCard, ScreenState } from '@sysgov/ui';
import { SERIES, parecerApi } from '../api';
import { CartaoTurma, Carga, corTurno, useCarga, useParecer } from './comum';

const TURNOS = ['Manhã', 'Tarde', 'Integral'];

/** Início (index.php): habilidades por série, escolha do turno e as turmas do turno. */
const Inicio: React.FC<{ turno?: string }> = ({ turno }) => {
  const { ano, ir, catalogo } = useParecer();
  const carga = useCarga(() => parecerApi.turmas(ano), [ano]);

  return (
    <Carga carga={carga}>
      {(d) => {
        const turnos = Array.from(new Set([...TURNOS, ...d.turmas.map((t) => t.turno ?? 'Sem turno')]));
        const resumo = (tu: string) => {
          const ts = d.turmas.filter((t) => (t.turno ?? 'Sem turno') === tu);
          return { turmas: ts.length, alunos: ts.reduce((s, t) => s + t.alunos_ativos, 0) };
        };
        return (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {Object.entries(SERIES).map(([s, rot]) => (
                <button key={s} type="button" className="text-left" onClick={() => ir({ aba: 'conteudos', serie: Number(s) })}>
                  <KpiCard title={rot} value={String(d.habilidades_por_serie[s] ?? 0)} subtitle="habilidades" />
                </button>
              ))}
            </div>

            {d.turmas.length === 0 ? (
              <ScreenState
                type="empty"
                title={`Nenhuma turma do parecer em ${ano}`}
                description={catalogo.gestor ? 'Defina a série (1º ao 5º ano) das turmas do Cadastro Escolar em "Turmas e funções".' : 'Peça à gestão para incluir você numa turma.'}
                actionLabel={catalogo.gestor ? 'Turmas e funções' : undefined}
                onAction={catalogo.gestor ? () => ir({ aba: 'configuracoes' }) : undefined}
              />
            ) : !turno ? (
              <section className="space-y-3">
                <h2 className="text-lg font-semibold">Escolha o turno</h2>
                <div className="grid gap-3 sm:grid-cols-3">
                  {turnos.map((tu) => {
                    const r = resumo(tu);
                    if (r.turmas === 0 && !TURNOS.includes(tu)) return null;
                    return r.turmas > 0 ? (
                      <button key={tu} type="button" className="text-left" onClick={() => ir({ aba: 'inicio', turno: tu })}>
                        <Card className="border-l-4 p-5 transition hover:shadow-md" style={{ borderLeftColor: corTurno(tu) }}>
                          <strong className="block text-lg" style={{ color: corTurno(tu) }}>{tu}</strong>
                          <span className="text-sm text-muted-foreground">
                            <b className="font-mono tabular-nums">{r.turmas}</b> turma{r.turmas > 1 ? 's' : ''} · <b className="font-mono tabular-nums">{r.alunos}</b> aluno{r.alunos === 1 ? '' : 's'}
                          </span>
                        </Card>
                      </button>
                    ) : (
                      <Card key={tu} className="border-l-4 p-5 opacity-60" style={{ borderLeftColor: corTurno(tu) }}>
                        <strong className="block text-lg">{tu}</strong>
                        <span className="text-sm text-muted-foreground">Sem turmas</span>
                      </Card>
                    );
                  })}
                </div>
              </section>
            ) : (
              <section className="space-y-3">
                <Button variant="outline" size="sm" onClick={() => ir({ aba: 'inicio' })}>
                  ← Trocar turno
                </Button>
                <h2 className="text-lg font-semibold">
                  Turmas · <span style={{ color: corTurno(turno) }}>{turno}</span>
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {d.turmas
                    .filter((t) => (t.turno ?? 'Sem turno') === turno)
                    .map((t) => (
                      <CartaoTurma key={t.turma_id} turma={t} mostrarRegente onClick={() => ir({ aba: 'inicio', tela: 'alunos', turmaId: t.turma_id })} />
                    ))}
                </div>
              </section>
            )}
          </div>
        );
      }}
    </Carga>
  );
};

export default Inicio;
