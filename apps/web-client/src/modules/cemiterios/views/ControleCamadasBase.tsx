import React from 'react';
import { Layers, MapPin, Globe, Compass } from 'lucide-react';
import type { ProvedorMapaBase } from '../api';

export const PROVEDORES_PADRAO: ProvedorMapaBase[] = [
  {
    id: 'esri',
    nome: 'Satélite Esri',
    tipo: 'satelite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    atribuicao: 'Imagens © Esri, Maxar, Earthstar Geographics',
    max_zoom: 19,
  },
  {
    id: 'osm',
    nome: 'OpenStreetMap',
    tipo: 'ruas',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    atribuicao: '© OpenStreetMap colaboradores',
    max_zoom: 19,
  },
  {
    id: 'cartodb_positron',
    nome: 'CartoDB Positron',
    tipo: 'claro',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    atribuicao: '© OpenStreetMap, © CARTO',
    max_zoom: 20,
  },
  {
    id: 'google_hibrido',
    nome: 'Google Híbrido XYZ',
    tipo: 'satelite',
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    atribuicao: 'Imagens © Google',
    max_zoom: 20,
  },
];

interface ControleCamadasBaseProps {
  provedores?: ProvedorMapaBase[];
  provedorAtivoId: string;
  onMudarProvedor: (provedor: ProvedorMapaBase) => void;
}

export const ControleCamadasBase: React.FC<ControleCamadasBaseProps> = ({
  provedores = PROVEDORES_PADRAO,
  provedorAtivoId,
  onMudarProvedor,
}) => {
  const lista = provedores && provedores.length > 0 ? provedores : PROVEDORES_PADRAO;

  const obterIcone = (id: string) => {
    switch (id) {
      case 'osm':
        return <MapPin className="h-3.5 w-3.5" />;
      case 'cartodb_positron':
        return <Compass className="h-3.5 w-3.5" />;
      case 'google_hibrido':
        return <Globe className="h-3.5 w-3.5" />;
      case 'esri':
      default:
        return <Layers className="h-3.5 w-3.5" />;
    }
  };

  return (
    <div
      className="absolute right-3 top-3 z-[400] flex items-center gap-1 rounded-lg border border-border/80 bg-background/90 p-1 shadow-md backdrop-blur-sm"
      role="group"
      aria-label="Controle de Camadas Base"
    >
      {lista.map((p) => {
        const ativo = p.id === provedorAtivoId;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onMudarProvedor(p)}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
              ativo
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
            title={`${p.nome} (Zoom máx: ${p.max_zoom})`}
          >
            {obterIcone(p.id)}
            <span className="hidden sm:inline">{p.nome}</span>
          </button>
        );
      })}
    </div>
  );
};
