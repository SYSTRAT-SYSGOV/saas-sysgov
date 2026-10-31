import React, { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { Badge, Button, Input, Modal, Select } from '@sysgov/ui';
import type { Toast } from '../../escola/components/AdminModal';
import { EstadoCarga } from '../../escola/components/AdminModal';
import { useCarga } from '../../escola/useCarga';
import { mensagemDeErro, transporteApi, type ItemItinerario, type Rota } from '../api';
import { MapaItinerario } from './MapaItinerario';

const NENHUMA = '0';

/** Itinerário da rota: paradas na ordem (subir/descer grava a nova ordem de uma vez) e o mapa. */
export const Itinerario: React.FC<{ rota: Rota; podeEditar: boolean; avisar: Toast; aoFechar: () => void }> = ({ rota, podeEditar, avisar, aoFechar }) => {
  const [itens, setItens] = useState<ItemItinerario[] | null>(null);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [nova, setNova] = useState({ parada: NENHUMA, embarque: '', desembarque: '' });
  const paradas = useCarga(() => transporteApi.paradas({ ativa: true, per_page: 200 }), []);

  const carregar = useCallback(async () => {
    try {
      setItens(await transporteApi.itinerario(rota.id));
      setErroCarga(null);
    } catch (e) {
      setErroCarga(mensagemDeErro(e, 'Não foi possível carregar o itinerário.'));
    }
  }, [rota.id]);
  useEffect(() => { void carregar(); }, [carregar]);

  const executar = async (acao: () => Promise<ItemItinerario[]>) => {
    setOcupado(true);
    try {
      setItens(await acao());
    } catch (e) {
      avisar({ type: 'error', title: 'Itinerário', message: mensagemDeErro(e) });
    } finally {
      setOcupado(false);
    }
  };

  const mover = (indice: number, delta: number) => {
    if (!itens) return;
    const ids = itens.map((i) => i.parada.id);
    const destino = indice + delta;
    if (destino < 0 || destino >= ids.length) return;
    [ids[indice], ids[destino]] = [ids[destino], ids[indice]];
    void executar(() => transporteApi.reordenarItinerario(rota.id, ids));
  };

  const adicionar = async () => {
    if (nova.parada === NENHUMA) return avisar({ type: 'error', title: 'Itinerário', message: 'Escolha a parada a adicionar.' });
    await executar(() => transporteApi.adicionarParada(rota.id, {
      parada_id: Number(nova.parada),
      embarque_previsto: nova.embarque || null,
      desembarque_previsto: nova.desembarque || null,
    }));
    setNova({ parada: NENHUMA, embarque: '', desembarque: '' });
  };

  const noItinerario = new Set((itens ?? []).map((i) => i.parada.id));
  const disponiveis = (paradas.dados?.data ?? []).filter((p) => !noItinerario.has(p.id));

  return (
    <Modal open onClose={aoFechar} title={`Itinerário — ${rota.nome}`} size="xl" footer={<Button variant="outline" onClick={aoFechar}>Fechar</Button>}>
      <div className="space-y-4">
        {!rota.regular && rota.ativa && <p role="status"><Badge variant="destructive">Irregular</Badge> <span className="text-sm text-muted-foreground">A rota está irregular; veja a lista de rotas.</span></p>}
        <EstadoCarga carregando={itens === null && erroCarga === null} erro={erroCarga} onTentar={() => void carregar()} />
        {itens && (
          <>
            {itens.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma parada no itinerário.</p>
            ) : (
              <ol className="space-y-1" aria-label="Paradas do itinerário">
                {itens.map((item, i) => (
                  <li key={item.parada.id} className="flex flex-wrap items-center gap-2 rounded border border-border px-3 py-2 text-sm">
                    <span className="w-6 font-mono font-semibold tabular-nums">{item.ordem}</span>
                    <span className="flex-1">
                      {item.parada.nome}
                      {!item.parada.tem_coordenadas && <Badge variant="secondary" className="ml-2">sem coordenada</Badge>}
                    </span>
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">
                      {item.embarque_previsto ?? '--:--'} / {item.desembarque_previsto ?? '--:--'}
                    </span>
                    {podeEditar && (
                      <span className="flex gap-1">
                        <Button variant="outline" size="sm" disabled={ocupado || i === 0} aria-label={`Subir ${item.parada.nome}`} onClick={() => mover(i, -1)}><ArrowUp className="h-4 w-4" /></Button>
                        <Button variant="outline" size="sm" disabled={ocupado || i === itens.length - 1} aria-label={`Descer ${item.parada.nome}`} onClick={() => mover(i, 1)}><ArrowDown className="h-4 w-4" /></Button>
                        <Button variant="outline" size="sm" disabled={ocupado} aria-label={`Remover ${item.parada.nome}`} onClick={() => void executar(() => transporteApi.removerParada(rota.id, item.parada.id))}><Trash2 className="h-4 w-4" /></Button>
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            )}
            {podeEditar && (
              <div className="grid gap-3 border-t pt-4 sm:grid-cols-[2fr_1fr_1fr_auto]">
                <Select label="Adicionar parada" value={nova.parada} onChange={(v) => setNova((n) => ({ ...n, parada: v }))}
                  emptyText="Todas as paradas ativas já estão no itinerário."
                  options={[{ value: NENHUMA, label: 'Selecione…' }, ...disponiveis.map((p) => ({ value: String(p.id), label: p.nome }))]} />
                <Input label="Embarque" type="time" value={nova.embarque} className="font-mono tabular-nums" onChange={(e) => setNova((n) => ({ ...n, embarque: e.target.value }))} />
                <Input label="Desembarque" type="time" value={nova.desembarque} className="font-mono tabular-nums" onChange={(e) => setNova((n) => ({ ...n, desembarque: e.target.value }))} />
                <div className="self-end"><Button onClick={() => void adicionar()} isLoading={ocupado}><Plus className="mr-1 h-4 w-4" />Adicionar</Button></div>
              </div>
            )}
            <MapaItinerario itens={itens} escola={rota.escola?.nome} />
          </>
        )}
      </div>
    </Modal>
  );
};
