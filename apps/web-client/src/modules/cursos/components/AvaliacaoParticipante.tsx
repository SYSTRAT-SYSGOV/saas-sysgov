import React, { useState } from 'react';
import { ClipboardList, Lock } from 'lucide-react';
import { Button } from '@sysgov/ui';
import { ConfirmDialog, StatusChip } from '@/components/ui';
import { sysgovApi, type ConteudoAvaliacao } from '@sysgov/sdk';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { STATUS_TENTATIVA, formatarDataHora, formatarNota } from '../utils/formatos';
import { ErroFormulario } from './ErroFormulario';
import { TextoSeguro } from './TextoSeguro';

interface Props {
  avaliacao: ConteudoAvaliacao;
  inscricaoId: number;
  onAbrirTentativa: (tentativaId: number) => void;
}

/** Uma avaliação na área do participante: situação, tentativas restantes, notas e o botão de iniciar. */
export const AvaliacaoParticipante: React.FC<Props> = ({ avaliacao, inscricaoId, onAbrirTentativa }) => {
  const [confirmando, setConfirmando] = useState(false);
  const [iniciando, setIniciando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const iniciar = async () => {
    setConfirmando(false);
    setErro(null);
    setIniciando(true);
    try {
      onAbrirTentativa((await sysgovApi.cursos.iniciarTentativa(avaliacao.id, inscricaoId)).id);
    } catch (e) {
      setErro(getApiErrorMessage(e, 'Não foi possível iniciar a avaliação.'));
    } finally {
      setIniciando(false);
    }
  };

  const Icone = avaliacao.liberado ? ClipboardList : Lock;

  return (
    <li className="space-y-2 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <Icone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">{avaliacao.titulo}</p>
            <p className="text-xs text-muted-foreground">
              <span className="font-mono tabular-nums">{avaliacao.questoes_total}</span> questões · peso <span className="font-mono tabular-nums">{avaliacao.peso}</span> ·{' '}
              {avaliacao.tempo_limite_minutos ? (
                <>
                  <span className="font-mono tabular-nums">{avaliacao.tempo_limite_minutos}</span> min
                </>
              ) : (
                'sem limite de tempo'
              )}{' '}
              · tentativas restantes: <span className="font-mono tabular-nums">{avaliacao.tentativas_restantes}</span> de{' '}
              <span className="font-mono tabular-nums">{avaliacao.tentativas_max}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {avaliacao.melhor_nota !== null && (
            <span className="text-xs text-muted-foreground">
              Melhor nota <span className="font-mono text-sm font-semibold tabular-nums text-foreground">{formatarNota(avaliacao.melhor_nota)}</span>
            </span>
          )}
          {!avaliacao.liberado ? (
            <StatusChip label={avaliacao.aguardando_agendamento ? 'Aguardando agendamento' : `Libera em ${formatarDataHora(avaliacao.prevista_em)}`} variant="warning" />
          ) : avaliacao.tentativa_em_andamento_id !== null ? (
            <Button size="sm" onClick={() => onAbrirTentativa(avaliacao.tentativa_em_andamento_id as number)}>
              Continuar tentativa
            </Button>
          ) : (
            avaliacao.pode_iniciar && (
              <Button size="sm" isLoading={iniciando} onClick={() => (avaliacao.tempo_limite_minutos ? setConfirmando(true) : void iniciar())}>
                Iniciar tentativa
              </Button>
            )
          )}
        </div>
      </div>

      <ErroFormulario mensagem={erro} />
      {avaliacao.liberado && avaliacao.instrucoes && <TextoSeguro html={avaliacao.instrucoes} className="pl-6 text-muted-foreground" />}

      {avaliacao.tentativas.length > 0 && (
        <ul className="ml-6 divide-y divide-border rounded-lg border border-border">
          {avaliacao.tentativas.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 text-sm">
              <span>
                Tentativa <span className="font-mono tabular-nums">{t.numero}</span>
                {t.enviada_em && <span className="ml-2 font-mono text-xs tabular-nums text-muted-foreground">enviada em {formatarDataHora(t.enviada_em)}</span>}
              </span>
              <span className="flex items-center gap-2">
                {t.nota !== null && <span className="font-mono font-semibold tabular-nums">{formatarNota(t.nota)}</span>}
                <StatusChip label={STATUS_TENTATIVA[t.status].label} variant={STATUS_TENTATIVA[t.status].variant} />
                <Button size="sm" variant="ghost" onClick={() => onAbrirTentativa(t.id)}>
                  {t.status === 'em_andamento' ? 'Continuar' : 'Ver'}
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={confirmando}
        onClose={() => setConfirmando(false)}
        requireReason={false}
        destructive={false}
        title="Iniciar avaliação"
        description={`Esta avaliação tem tempo limite de ${avaliacao.tempo_limite_minutos} minutos. O tempo começa a contar agora e, ao terminar, a tentativa é enviada com as respostas já salvas.`}
        confirmLabel="Iniciar agora"
        onConfirm={() => void iniciar()}
      />
    </li>
  );
};

export default AvaliacaoParticipante;
