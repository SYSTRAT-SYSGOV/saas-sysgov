import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Eye, EyeOff, Pencil, Trash2 } from 'lucide-react';
import { Button, Card, Checkbox, ConfirmDialog, Field, Input, Modal, ScreenState, Select, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Textarea } from '@sysgov/ui';
import { SERIES, parecerApi, type Habilidade, type ItemBncc, type TelaConteudos } from '../api';
import { Aviso, Botoes, mensagemDeErro, useParecer, type Mensagem } from './comum';

const TRIS = [1, 2, 3];

/** Conteúdos por matéria (conteudos.php): gestor edita; professor consulta as séries e matérias das suas turmas. */
const Conteudos: React.FC<{ serieInicial?: number; materiaInicial?: string }> = ({ serieInicial, materiaInicial }) => {
  const { catalogo } = useParecer();
  const [serie, setSerie] = useState<number | undefined>(serieInicial);
  const [materia, setMateria] = useState<string | undefined>(materiaInicial);
  const [tela, setTela] = useState<TelaConteudos | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [msg, setMsg] = useState<Mensagem>(null);
  const [marcados, setMarcados] = useState<Record<number, Set<number>>>({});
  const [editar, setEditar] = useState<Habilidade | null>(null);
  const [excluir, setExcluir] = useState<Habilidade | null>(null);
  const [bncc, setBncc] = useState(false);

  const carregar = () =>
    parecerApi
      .conteudos(serie, materia)
      .then((t) => {
        setTela(t);
        setErro(null);
        setMarcados(Object.fromEntries(t.habilidades.map((h) => [h.id, new Set(h.trimestres.split('').map(Number))])));
      })
      .catch((e: unknown) => setErro(mensagemDeErro(e)?.texto ?? 'Erro'));
  useEffect(() => {
    void carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serie, materia]);

  const trisAlterados = useMemo(() => (tela ? tela.habilidades.filter((h) => [...(marcados[h.id] ?? [])].sort().join('') !== h.trimestres).length : 0), [tela, marcados]);

  if (erro !== null) return <ScreenState type="error" title="Não foi possível abrir os conteúdos" description={erro} />;
  if (tela === null) return <ScreenState type="loading" />;
  const pode = tela.pode_editar;
  const nomeMat = catalogo.materias[tela.materia];

  const acao = async (fn: () => Promise<unknown>, ok?: string) => {
    try {
      await fn();
      if (ok) setMsg({ tipo: 'ok', texto: ok });
      await carregar();
    } catch (e) {
      setMsg(mensagemDeErro(e));
    }
  };
  /** Salva os trimestres alterados antes de trocar de série ou matéria (como o PHP). */
  const trocar = async (fn: () => void) => {
    if (pode && trisAlterados > 0) await salvarTris();
    fn();
  };
  const salvarTris = async () => {
    try {
      const r = await parecerApi.salvarTrimestres(tela.serie, tela.materia, Object.fromEntries(Object.entries(marcados).map(([id, s]) => [id, [...s]])));
      setMsg(
        r.vazias
          ? { tipo: 'erro', texto: `Trimestres salvos. ${r.vazias} habilidade(s) ficaram sem nenhum trimestre marcado e não foram alteradas.` }
          : { tipo: 'ok', texto: r.alteradas ? `Trimestres salvos (${r.alteradas} habilidade(s) alterada(s)).` : 'Nenhuma alteração nos trimestres.' },
      );
      await carregar();
    } catch (e) {
      setMsg(mensagemDeErro(e));
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Habilidades avaliadas no parecer, por série e matéria.{' '}
        {pode
          ? 'Pedagogos(as), diretores(as) e administradores podem incluir, editar, reordenar e desativar.'
          : 'Aqui você consulta as habilidades das suas matérias e em quais trimestres cada uma é trabalhada. Somente pedagogos(as), diretores(as) e administradores alteram.'}
      </p>
      <Botoes rotulo="Série" atual={tela.serie} onChange={(s) => void trocar(() => setSerie(s))} itens={Object.keys(tela.visiveis).map((s) => [Number(s), SERIES[Number(s)]])} />
      <Botoes
        rotulo="Matéria"
        atual={tela.materia}
        onChange={(m) => void trocar(() => setMateria(m))}
        itens={(tela.visiveis[String(tela.serie)] ?? []).map((m) => [m, <span key={m}>{catalogo.materias[m]} <small className="font-mono opacity-70">{tela.contagem[m] ?? 0}</small></span>])}
      />
      <h2 className="text-lg font-semibold">
        {nomeMat} · {SERIES[tela.serie]}
      </h2>
      <p className="text-sm text-muted-foreground">
        Habilidades ativas por trimestre: 1º tri <b className="font-mono">{tela.por_trimestre['1']}</b> · 2º tri <b className="font-mono">{tela.por_trimestre['2']}</b> · 3º tri <b className="font-mono">{tela.por_trimestre['3']}</b>
      </p>
      <Aviso msg={msg} onFechar={() => setMsg(null)} />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12 text-center">Nº</TableHead>
            <TableHead>Habilidade</TableHead>
            <TableHead className="w-40 text-center">Trimestres</TableHead>
            {pode && <TableHead className="w-44 text-center">Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {tela.habilidades.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                Nenhuma habilidade cadastrada para esta matéria nesta série.
              </TableCell>
            </TableRow>
          )}
          {tela.habilidades.map((h, i) => (
            <TableRow key={h.id} className={h.ativo ? undefined : 'opacity-50'}>
              <TableCell className="text-center font-mono tabular-nums">{i + 1}</TableCell>
              <TableCell>
                {h.descricao} {h.codigo_bncc && <span className="ml-1 rounded bg-muted px-1 font-mono text-xs">{h.codigo_bncc}</span>}
                {!h.ativo && <small className="ml-1 text-muted-foreground">(desativada)</small>}
              </TableCell>
              <TableCell>
                <div className="flex justify-center gap-2">
                  {TRIS.map((t) => (
                    <Checkbox
                      key={t}
                      label={`${t}º`}
                      aria-label={`${t}º trimestre`}
                      disabled={!pode}
                      checked={marcados[h.id]?.has(t) ?? false}
                      onCheckedChange={(v) =>
                        setMarcados((m) => {
                          const s = new Set(m[h.id]);
                          if (v === true) s.add(t);
                          else s.delete(t);
                          return { ...m, [h.id]: s };
                        })
                      }
                    />
                  ))}
                </div>
              </TableCell>
              {pode && (
                <TableCell>
                  <div className="flex justify-center gap-0.5">
                    <Button variant="ghost" size="icon-sm" title="Subir" aria-label="Subir" disabled={i === 0} onClick={() => void acao(() => parecerApi.moverHabilidade(h.id, 'subir'))}>
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" title="Descer" aria-label="Descer" disabled={i === tela.habilidades.length - 1} onClick={() => void acao(() => parecerApi.moverHabilidade(h.id, 'descer'))}>
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" title="Editar" aria-label="Editar" onClick={() => setEditar(h)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" title={h.ativo ? 'Desativar' : 'Ativar'} aria-label={h.ativo ? 'Desativar' : 'Ativar'} onClick={() => void acao(() => parecerApi.alternarHabilidade(h.id))}>
                      {h.ativo ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon-sm" title="Excluir" aria-label="Excluir" className="text-destructive" onClick={() => setExcluir(h)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {pode && tela.habilidades.length > 0 && (
        <div className="flex items-center gap-3">
          <Button disabled={trisAlterados === 0} onClick={() => void salvarTris()}>
            Salvar trimestres
          </Button>
          {trisAlterados > 0 && <span className="text-xs text-amber-700 dark:text-amber-400">{trisAlterados} alteração(ões) não salva(s)</span>}
        </div>
      )}

      {pode && (
        <>
          <Card className="space-y-2 p-4">
            <h3 className="font-semibold">
              🔎 Buscar na BNCC · {nomeMat} · {SERIES[tela.serie]}
            </h3>
            {tela.bncc_configurada ? (
              <Button variant="outline" size="sm" onClick={() => setBncc(true)}>
                Abrir habilidades da BNCC
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">A busca na BNCC está desativada: falta a chave BNCC_API_KEY no servidor. A lista local continua editável.</p>
            )}
          </Card>
          <NovaHabilidade serie={tela.serie} materia={tela.materia} nomeMat={nomeMat} onSalva={(texto) => void acao(async () => undefined, texto)} onErro={setMsg} />
          <CopiarDeOutraSerie serie={tela.serie} materia={tela.materia} nomeMat={nomeMat} onFeito={(t) => void acao(async () => undefined, t)} onErro={setMsg} />
        </>
      )}

      {editar && <EditarHabilidade h={editar} onFechar={() => setEditar(null)} onSalva={() => { setEditar(null); void acao(async () => undefined, 'Habilidade atualizada.'); }} />}
      {bncc && <PainelBncc serie={tela.serie} materia={tela.materia} titulo={`${nomeMat} · ${SERIES[tela.serie]}`} onFechar={() => setBncc(false)} onAdicionadas={(n) => { setBncc(false); void acao(async () => undefined, `${n} habilidade(s) da BNCC adicionada(s) em todos os trimestres. Ajuste os trimestres na tabela se precisar.`); }} />}
      <ConfirmDialog
        open={excluir !== null}
        onClose={() => setExcluir(null)}
        destructive
        title="Excluir esta habilidade?"
        description={excluir?.descricao ?? ''}
        confirmLabel="Excluir"
        onConfirm={() => {
          const h = excluir;
          setExcluir(null);
          if (h) void acao(() => parecerApi.excluirHabilidade(h.id), 'Habilidade excluída.');
        }}
      />
    </div>
  );
};

const ChipsTrimestre: React.FC<{ valor: number[]; onChange: (v: number[]) => void }> = ({ valor, onChange }) => (
  <div className="flex gap-3">
    {TRIS.map((t) => (
      <Checkbox key={t} label={`${t}º tri`} checked={valor.includes(t)} onCheckedChange={(v) => onChange(v === true ? [...valor, t].sort() : valor.filter((x) => x !== t))} />
    ))}
  </div>
);

const NovaHabilidade: React.FC<{ serie: number; materia: string; nomeMat: string; onSalva: (t: string) => void; onErro: (m: Mensagem) => void }> = ({ serie, materia, nomeMat, onSalva, onErro }) => {
  const [descricao, setDescricao] = useState('');
  const [codigo, setCodigo] = useState('');
  const [tris, setTris] = useState([1, 2, 3]);
  return (
    <Card className="p-4">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (tris.length === 0) return onErro({ tipo: 'erro', texto: 'Marque pelo menos um trimestre em que a habilidade será trabalhada.' });
          parecerApi
            .criarHabilidade({ serie, materia, descricao, codigo_bncc: codigo || null, trimestres: tris })
            .then(() => {
              setDescricao('');
              setCodigo('');
              setTris([1, 2, 3]);
              onSalva('Habilidade incluída.');
            })
            .catch((err: unknown) => onErro(mensagemDeErro(err)));
        }}
      >
        <h3 className="font-semibold">
          Nova habilidade · {nomeMat} · {SERIES[serie]}
        </h3>
        <Field label="Descrição" required>
          <Textarea rows={2} required value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: Reconhece as letras do alfabeto por seus nomes." />
        </Field>
        <div className="flex flex-wrap items-end gap-4">
          <Field label="Código BNCC (opcional)">
            <Input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="EF01LP04" className="w-40 font-mono" />
          </Field>
          <Field label="Trabalhar no">
            <ChipsTrimestre valor={tris} onChange={setTris} />
          </Field>
          <Button type="submit">Incluir</Button>
        </div>
      </form>
    </Card>
  );
};

const CopiarDeOutraSerie: React.FC<{ serie: number; materia: string; nomeMat: string; onFeito: (t: string) => void; onErro: (m: Mensagem) => void }> = ({ serie, materia, nomeMat, onFeito, onErro }) => {
  const outras = Object.keys(SERIES).map(Number).filter((s) => s !== serie);
  const [origem, setOrigem] = useState(outras[0]);
  useEffect(() => setOrigem(outras[0]), [serie]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Card className="flex flex-wrap items-end gap-3 p-4">
      <Field label={`Copiar as habilidades de ${nomeMat} do`}>
        <div className="w-40">
          <Select value={origem} onChange={(v) => setOrigem(Number(v))} options={outras.map((s) => ({ value: s, label: SERIES[s] }))} />
        </div>
      </Field>
      <Button
        variant="outline"
        onClick={() =>
          parecerApi
            .copiarHabilidades(origem, serie, materia)
            .then(() => onFeito(`Habilidades copiadas do ${SERIES[origem]}.`))
            .catch((e: unknown) => onErro(mensagemDeErro(e)))
        }
      >
        Copiar para o {SERIES[serie]}
      </Button>
    </Card>
  );
};

const EditarHabilidade: React.FC<{ h: Habilidade; onFechar: () => void; onSalva: () => void }> = ({ h, onFechar, onSalva }) => {
  const [descricao, setDescricao] = useState(h.descricao);
  const [codigo, setCodigo] = useState(h.codigo_bncc ?? '');
  const [tris, setTris] = useState(h.trimestres.split('').map(Number));
  const [erro, setErro] = useState<Mensagem>(null);
  return (
    <Modal
      open
      onClose={onFechar}
      title="Editar habilidade"
      footer={
        <>
          <Button variant="outline" onClick={onFechar}>
            Cancelar
          </Button>
          <Button
            onClick={() =>
              tris.length === 0
                ? setErro({ tipo: 'erro', texto: 'Marque pelo menos um trimestre.' })
                : parecerApi.salvarHabilidade(h.id, { descricao, codigo_bncc: codigo || null, trimestres: tris }).then(onSalva).catch((e: unknown) => setErro(mensagemDeErro(e)))
            }
          >
            Salvar
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Aviso msg={erro} />
        <Field label="Descrição" required>
          <Textarea rows={3} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        </Field>
        <Field label="Código BNCC">
          <Input value={codigo} onChange={(e) => setCodigo(e.target.value)} className="w-40 font-mono" />
        </Field>
        <Field label="Trimestres">
          <ChipsTrimestre valor={tris} onChange={setTris} />
        </Field>
      </div>
    </Modal>
  );
};

const PainelBncc: React.FC<{ serie: number; materia: string; titulo: string; onFechar: () => void; onAdicionadas: (n: number) => void }> = ({ serie, materia, titulo, onFechar, onAdicionadas }) => {
  const [dados, setDados] = useState<{ itens: ItemBncc[]; ja_cadastrados: string[] } | null>(null);
  const [erro, setErro] = useState<Mensagem>(null);
  const [busca, setBusca] = useState('');
  const [sel, setSel] = useState<Set<string>>(new Set());
  useEffect(() => {
    parecerApi.bncc(serie, materia).then(setDados).catch((e: unknown) => setErro(mensagemDeErro(e)));
  }, [serie, materia]);
  const ja = new Set(dados?.ja_cadastrados ?? []);
  const termo = busca.trim().toLowerCase();
  const visiveis = (dados?.itens ?? []).filter((i) => termo === '' || [i.codigo, i.descricao, i.unidade_tematica ?? '', i.objeto_conhecimento ?? ''].join(' ').toLowerCase().includes(termo));

  return (
    <Modal
      open
      size="2xl"
      onClose={onFechar}
      title={`Buscar na BNCC · ${titulo}`}
      description="Fonte: bncc.api.br (base de dados da BNCC, projeto independente, não oficial do MEC). Confira o texto antes de usar."
      footer={
        <>
          <span className="mr-auto text-xs text-muted-foreground">{sel.size} selecionada(s)</span>
          <Button variant="outline" onClick={onFechar}>
            Fechar
          </Button>
          <Button disabled={sel.size === 0} onClick={() => parecerApi.adicionarBncc(serie, materia, [...sel]).then((r) => onAdicionadas(r.adicionadas)).catch((e: unknown) => setErro(mensagemDeErro(e)))}>
            Adicionar selecionadas
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Aviso msg={erro} />
        {dados === null && erro === null && <ScreenState type="loading" />}
        {dados !== null && dados.itens.length === 0 && <ScreenState type="empty" title="A BNCC não traz habilidades desta matéria para esta série." />}
        {dados !== null && dados.itens.length > 0 && (
          <>
            <Input placeholder="Buscar por palavra, código ou unidade temática" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar habilidades da BNCC" />
            <div className="max-h-[55vh] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10" />
                    <TableHead>Código</TableHead>
                    <TableHead>Habilidade</TableHead>
                    <TableHead>Unidade temática / objeto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visiveis.map((i) => (
                    <TableRow key={i.codigo} className={ja.has(i.codigo) ? 'opacity-50' : undefined}>
                      <TableCell>
                        <Checkbox
                          aria-label={`Selecionar ${i.codigo}`}
                          disabled={ja.has(i.codigo)}
                          checked={ja.has(i.codigo) || sel.has(i.codigo)}
                          onCheckedChange={(v) =>
                            setSel((s) => {
                              const n = new Set(s);
                              if (v === true) n.add(i.codigo);
                              else n.delete(i.codigo);
                              return n;
                            })
                          }
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs">{i.codigo}</TableCell>
                      <TableCell className="text-sm">{i.descricao}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{[i.unidade_tematica, i.objeto_conhecimento].filter(Boolean).join(' · ')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default Conteudos;
