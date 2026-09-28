import React, { useEffect, useState } from 'react';
import { CircleHelp, Plus, Trash2 } from 'lucide-react';
import { Button, Input, Modal, RichTextEditor, Select } from '@sysgov/ui';
import { sysgovApi, type Questao, type TipoQuestao } from '@sysgov/sdk';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { TIPO_QUESTAO } from '../utils/formatos';
import { ALTERNATIVAS_MAX, ALTERNATIVAS_MIN, paraNumero, validarAlternativas, type AlternativaForm } from '../utils/validacoes';
import { ErroFormulario } from './ErroFormulario';

interface Props {
  open: boolean;
  cursoId: number;
  questao?: Questao | null;
  onClose: () => void;
  onSalvo: () => void;
}

const vazias = (): AlternativaForm[] => [
  { texto: '', correta: true },
  { texto: '', correta: false },
  { texto: '', correta: false },
  { texto: '', correta: false },
];

const letra = (i: number) => String.fromCharCode(65 + i);

/** Questão do banco do curso: objetiva (2 a 6 alternativas, uma correta) ou dissertativa. */
export const QuestaoFormModal: React.FC<Props> = ({ open, cursoId, questao, onClose, onSalvo }) => {
  const [tipo, setTipo] = useState<TipoQuestao>('objetiva');
  const [enunciado, setEnunciado] = useState('');
  const [pontuacao, setPontuacao] = useState('1');
  const [orientacao, setOrientacao] = useState('');
  const [alternativas, setAlternativas] = useState<AlternativaForm[]>(vazias());
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setErro(null);
    setTipo(questao?.tipo ?? 'objetiva');
    setEnunciado(questao?.enunciado ?? '');
    setPontuacao(questao ? String(Number(questao.pontuacao)) : '1');
    setOrientacao(questao?.orientacao_correcao ?? '');
    setAlternativas(questao && questao.tipo === 'objetiva' ? questao.alternativas.map((a) => ({ texto: a.texto, correta: a.correta })) : vazias());
  }, [open, questao]);

  const mudarTexto = (i: number, texto: string) => setAlternativas((atual) => atual.map((a, j) => (j === i ? { ...a, texto } : a)));
  const marcarCorreta = (i: number) => setAlternativas((atual) => atual.map((a, j) => ({ ...a, correta: j === i })));
  const remover = (i: number) =>
    setAlternativas((atual) => {
      const restantes = atual.filter((_, j) => j !== i);
      // Se a correta foi removida, a primeira assume — o formulário nunca fica sem correta sem o usuário ver.
      return restantes.some((a) => a.correta) ? restantes : restantes.map((a, j) => ({ ...a, correta: j === 0 }));
    });
  const adicionar = () => setAlternativas((atual) => [...atual, { texto: '', correta: false }]);

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enunciado.replace(/<[^>]*>/g, '').trim() === '') {
      setErro('Informe o enunciado da questão.');
      return;
    }
    const pontos = paraNumero(pontuacao);
    if (pontos === null || Number.isNaN(pontos) || pontos <= 0 || pontos > 100) {
      setErro('A pontuação deve ser maior que zero (até 100).');
      return;
    }
    if (tipo === 'objetiva') {
      const problema = validarAlternativas(alternativas);
      if (problema) {
        setErro(problema);
        return;
      }
    }

    setSalvando(true);
    setErro(null);
    const dados = {
      enunciado,
      pontuacao: pontos,
      ...(tipo === 'dissertativa' ? { orientacao_correcao: orientacao || null } : { alternativas: alternativas.map((a) => ({ texto: a.texto.trim(), correta: a.correta })) }),
    };
    try {
      if (questao) await sysgovApi.cursos.atualizarQuestao(questao.id, dados);
      else await sysgovApi.cursos.criarQuestao(cursoId, { ...dados, tipo });
      onSalvo();
    } catch (err) {
      setErro(getApiErrorMessage(err, 'Não foi possível salvar a questão.'));
    } finally {
      setSalvando(false);
    }
  };

  const indiceCorreta = Math.max(0, alternativas.findIndex((a) => a.correta));

  return (
    <Modal open={open} onClose={onClose} title={questao ? 'Editar questão' : 'Nova questão'} icon={<CircleHelp className="h-5 w-5" />} size="lg">
      <form onSubmit={salvar} noValidate className="space-y-4">
        <ErroFormulario mensagem={erro} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            label="Tipo"
            value={tipo}
            onChange={(v) => setTipo(v as TipoQuestao)}
            disabled={!!questao}
            options={[
              { value: 'objetiva', label: TIPO_QUESTAO.objetiva, hint: 'Correção automática' },
              { value: 'dissertativa', label: TIPO_QUESTAO.dissertativa, hint: 'Corrigida pelo instrutor' },
            ]}
          />
          <Input label="Pontuação" type="number" min={0.01} max={100} step="0.01" value={pontuacao} onChange={(e) => setPontuacao(e.target.value)} className="font-mono tabular-nums" />
        </div>

        <div>
          <p className="mb-1 text-sm font-medium text-foreground">Enunciado</p>
          <RichTextEditor value={enunciado} onChange={setEnunciado} minHeight={160} />
        </div>

        {tipo === 'objetiva' ? (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-foreground">
              Alternativas ({ALTERNATIVAS_MIN} a {ALTERNATIVAS_MAX})
            </legend>
            {alternativas.map((a, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-5 font-mono text-sm tabular-nums text-muted-foreground">{letra(i)}</span>
                <Input aria-label={`Texto da alternativa ${letra(i)}`} value={a.texto} onChange={(e) => mudarTexto(i, e.target.value)} maxLength={1000} className="flex-1" />
                <Button type="button" size="icon-sm" variant="ghost" aria-label={`Remover alternativa ${letra(i)}`} onClick={() => remover(i)} disabled={alternativas.length <= ALTERNATIVAS_MIN}>
                  <Trash2 />
                </Button>
              </div>
            ))}
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-48 flex-1">
                <Select
                  label="Alternativa correta"
                  value={String(indiceCorreta)}
                  onChange={(v) => marcarCorreta(Number(v))}
                  options={alternativas.map((a, i) => ({ value: String(i), label: `${letra(i)}${a.texto.trim() ? ` — ${a.texto.trim().slice(0, 50)}` : ''}` }))}
                />
              </div>
              <Button type="button" variant="outline" size="sm" onClick={adicionar} disabled={alternativas.length >= ALTERNATIVAS_MAX}>
                <Plus className="h-4 w-4" /> Adicionar alternativa
              </Button>
            </div>
          </fieldset>
        ) : (
          <div>
            <p className="mb-1 text-sm font-medium text-foreground">Orientação de correção (visível só para quem corrige)</p>
            <RichTextEditor value={orientacao} onChange={setOrientacao} minHeight={120} />
          </div>
        )}

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

export default QuestaoFormModal;
