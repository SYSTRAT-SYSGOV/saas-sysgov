import React, { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Layers, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button, Card, Input, Modal, Select, Switch } from '@sysgov/ui';
import { ConfirmDialog, EmptyState, ScreenState, StatusChip } from '@/components/ui';
import { sysgovApi, type Curso, type Formacao } from '@sysgov/sdk';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { CampoTexto } from '../components/CampoTexto';
import { ErroFormulario } from '../components/ErroFormulario';
import { formatarCargaHoraria } from '../utils/formatos';

/** Formações (trilhas): cursos ordenados, obrigatórios ou optativos. */
export const FormacoesPage: React.FC = () => {
  const [formacoes, setFormacoes] = useState<Formacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [edicao, setEdicao] = useState<Formacao | null | undefined>(undefined);
  const [excluir, setExcluir] = useState<Formacao | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setFormacoes(await sysgovApi.cursos.listarFormacoes());
    } catch (e) {
      setErro(getApiErrorMessage(e, 'Não foi possível carregar as formações.'));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  if (carregando && formacoes.length === 0) return <ScreenState type="loading" title="Carregando formações..." />;

  return (
    <div className="space-y-4">
      <ErroFormulario mensagem={erro} />
      <div className="flex justify-end">
        <Button onClick={() => setEdicao(null)}>
          <Plus className="h-4 w-4" /> Nova formação
        </Button>
      </div>
      {formacoes.length === 0 ? (
        <EmptyState icon={<Layers className="h-8 w-8" />} title="Nenhuma formação" description="Uma formação agrupa cursos numa trilha; quem conclui os obrigatórios recebe o certificado da formação." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {formacoes.map((f) => {
            const carga = f.cursos.filter((c) => c.pivot.obrigatorio).reduce((soma, c) => soma + c.carga_horaria_minutos, 0);
            return (
              <Card key={f.id} className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-semibold text-foreground">{f.titulo}</h3>
                    <p className="text-xs text-muted-foreground">
                      Obrigatórios: <span className="font-mono tabular-nums">{formatarCargaHoraria(carga)}</span>
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon-sm" variant="ghost" aria-label={`Editar ${f.titulo}`} onClick={() => setEdicao(f)}>
                      <Pencil />
                    </Button>
                    <Button size="icon-sm" variant="ghost" aria-label={`Excluir ${f.titulo}`} onClick={() => setExcluir(f)}>
                      <Trash2 />
                    </Button>
                  </div>
                </div>
                {f.descricao && <p className="text-sm text-muted-foreground">{f.descricao}</p>}
                <ol className="space-y-1">
                  {f.cursos.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
                      <span>
                        <span className="font-mono tabular-nums text-muted-foreground">{c.pivot.ordem}.</span> {c.titulo}
                      </span>
                      <StatusChip label={c.pivot.obrigatorio ? 'Obrigatório' : 'Optativo'} variant={c.pivot.obrigatorio ? 'primary' : 'neutral'} />
                    </li>
                  ))}
                </ol>
              </Card>
            );
          })}
        </div>
      )}

      <FormacaoFormModal formacao={edicao} onClose={() => setEdicao(undefined)} onSalvo={() => { setEdicao(undefined); void carregar(); }} />
      <ConfirmDialog
        open={excluir !== null}
        onClose={() => setExcluir(null)}
        requireReason={false}
        title="Excluir formação"
        description={`Excluir "${excluir?.titulo ?? ''}"? Não é possível se a formação já emitiu certificados.`}
        confirmLabel="Excluir"
        onConfirm={() => {
          const alvo = excluir;
          setExcluir(null);
          if (alvo) sysgovApi.cursos.excluirFormacao(alvo.id).then(carregar).catch((e) => setErro(getApiErrorMessage(e, 'Não foi possível excluir a formação.')));
        }}
      />
    </div>
  );
};

interface ItemComposicao {
  curso_id: number;
  titulo: string;
  obrigatorio: boolean;
}

/** Formulário de formação; exportado para teste. */
export const FormacaoFormModal: React.FC<{ formacao: Formacao | null | undefined; onClose: () => void; onSalvo: () => void }> = ({ formacao, onClose, onSalvo }) => {
  const aberto = formacao !== undefined;
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [itens, setItens] = useState<ItemComposicao[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [escolhido, setEscolhido] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!aberto) return;
    setErro(null);
    setTitulo(formacao?.titulo ?? '');
    setDescricao(formacao?.descricao ?? '');
    setItens(formacao?.cursos.map((c) => ({ curso_id: c.id, titulo: c.titulo, obrigatorio: c.pivot.obrigatorio })) ?? []);
    sysgovApi.cursos.listarCursos({ per_page: 200 }).then((r) => setCursos(r.data)).catch(() => setCursos([]));
  }, [aberto, formacao]);

  const disponiveis = cursos.filter((c) => !itens.some((i) => i.curso_id === c.id));

  const adicionar = () => {
    const curso = cursos.find((c) => String(c.id) === escolhido);
    if (!curso) return;
    setItens((atual) => [...atual, { curso_id: curso.id, titulo: curso.titulo, obrigatorio: true }]);
    setEscolhido('');
  };

  const mover = (indice: number, delta: number) =>
    setItens((atual) => {
      const novo = [...atual];
      const destino = indice + delta;
      if (destino < 0 || destino >= novo.length) return atual;
      [novo[indice], novo[destino]] = [novo[destino], novo[indice]];
      return novo;
    });

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itens.some((i) => i.obrigatorio)) {
      setErro('Marque ao menos um curso como obrigatório.');
      return;
    }
    setSalvando(true);
    setErro(null);
    const dados = {
      titulo,
      descricao: descricao || null,
      cursos: itens.map((i, ordem) => ({ curso_id: i.curso_id, obrigatorio: i.obrigatorio, ordem: ordem + 1 })),
    };
    try {
      if (formacao) await sysgovApi.cursos.atualizarFormacao(formacao.id, dados);
      else await sysgovApi.cursos.criarFormacao(dados);
      onSalvo();
    } catch (err) {
      setErro(getApiErrorMessage(err, 'Não foi possível salvar a formação.'));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal open={aberto} onClose={onClose} title={formacao ? 'Editar formação' : 'Nova formação'} icon={<Layers className="h-5 w-5" />} size="xl">
      <form onSubmit={salvar} className="space-y-4">
        <ErroFormulario mensagem={erro} />
        <Input label="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} required maxLength={255} />
        <CampoTexto label="Descrição" value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} />
        <div className="space-y-2">
          <span className="block text-sm font-medium text-foreground">Cursos da trilha</span>
          {itens.length === 0 && <p className="text-sm text-muted-foreground">Adicione os cursos na ordem da trilha.</p>}
          <ol className="space-y-2">
            {itens.map((item, i) => (
              <li key={item.curso_id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                <span className="font-mono text-xs tabular-nums text-muted-foreground">{i + 1}.</span>
                <span className="flex-1 text-sm">{item.titulo}</span>
                <Switch
                  checked={item.obrigatorio}
                  onCheckedChange={(v) => setItens((atual) => atual.map((x) => (x.curso_id === item.curso_id ? { ...x, obrigatorio: v } : x)))}
                  label={`${item.titulo} é obrigatório`}
                />
                <span className="w-20 text-xs text-muted-foreground">{item.obrigatorio ? 'Obrigatório' : 'Optativo'}</span>
                <Button type="button" size="icon-xs" variant="ghost" aria-label={`Subir ${item.titulo}`} onClick={() => mover(i, -1)}>
                  <ArrowUp />
                </Button>
                <Button type="button" size="icon-xs" variant="ghost" aria-label={`Descer ${item.titulo}`} onClick={() => mover(i, 1)}>
                  <ArrowDown />
                </Button>
                <Button type="button" size="icon-xs" variant="ghost" aria-label={`Remover ${item.titulo}`} onClick={() => setItens((atual) => atual.filter((x) => x.curso_id !== item.curso_id))}>
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ol>
          <div className="flex items-end gap-2">
            <Select label="Adicionar curso" value={escolhido} onChange={setEscolhido} options={disponiveis.map((c) => ({ value: String(c.id), label: c.titulo }))} emptyText="Nenhum outro curso cadastrado." className="flex-1" />
            <Button type="button" variant="outline" onClick={adicionar} disabled={!escolhido}>
              Adicionar
            </Button>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={salvando} disabled={itens.length === 0}>
            Salvar
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default FormacoesPage;
