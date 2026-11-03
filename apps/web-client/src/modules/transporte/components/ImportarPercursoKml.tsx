import React, { useMemo, useRef, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowLeftRight, Upload } from 'lucide-react';
import { Badge, Button, DataTable, Input, Modal, Switch } from '@sysgov/ui';
import { mensagemDeErro, transporteApi, type LinhaKml, type ParLatLng, type PreviaKml, type Rota } from '../api';
import { km as formatarKm } from '../formato';
import { MapaItinerarioLeaflet } from './MapaLeaflet';

const numero = (v: string): number | null => {
  if (v.trim() === '') return null;
  const n = Number(v.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

/** Distância de haversine em km, só para mostrar o total enquanto o usuário escolhe; quem vale é o cálculo do servidor. */
function distanciaKm(pontos: ParLatLng[]): number {
  const rad = (g: number) => (g * Math.PI) / 180;
  let total = 0;
  for (let i = 1; i < pontos.length; i++) {
    const [a, b] = [pontos[i - 1], pontos[i]];
    const h = Math.sin(rad(b[0] - a[0]) / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(rad(b[1] - a[1]) / 2) ** 2;
    total += 2 * 6371.0088 * Math.asin(Math.min(1, Math.sqrt(h)));
  }
  return Math.round(total * 100) / 100;
}

/**
 * Importa o percurso da rota de um KML/KMZ: envio → prévia (nada é gravado) → escolha das linhas, sentido e km → gravação.
 * O arquivo não fica no servidor; ao gravar, o servidor recalcula os km a partir das coordenadas.
 */
export const ImportarPercursoKml: React.FC<{ rota: Rota; aoFechar: () => void; aoGravar: (aplicouKm: boolean) => void }> = ({ rota, aoFechar, aoGravar }) => {
  const [previa, setPrevia] = useState<PreviaKml | null>(null);
  const [escolhidas, setEscolhidas] = useState<Set<number>>(new Set());
  const [invertido, setInvertido] = useState(false);
  const [aplicarKm, setAplicarKm] = useState(true);
  const [naoPav, setNaoPav] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);

  const trecho = useMemo<ParLatLng[]>(() => {
    if (!previa) return [];
    const juntas = previa.linhas.filter((l) => escolhidas.has(l.indice)).flatMap((l) => l.coordenadas);
    return invertido ? [...juntas].reverse() : juntas;
  }, [previa, escolhidas, invertido]);
  const total = useMemo(() => distanciaKm(trecho), [trecho]);
  const naoPavNumero = numero(naoPav);
  const excede = aplicarKm && naoPavNumero !== null && naoPavNumero > total;

  const enviar = async (arquivo: File | undefined) => {
    if (!arquivo) return;
    setErro(null);
    setOcupado(true);
    try {
      const p = await transporteApi.previaPercurso(rota.id, arquivo);
      setPrevia(p);
      setEscolhidas(new Set(p.linhas.map((l) => l.indice)));
      setInvertido(false);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setOcupado(false);
    }
  };

  const alternar = (indice: number) => setEscolhidas((atual) => {
    const novo = new Set(atual);
    if (novo.has(indice)) novo.delete(indice); else novo.add(indice);
    return novo;
  });

  const gravar = async () => {
    setErro(null);
    if (trecho.length < 2) { setErro('Escolha ao menos uma linha.'); return; }
    if (aplicarKm && naoPav.trim() !== '' && naoPavNumero === null) { setErro('Informe a parte não pavimentada em km, com números.'); return; }
    if (excede) { setErro('A parte não pavimentada não pode passar do total do traçado.'); return; }
    setOcupado(true);
    try {
      await transporteApi.gravarPercurso(rota.id, { coordenadas: trecho, aplicar_km: aplicarKm, km_nao_pavimentado: aplicarKm ? naoPavNumero : null });
      aoGravar(aplicarKm);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setOcupado(false);
    }
  };

  const colunas = useMemo<ColumnDef<LinhaKml, unknown>[]>(() => [
    {
      id: 'usar', header: 'Usar', size: 56, enableSorting: false,
      cell: ({ row }) => <Switch checked={escolhidas.has(row.original.indice)} onCheckedChange={() => alternar(row.original.indice)} aria-label={`Usar a linha ${row.original.nome}`} />,
    },
    { id: 'nome', header: 'Linha', accessorKey: 'nome' },
    { id: 'pontos', header: 'Pontos', accessorKey: 'pontos', cell: ({ row }) => <span className="font-mono text-xs tabular-nums">{row.original.pontos} de {row.original.pontos_no_arquivo}</span> },
    { id: 'km', header: 'Extensão', accessorKey: 'km', cell: ({ row }) => <span className="font-mono text-xs tabular-nums">{formatarKm(row.original.km)}</span> },
  ], [escolhidas]);

  return (
    <Modal open onClose={aoFechar} title={`Importar percurso (KML) — ${rota.nome}`} size="2xl"
      footer={<><Button variant="outline" onClick={aoFechar}>Cancelar</Button>{previa && <Button onClick={() => void gravar()} isLoading={ocupado} disabled={trecho.length < 2}>Gravar percurso</Button>}</>}>
      <div className="space-y-4">
        {!previa && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Envie o arquivo <strong>KML</strong> ou <strong>KMZ</strong> exportado do Google Earth, do Google My Maps ou de um aplicativo de GPS. Só as <strong>linhas</strong> entram no percurso; pontos e áreas do arquivo são ignorados.
            </p>
            <Button onClick={() => entrada.current?.click()} disabled={ocupado}><Upload className="mr-1 h-4 w-4" />Escolher arquivo KML ou KMZ</Button>
            <input ref={entrada} type="file" accept=".kml,.kmz" className="sr-only" aria-label="Arquivo KML ou KMZ" onChange={(e) => void enviar(e.target.files?.[0])} />
            <p className="text-xs text-muted-foreground">Até 5 MB. O arquivo não é guardado: o sistema só mantém a linha do percurso, simplificada. Nada é gravado até você confirmar.</p>
            {rota.tem_percurso && <p className="text-xs text-muted-foreground">Esta rota já tem um percurso de {formatarKm(rota.percurso_km ?? 0)}; gravar um novo substitui o atual.</p>}
          </div>
        )}

        {previa && (
          <div className="space-y-4" role="region" aria-label="Prévia do percurso">
            <p className="flex flex-wrap items-center gap-2 text-sm"><strong>{previa.arquivo}</strong><Badge variant="outline">Prévia</Badge></p>
            {previa.avisos.length > 0 && <ul className="space-y-1 rounded border border-border bg-muted/40 p-3 text-xs">{previa.avisos.map((a) => <li key={a}>{a}</li>)}</ul>}
            <DataTable columns={colunas} data={previa.linhas} emptyText="Nenhuma linha." />
            <MapaItinerarioLeaflet pontos={[]} percursos={trecho.length > 1 ? [trecho] : []} altura={300} />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm" role="status">Percurso escolhido: <strong className="font-mono tabular-nums">{formatarKm(total)}</strong> ({trecho.length} pontos)</p>
              <Button variant="outline" size="sm" onClick={() => setInvertido((v) => !v)} aria-pressed={invertido}><ArrowLeftRight className="mr-1 h-4 w-4" />Inverter sentido</Button>
            </div>
            <fieldset className="space-y-2 rounded border border-border p-3">
              <legend className="px-1 text-sm font-semibold">Quilômetros da rota</legend>
              <label className="flex items-center gap-2 text-sm"><Switch checked={aplicarKm} onCheckedChange={setAplicarKm} aria-label="Atualizar os km da rota" />Atualizar os km da rota com o comprimento do traçado</label>
              {aplicarKm && (
                <div className="grid gap-3 sm:grid-cols-3">
                  <Input label="Parte não pavimentada (km)" inputMode="decimal" value={naoPav} className="font-mono tabular-nums" onChange={(e) => setNaoPav(e.target.value)} placeholder="0" />
                  <p className="self-end text-sm">Pavimentada: <strong className="font-mono tabular-nums">{formatarKm(Math.max(0, total - (naoPavNumero ?? 0)))}</strong></p>
                  <p className="self-end text-xs text-muted-foreground">Hoje: {formatarKm(rota.km_pavimentado)} pavimentados e {formatarKm(rota.km_nao_pavimentado)} não pavimentados.</p>
                </div>
              )}
              <p className="text-xs text-muted-foreground">O comprimento é de um sentido; o cálculo de custo já considera as viagens por dia.</p>
            </fieldset>
          </div>
        )}
        {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
      </div>
    </Modal>
  );
};
