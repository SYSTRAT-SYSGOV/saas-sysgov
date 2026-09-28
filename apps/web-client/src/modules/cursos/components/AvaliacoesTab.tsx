import React, { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@sysgov/ui';
import { ConfirmDialog, EmptyState, ScreenState, StatusChip } from '@/components/ui';
import { sysgovApi, type Aula, type Avaliacao } from '@sysgov/sdk';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { descreverLiberacao } from '../utils/formatos';
import { AvaliacaoFormModal } from './AvaliacaoFormModal';
import { ErroFormulario } from './ErroFormulario';

interface Props {
  cursoId: number;
  aulas: Aula[];
  editavel: boolean;
  /** Evento não tem avaliação (nem nota mínima). */
  evento: boolean;
}

/** Avaliações do curso: peso, tentativas, tempo, liberação e publicação. */
export const AvaliacoesTab: React.FC<Props> = ({ cursoId, aulas, editavel, evento }) => {
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[] | null>(null);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [emEdicao, setEmEdicao] = useState<Avaliacao | null | undefined>(undefined);
  const [excluir, setExcluir] = useState<Avaliacao | null>(null);

  const carregar = useCallback(async () => {
    setErroCarga(null);
    try {
      setAvaliacoes(await sysgovApi.cursos.listarAvaliacoes(cursoId));
    } catch (e) {
      setErroCarga(getApiErrorMessage(e, 'Não foi possível carregar as avaliações.'));
    }
  }, [cursoId]);

  useEffect(() => {
    if (!evento) void carregar();
  }, [carregar, evento]);

  const executar = async (acao: () => Promise<unknown>, falha: string) => {
    setErro(null);
    try {
      await acao();
      await carregar();
    } catch (e) {
      setErro(getApiErrorMessage(e, falha));
    }
  };

  // A lista não traz as questões: a edição busca a avaliação completa.
  const editar = (a: Avaliacao) => {
    setErro(null);
    sysgovApi.cursos
      .getAvaliacao(a.id)
      .then(setEmEdicao)
      .catch((e) => setErro(getApiErrorMessage(e, 'Não foi possível abrir a avaliação.')));
  };

  if (evento) return <EmptyState title="Eventos não têm avaliação" description="Avaliações e nota mínima existem só em cursos. Mude o tipo do curso, se for o caso." />;
  if (erroCarga) return <ScreenState type="error" title="Erro ao carregar" description={erroCarga} actionLabel="Tentar novamente" onAction={carregar} />;
  if (!avaliacoes) return <ScreenState type="loading" title="Carregando avaliações..." />;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">A nota final é a média ponderada, pelo peso, da melhor tentativa em cada avaliação publicada.</p>
        {editavel && (
          <Button size="sm" onClick={() => setEmEdicao(null)}>
            <Plus className="h-4 w-4" /> Nova avaliação
          </Button>
        )}
      </div>
      <ErroFormulario mensagem={erro} />

      {avaliacoes.length === 0 ? (
        <EmptyState title="Nenhuma avaliação" description="Monte uma avaliação com as questões do banco do curso." />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {avaliacoes.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{a.titulo}</p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-mono tabular-nums">{a.questoes_count}</span> questões · peso <span className="font-mono tabular-nums">{a.peso}</span> ·{' '}
                  <span className="font-mono tabular-nums">{a.tentativas_max}</span> {a.tentativas_max === 1 ? 'tentativa' : 'tentativas'}
                  {a.tempo_limite_minutos ? <> · <span className="font-mono tabular-nums">{a.tempo_limite_minutos}</span> min</> : ' · sem limite de tempo'} · {descreverLiberacao(a.liberacao_regra, a.liberacao_dias)}
                  {a.tentativas_count > 0 && <> · <span className="font-mono tabular-nums">{a.tentativas_count}</span> tentativa(s) feita(s)</>}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <StatusChip label={a.publicada ? 'Publicada' : 'Rascunho'} variant={a.publicada ? 'success' : 'neutral'} />
                {editavel && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void executar(() => (a.publicada ? sysgovApi.cursos.despublicarAvaliacao(a.id) : sysgovApi.cursos.publicarAvaliacao(a.id)), 'Não foi possível alterar a publicação.')}
                    >
                      {a.publicada ? 'Despublicar' : 'Publicar'}
                    </Button>
                    <Button size="icon-sm" variant="ghost" aria-label={`Editar ${a.titulo}`} onClick={() => editar(a)}>
                      <Pencil />
                    </Button>
                    <Button size="icon-sm" variant="ghost" aria-label={`Excluir ${a.titulo}`} onClick={() => setExcluir(a)}>
                      <Trash2 />
                    </Button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <AvaliacaoFormModal
        open={emEdicao !== undefined}
        cursoId={cursoId}
        aulas={aulas}
        avaliacao={emEdicao}
        onClose={() => setEmEdicao(undefined)}
        onSalvo={() => {
          setEmEdicao(undefined);
          void carregar();
        }}
      />
      <ConfirmDialog
        open={excluir !== null}
        onClose={() => setExcluir(null)}
        requireReason={false}
        title="Excluir avaliação"
        description={`Excluir "${excluir?.titulo ?? ''}"? Avaliações que já têm tentativas não podem ser excluídas.`}
        confirmLabel="Excluir"
        onConfirm={() => {
          const alvo = excluir;
          setExcluir(null);
          if (alvo) void executar(() => sysgovApi.cursos.excluirAvaliacao(alvo.id), 'Não foi possível excluir a avaliação.');
        }}
      />
    </div>
  );
};

export default AvaliacoesTab;
