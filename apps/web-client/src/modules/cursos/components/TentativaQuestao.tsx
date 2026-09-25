import React from 'react';
import { Button } from '@sysgov/ui';
import type { TentativaQuestaoParticipante } from '@sysgov/sdk';
import { TextoPuro, TextoSeguro } from './TextoSeguro';
import { TEXTO_MAX_RESPOSTA } from '../utils/tentativa';

export type EstadoSalvamento = 'salvando' | 'salvo' | 'erro';

const ROTULO_SALVAMENTO: Record<EstadoSalvamento, string> = { salvando: 'Salvando…', salvo: 'Resposta salva', erro: 'Não foi possível salvar — tente de novo' };

interface Props {
  numero: number;
  questao: TentativaQuestaoParticipante;
  /** Bloqueia as respostas (tempo esgotado ou envio em andamento). */
  desabilitada: boolean;
  salvamento?: EstadoSalvamento;
  onAlternativa: (alternativaId: number | null) => void;
  onTexto: (texto: string) => void;
}

const letra = (i: number) => String.fromCharCode(65 + i);

/** Uma questão sendo respondida: alternativas (objetiva) ou caixa de texto puro (dissertativa). */
export const TentativaQuestao: React.FC<Props> = ({ numero, questao, desabilitada, salvamento, onAlternativa, onTexto }) => {
  const rotuloId = `questao-${questao.questao_id}`;

  return (
    <section aria-labelledby={rotuloId} className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div id={rotuloId} className="min-w-0 flex-1">
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            Questão <span className="font-mono tabular-nums">{numero}</span> · <span className="font-mono tabular-nums">{questao.pontuacao}</span> {questao.pontuacao === 1 ? 'ponto' : 'pontos'}
          </p>
          <TextoSeguro html={questao.enunciado} />
        </div>
        <span role="status" className="shrink-0 text-xs text-muted-foreground">
          {salvamento ? ROTULO_SALVAMENTO[salvamento] : ''}
        </span>
      </div>

      {questao.tipo === 'objetiva' ? (
        <div role="radiogroup" aria-labelledby={rotuloId} className="space-y-2">
          {questao.alternativas.map((a, i) => {
            const marcada = questao.resposta.alternativa_id === a.id;
            return (
              <Button
                key={a.id}
                type="button"
                role="radio"
                aria-checked={marcada}
                variant={marcada ? 'default' : 'outline'}
                disabled={desabilitada}
                className="h-auto w-full justify-start whitespace-normal py-2 text-left"
                // Clicar de novo na marcada limpa a resposta (o participante pode desistir de responder).
                onClick={() => onAlternativa(marcada ? null : a.id)}
              >
                <span className="mr-2 font-mono tabular-nums">{letra(i)}.</span> {a.texto}
              </Button>
            );
          })}
        </div>
      ) : (
        <div>
          <label htmlFor={`resposta-${questao.questao_id}`} className="mb-1 block text-xs font-medium text-muted-foreground">
            Sua resposta
          </label>
          <textarea
            id={`resposta-${questao.questao_id}`}
            rows={6}
            maxLength={TEXTO_MAX_RESPOSTA}
            disabled={desabilitada}
            value={questao.resposta.texto ?? ''}
            onChange={(e) => onTexto(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>
      )}
    </section>
  );
};

/** Questão depois de enviada: a resposta dada e, corrigida, pontos e comentário (nunca a alternativa correta). */
export const TentativaQuestaoResultado: React.FC<{ numero: number; questao: TentativaQuestaoParticipante }> = ({ numero, questao }) => {
  const escolhida = questao.alternativas.findIndex((a) => a.id === questao.resposta.alternativa_id);
  const r = questao.resultado;

  return (
    <section className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            Questão <span className="font-mono tabular-nums">{numero}</span>
          </p>
          <TextoSeguro html={questao.enunciado} />
        </div>
        {r && (
          <span className="shrink-0 text-right text-sm">
            <span className="font-mono font-semibold tabular-nums text-foreground">
              {r.pontos ?? '—'}/{questao.pontuacao}
            </span>
            {r.acertou !== undefined && <span className={r.acertou ? 'ml-2 text-status-success' : 'ml-2 text-destructive'}>{r.acertou ? 'Acertou' : 'Errou'}</span>}
          </span>
        )}
      </div>

      <div className="rounded-lg bg-muted/40 p-3">
        <p className="mb-1 text-xs font-medium text-muted-foreground">Sua resposta</p>
        {questao.tipo === 'objetiva' ? (
          <p className="text-sm text-foreground">{escolhida >= 0 ? `${letra(escolhida)}. ${questao.alternativas[escolhida].texto}` : 'Sem resposta'}</p>
        ) : questao.resposta.texto?.trim() ? (
          <TextoPuro texto={questao.resposta.texto} />
        ) : (
          <p className="text-sm text-foreground">Sem resposta</p>
        )}
      </div>

      {r?.comentario && (
        <div>
          <p className="text-xs font-medium text-muted-foreground">Comentário do instrutor</p>
          <TextoPuro texto={r.comentario} />
        </div>
      )}
    </section>
  );
};
