import React, { useCallback, useEffect, useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import { Button, Input, Modal } from '@sysgov/ui';
import { ScreenState, StatusChip } from '@/components/ui';
import { sysgovApi, type TentativaCorrecao } from '@sysgov/sdk';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { STATUS_TENTATIVA, formatarDataHora, formatarNota } from '../utils/formatos';
import { paraNumero } from '../utils/validacoes';
import { CampoTexto } from './CampoTexto';
import { ErroFormulario } from './ErroFormulario';
import { TextoPuro, TextoSeguro } from './TextoSeguro';

interface Props {
  tentativaId: number | null;
  /** Turma aberta: só então a correção pode ser feita ou revista. */
  editavel: boolean;
  onClose: () => void;
}

const letra = (i: number) => String.fromCharCode(65 + i);

/**
 * Correção de uma tentativa pelo instrutor ou Administrador: mostra o gabarito
 * (nunca chega ao participante), as objetivas já corrigidas e as dissertativas
 * para dar pontos de 0 até a pontuação da questão, com comentário opcional.
 */
export const CorrecaoModal: React.FC<Props> = ({ tentativaId, editavel, onClose }) => {
  const [tentativa, setTentativa] = useState<TentativaCorrecao | null>(null);
  const [erroCarga, setErroCarga] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (tentativaId === null) return;
    setErroCarga(null);
    try {
      setTentativa(await sysgovApi.cursos.getCorrecao(tentativaId));
    } catch (e) {
      setErroCarga(getApiErrorMessage(e, 'Não foi possível carregar a tentativa.'));
    }
  }, [tentativaId]);

  useEffect(() => {
    setTentativa(null);
    void carregar();
  }, [carregar]);

  const status = tentativa ? STATUS_TENTATIVA[tentativa.status] : null;

  return (
    <Modal
      open={tentativaId !== null}
      onClose={onClose}
      title={tentativa ? `${tentativa.participante.nome} — ${tentativa.avaliacao.titulo}` : 'Correção'}
      icon={<ClipboardCheck className="h-5 w-5" />}
      size="xl"
    >
      {erroCarga ? (
        <ScreenState type="error" title="Erro ao carregar" description={erroCarga} actionLabel="Tentar novamente" onAction={carregar} />
      ) : !tentativa ? (
        <p className="text-sm text-muted-foreground">Carregando tentativa...</p>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            {status && <StatusChip label={status.label} variant={status.variant} />}
            <span>
              Tentativa <span className="font-mono tabular-nums">{tentativa.numero}</span>
            </span>
            {tentativa.enviada_em && <span className="font-mono text-xs tabular-nums text-muted-foreground">enviada em {formatarDataHora(tentativa.enviada_em)}</span>}
            <span className="ml-auto">
              Nota <span className="font-mono text-lg font-semibold tabular-nums">{formatarNota(tentativa.nota)}</span>
            </span>
          </div>
          {!editavel && <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">A turma foi encerrada: as correções não podem mais ser alteradas.</p>}

          {tentativa.questoes.map((q, i) => (
            <QuestaoCorrecao key={q.questao_id} numero={i + 1} tentativaId={tentativa.id} questao={q} editavel={editavel} onCorrigida={setTentativa} />
          ))}
        </div>
      )}
    </Modal>
  );
};

const QuestaoCorrecao: React.FC<{
  numero: number;
  tentativaId: number;
  questao: TentativaCorrecao['questoes'][number];
  editavel: boolean;
  onCorrigida: (t: TentativaCorrecao) => void;
}> = ({ numero, tentativaId, questao, editavel, onCorrigida }) => {
  const dissertativa = questao.tipo === 'dissertativa';
  const [pontos, setPontos] = useState(questao.correcao.pontos === null ? '' : String(questao.correcao.pontos));
  const [comentario, setComentario] = useState(questao.correcao.comentario ?? '');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    const valor = paraNumero(pontos);
    if (valor === null || Number.isNaN(valor) || valor < 0 || valor > questao.pontuacao) {
      setErro(`Os pontos devem ficar entre 0 e ${questao.pontuacao.toLocaleString('pt-BR')}.`);
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      onCorrigida(await sysgovApi.cursos.corrigirResposta(tentativaId, questao.questao_id, { pontos: valor, comentario: comentario.trim() || null }));
    } catch (err) {
      setErro(getApiErrorMessage(err, 'Não foi possível salvar a correção.'));
    } finally {
      setSalvando(false);
    }
  };

  const escolhida = questao.alternativas.findIndex((a) => a.id === questao.resposta.alternativa_id);

  return (
    <section className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            Questão <span className="font-mono tabular-nums">{numero}</span> · {dissertativa ? 'Dissertativa' : 'Objetiva'} · vale <span className="font-mono tabular-nums">{questao.pontuacao}</span>
          </p>
          <TextoSeguro html={questao.enunciado} />
        </div>
        {dissertativa && questao.correcao.pendente && <StatusChip label="Pendente" variant="warning" />}
      </div>

      {dissertativa ? (
        <>
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="mb-1 text-xs font-medium text-muted-foreground">Resposta do participante</p>
            {questao.resposta.texto?.trim() ? <TextoPuro texto={questao.resposta.texto} /> : <p className="text-sm text-foreground">Sem resposta</p>}
          </div>
          {questao.orientacao_correcao && (
            <div className="rounded-lg border border-border p-3">
              <p className="mb-1 text-xs font-medium text-muted-foreground">Orientação de correção</p>
              <TextoSeguro html={questao.orientacao_correcao} />
            </div>
          )}
          <form onSubmit={salvar} noValidate className="space-y-2">
            <ErroFormulario mensagem={erro} />
            <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
              <Input label={`Pontos (0 a ${questao.pontuacao})`} type="number" step="0.25" value={pontos} onChange={(e) => setPontos(e.target.value)} disabled={!editavel} className="font-mono tabular-nums" />
              <CampoTexto label="Comentário (opcional)" value={comentario} onChange={(e) => setComentario(e.target.value)} rows={2} maxLength={5000} disabled={!editavel} />
            </div>
            {editavel && (
              <div className="flex justify-end">
                <Button type="submit" size="sm" isLoading={salvando}>
                  {questao.correcao.pendente ? 'Salvar correção' : 'Atualizar correção'}
                </Button>
              </div>
            )}
          </form>
        </>
      ) : (
        <ul className="space-y-1">
          {questao.alternativas.map((a, i) => (
            <li key={a.id} className={`rounded-md border px-3 py-1.5 text-sm ${a.correta ? 'border-status-success-border bg-status-success-bg' : 'border-border'}`}>
              <span className="mr-2 font-mono tabular-nums">{letra(i)}.</span>
              {a.texto}
              {a.correta && <span className="ml-2 text-xs font-medium text-status-success">correta</span>}
              {i === escolhida && <span className="ml-2 text-xs font-medium text-foreground">← resposta do participante</span>}
            </li>
          ))}
          <li className="pt-1 text-xs text-muted-foreground">
            {escolhida < 0 ? 'Sem resposta. ' : ''}Corrigida automaticamente: <span className="font-mono tabular-nums">{questao.correcao.pontos ?? 0}</span> de <span className="font-mono tabular-nums">{questao.pontuacao}</span>.
          </li>
        </ul>
      )}
    </section>
  );
};

export default CorrecaoModal;
