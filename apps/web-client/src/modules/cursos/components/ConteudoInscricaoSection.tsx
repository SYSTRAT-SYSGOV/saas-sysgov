import React, { useCallback, useEffect, useState } from 'react';
import { Card } from '@sysgov/ui';
import { ScreenState } from '@/components/ui';
import { sysgovApi, type ConteudoInscricao } from '@sysgov/sdk';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { formatarNota } from '../utils/formatos';
import { AvaliacaoParticipante } from './AvaliacaoParticipante';
import { MaterialParticipante } from './MaterialParticipante';

interface Props {
  inscricaoId: number;
  onAbrirTentativa: (tentativaId: number) => void;
}

/** Materiais, avaliações e nota da inscrição (área do participante). */
export const ConteudoInscricaoSection: React.FC<Props> = ({ inscricaoId, onAbrirTentativa }) => {
  const [conteudo, setConteudo] = useState<ConteudoInscricao | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setErro(null);
    try {
      setConteudo(await sysgovApi.cursos.getConteudoInscricao(inscricaoId));
    } catch (e) {
      setErro(getApiErrorMessage(e, 'Não foi possível carregar os materiais e as avaliações.'));
    }
  }, [inscricaoId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  if (erro) return <ScreenState type="error" title="Erro ao carregar" description={erro} actionLabel="Tentar novamente" onAction={carregar} />;
  if (!conteudo) return <p className="text-sm text-muted-foreground">Carregando materiais e avaliações...</p>;
  if (!conteudo.acesso) {
    return (
      <Card className="p-4">
        <p className="text-sm text-muted-foreground">Os materiais e as avaliações ficam disponíveis quando a inscrição está confirmada.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {conteudo.nota !== null && (
        <Card className="flex items-center gap-6 p-4">
          <div>
            <p className="text-xs text-muted-foreground">{conteudo.nota_tipo === 'final' ? 'Nota final' : 'Nota parcial'}</p>
            <p className="font-mono text-lg font-semibold tabular-nums text-foreground">{formatarNota(conteudo.nota)}</p>
          </div>
          {conteudo.nota_tipo === 'parcial' && <p className="text-xs text-muted-foreground">Média ponderada da melhor tentativa de cada avaliação. Avaliação sem tentativa corrigida vale zero.</p>}
        </Card>
      )}

      <section aria-labelledby="secao-materiais" className="space-y-2">
        <h2 id="secao-materiais" className="text-sm font-semibold text-foreground">
          Materiais
        </h2>
        <Card className="p-0">
          {conteudo.materiais.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Nenhum material publicado neste curso.</p>
          ) : (
            <ul className="divide-y divide-border">
              {conteudo.materiais.map((m) => (
                <MaterialParticipante key={m.id} material={m} />
              ))}
            </ul>
          )}
        </Card>
      </section>

      <section aria-labelledby="secao-avaliacoes" className="space-y-2">
        <h2 id="secao-avaliacoes" className="text-sm font-semibold text-foreground">
          Avaliações
        </h2>
        <Card className="p-0">
          {conteudo.avaliacoes.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Nenhuma avaliação publicada neste curso.</p>
          ) : (
            <ul className="divide-y divide-border">
              {conteudo.avaliacoes.map((a) => (
                <AvaliacaoParticipante key={a.id} avaliacao={a} inscricaoId={inscricaoId} onAbrirTentativa={onAbrirTentativa} />
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
};

export default ConteudoInscricaoSection;
