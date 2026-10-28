import React, { useEffect, useState } from 'react';
import { LayoutDashboard } from 'lucide-react';
import { Card, Switch } from '@sysgov/ui';
import { apiClient } from '@/core/api/client';
import type { CartaoEscolha } from './tipos';

/** "Meu perfil": o usuário escolhe quais cards aparecem na própria home. Só lista módulos a que ele tem acesso. */
export const PreferenciasCardsHome: React.FC = () => {
  const [cartoes, setCartoes] = useState<CartaoEscolha[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    apiClient
      .get<{ data: CartaoEscolha[] }>('/client/dashboard-preferences')
      .then((res) => { if (ativo) setCartoes(res.data.data ?? []); })
      .catch(() => { if (ativo) setErro('Não foi possível carregar as opções da página inicial.'); });
    return () => { ativo = false; };
  }, []);

  const alternar = async (modulo: string, visivel: boolean) => {
    if (!cartoes) return;
    const anterior = cartoes;
    const proximo = cartoes.map((c) => (c.module === modulo ? { ...c, hidden: !visivel } : c));
    setCartoes(proximo);
    setErro(null);
    try {
      await apiClient.put('/client/dashboard-preferences', { hidden: proximo.filter((c) => c.hidden).map((c) => c.module) });
    } catch {
      setCartoes(anterior);
      setErro('Não foi possível salvar a escolha. Tente novamente.');
    }
  };

  const grupos = (cartoes ?? []).reduce<Record<string, { label: string; itens: CartaoEscolha[] }>>((acc, c) => {
    (acc[c.group] ??= { label: c.group_label, itens: [] }).itens.push(c);
    return acc;
  }, {});

  return (
    <Card className="p-6">
      <div className="mb-1 flex items-center gap-2">
        <LayoutDashboard className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Cards da página inicial</h2>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">Escolha quais totais aparecem na sua página inicial. Só aparecem os módulos a que você tem acesso.</p>

      {erro && <p role="alert" className="mb-3 text-sm text-destructive">{erro}</p>}

      {cartoes === null && !erro ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : cartoes !== null && cartoes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum módulo com card disponível para o seu acesso.</p>
      ) : (
        <div className="space-y-4">
          {Object.entries(grupos).map(([chave, g]) => (
            <div key={chave} className="rounded-lg border border-border bg-card p-3">
              <p className="mb-2 text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">{g.label}</p>
              <ul className="divide-y divide-border">
                {g.itens.map((c) => (
                  <li key={c.module} className="flex items-center justify-between py-2">
                    <span className="text-sm text-foreground">{c.label}</span>
                    <Switch
                      checked={!c.hidden}
                      onCheckedChange={(v) => alternar(c.module, v)}
                      label={`Mostrar o card ${c.label}`}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
