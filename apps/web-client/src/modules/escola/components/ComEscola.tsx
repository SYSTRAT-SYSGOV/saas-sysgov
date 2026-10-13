import React, { useCallback, useEffect, useState } from 'react';
import { School } from 'lucide-react';
import { Button, Card, Select } from '@sysgov/ui';
import { ScreenState } from '@/components/ui';
import { definirEscolaAtiva, obterEscolaAtiva } from '@/core/escola/escolaAtiva';
import { escolaApi, type Escola, type ModuloEducacao } from '../api';

interface ComEscolaProps {
  modulo: ModuloEducacao;
  children: React.ReactNode;
}

/**
 * Envolve um módulo de educação com a escola de trabalho: carrega as escolas que o usuário acessa
 * no módulo, escolhe sozinho quando há uma só, pede a escolha quando há várias e remonta o
 * conteúdo ao trocar de escola (cada escola é um conjunto de dados à parte).
 */
export const ComEscola: React.FC<ComEscolaProps> = ({ modulo, children }) => {
  const [escolas, setEscolas] = useState<Escola[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ativa, setAtiva] = useState<number | null>(obterEscolaAtiva());

  const escolher = useCallback((id: number) => {
    definirEscolaAtiva(id);
    setAtiva(id);
  }, []);

  useEffect(() => {
    let cancelado = false;
    escolaApi
      .minhasEscolas(modulo)
      .then((lista) => {
        if (cancelado) return;
        setEscolas(lista);
        const atual = obterEscolaAtiva();
        if (atual !== null && lista.some((e) => e.id === atual)) {
          setAtiva(atual);
        } else if (lista.length === 1) {
          escolher(lista[0].id);
        } else {
          setAtiva(null);
        }
      })
      .catch(() => !cancelado && setErro('Não foi possível carregar as escolas.'));
    return () => {
      cancelado = true;
    };
  }, [modulo, escolher]);

  if (erro) return <ScreenState type="error" title={erro} />;
  if (escolas === null) return <ScreenState type="loading" title="Carregando escolas..." />;
  if (escolas.length === 0) {
    return <ScreenState type="empty" title="Nenhuma escola disponível" description="Peça ao administrador acesso a uma escola neste módulo." />;
  }

  const escolaAtual = escolas.find((e) => e.id === ativa) ?? null;

  if (escolaAtual === null) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Escolha a escola de trabalho</h2>
          <p className="text-sm text-muted-foreground">Os dados exibidos e os lançamentos feitos valem para a escola escolhida.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {escolas.map((e) => (
            <Card key={e.id} className="flex items-center justify-between gap-3 p-4">
              <div className="flex items-center gap-3">
                <School className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-foreground">{e.nome}</p>
                  {e.inep && <p className="font-mono text-xs tabular-nums text-muted-foreground">INEP {e.inep}</p>}
                  {!e.ativa && <p className="text-xs text-amber-600">Inativa — somente consulta</p>}
                </div>
              </div>
              <Button size="sm" onClick={() => escolher(e.id)}>Entrar</Button>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {escolas.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
          <School className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium text-muted-foreground">Escola de trabalho</span>
          <div className="min-w-[16rem]">
            <Select
              value={escolaAtual.id}
              onChange={(v) => escolher(Number(v))}
              options={escolas.map((e) => ({ value: e.id, label: e.ativa ? e.nome : `${e.nome} (inativa)` }))}
            />
          </div>
        </div>
      )}
      {!escolaAtual.ativa && (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          Esta escola está inativa: os dados podem ser consultados, mas não aceita novos cadastros ou lançamentos.
        </p>
      )}
      <React.Fragment key={escolaAtual.id}>{children}</React.Fragment>
    </div>
  );
};

export default ComEscola;
