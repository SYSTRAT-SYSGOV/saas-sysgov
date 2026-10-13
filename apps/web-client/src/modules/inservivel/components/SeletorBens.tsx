import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { Button, Checkbox, Input, Skeleton } from '@sysgov/ui';
import { useCarga } from '../../escola/useCarga';
import { inservivelApi, type BemResumo } from '../api';
import { formatarCentavos, rotuloUnidade } from '../formato';

/** Busca de bens aptos a entrar em lote (situação de papel `inservivel`) com seleção múltipla. */
export const SeletorBens: React.FC<{ selecionados: Map<number, BemResumo>; onChange: (m: Map<number, BemResumo>) => void }> = ({ selecionados, onChange }) => {
  const [busca, setBusca] = useState('');
  const [aplicada, setAplicada] = useState('');
  const lista = useCarga(() => inservivelApi.bens({ papel: 'inservivel', q: aplicada || undefined, per_page: 50 }), [aplicada]);

  const alternar = (b: BemResumo) => {
    const novo = new Map(selecionados);
    if (novo.has(b.id)) novo.delete(b.id); else novo.set(b.id, b);
    onChange(novo);
  };
  const total = [...selecionados.values()].reduce((s, b) => s + b.valor_referencia_cents, 0);

  return (
    <div className="space-y-2">
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); setAplicada(busca); }}>
        <Input aria-label="Buscar bens inservíveis" placeholder="Buscar bens inservíveis por nº, descrição, marca…" value={busca} onChange={(e) => setBusca(e.target.value)} className="flex-1" />
        <Button type="submit" variant="outline" leftIcon={<Search className="h-4 w-4" />}>Buscar</Button>
      </form>
      <p className="text-xs text-muted-foreground">
        <span className="font-mono tabular-nums">{selecionados.size}</span> selecionado(s) · <span className="font-mono tabular-nums">{formatarCentavos(total)}</span>
      </p>
      <div className="max-h-72 overflow-y-auto rounded-md border border-border">
        {!lista.dados ? <Skeleton className="h-40 w-full" /> : lista.dados.data.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Nenhum bem com a situação "Inservível" encontrado.</p>
        ) : (
          <ul className="divide-y divide-border">
            {lista.dados.data.map((b) => (
              <li key={b.id}>
                <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-muted">
                  <Checkbox checked={selecionados.has(b.id)} onCheckedChange={() => alternar(b)} aria-label={`Selecionar ${b.numero_patrimonial}`} />
                  <span className="w-24 font-mono tabular-nums">{b.numero_patrimonial}</span>
                  <span className="flex-1 truncate">{b.descricao}<span className="block text-xs text-muted-foreground">{rotuloUnidade(b.secretaria, b.setor)}</span></span>
                  <span className="font-mono tabular-nums">{formatarCentavos(b.valor_referencia_cents)}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
