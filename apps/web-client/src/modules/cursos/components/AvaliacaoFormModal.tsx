import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, ClipboardList, Plus, Trash2 } from 'lucide-react';
import { Button, Input, Modal, RichTextEditor } from '@sysgov/ui';
import { sysgovApi, type Aula, type Avaliacao, type AvaliacaoInput, type Questao } from '@sysgov/sdk';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { htmlParaTexto } from '../utils/htmlSeguro';
import { LIBERACAO_IMEDIATA, liberacaoDe, liberacaoParaApi, paraNumero, validarLiberacao, type LiberacaoForm } from '../utils/validacoes';
import { ErroFormulario } from './ErroFormulario';
import { RegraLiberacaoFields } from './RegraLiberacaoFields';

interface Props {
  open: boolean;
  cursoId: number;
  aulas: Aula[];
  avaliacao?: Avaliacao | null;
  onClose: () => void;
  onSalvo: () => void;
}

/** Avaliação do curso: parâmetros, regra de liberação e as questões escolhidas do banco, em ordem. */
export const AvaliacaoFormModal: React.FC<Props> = ({ open, cursoId, aulas, avaliacao, onClose, onSalvo }) => {
  const [titulo, setTitulo] = useState('');
  const [instrucoes, setInstrucoes] = useState('');
  const [peso, setPeso] = useState('1');
  const [tentativas, setTentativas] = useState('1');
  const [tempo, setTempo] = useState('');
  const [liberacao, setLiberacao] = useState<LiberacaoForm>(LIBERACAO_IMEDIATA);
  const [banco, setBanco] = useState<Questao[]>([]);
  const [escolhidas, setEscolhidas] = useState<number[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Depois da primeira tentativa, questões e ordem não mudam mais (a nota já depende delas).
  const travada = (avaliacao?.tentativas_count ?? 0) > 0;

  useEffect(() => {
    if (!open) return;
    setErro(null);
    setTitulo(avaliacao?.titulo ?? '');
    setInstrucoes(avaliacao?.instrucoes ?? '');
    setPeso(String(avaliacao?.peso ?? 1));
    setTentativas(String(avaliacao?.tentativas_max ?? 1));
    setTempo(avaliacao?.tempo_limite_minutos ? String(avaliacao.tempo_limite_minutos) : '');
    setLiberacao(liberacaoDe(avaliacao));
    setEscolhidas((avaliacao?.questoes ?? []).map((q) => q.questao_id));
    sysgovApi.cursos
      .listarQuestoes(cursoId)
      .then(setBanco)
      .catch((e) => setErro(getApiErrorMessage(e, 'Não foi possível carregar o banco de questões.')));
  }, [open, avaliacao, cursoId]);

  const porId = new Map(banco.map((q) => [q.id, q]));
  // Só as ativas entram em avaliações novas; as que já estão na prova continuam listadas mesmo desativadas.
  const disponiveis = banco.filter((q) => q.ativa && !escolhidas.includes(q.id));

  const mover = (i: number, delta: number) =>
    setEscolhidas((atual) => {
      const j = i + delta;
      if (j < 0 || j >= atual.length) return atual;
      const novo = [...atual];
      [novo[i], novo[j]] = [novo[j], novo[i]];
      return novo;
    });

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (titulo.trim() === '') return setErro('Informe o título da avaliação.');
    const problema = validarLiberacao(liberacao);
    if (problema) {
      setErro(problema);
      return;
    }
    const pesoN = Number(peso);
    const tentativasN = Number(tentativas);
    const tempoN = paraNumero(tempo);
    if (!Number.isInteger(pesoN) || pesoN < 1 || pesoN > 10) return setErro('O peso deve ser um inteiro de 1 a 10.');
    if (!Number.isInteger(tentativasN) || tentativasN < 1 || tentativasN > 10) return setErro('O número de tentativas deve ser de 1 a 10.');
    if (tempoN !== null && (!Number.isInteger(tempoN) || tempoN < 1 || tempoN > 1440)) return setErro('O tempo limite deve ser de 1 a 1440 minutos, ou ficar em branco.');

    setSalvando(true);
    setErro(null);
    const dados: AvaliacaoInput = {
      titulo,
      instrucoes: instrucoes || null,
      peso: pesoN,
      tentativas_max: tentativasN,
      tempo_limite_minutos: tempoN,
      ...liberacaoParaApi(liberacao),
      ...(travada ? {} : { questoes: escolhidas }),
    };
    try {
      if (avaliacao) await sysgovApi.cursos.atualizarAvaliacao(avaliacao.id, dados);
      else await sysgovApi.cursos.criarAvaliacao(cursoId, dados);
      onSalvo();
    } catch (err) {
      setErro(getApiErrorMessage(err, 'Não foi possível salvar a avaliação.'));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={avaliacao ? 'Editar avaliação' : 'Nova avaliação'} icon={<ClipboardList className="h-5 w-5" />} size="xl">
      <form onSubmit={salvar} noValidate className="space-y-4">
        <ErroFormulario mensagem={erro} />
        <Input label="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} required maxLength={255} />
        <div>
          <p className="mb-1 text-sm font-medium text-foreground">Instruções</p>
          <RichTextEditor value={instrucoes} onChange={setInstrucoes} minHeight={120} />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Peso na nota final (1 a 10)" type="number" min={1} max={10} value={peso} onChange={(e) => setPeso(e.target.value)} className="font-mono tabular-nums" />
          <Input label="Tentativas (1 a 10)" type="number" min={1} max={10} value={tentativas} onChange={(e) => setTentativas(e.target.value)} className="font-mono tabular-nums" />
          <Input label="Tempo limite (minutos)" type="number" min={1} max={1440} value={tempo} onChange={(e) => setTempo(e.target.value)} helperText="Vazio = sem limite" className="font-mono tabular-nums" />
        </div>

        <RegraLiberacaoFields value={liberacao} onChange={setLiberacao} aulas={aulas} />

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-foreground">Questões da prova ({escolhidas.length})</legend>
          {travada && <p className="rounded-lg border border-status-warning-border bg-status-warning-bg px-3 py-2 text-xs text-status-warning">Esta avaliação já tem tentativas: as questões e a ordem não podem mais ser alteradas.</p>}
          {escolhidas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma questão escolhida. Uma avaliação precisa de ao menos uma para ser publicada.</p>
          ) : (
            <ol className="divide-y divide-border rounded-lg border border-border">
              {escolhidas.map((id, i) => {
                const q = porId.get(id);
                return (
                  <li key={id} className="flex items-center gap-2 px-3 py-2">
                    <span className="w-6 font-mono text-sm tabular-nums text-muted-foreground">{i + 1}.</span>
                    <span className="flex-1 text-sm text-foreground">{q ? htmlParaTexto(q.enunciado, 90) : `Questão #${id}`}</span>
                    {q && <span className="font-mono text-xs tabular-nums text-muted-foreground">{Number(q.pontuacao)} pt</span>}
                    {!travada && (
                      <>
                        <Button type="button" size="icon-xs" variant="ghost" aria-label={`Subir questão ${i + 1}`} onClick={() => mover(i, -1)} disabled={i === 0}>
                          <ArrowUp />
                        </Button>
                        <Button type="button" size="icon-xs" variant="ghost" aria-label={`Descer questão ${i + 1}`} onClick={() => mover(i, 1)} disabled={i === escolhidas.length - 1}>
                          <ArrowDown />
                        </Button>
                        <Button type="button" size="icon-xs" variant="ghost" aria-label={`Retirar questão ${i + 1}`} onClick={() => setEscolhidas((a) => a.filter((x) => x !== id))}>
                          <Trash2 />
                        </Button>
                      </>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
          {!travada && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Banco de questões do curso</p>
              {disponiveis.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma questão ativa disponível. Cadastre questões na aba Questões.</p>
              ) : (
                <ul className="max-h-48 divide-y divide-border overflow-y-auto rounded-lg border border-border">
                  {disponiveis.map((q) => (
                    <li key={q.id} className="flex items-center gap-2 px-3 py-1.5">
                      <span className="flex-1 text-sm text-foreground">{htmlParaTexto(q.enunciado, 90)}</span>
                      <span className="text-xs text-muted-foreground">{q.tipo === 'objetiva' ? 'Objetiva' : 'Dissertativa'}</span>
                      <Button type="button" size="sm" variant="outline" aria-label={`Adicionar questão: ${htmlParaTexto(q.enunciado, 40)}`} onClick={() => setEscolhidas((a) => [...a, q.id])}>
                        <Plus className="h-4 w-4" /> Adicionar
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </fieldset>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={salvando}>
            Salvar
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default AvaliacaoFormModal;
