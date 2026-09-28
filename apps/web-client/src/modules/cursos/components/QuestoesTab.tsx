import React, { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Power, PowerOff, Trash2 } from 'lucide-react';
import { Button } from '@sysgov/ui';
import { ConfirmDialog, EmptyState, ScreenState, StatusChip } from '@/components/ui';
import { sysgovApi, type Questao } from '@sysgov/sdk';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { TIPO_QUESTAO } from '../utils/formatos';
import { htmlParaTexto } from '../utils/htmlSeguro';
import { ErroFormulario } from './ErroFormulario';
import { QuestaoFormModal } from './QuestaoFormModal';

interface Props {
  cursoId: number;
  editavel: boolean;
}

/** Banco de questões do curso. Questão já respondida não é excluída: só desativada. */
export const QuestoesTab: React.FC<Props> = ({ cursoId, editavel }) => {
  const [questoes, setQuestoes] = useState<Questao[] | null>(null);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [emEdicao, setEmEdicao] = useState<Questao | null | undefined>(undefined);
  const [excluir, setExcluir] = useState<Questao | null>(null);

  const carregar = useCallback(async () => {
    setErroCarga(null);
    try {
      setQuestoes(await sysgovApi.cursos.listarQuestoes(cursoId));
    } catch (e) {
      setErroCarga(getApiErrorMessage(e, 'Não foi possível carregar as questões.'));
    }
  }, [cursoId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const executar = async (acao: () => Promise<unknown>, falha: string) => {
    setErro(null);
    try {
      await acao();
      await carregar();
    } catch (e) {
      setErro(getApiErrorMessage(e, falha));
    }
  };

  if (erroCarga) return <ScreenState type="error" title="Erro ao carregar" description={erroCarga} actionLabel="Tentar novamente" onAction={carregar} />;
  if (!questoes) return <ScreenState type="loading" title="Carregando questões..." />;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Questões do curso, usadas na montagem das avaliações.</p>
        {editavel && (
          <Button size="sm" onClick={() => setEmEdicao(null)}>
            <Plus className="h-4 w-4" /> Nova questão
          </Button>
        )}
      </div>
      <ErroFormulario mensagem={erro} />

      {questoes.length === 0 ? (
        <EmptyState title="Nenhuma questão" description="Cadastre questões objetivas (correção automática) ou dissertativas (corrigidas pelo instrutor)." />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {questoes.map((q) => (
            <li key={q.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground">{htmlParaTexto(q.enunciado, 160)}</p>
                <p className="text-xs text-muted-foreground">
                  {TIPO_QUESTAO[q.tipo]} · <span className="font-mono tabular-nums">{Number(q.pontuacao)}</span> {Number(q.pontuacao) === 1 ? 'ponto' : 'pontos'}
                  {q.tipo === 'objetiva' && ` · ${q.alternativas.length} alternativas`}
                  {(q.avaliacoes_count ?? 0) > 0 && ` · em ${q.avaliacoes_count} ${q.avaliacoes_count === 1 ? 'avaliação' : 'avaliações'}`}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <StatusChip label={q.ativa ? 'Ativa' : 'Desativada'} variant={q.ativa ? 'success' : 'neutral'} />
                {editavel && (
                  <>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`${q.ativa ? 'Desativar' : 'Ativar'} questão ${q.id}`}
                      onClick={() => void executar(() => (q.ativa ? sysgovApi.cursos.desativarQuestao(q.id) : sysgovApi.cursos.ativarQuestao(q.id)), 'Não foi possível alterar a questão.')}
                    >
                      {q.ativa ? <PowerOff /> : <Power />}
                    </Button>
                    <Button size="icon-sm" variant="ghost" aria-label={`Editar questão ${q.id}`} onClick={() => setEmEdicao(q)}>
                      <Pencil />
                    </Button>
                    <Button size="icon-sm" variant="ghost" aria-label={`Excluir questão ${q.id}`} onClick={() => setExcluir(q)}>
                      <Trash2 />
                    </Button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <QuestaoFormModal
        open={emEdicao !== undefined}
        cursoId={cursoId}
        questao={emEdicao}
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
        title="Excluir questão"
        description="Excluir esta questão? Se ela já foi respondida ou está numa avaliação, a exclusão é recusada — nesse caso, desative-a."
        confirmLabel="Excluir"
        onConfirm={() => {
          const alvo = excluir;
          setExcluir(null);
          if (alvo) void executar(() => sysgovApi.cursos.excluirQuestao(alvo.id), 'Não foi possível excluir a questão.');
        }}
      />
    </div>
  );
};

export default QuestoesTab;
