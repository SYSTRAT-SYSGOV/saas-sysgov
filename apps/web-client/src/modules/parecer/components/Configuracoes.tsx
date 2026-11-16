import React, { useState } from 'react';
import { Badge, Button, ConfirmDialog, Field, Modal, ScreenState, Select, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@sysgov/ui';
import { SERIES, parecerApi, type TurmaConfig } from '../api';
import { Aviso, Carga, mensagemDeErro, useCarga, useParecer, type Mensagem } from './comum';

/**
 * Turmas e funções (turmas.php): as turmas vêm do Cadastro Escolar; aqui o gestor define a série (1º ao 5º ano)
 * e quem ocupa cada função. Só turmas com série aparecem no parecer.
 */
const Configuracoes: React.FC = () => {
  const { ano, catalogo } = useParecer();
  const carga = useCarga(() => parecerApi.configuracoes(ano), [ano]);
  const [editar, setEditar] = useState<TurmaConfig | null>(null);
  const [remover, setRemover] = useState<TurmaConfig | null>(null);
  const [msg, setMsg] = useState<Mensagem>(null);

  return (
    <Carga carga={carga}>
      {(d) => {
        const nome = new Map(d.equipe.map((u) => [u.id, u.nome]));
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              As turmas vêm do Cadastro Escolar ({ano}). Defina a série das turmas do 1º ao 5º ano e quem ocupa cada função: o professor regente avalia Língua Portuguesa, Matemática e Ciências e cobre as matérias sem professor próprio. Os nomes saem nas assinaturas do parecer.
            </p>
            <Aviso msg={msg} onFechar={() => setMsg(null)} />
            {d.turmas.length === 0 ? (
              <ScreenState type="empty" title={`Nenhuma turma cadastrada em ${ano}.`} description="Cadastre as turmas no Cadastro Escolar." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Turma</TableHead>
                    <TableHead>Turno</TableHead>
                    <TableHead>Série</TableHead>
                    <TableHead>Regente</TableHead>
                    <TableHead>Outras funções</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {d.turmas.map((t) => (
                    <TableRow key={t.turma_id}>
                      <TableCell className="font-medium">{t.nome}</TableCell>
                      <TableCell>{t.turno}</TableCell>
                      <TableCell>{t.serie ? <Badge variant="info">{SERIES[t.serie]}</Badge> : <span className="text-xs text-muted-foreground">fora do parecer</span>}</TableCell>
                      <TableCell>{nome.get(t.funcoes.professor_regente) ?? '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{Object.keys(t.funcoes).filter((f) => f !== 'professor_regente').length} preenchida(s)</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="outline" size="xs" onClick={() => setEditar(t)}>
                            {t.serie ? 'Editar' : 'Incluir no parecer'}
                          </Button>
                          {t.serie && (
                            <Button variant="ghost" size="xs" className="text-destructive" onClick={() => setRemover(t)}>
                              Retirar
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {editar && (
              <EditarTurma
                t={editar}
                equipe={d.equipe}
                funcoes={catalogo.funcoes}
                onFechar={() => setEditar(null)}
                onSalva={() => {
                  setEditar(null);
                  setMsg({ tipo: 'ok', texto: 'Turma atualizada.' });
                  carga.recarregar();
                }}
              />
            )}
            <ConfirmDialog
              open={remover !== null}
              onClose={() => setRemover(null)}
              destructive
              title="Retirar a turma do parecer?"
              description="A turma some das listas do parecer. As avaliações e lançamentos já feitos ficam guardados e voltam se a série for definida de novo."
              confirmLabel="Retirar"
              onConfirm={() => {
                const t = remover;
                setRemover(null);
                if (t)
                  parecerApi
                    .removerConfiguracao(t.turma_id)
                    .then(() => {
                      setMsg({ tipo: 'ok', texto: 'Turma retirada do parecer.' });
                      carga.recarregar();
                    })
                    .catch((e: unknown) => setMsg(mensagemDeErro(e)));
              }}
            />
          </div>
        );
      }}
    </Carga>
  );
};

const EditarTurma: React.FC<{ t: TurmaConfig; equipe: { id: number; nome: string }[]; funcoes: Record<string, { rotulo: string }>; onFechar: () => void; onSalva: () => void }> = ({ t, equipe, funcoes, onFechar, onSalva }) => {
  const [serie, setSerie] = useState<number | null>(t.serie);
  const [valores, setValores] = useState<Record<string, number | null>>({ ...t.funcoes });
  const [erro, setErro] = useState<Mensagem>(null);
  const opcoes = [{ value: 0, label: '— ninguém —' }, ...equipe.map((u) => ({ value: u.id, label: u.nome }))];

  return (
    <Modal
      open
      size="lg"
      onClose={onFechar}
      title={`Turma ${t.nome}`}
      footer={
        <>
          <Button variant="outline" onClick={onFechar}>
            Cancelar
          </Button>
          <Button
            onClick={() =>
              serie
                ? parecerApi.configurar(t.turma_id, serie, valores).then(onSalva).catch((e: unknown) => setErro(mensagemDeErro(e)))
                : setErro({ tipo: 'erro', texto: 'Informe a série da turma.' })
            }
          >
            Salvar
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Aviso msg={erro} />
        </div>
        <Field label="Série" required>
          <Select value={serie} placeholder="Escolha a série" onChange={(v) => setSerie(Number(v))} options={Object.entries(SERIES).map(([s, r]) => ({ value: Number(s), label: r }))} />
        </Field>
        <div />
        {Object.entries(funcoes).map(([f, { rotulo }]) => (
          <Field key={f} label={rotulo}>
            <Select value={valores[f] ?? 0} onChange={(v) => setValores((x) => ({ ...x, [f]: Number(v) || null }))} options={opcoes} />
          </Field>
        ))}
      </div>
    </Modal>
  );
};

export default Configuracoes;
