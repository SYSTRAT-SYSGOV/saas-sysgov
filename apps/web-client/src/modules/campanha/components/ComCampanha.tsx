import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Vote } from 'lucide-react';
import { Button, Card, Select } from '@sysgov/ui';
import { EmptyState, ScreenState } from '@/components/ui';
import { useCan } from '@/core/rbac/useCan';
import { definirCampanhaAtiva, obterCampanhaAtiva } from '@/core/campanha/campanhaAtiva';
import { erroApi } from '../../escola/api';
import { campanhaApi, type Campanha } from '../api';
import { CampanhaFormModal } from './CampanhaForm';

export interface ContextoCampanha {
  campanhas: Campanha[];
  campanha: Campanha;
  escolher: (id: number) => void;
  recarregarCampanhas: () => Promise<void>;
}

/** Escolhe a campanha de trabalho dentre as primeiras de uma lista (lembrada, única ou nenhuma). */
export function campanhaInicial(campanhas: Campanha[], lembrada: number | null): number | null {
  if (lembrada !== null && campanhas.some((c) => c.id === lembrada)) return lembrada;
  return campanhas.length === 1 ? campanhas[0].id : null;
}

/**
 * Envolve o módulo com a campanha de trabalho (D2): carrega as campanhas que o usuário acessa, escolhe
 * sozinha quando há uma, pede a escolha quando há várias e remonta o conteúdo ao trocar. Sem campanhas,
 * quem tem a gestão cadastra a primeira aqui mesmo.
 */
export const ComCampanha: React.FC<{ children: (contexto: ContextoCampanha) => React.ReactNode }> = ({ children }) => {
  const { can } = useCan();
  const [campanhas, setCampanhas] = useState<Campanha[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ativa, setAtiva] = useState<number | null>(obterCampanhaAtiva());
  const [nova, setNova] = useState(false);

  const escolher = useCallback((id: number) => {
    definirCampanhaAtiva(id);
    setAtiva(id);
  }, []);

  const recarregarCampanhas = useCallback(async () => {
    try {
      const lista = await campanhaApi.minhas();
      setCampanhas(lista);
      const inicial = campanhaInicial(lista, obterCampanhaAtiva());
      if (inicial !== null) escolher(inicial);
      else setAtiva(null);
    } catch (e) {
      setErro(erroApi(e).mensagem);
    }
  }, [escolher]);

  useEffect(() => {
    void recarregarCampanhas();
  }, [recarregarCampanhas]);

  if (erro) return <ScreenState type="error" title={erro} />;
  if (campanhas === null) return <ScreenState type="loading" title="Carregando campanhas..." />;

  const gestao = can('campanha.gestao.manage');
  const formNova = (
    <CampanhaFormModal campanha={nova ? 'nova' : null} onFechar={() => setNova(false)} onSalva={async (c) => { setNova(false); definirCampanhaAtiva(c.id); await recarregarCampanhas(); }} />
  );

  if (campanhas.length === 0) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <EmptyState
          icon={<Vote className="h-8 w-8" />}
          title="Nenhuma campanha disponível"
          description={gestao ? 'Cadastre a primeira campanha: o candidato, a eleição e a UF de atuação.' : 'Peça à coordenação geral para incluir você numa campanha.'}
          actionLabel={gestao ? 'Cadastrar campanha' : undefined}
          onAction={gestao ? () => setNova(true) : undefined}
        />
        {formNova}
      </div>
    );
  }

  const atual = campanhas.find((c) => c.id === ativa) ?? null;
  if (atual === null) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Escolha a campanha de trabalho</h2>
          <p className="text-sm text-muted-foreground">O mapa, os municípios e as equipes exibidos são os da campanha escolhida.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {campanhas.map((c) => (
            <Card key={c.id} className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium text-foreground">{c.candidato?.nome_urna ?? c.nome}</p>
                <p className="text-xs text-muted-foreground">{c.cargo} · <span className="font-mono tabular-nums">{c.ano}</span> · {c.uf}{c.status === 'encerrada' ? ' · encerrada' : ''}</p>
              </div>
              <Button size="sm" onClick={() => escolher(c.id)}>Entrar</Button>
            </Card>
          ))}
        </div>
        {gestao && <Button variant="outline" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setNova(true)}>Nova campanha</Button>}
        {formNova}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {campanhas.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 print:hidden">
          <Vote className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium text-muted-foreground">Campanha de trabalho</span>
          <div className="min-w-[18rem]">
            <Select value={atual.id} onChange={(v) => escolher(Number(v))} options={campanhas.map((c) => ({ value: c.id, label: `${c.candidato?.nome_urna ?? c.nome} — ${c.cargo} ${c.ano}` }))} />
          </div>
        </div>
      )}
      {atual.status === 'encerrada' && (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          Esta campanha está encerrada: os dados podem ser consultados, mas não aceitam alterações.
        </p>
      )}
      <React.Fragment key={atual.id}>{children({ campanhas, campanha: atual, escolher, recarregarCampanhas })}</React.Fragment>
    </div>
  );
};

export default ComCampanha;
