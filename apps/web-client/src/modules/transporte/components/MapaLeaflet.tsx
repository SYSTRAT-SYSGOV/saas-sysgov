import React, { useEffect } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from 'react-leaflet';

/** Centro do Brasil quando nenhuma parada tem coordenada. */
const CENTRO_PADRAO: [number, number] = [-14.235, -51.925];

export interface PontoMapa { ordem: number; nome: string; latitude: number; longitude: number }

const icone = (ordem: number): L.DivIcon => L.divIcon({
  className: '',
  html: `<div style="background:#1d4ed8;color:#fff;border:2px solid #fff;border-radius:9999px;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font:600 12px system-ui;box-shadow:0 1px 3px rgba(0,0,0,.4)">${ordem}</div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

const Enquadrar: React.FC<{ pontos: [number, number][] }> = ({ pontos }) => {
  const mapa = useMap();
  useEffect(() => {
    if (pontos.length === 1) mapa.setView(pontos[0], 14);
    else if (pontos.length > 1) mapa.fitBounds(L.latLngBounds(pontos), { padding: [30, 30] });
  }, [mapa, pontos]);
  return null;
};

/** Itinerário: marcadores numerados na ordem e uma linha reta ligando-os (não é roteirização viária; design D15). */
export const MapaItinerarioLeaflet: React.FC<{ pontos: PontoMapa[]; altura?: number }> = ({ pontos, altura = 360 }) => {
  const coords = pontos.map((p): [number, number] => [p.latitude, p.longitude]);

  return (
    <div className="isolate overflow-hidden rounded-lg border border-border" style={{ height: altura }} data-testid="mapa-itinerario">
      <MapContainer center={coords[0] ?? CENTRO_PADRAO} zoom={coords.length > 0 ? 13 : 4} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
        <TileLayer attribution="&copy; OpenStreetMap" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {pontos.map((p) => <Marker key={p.ordem} position={[p.latitude, p.longitude]} icon={icone(p.ordem)} title={`${p.ordem}. ${p.nome}`} />)}
        {coords.length > 1 && <Polyline positions={coords} pathOptions={{ color: '#1d4ed8', weight: 3, opacity: 0.7 }} />}
        <Enquadrar pontos={coords} />
      </MapContainer>
    </div>
  );
};

const Cliques: React.FC<{ aoClicar: (lat: number, lng: number) => void }> = ({ aoClicar }) => {
  useMapEvents({ click: (e) => aoClicar(e.latlng.lat, e.latlng.lng) });
  return null;
};

/** Seletor de coordenada: um clique no mapa marca o ponto. */
export const SeletorCoordenadaLeaflet: React.FC<{
  latitude: number | null;
  longitude: number | null;
  aoEscolher: (lat: number, lng: number) => void;
}> = ({ latitude, longitude, aoEscolher }) => {
  const marcado: [number, number] | null = latitude !== null && longitude !== null ? [latitude, longitude] : null;

  return (
    <div className="isolate overflow-hidden rounded-lg border border-border" style={{ height: 260 }} data-testid="seletor-coordenada">
      <MapContainer center={marcado ?? CENTRO_PADRAO} zoom={marcado ? 15 : 4} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
        <TileLayer attribution="&copy; OpenStreetMap" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Cliques aoClicar={(lat, lng) => aoEscolher(Number(lat.toFixed(7)), Number(lng.toFixed(7)))} />
        {marcado && <Marker position={marcado} />}
      </MapContainer>
    </div>
  );
};
