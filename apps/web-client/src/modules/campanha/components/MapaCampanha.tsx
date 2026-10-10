import React, { useEffect, useMemo, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import 'leaflet.heat';
import { GeoJSON, MapContainer, TileLayer, useMap } from 'react-leaflet';
import { Map as MapIcon } from 'lucide-react';
import { Button, Skeleton } from '@sysgov/ui';
import { erroApi } from '../../escola/api';
import { campanhaApi, type Camada, type Faixas, type PontoCalor, type PontoMapa, type Situacao } from '../api';
import { GRADIENTE_CALOR, corDoMunicipio, dicaDoMunicipio, legenda } from '../formato';

/** Malha por UF guardada na sessão da tela (o servidor também responde com ETag). */
const malhas = new Map<string, Promise<GeoJSON.FeatureCollection>>();

function carregarMalha(uf: string): Promise<GeoJSON.FeatureCollection> {
  if (!malhas.has(uf)) {
    const pedido = campanhaApi.malha(uf);
    pedido.catch(() => malhas.delete(uf));
    malhas.set(uf, pedido);
  }
  return malhas.get(uf) as Promise<GeoJSON.FeatureCollection>;
}

const escapar = (t: string): string => t.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

interface Props {
  uf: string;
  pontos: Record<string, PontoMapa>;
  camada: Camada;
  cores: Record<Situacao, string>;
  faixas: Faixas;
  onSelecionar: (ibge: number) => void;
  altura?: number;
  /** Camada "Mapa de calor": pontos arredondados e agregados pelo servidor. */
  calor?: PontoCalor[];
  /** Eleitores captados por município (dica da camada de calor). */
  captados?: Record<number, number>;
}

/** Camada leaflet.heat sobre a malha (D6). */
const CamadaCalor: React.FC<{ pontos: PontoCalor[] }> = ({ pontos }) => {
  const mapa = useMap();
  useEffect(() => {
    // maxZoom 0: o leaflet.heat não atenua os pontos nos zooms baixos (o mapa da UF fica em torno de 6–7).
    const maximo = Math.max(1, ...pontos.map((p) => p[2]));
    const camada = L.heatLayer(pontos, { radius: 26, blur: 16, minOpacity: 0.45, max: maximo, maxZoom: 0, gradient: GRADIENTE_CALOR }).addTo(mapa);
    return () => { camada.remove(); };
  }, [mapa, pontos]);
  return null;
};

/**
 * Mapa dos municípios da UF (D7): sem mapa de fundo (nenhuma requisição externa), zoom e arrasto, cor
 * por camada, dica ao passar o mouse e clique que abre a ficha do município.
 */
export const MapaCampanha: React.FC<Props> = ({ uf, pontos, camada, cores, faixas, onSelecionar, altura = 540, calor, captados }) => {
  const [malha, setMalha] = useState<GeoJSON.FeatureCollection | null>(null);
  // Mapa de ruas (OpenStreetMap) só quando o usuário pede: é a única requisição externa do mapa.
  const [ruas, setRuas] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    setMalha(null);
    carregarMalha(uf).then((m) => !cancelado && setMalha(m)).catch((e) => !cancelado && setErro(erroApi(e).mensagem));
    return () => { cancelado = true; };
  }, [uf]);

  const limites = useMemo(() => (malha ? L.geoJSON(malha).getBounds() : null), [malha]);
  // Recria a camada quando muda o que é desenhado (cores, faixas, dados ou camada escolhida).
  const chave = useMemo(() => `${camada}-${ruas}-${JSON.stringify(captados ?? {})}-${JSON.stringify(cores)}-${JSON.stringify(faixas)}-${Object.values(pontos).map((p) => `${p.situacao}${p.meta_votos}${p.relacao_prefeito}`).join('')}`, [camada, cores, faixas, pontos, ruas, captados]);

  if (erro) return <p className="rounded-md border border-border p-4 text-sm text-muted-foreground">{erro === 'Registro não encontrado.' ? `O mapa de ${uf} ainda não foi importado. Rode ./sysgov.sh dados-campanha ${uf}.` : erro}</p>;
  const borda = camada === 'mapa_calor' && ruas ? '#64748b' : '#ffffff';
  if (!malha || !limites) return <Skeleton className="w-full" style={{ height: altura }} />;

  return (
    <div className="space-y-3">
      {/* isolate: as camadas do Leaflet (z-index 400+) não passam por cima do cabeçalho fixo do painel. */}
      <div className="isolate overflow-hidden rounded-lg border border-border bg-muted/40" style={{ height: altura }}>
        <MapContainer bounds={limites} boundsOptions={{ padding: [12, 12] }} zoomSnap={0.25} scrollWheelZoom attributionControl={ruas} style={{ height: '100%', width: '100%', background: 'transparent' }}>
          {ruas && <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />}
          <GeoJSON
            key={chave}
            data={malha}
            style={(f) => ({
              fillColor: corDoMunicipio(pontos[String(f?.properties?.codarea)], camada, cores, faixas),
              fillOpacity: ruas ? (camada === 'mapa_calor' ? 0.05 : 0.55) : 0.85,
              color: borda,
              weight: 0.7,
            })}
            onEachFeature={(f, layer) => {
              const ibge = String(f.properties?.codarea);
              const ponto = pontos[ibge];
              const linhas = dicaDoMunicipio(ponto, camada, captados?.[Number(ibge)]).map((l) => `<div>${escapar(l)}</div>`).join('');
              layer.bindTooltip(`<strong>${escapar(ponto?.nome ?? ibge)}</strong>${linhas}<div style="opacity:.7;margin-top:4px">Clique para abrir a ficha</div>`, { sticky: true });
              layer.on({
                click: () => onSelecionar(Number(ibge)),
                mouseover: (e) => (e.target as L.Path).setStyle({ weight: 2.2, color: '#0c326f' }),
                mouseout: (e) => (e.target as L.Path).setStyle({ weight: 0.7, color: borda }),
              });
            }}
          />
          {camada === 'mapa_calor' && calor && <CamadaCalor pontos={calor} />}
        </MapContainer>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Legenda do mapa">
        {legenda(camada, cores, faixas).map((item) => (
          <li key={item.rotulo} className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm border border-border" style={{ backgroundColor: item.cor }} aria-hidden />
            {item.rotulo}
          </li>
        ))}
        </ul>
        <Button size="sm" variant="outline" aria-pressed={ruas} leftIcon={<MapIcon className="h-4 w-4" />} onClick={() => setRuas((r) => !r)}>
          {ruas ? 'Ocultar ruas' : 'Mostrar ruas'}
        </Button>
      </div>
      {camada === 'mapa_calor' && calor?.length === 0 && <p className="text-sm text-muted-foreground">Ainda não há eleitores captados com localização.</p>}
    </div>
  );
};
