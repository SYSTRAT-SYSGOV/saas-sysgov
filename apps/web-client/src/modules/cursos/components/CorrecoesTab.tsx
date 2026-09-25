import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '@sysgov/ui';
import { EmptyState, ScreenState, StatusChip, Tabs, type TabsItem } from '@/components/ui';
import { sysgovApi, type FilaCorrecaoItem, type StatusTentativa } from '@sysgov/sdk';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { STATUS_TENTATIVA, formatarDataHora, formatarNota } from '../utils/formatos';
import { CorrecaoModal } from './CorrecaoModal';

interface Props {
  turmaId: number;
  /** Turma aberta: a correção pode ser feita e revista; encerrada, fica só para consulta. */
  aberta: boolean;
  /** Avisa a página que a fila mudou (a nota parcial dos inscritos pode ter mudado). */
  onMudou?: () => void;
}

type Filtro = Extract<StatusTentativa, 'aguardando_correcao' | 'corrigida'>;

const ABAS: TabsItem<Filtro>[] = [
  { key: 'aguardando_correcao', label: 'Aguardando correção' },
  { key: 'corrigida', label: 'Corrigidas' },
];

/** Fila de correção da turma: tentativas com dissertativa que esperam o instrutor, e as já corrigidas para revisão. */
export const CorrecoesTab: React.FC<Props> = ({ turmaId, aberta, onMudou }) => {
  const [filtro, setFiltro] = useState<Filtro>('aguardando_correcao');
  const [fila, setFila] = useState<FilaCorrecaoItem[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [corrigindo, setCorrigindo] = useState<number | null>(null);

  const carregar = useCallback(async () => {
    setErro(null);
    try {
      setFila(await sysgovApi.cursos.filaCorrecao(turmaId, filtro));
    } catch (e) {
      setErro(getApiErrorMessage(e, 'Não foi possível carregar a fila de correção.'));
    }
  }, [turmaId, filtro]);

  useEffect(() => {
    setFila(null);
    void carregar();
  }, [carregar]);

  if (erro) return <ScreenState type="error" title="Erro ao carregar" description={erro} actionLabel="Tentar novamente" onAction={carregar} />;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Tabs items={ABAS} value={filtro} onChange={setFiltro} />
        <p className="text-xs text-muted-foreground">
          {aberta ? 'As correções podem ser revistas até o encerramento da turma.' : 'Turma encerrada: as correções são só para consulta.'}
        </p>
      </div>

      {!fila ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : fila.length === 0 ? (
        <EmptyState
          title={filtro === 'aguardando_correcao' ? 'Nenhuma tentativa aguardando correção' : 'Nenhuma tentativa corrigida ainda'}
          description={filtro === 'aguardando_correcao' ? 'Tentativas com questões dissertativas aparecem aqui quando o participante envia.' : 'As tentativas corrigidas aparecem aqui para revisão.'}
        />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {fila.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{t.participante.nome}</p>
                <p className="text-xs text-muted-foreground">
                  {t.avaliacao.titulo} · tentativa <span className="font-mono tabular-nums">{t.numero}</span>
                  {t.enviada_em && <span className="font-mono tabular-nums"> · enviada em {formatarDataHora(t.enviada_em)}</span>}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {t.status === 'aguardando_correcao' ? (
                  <StatusChip label={`${t.pendentes} ${t.pendentes === 1 ? 'questão pendente' : 'questões pendentes'}`} variant={STATUS_TENTATIVA[t.status].variant} />
                ) : (
                  <span className="font-mono text-sm font-semibold tabular-nums">{formatarNota(t.nota)}</span>
                )}
                <Button size="sm" variant={t.status === 'aguardando_correcao' && aberta ? 'default' : 'outline'} onClick={() => setCorrigindo(t.id)}>
                  {t.status === 'aguardando_correcao' && aberta ? 'Corrigir' : aberta ? 'Rever' : 'Ver'}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <CorrecaoModal
        tentativaId={corrigindo}
        editavel={aberta}
        onClose={() => {
          setCorrigindo(null);
          void carregar();
          onMudou?.();
        }}
      />
    </div>
  );
};

export default CorrecoesTab;
