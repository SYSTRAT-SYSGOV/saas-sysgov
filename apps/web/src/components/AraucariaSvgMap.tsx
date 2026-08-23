import React, { useState, useRef } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
  MapPin,
  Building2,
  HeartPulse,
  GraduationCap,
  Trees,
  Shield,
  Trophy,
  Compass,
  Eye,
  CheckCircle2,
  Clock,
  FileText,
  AlertTriangle,
  Flame,
  Info,
} from 'lucide-react';
import { ObraAraucaria, ObraStatus, ObraSecretaria } from '../types/fiscal';
import { formatCurrency, formatCompactCurrency } from '../utils/formatters';

interface AraucariaSvgMapProps {
  obras: ObraAraucaria[];
  selectedObraId: string | null;
  onSelectObra: (obra: ObraAraucaria) => void;
  selectedSecretaria: string;
  selectedStatus: string;
}

export const AraucariaSvgMap: React.FC<AraucariaSvgMapProps> = ({
  obras,
  selectedObraId,
  onSelectObra,
  selectedSecretaria,
  selectedStatus,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredObra, setHoveredObra] = useState<ObraAraucaria | null>(null);
  const [hoveredSector, setHoveredSector] = useState<string | null>(null);

  // Layer Visibility Toggles
  const [showSectors, setShowSectors] = useState<boolean>(true);
  const [showRivers, setShowRivers] = useState<boolean>(true);
  const [showRoads, setShowRoads] = useState<boolean>(true);
  const [showRepar, setShowRepar] = useState<boolean>(true);
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [showLayerMenu, setShowLayerMenu] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.25, 2.5));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.25, 0.75));
  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Helper for secretarias icons
  const getSecretariaIcon = (sec: ObraSecretaria) => {
    switch (sec) {
      case 'SMOP':
        return Building2;
      case 'SMSA':
        return HeartPulse;
      case 'SMED':
        return GraduationCap;
      case 'SMMA':
        return Trees;
      case 'SMSP':
        return Shield;
      case 'SMEL':
        return Trophy;
      case 'SMURB':
      case 'SMAS':
      default:
        return Compass;
    }
  };

  // Helper for status colors
  const getStatusColor = (status: ObraStatus) => {
    switch (status) {
      case 'Em Execução':
        return {
          bg: '#4f46e5', // Indigo-600
          border: '#312e81',
          fill: '#6366f1',
          text: 'text-indigo-600',
          badge: 'bg-indigo-600',
        };
      case 'Concluída':
        return {
          bg: '#059669', // Emerald-600
          border: '#064e3b',
          fill: '#10b981',
          text: 'text-emerald-600',
          badge: 'bg-emerald-600',
        };
      case 'Em Licitação':
        return {
          bg: '#d97706', // Amber-600
          border: '#78350f',
          fill: '#f59e0b',
          text: 'text-amber-600',
          badge: 'bg-amber-600',
        };
      case 'Em Projeto':
        return {
          bg: '#7c3aed', // Violet-600
          border: '#4c1d95',
          fill: '#8b5cf6',
          text: 'text-violet-600',
          badge: 'bg-violet-600',
        };
      case 'Paralisada':
      default:
        return {
          bg: '#e11d48', // Rose-600
          border: '#881337',
          fill: '#f43f5e',
          text: 'text-rose-600',
          badge: 'bg-rose-600',
        };
    }
  };

  return (
    <div className="relative w-full h-[540px] sm:h-[580px] lg:h-[620px] bg-slate-50 dark:bg-[#0a1128] border border-slate-200/90 dark:border-navy-800/80 rounded-sm overflow-hidden select-none flex flex-col shadow-xs font-sans">
      {/* Top Map Controls Bar */}
      <div className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-1.5 bg-white/95 dark:bg-navy-900/95 backdrop-blur-md p-1.5 rounded-sm border border-slate-200 dark:border-navy-700 shadow-sm font-sans">
        <button
          type="button"
          onClick={handleZoomIn}
          className="p-1.5 rounded-xs hover:bg-slate-100 dark:hover:bg-navy-800 text-slate-700 dark:text-slate-200 transition cursor-pointer"
          title="Aproximar Mapa (Zoom In)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          className="p-1.5 rounded-xs hover:bg-slate-100 dark:hover:bg-navy-800 text-slate-700 dark:text-slate-200 transition cursor-pointer"
          title="Afastar Mapa (Zoom Out)"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleResetZoom}
          className="p-1.5 rounded-xs hover:bg-slate-100 dark:hover:bg-navy-800 text-slate-700 dark:text-slate-200 transition cursor-pointer font-bold text-[11px] flex items-center gap-1"
          title="Centralizar e Restaurar Escala"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">100%</span>
        </button>

        <div className="h-4 w-px bg-slate-200 dark:bg-navy-700 mx-0.5" />

        {/* Layer Visibility Menu Toggle */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowLayerMenu(!showLayerMenu)}
            className={`px-2 py-1 rounded-xs text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
              showLayerMenu ? 'bg-[#0a1128] text-white' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-navy-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Camadas</span>
          </button>

          {showLayerMenu && (
            <div className="absolute top-full left-0 mt-1.5 w-52 bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 rounded-sm p-2.5 shadow-xl z-30 space-y-1.5 text-xs font-sans">
              <div className="text-[10px] text-slate-400 font-bold uppercase border-b border-slate-100 dark:border-navy-800 pb-1">
                Camadas Geográficas
              </div>
              <label className="flex items-center gap-2 text-slate-700 dark:text-slate-200 cursor-pointer hover:text-slate-900">
                <input
                  type="checkbox"
                  checked={showSectors}
                  onChange={e => setShowSectors(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-0"
                />
                Setores Municipais
              </label>
              <label className="flex items-center gap-2 text-slate-700 dark:text-slate-200 cursor-pointer hover:text-slate-900">
                <input
                  type="checkbox"
                  checked={showRivers}
                  onChange={e => setShowRivers(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-0"
                />
                Hidrografia (Rios & Represa)
              </label>
              <label className="flex items-center gap-2 text-slate-700 dark:text-slate-200 cursor-pointer hover:text-slate-900">
                <input
                  type="checkbox"
                  checked={showRoads}
                  onChange={e => setShowRoads(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-0"
                />
                Eixos Viários (BR-476 / PR-423)
              </label>
              <label className="flex items-center gap-2 text-slate-700 dark:text-slate-200 cursor-pointer hover:text-slate-900">
                <input
                  type="checkbox"
                  checked={showRepar}
                  onChange={e => setShowRepar(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-0"
                />
                Polo Petroquímico (REPAR)
              </label>
              <label className="flex items-center gap-2 text-slate-700 dark:text-slate-200 cursor-pointer hover:text-slate-900">
                <input
                  type="checkbox"
                  checked={showLabels}
                  onChange={e => setShowLabels(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-0"
                />
                Rótulos dos Bairros
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Top Right Live Stats Chip */}
      <div className="absolute top-3 right-3 z-20 bg-white/95 dark:bg-navy-900/95 backdrop-blur-md px-3 py-1.5 rounded-sm border border-slate-200 dark:border-navy-700 shadow-sm flex items-center gap-2.5 text-[11px] font-sans">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-slate-700 dark:text-slate-200 font-bold">{obras.length} Obras Mapeadas</span>
        </div>
        <span className="text-slate-300 dark:text-navy-700">|</span>
        <span className="text-indigo-600 dark:text-indigo-400 font-extrabold tabular-nums">
          {formatCompactCurrency(obras.reduce((acc, o) => acc + o.valorPrevisto, 0))}
        </span>
      </div>

      {/* Main Interactive SVG Map Canvas */}
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center overflow-hidden cursor-crosshair relative"
      >
        <svg
          viewBox="0 0 800 600"
          className="w-full h-full transition-transform duration-300 ease-out"
          style={{
            transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
          }}
        >
          <defs>
            {/* Grid Pattern */}
            <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#94a3b8" strokeWidth="0.5" strokeOpacity="0.25" />
            </pattern>

            {/* Industrial Pattern for REPAR */}
            <pattern id="repar-hatch" width="12" height="12" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="12" stroke="#f59e0b" strokeWidth="2" strokeOpacity="0.4" />
            </pattern>

            {/* Linear Gradients */}
            <linearGradient id="grad-rural" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f0fdf4" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#dcfce7" stopOpacity="0.85" />
            </linearGradient>

            <linearGradient id="grad-urban" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f8fafc" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#e2e8f0" stopOpacity="0.85" />
            </linearGradient>

            <linearGradient id="grad-river" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.9" />
            </linearGradient>

            {/* Glow Filter for Active Pins */}
            <filter id="glow-pin" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Grid */}
          <rect width="800" height="600" fill="#f8fafc" />
          <rect width="800" height="600" fill="url(#grid-pattern)" />

          {/* External Municipal Border Reference Contours */}
          <g className="text-slate-400 font-sans text-[9px] font-bold opacity-60">
            <text x="660" y="70" fill="#64748b">← CURITIBA (CIC)</text>
            <text x="680" y="460" fill="#64748b">← FAZENDA RIO GRANDE</text>
            <text x="70" y="110" fill="#64748b">CAMPO LARGO →</text>
            <text x="50" y="470" fill="#64748b">CONTENDA / LAPA →</text>
          </g>

          {/* Araucária Sector Polygons */}
          {showSectors && (
            <g className="transition-all duration-300">
              {/* Sector 6: Zona Rural Sul / Guajuvira / Rio Abaixo / Roça Nova */}
              <path
                d="M 120 310 L 260 290 L 320 420 L 450 510 L 380 575 L 140 560 L 70 430 Z"
                fill="url(#grad-rural)"
                stroke="#10b981"
                strokeWidth={hoveredSector === 'rural' ? '2.5' : '1.2'}
                strokeOpacity="0.65"
                className="cursor-pointer transition-all hover:stroke-opacity-100"
                onMouseEnter={() => setHoveredSector('rural')}
                onMouseLeave={() => setHoveredSector(null)}
              />

              {/* Sector 5: Região Oeste / Thomaz Coelho & Tindiquera */}
              <path
                d="M 260 170 L 370 160 L 360 320 L 260 290 L 230 200 Z"
                fill="#f1f5f9"
                stroke="#6366f1"
                strokeWidth={hoveredSector === 'oeste' ? '2.5' : '1.2'}
                strokeOpacity="0.5"
                className="cursor-pointer transition-all hover:stroke-opacity-100"
                onMouseEnter={() => setHoveredSector('oeste')}
                onMouseLeave={() => setHoveredSector(null)}
              />

              {/* Sector 1: Norte / Capela Velha & Passaúna */}
              <path
                d="M 400 50 L 590 70 L 600 190 L 460 210 L 370 160 L 360 90 Z"
                fill="url(#grad-urban)"
                stroke="#38bdf8"
                strokeWidth={hoveredSector === 'norte' ? '2.5' : '1.5'}
                strokeOpacity="0.6"
                className="cursor-pointer transition-all hover:stroke-opacity-100"
                onMouseEnter={() => setHoveredSector('norte')}
                onMouseLeave={() => setHoveredSector(null)}
              />

              {/* Sector 2: Centro Urbano / Fazenda Velha & Iguaçu */}
              <path
                d="M 370 160 L 460 210 L 520 280 L 470 360 L 360 320 Z"
                fill="#e0e7ff"
                stroke="#6366f1"
                strokeWidth={hoveredSector === 'centro' ? '3' : '1.8'}
                strokeOpacity="0.85"
                className="cursor-pointer transition-all hover:stroke-opacity-100"
                onMouseEnter={() => setHoveredSector('centro')}
                onMouseLeave={() => setHoveredSector(null)}
              />

              {/* Sector 3: Costeira / Sul / Estação / Campina das Pedras */}
              <path
                d="M 360 320 L 470 360 L 540 400 L 450 510 L 320 420 Z"
                fill="#f3e8ff"
                stroke="#a855f7"
                strokeWidth={hoveredSector === 'costeira' ? '2.5' : '1.2'}
                strokeOpacity="0.6"
                className="cursor-pointer transition-all hover:stroke-opacity-100"
                onMouseEnter={() => setHoveredSector('costeira')}
                onMouseLeave={() => setHoveredSector(null)}
              />
            </g>
          )}

          {/* Sector 4: Industrial District & REPAR Polo Petroquímico */}
          {showRepar && (
            <g className="transition-all duration-300">
              <path
                d="M 520 180 L 680 190 L 700 320 L 550 330 L 510 260 Z"
                fill="url(#repar-hatch)"
                stroke="#f59e0b"
                strokeWidth="1.8"
                strokeDasharray="4 2"
                strokeOpacity="0.7"
                className="cursor-pointer hover:stroke-opacity-100"
                onMouseEnter={() => setHoveredSector('repar')}
                onMouseLeave={() => setHoveredSector(null)}
              />
              <g transform="translate(560, 240)" className="pointer-events-none">
                <rect x="0" y="0" width="115" height="26" rx="3" fill="#1e1b4b" fillOpacity="0.9" stroke="#f59e0b" strokeWidth="1" />
                <text x="6" y="17" fill="#fbbf24" fontSize="9.5" fontWeight="bold" fontFamily="monospace">
                  🏭 POLO REPAR CIAR
                </text>
              </g>
            </g>
          )}

          {/* Hydrography (Rios & Represa do Passaúna) */}
          {showRivers && (
            <g className="pointer-events-none">
              {/* Represa do Passaúna (North lake) */}
              <ellipse cx="540" cy="80" rx="38" ry="24" fill="#0284c7" fillOpacity="0.45" stroke="#38bdf8" strokeWidth="1.5" />
              <text x="515" y="83" fill="#7dd3fc" fontSize="8" fontFamily="monospace" fontWeight="bold">
                Represa Passaúna
              </text>

              {/* Rio Iguaçu (East Municipal border) */}
              <path
                d="M 590 60 Q 640 180 660 300 T 560 480 Q 480 550 440 590"
                fill="none"
                stroke="url(#grad-river)"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeOpacity="0.8"
              />
              <text x="625" y="380" fill="#38bdf8" fontSize="8.5" fontFamily="monospace" transform="rotate(70 625 380)">
                Rio Iguaçu ~~~~~
              </text>

              {/* Rio Barigui (Connecting River) */}
              <path
                d="M 570 180 Q 560 250 560 320 T 540 400"
                fill="none"
                stroke="#0ea5e9"
                strokeWidth="2.2"
                strokeDasharray="5 2"
                strokeOpacity="0.75"
              />
              <text x="562" y="270" fill="#7dd3fc" fontSize="7.5" fontFamily="monospace">
                Rio Barigui
              </text>
            </g>
          )}

          {/* Road Network (BR-476 & PR-423 & Vias Urbanas) */}
          {showRoads && (
            <g className="pointer-events-none">
              {/* BR-476 Rodovia do Xisto (North-South spine) */}
              <path
                d="M 470 30 L 460 170 L 440 280 L 420 400 L 370 580"
                fill="none"
                stroke="#f97316"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeOpacity="0.85"
              />
              <g transform="translate(470, 110)">
                <rect x="0" y="0" width="55" height="15" rx="3" fill="#c2410c" stroke="#fed7aa" strokeWidth="0.8" />
                <text x="6" y="11" fill="#ffffff" fontSize="8" fontWeight="bold" fontFamily="monospace">
                  BR-476
                </text>
              </g>

              {/* PR-423 (Connecting west towards Campo Largo) */}
              <path
                d="M 440 280 L 330 250 L 220 180 L 120 120"
                fill="none"
                stroke="#eab308"
                strokeWidth="2.8"
                strokeDasharray="4 2"
                strokeOpacity="0.8"
              />
              <g transform="translate(240, 200)">
                <rect x="0" y="0" width="52" height="15" rx="3" fill="#854d0e" stroke="#fef08a" strokeWidth="0.8" />
                <text x="6" y="11" fill="#ffffff" fontSize="8" fontWeight="bold" fontFamily="monospace">
                  PR-423
                </text>
              </g>

              {/* Av. Manoel Ribas Corredor */}
              <path
                d="M 440 280 L 480 390 L 450 490"
                fill="none"
                stroke="#fb923c"
                strokeWidth="2"
                strokeOpacity="0.6"
              />
            </g>
          )}

          {/* Regional Labels */}
          {showLabels && (
            <g className="pointer-events-none text-slate-400 font-mono text-[9px]">
              <text x="440" y="100" fill="#93c5fd" fontWeight="bold">
                CAPELA VELHA
              </text>
              <text x="390" y="275" fill="#c7d2fe" fontWeight="bold" fontSize="11">
                CENTRO
              </text>
              <text x="450" y="260" fill="#a5b4fc" fontWeight="bold">
                FAZENDA VELHA
              </text>
              <text x="460" y="415" fill="#d8b4fe" fontWeight="bold">
                COSTEIRA
              </text>
              <text x="375" y="375" fill="#cbd5e1">
                ESTAÇÃO
              </text>
              <text x="310" y="270" fill="#cbd5e1">
                THOMAZ COELHO
              </text>
              <text x="330" y="335" fill="#cbd5e1">
                TINDIQUERA
              </text>
              <text x="180" y="470" fill="#6ee7b7" fontWeight="bold">
                ZONA RURAL GUAJUVIRA
              </text>
              <text x="280" y="530" fill="#6ee7b7">
                RIO ABAIXO
              </text>
            </g>
          )}

          {/* Interactive Obra Markers / Pins */}
          <g>
            {obras.map(obra => {
              const isSelected = selectedObraId === obra.id;
              const isHovered = hoveredObra?.id === obra.id;
              const statusCfg = getStatusColor(obra.status);
              const Icon = getSecretariaIcon(obra.secretaria);

              const { x, y } = obra.coordenadasSvg;

              return (
                <g
                  key={obra.id}
                  transform={`translate(${x}, ${y})`}
                  className="cursor-pointer transition-transform duration-200"
                  onClick={() => onSelectObra(obra)}
                  onMouseEnter={() => setHoveredObra(obra)}
                  onMouseLeave={() => setHoveredObra(null)}
                >
                  {/* Ping Animation for Active Works in Execution */}
                  {obra.status === 'Em Execução' && (
                    <circle
                      cx="0"
                      cy="0"
                      r="16"
                      fill={statusCfg.fill}
                      fillOpacity="0.35"
                      className="animate-ping"
                    />
                  )}

                  {/* Outer Selection Halo */}
                  {isSelected && (
                    <circle
                      cx="0"
                      cy="0"
                      r="20"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="2.5"
                      strokeDasharray="3 3"
                      filter="url(#glow-pin)"
                    />
                  )}

                  {/* Main Pin Base Disc */}
                  <circle
                    cx="0"
                    cy="0"
                    r={isSelected || isHovered ? '14' : '11'}
                    fill={statusCfg.bg}
                    stroke="#ffffff"
                    strokeWidth={isSelected ? '2.5' : '1.5'}
                    className="shadow-lg transition-all"
                  />

                  {/* Pin Number/Progress Pill or Icon */}
                  <text
                    x="0"
                    y="3.5"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize={isSelected || isHovered ? '8' : '7.5'}
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {obra.progressoFisico > 0 ? `${obra.progressoFisico.toFixed(0)}%` : '0%'}
                  </text>

                  {/* Small Secretaria Flag Tag */}
                  <g transform="translate(10, -12)">
                    <rect
                      x="0"
                      y="0"
                      width="34"
                      height="12"
                      rx="2"
                      fill="#0f172a"
                      fillOpacity="0.9"
                      stroke={statusCfg.bg}
                      strokeWidth="0.8"
                    />
                    <text
                      x="17"
                      y="8.5"
                      textAnchor="middle"
                      fill="#f8fafc"
                      fontSize="6.5"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {obra.secretaria}
                    </text>
                  </g>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Floating Tooltip On Pin Hover */}
        {hoveredObra && (
          <div
            className="absolute pointer-events-none z-30 bg-slate-900/95 text-white p-3 rounded-sm border border-slate-700 shadow-2xl max-w-xs text-xs font-mono backdrop-blur-md space-y-1.5 transition-all"
            style={{
              left: Math.min(Math.max(hoveredObra.coordenadasSvg.x * (zoomLevel) + panOffset.x - 60, 20), 480),
              top: Math.max(hoveredObra.coordenadasSvg.y * (zoomLevel) + panOffset.y - 120, 20),
            }}
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1">
              <span className="font-bold text-[11px] text-white font-sans truncate">
                {hoveredObra.titulo}
              </span>
              <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-bold text-white ${getStatusColor(hoveredObra.status).badge}`}>
                {hoveredObra.status}
              </span>
            </div>

            <div className="text-[10px] space-y-0.5 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Secretaria:</span>
                <span className="font-bold text-indigo-300">{hoveredObra.secretaria} — {hoveredObra.secretariaNome}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Bairro:</span>
                <span className="text-slate-200 font-semibold">{hoveredObra.bairro}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Investimento Total:</span>
                <span className="font-bold text-emerald-400">{formatCurrency(hoveredObra.valorPrevisto)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Avanço Físico:</span>
                <span className="font-bold text-indigo-400">{hoveredObra.progressoFisico.toFixed(1)}%</span>
              </div>
            </div>

            {/* Mini Progress Bar */}
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-indigo-500 h-full rounded-full"
                style={{ width: `${hoveredObra.progressoFisico}%` }}
              />
            </div>

            <div className="text-[9px] text-slate-400 italic pt-0.5">
              Clique no marcador para abrir a ficha completa da obra
            </div>
          </div>
        )}
      </div>

      {/* Bottom Map Legend Bar */}
      <div className="bg-slate-900/95 border-t border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-[10px] font-mono text-slate-300 z-10">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-slate-400 font-bold uppercase">Legenda de Status:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
            <span>Em Execução ({obras.filter(o => o.status === 'Em Execução').length})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
            <span>Em Licitação ({obras.filter(o => o.status === 'Em Licitação').length})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-violet-600" />
            <span>Em Projeto ({obras.filter(o => o.status === 'Em Projeto').length})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
            <span>Concluída ({obras.filter(o => o.status === 'Concluída').length})</span>
          </div>
        </div>

        <div className="text-slate-400 flex items-center gap-1">
          <Info className="w-3.5 h-3.5 text-indigo-400" />
          <span>Araucária (PR) - Coordenadas UTM Georreferenciadas</span>
        </div>
      </div>
    </div>
  );
};
