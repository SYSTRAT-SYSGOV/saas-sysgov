import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ClipboardList, Clock } from 'lucide-react';
import { Button, Card } from '@sysgov/ui';
import { ConfirmDialog, PageHeader, ScreenState, StatusChip } from '@/components/ui';
import { sysgovApi, type TentativaParticipante } from '@sysgov/sdk';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { ErroFormulario } from '../components/ErroFormulario';
import { TentativaQuestao, TentativaQuestaoResultado, type EstadoSalvamento } from '../components/TentativaQuestao';
import { TextoSeguro } from '../components/TextoSeguro';
import { STATUS_TENTATIVA, formatarContagem, formatarDataHora, formatarNota } from '../utils/formatos';
import { ESPERA_AUTOSAVE_MS, diferencaDoServidor, restanteAtePrazo } from '../utils/tentativa';

interface Props {
  tentativaId: number;
  onVoltar: () => void;
}

/**
 * Responder uma avaliação: as respostas são salvas sozinhas (objetiva na
 * hora, dissertativa depois de uma pausa na digitação), o cronômetro usa o
 * relógio do servidor e, ao fim do prazo, a tela bloqueia e envia o que já
 * está salvo. Depois do envio mostra o resultado, sem o gabarito.
 */
export const TentativaPage: React.FC<Props> = ({ tentativaId, onVoltar }) => {
  const [tentativa, setTentativa] = useState<TentativaParticipante | null>(null);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [salvamento, setSalvamento] = useState<Record<number, EstadoSalvamento>>({});
  const [restante, setRestante] = useState<number | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [encerrando, setEncerrando] = useState(false);

  const diferenca = useRef(0);
  const espera = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const pendentes = useRef<Record<number, string>>({});
  const fila = useRef<Record<number, Promise<void>>>({});
  const expirou = useRef(false);

  const aplicar = useCallback((t: TentativaParticipante) => {
    diferenca.current = diferencaDoServidor(t.servidor_agora);
    setTentativa(t);
  }, []);

  const carregar = useCallback(async () => {
    setErroCarga(null);
    try {
      aplicar(await sysgovApi.cursos.getTentativa(tentativaId));
    } catch (e) {
      setErroCarga(getApiErrorMessage(e, 'Não foi possível carregar a avaliação.'));
    }
  }, [tentativaId, aplicar]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  /** Salvamentos da mesma questão saem em fila: a última resposta é sempre a que vale no servidor. */
  const enviarResposta = useCallback(
    (questaoId: number, resposta: { alternativa_id?: number | null; texto?: string | null }): Promise<void> => {
      setSalvamento((s) => ({ ...s, [questaoId]: 'salvando' }));
      const anterior = fila.current[questaoId] ?? Promise.resolve();
      const atual = anterior.then(async () => {
        try {
          await sysgovApi.cursos.salvarResposta(tentativaId, questaoId, resposta);
          setSalvamento((s) => ({ ...s, [questaoId]: 'salvo' }));
        } catch (e) {
          setSalvamento((s) => ({ ...s, [questaoId]: 'erro' }));
          setErro(getApiErrorMessage(e, 'Não foi possível salvar a resposta.'));
          // O servidor pode ter fechado a tentativa (prazo): recarrega para mostrar o estado real.
          await carregar();
        }
      });
      fila.current[questaoId] = atual;
      return atual;
    },
    [tentativaId, carregar],
  );

  /** Dispara já os textos que ainda esperam a pausa na digitação. */
  const descarregarPendentes = useCallback(async () => {
    const ids = Object.keys(pendentes.current).map(Number);
    ids.forEach((id) => clearTimeout(espera.current[id]));
    const envios = ids.map((id) => {
      const texto = pendentes.current[id];
      delete pendentes.current[id];
      return enviarResposta(id, { texto });
    });
    await Promise.all([...envios, ...Object.values(fila.current)]);
  }, [enviarResposta]);

  const mudarQuestao = (questaoId: number, resposta: { alternativa_id: number | null } | { texto: string }) =>
    setTentativa((t) => (t ? { ...t, questoes: t.questoes.map((q) => (q.questao_id === questaoId ? { ...q, resposta: { ...q.resposta, ...resposta } } : q)) } : t));

  const aoEscolherAlternativa = (questaoId: number, alternativaId: number | null) => {
    if (expirou.current) return;
    setErro(null);
    mudarQuestao(questaoId, { alternativa_id: alternativaId });
    void enviarResposta(questaoId, { alternativa_id: alternativaId });
  };

  const aoDigitar = (questaoId: number, texto: string) => {
    if (expirou.current) return;
    setErro(null);
    mudarQuestao(questaoId, { texto });
    pendentes.current[questaoId] = texto;
    clearTimeout(espera.current[questaoId]);
    espera.current[questaoId] = setTimeout(() => {
      const valor = pendentes.current[questaoId];
      delete pendentes.current[questaoId];
      if (valor !== undefined) void enviarResposta(questaoId, { texto: valor });
    }, ESPERA_AUTOSAVE_MS);
  };

  const enviar = useCallback(
    async (porTempo: boolean) => {
      setEncerrando(true);
      setErro(null);
      try {
        await descarregarPendentes();
        aplicar(await sysgovApi.cursos.enviarTentativa(tentativaId));
        setAviso(porTempo ? 'O tempo terminou. Sua tentativa foi enviada com as respostas salvas até o prazo.' : null);
      } catch (e) {
        setErro(getApiErrorMessage(e, 'Não foi possível enviar a avaliação.'));
      } finally {
        setEncerrando(false);
      }
    },
    [aplicar, descarregarPendentes, tentativaId],
  );

  // Cronômetro: usa a hora do servidor; ao chegar a zero bloqueia as respostas e envia o que está salvo.
  const emAndamento = tentativa?.status === 'em_andamento';
  const prazoEm = tentativa?.prazo_em ?? null;
  useEffect(() => {
    if (!emAndamento || prazoEm === null) {
      setRestante(null);
      return;
    }
    const tick = () => {
      const ms = restanteAtePrazo(prazoEm, diferenca.current) ?? 0;
      setRestante(Math.max(0, ms));
      if (ms <= 0 && !expirou.current) {
        expirou.current = true;
        void enviar(true);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [emAndamento, prazoEm, enviar]);

  // Ao sair da tela, o que ainda espera a pausa na digitação é enviado assim mesmo.
  useEffect(
    () => () => {
      Object.entries(pendentes.current).forEach(([id, texto]) => {
        clearTimeout(espera.current[Number(id)]);
        void sysgovApi.cursos.salvarResposta(tentativaId, Number(id), { texto }).catch(() => undefined);
      });
      pendentes.current = {};
    },
    [tentativaId],
  );

  const voltar = async () => {
    await descarregarPendentes();
    onVoltar();
  };

  if (erroCarga) return <ScreenState type="error" title="Erro ao carregar" description={erroCarga} actionLabel="Tentar novamente" onAction={carregar} />;
  if (!tentativa) return <ScreenState type="loading" title="Carregando avaliação..." />;

  const status = STATUS_TENTATIVA[tentativa.status];
  const bloqueada = expirou.current || encerrando || !emAndamento;
  const naoRespondidas = tentativa.questoes.filter((q) => (q.tipo === 'objetiva' ? q.resposta.alternativa_id === null : !(q.resposta.texto ?? '').trim())).length;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<ClipboardList className="h-6 w-6" />}
        title={tentativa.avaliacao.titulo}
        subtitle={`Tentativa ${tentativa.numero} de ${tentativa.avaliacao.tentativas_max}`}
        actions={
          <div className="flex items-center gap-2">
            <StatusChip label={status.label} variant={status.variant} />
            {emAndamento && restante !== null && (
              <span role="timer" aria-label="Tempo restante" className={`flex items-center gap-1 rounded-lg border px-3 py-1 font-mono text-lg font-semibold tabular-nums ${restante <= 60_000 ? 'border-destructive/40 text-destructive' : 'border-border text-foreground'}`}>
                <Clock className="h-4 w-4" aria-hidden /> {formatarContagem(restante)}
              </span>
            )}
            <Button variant="outline" onClick={voltar}>
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Button>
          </div>
        }
      />

      <ErroFormulario mensagem={erro} />
      {aviso && (
        <div role="status" className="rounded-lg border border-status-warning-border bg-status-warning-bg px-3 py-2 text-sm text-status-warning">
          {aviso}
        </div>
      )}

      {emAndamento ? (
        <>
          {tentativa.avaliacao.instrucoes && (
            <Card className="p-4">
              <TextoSeguro html={tentativa.avaliacao.instrucoes} />
            </Card>
          )}
          <div className="space-y-4">
            {tentativa.questoes.map((q, i) => (
              <TentativaQuestao
                key={q.questao_id}
                numero={i + 1}
                questao={q}
                desabilitada={bloqueada}
                salvamento={salvamento[q.questao_id]}
                onAlternativa={(id) => aoEscolherAlternativa(q.questao_id, id)}
                onTexto={(texto) => aoDigitar(q.questao_id, texto)}
              />
            ))}
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setConfirmando(true)} disabled={bloqueada} isLoading={encerrando}>
              Enviar respostas
            </Button>
          </div>
        </>
      ) : (
        <>
          <Card className="space-y-1 p-4">
            {tentativa.status === 'corrigida' ? (
              <div>
                <p className="text-xs text-muted-foreground">Nota desta tentativa</p>
                <p className="font-mono text-3xl font-semibold tabular-nums text-foreground">{formatarNota(tentativa.nota)}</p>
              </div>
            ) : (
              <p className="text-sm text-foreground">Sua tentativa foi enviada e está aguardando a correção do instrutor. A nota aparece aqui quando a correção terminar.</p>
            )}
            {tentativa.enviada_em && <p className="font-mono text-xs tabular-nums text-muted-foreground">Enviada em {formatarDataHora(tentativa.enviada_em)}</p>}
          </Card>
          <div className="space-y-4">
            {tentativa.questoes.map((q, i) => (
              <TentativaQuestaoResultado key={q.questao_id} numero={i + 1} questao={q} />
            ))}
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirmando}
        onClose={() => setConfirmando(false)}
        requireReason={false}
        destructive={false}
        title="Enviar respostas"
        description={
          naoRespondidas > 0
            ? `Você deixou ${naoRespondidas} ${naoRespondidas === 1 ? 'questão sem resposta' : 'questões sem resposta'}. Depois de enviar, não é possível alterar as respostas.`
            : 'Depois de enviar, não é possível alterar as respostas.'
        }
        confirmLabel="Enviar agora"
        onConfirm={() => {
          setConfirmando(false);
          void enviar(false);
        }}
      />
    </div>
  );
};

export default TentativaPage;
