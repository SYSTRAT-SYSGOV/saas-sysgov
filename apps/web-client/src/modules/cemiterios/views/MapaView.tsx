import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
// O bundle do leaflet-geoman-free é um UMD que espera `window.L` (Leaflet como script
// global) em vez do pacote ESM — precisa ser definido antes deste import.
(window as unknown as { L: typeof L }).L = L;
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import type { FeatureCollection as ColecaoGeoJson, LineString, Polygon } from 'geojson';
import type { Layer, LeafletMouseEvent, Polygon as PoligonoLeaflet } from 'leaflet';
import { Circle, CircleMarker, GeoJSON, MapContainer, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import { Grid3x3, LocateFixed, Navigation, MapPin, AlertTriangle, Route, Download } from 'lucide-react';
import { Button, Card, Input, Select, SearchInput, Switch } from '@/components/ui';
import { useCan } from '@/core/rbac/useCan';
import {
  cemiteriosApi,
  erroApi,
  ESTADOS,
  type Amenidade,
  type ErroApi,
  type FeatureCollection,
  type Parque,
  type ProvedorMapaBase,
  type ResultadoBusca,
  type Via,
} from '../api';
import {
  caixaDe,
  calcularDistanciaMetros,
  estiloFeicao,
  estiloVia,
  limitesDoEnvelope,
  metrosPorPixel,
  poligonosPodemSobrepor,
  ZOOM_MINIMO_JAZIGOS,
  type Caixa,
} from '../mapa.utils';
import { ModalDetalheJazigo } from './ModalDetalheJazigo';
import { ErroBox, FormModal, Mono, useDados } from './comum';
import { useCemiteriosNavigation } from '../CemiteriosContext';
import { ControleCamadasBase, PROVEDORES_PADRAO } from './ControleCamadasBase';
import { ControleModoPlanta } from './ControleModoPlanta';
import { ModalComoChegar } from './ModalComoChegar';
import { ModalGpsCampo } from './ModalGpsCampo';
import { FerramentaMedicao } from './FerramentaMedicao';
import { FiltrosRapidosMapa, type FiltroRapidoStatus } from './FiltrosRapidosMapa';
import { BotaoExportacaoGis } from './BotaoExportacaoGis';
import { ModalEditarCemiterio } from './ModalEditarCemiterio';

const ZOOM_DETALHE_JAZIGOS = 19; // abaixo disso, jazigos aparecem agrupados (clusterizados)
const ICONE_AMENIDADE: Record<Amenidade['tipo'], string> = {
  portaria: '🚪', capela: '⛪', sanitario: '🚻', administracao: '🏢', agua: '💧', vegetacao: '🌳',
};

type Camada = 'parques' | 'setores' | 'jazigos';
const CAMADAS: { key: Camada; rotulo: string }[] = [
  { key: 'parques', rotulo: 'Cemitérios' },
  { key: 'setores', rotulo: 'Quadras' },
  { key: 'jazigos', rotulo: 'Jazigos' },
];
const TIPO_DO_ALVO: Record<Camada, 'parque' | 'setor' | 'jazigo'> = {
  parques: 'parque',
  setores: 'setor',
  jazigos: 'jazigo',
};

/** Mapa interativo e GIS avançado: multi-camadas abertas, roteirização, GPS mobile e medição. */
export const MapaView: React.FC = () => {
  const { can } = useCan();
  const edita = can('cemiterios.gis.edit');
  const base = useDados(() => cemiteriosApi.mapaBase(), []);
  const parques = useDados(() => cemiteriosApi.parques(), []);

  const { focoMapa, limparFocoMapa, cemiterioAtivoId, cemiterioAtivo, modoPlanta, setModoPlanta } = useCemiteriosNavigation();

  // Camadas base e vetoriais
  const [provedorAtivo, setProvedorAtivo] = useState<ProvedorMapaBase>(PROVEDORES_PADRAO[0]);
  const [visiveis, setVisiveis] = useState<Record<Camada, boolean>>({ parques: true, setores: true, jazigos: true });
  const [feicoes, setFeicoes] = useState<Partial<Record<Camada, FeatureCollection>>>({});
  const [versao, setVersao] = useState(0);
  const [erro, setErro] = useState<ErroApi | null>(null);
  const [selecionado, setSelecionado] = useState<number | null>(null);
  const [envelope, setEnvelope] = useState<Caixa | null>(null);
  const [alvo, setAlvo] = useState<{ tipo: Camada; id: string }>({ tipo: 'jazigos', id: '' });
  const [grade, setGrade] = useState<{ capturando: boolean; pontos: [number, number][] }>({ capturando: false, pontos: [] });
  const [caixaAtual, setCaixaAtual] = useState<{ caixa: Caixa; zoom: number } | null>(null);

  // Vias e equipamentos da necrópole ativa (spec: mapa-gis › camadas de vias e equipamentos)
  const [viasVisiveis, setViasVisiveis] = useState(true);
  const [equipamentosVisiveis, setEquipamentosVisiveis] = useState(true);
  const [viasFeicoes, setViasFeicoes] = useState<{ id: string; via: Via }[]>([]);
  const [amenidadesFeicoes, setAmenidadesFeicoes] = useState<Amenidade[]>([]);
  const [desenhandoVia, setDesenhandoVia] = useState(false);
  const [novaViaCodigo, setNovaViaCodigo] = useState('');
  const [alertaSobreposicao, setAlertaSobreposicao] = useState(false);

  // Filtros rápidos
  const [filtroRapido, setFiltroRapido] = useState<FiltroRapidoStatus>(null);

  // GPS de Campo
  const [modalGpsAberto, setModalGpsAberto] = useState(false);
  const [posicaoGps, setPosicaoGps] = useState<{ lat: number; lng: number; precisao: number } | null>(null);

  // Medição métrica
  const [modoMedicao, setModoMedicao] = useState(false);
  const [pontosMedicao, setPontosMedicao] = useState<[number, number][]>([]);

  // Roteirização / Como Chegar
  const [modalRotaAberto, setModalRotaAberto] = useState(false);
  const [rotaReal, setRotaReal] = useState<{ trechos: [number, number][][]; distanciaMetros: number } | null>(null);

  // Edição de dados/coordenadas da necrópole
  const [modalEditarNecropole, setModalEditarNecropole] = useState(false);

  // Exportação da planta humanizada
  const [exportando, setExportando] = useState(false);
  const mapaContainerRef = useRef<HTMLElement | null>(null);

  // Sincroniza catálogo base inicial
  useEffect(() => {
    if (base.dados?.catalogo && base.dados.catalogo.length > 0) {
      const achado = base.dados.catalogo.find((p) => p.id === base.dados?.provedor) ?? base.dados.catalogo[0];
      setProvedorAtivo(achado);
    } else if (base.dados?.url) {
      setProvedorAtivo({
        id: base.dados.provedor || 'esri',
        nome: 'Satélite Base',
        tipo: 'satelite',
        url: base.dados.url,
        atribuicao: base.dados.atribuicao,
        max_zoom: base.dados.max_zoom,
      });
    }
  }, [base.dados]);

  // Sincroniza foco vindo da navegação cruzada do inventário
  useEffect(() => {
    if (!focoMapa) return;

    setSelecionado(focoMapa.jazigoId);

    if (
      focoMapa.lat !== null &&
      focoMapa.lng !== null &&
      focoMapa.lat !== undefined &&
      focoMapa.lng !== undefined
    ) {
      setEnvelope([focoMapa.lng, focoMapa.lat, focoMapa.lng, focoMapa.lat]);
      limparFocoMapa();
    } else if (focoMapa.codigo) {
      void cemiteriosApi.buscar(focoMapa.codigo).then((resultados) => {
        const achado = resultados.find((r) => r.jazigo_id === focoMapa.jazigoId) ?? resultados[0];
        if (achado?.envelope) {
          setEnvelope(achado.envelope);
        }
        limparFocoMapa();
      }).catch(() => {
        limparFocoMapa();
      });
    }
  }, [focoMapa, limparFocoMapa]);

  const carregar = useCallback(async (caixa: Caixa, zoom: number) => {
    setCaixaAtual({ caixa, zoom });
    try {
      const pedidos = CAMADAS.filter((c) => visiveis[c.key] && (c.key !== 'jazigos' || zoom >= ZOOM_MINIMO_JAZIGOS))
        .map(async (c) => [c.key, await cemiteriosApi.camada(c.key, caixa)] as const);
      const resultados = Object.fromEntries(await Promise.all(pedidos));

      // Se houver cemiterioAtivoId, isola as features estritamente da necrópole ativa
      if (cemiterioAtivoId) {
        (Object.keys(resultados) as Camada[]).forEach((chave) => {
          const fc = resultados[chave];
          if (fc && Array.isArray(fc.features)) {
            fc.features = fc.features.filter((f) => {
              const props = (f.properties ?? {}) as Record<string, unknown>;
              if (chave === 'parques') {
                return Number(props.id) === cemiterioAtivoId;
              }
              if (props.park_id !== undefined && props.park_id !== null) {
                return Number(props.park_id) === cemiterioAtivoId;
              }
              if (props.cemiterio_id !== undefined && props.cemiterio_id !== null) {
                return Number(props.cemiterio_id) === cemiterioAtivoId;
              }
              return true;
            });
          }
        });
      }

      setFeicoes(resultados);
      setVersao((v) => v + 1);
    } catch (e) {
      setErro(erroApi(e));
    }
  }, [visiveis, cemiterioAtivoId]);

  const recarregar = () => {
    if (caixaAtual) void carregar(caixaAtual.caixa, caixaAtual.zoom);
  };

  // Camadas de vias e equipamentos, isoladas pela necrópole ativa (spec: mapa-gis › vias e equipamentos).
  useEffect(() => {
    if (!cemiterioAtivoId || !caixaAtual) {
      setViasFeicoes([]);
      setAmenidadesFeicoes([]);
      return;
    }
    if (viasVisiveis) {
      void cemiteriosApi.camadaVias(cemiterioAtivoId, caixaAtual.caixa).then((fc) => {
        setViasFeicoes(fc.features.map((f) => ({
          id: f.id,
          via: { id: f.properties.id, park_id: cemiterioAtivoId, via_codigo: f.properties.via_codigo, geojson: f.geometry },
        })));
      }).catch(() => setViasFeicoes([]));
    } else {
      setViasFeicoes([]);
    }
    if (equipamentosVisiveis) {
      void cemiteriosApi.camadaAmenidades(cemiterioAtivoId, caixaAtual.caixa).then((fc) => {
        setAmenidadesFeicoes(fc.features.map((f) => ({
          id: f.properties.id, park_id: cemiterioAtivoId, tipo: f.properties.tipo, rotulo: f.properties.rotulo,
          lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0],
        })));
      }).catch(() => setAmenidadesFeicoes([]));
    } else {
      setAmenidadesFeicoes([]);
    }
  }, [cemiterioAtivoId, caixaAtual, viasVisiveis, equipamentosVisiveis, versao]);

  const salvarDesenho = useCallback(async (geometria: Polygon) => {
    if (!alvo.id) {
      setErro({ status: 422, mensagem: 'Informe o ID do cemitério, quadra ou jazigo antes de desenhar.' });
      return;
    }
    try {
      setErro(null);
      await cemiteriosApi.salvarGeometria(TIPO_DO_ALVO[alvo.tipo], Number(alvo.id), geometria);
      setVersao((v) => v + 1);
      if (caixaAtual) void carregar(caixaAtual.caixa, caixaAtual.zoom);
    } catch (e) {
      setErro(erroApi(e));
    }
  }, [alvo, caixaAtual, carregar]);

  const salvarVia = useCallback(async (geometria: LineString) => {
    if (!cemiterioAtivoId) return;
    if (!novaViaCodigo.trim()) {
      setErro({ status: 422, mensagem: 'Informe o código da via antes de desenhar.' });
      return;
    }
    try {
      setErro(null);
      await cemiteriosApi.criarVia({ park_id: cemiterioAtivoId, via_codigo: novaViaCodigo.trim(), geojson: geometria });
      setNovaViaCodigo('');
      setDesenhandoVia(false);
      setVersao((v) => v + 1);
    } catch (e) {
      setErro(erroApi(e));
    }
  }, [cemiterioAtivoId, novaViaCodigo]);

  // Anéis [lat,lng] dos jazigos já carregados, para o alerta antecipado de sobreposição ao desenhar.
  const jazigosExistentes = useMemo<[number, number][][]>(
    () =>
      (feicoes.jazigos?.features ?? [])
        .map((f) => f.geometry?.coordinates?.[0])
        .filter((c): c is [number, number][] => Array.isArray(c))
        .map((coords) => coords.map(([lng, lat]) => [lat, lng] as [number, number])),
    [feicoes.jazigos]
  );

  // Encontra dados do jazigo selecionado para rota interna
  const jazigoFeicaoSelecionado = feicoes.jazigos?.features?.find(
    (f) => Number(f.properties?.id) === selecionado
  );
  const jazigoProps = jazigoFeicaoSelecionado?.properties as Record<string, unknown> | undefined;

  let latJazigo: number | null = null;
  let lngJazigo: number | null = null;

  if (jazigoFeicaoSelecionado?.geometry?.type === 'Polygon' && Array.isArray(jazigoFeicaoSelecionado.geometry.coordinates[0])) {
    const coords = jazigoFeicaoSelecionado.geometry.coordinates[0];
    let sumLat = 0;
    let sumLng = 0;
    for (const pt of coords) {
      sumLng += pt[0];
      sumLat += pt[1];
    }
    latJazigo = sumLat / coords.length;
    lngJazigo = sumLng / coords.length;
  }

  const portariaLat = cemiterioAtivo?.portaria_lat ?? null;
  const portariaLng = cemiterioAtivo?.portaria_lng ?? null;

  const rotaRetaFallback: [number, number][] | null =
    portariaLat !== null && portariaLng !== null && latJazigo !== null && lngJazigo !== null
      ? [
          [portariaLat, portariaLng],
          [latJazigo, lngJazigo],
        ]
      : null;

  // Roteirização real por vias cadastradas, com fallback automático para a linha reta
  // quando não houver vias ou caminho conectando os dois pontos (spec: mapa-gis › roteirização).
  useEffect(() => {
    setRotaReal(null);
    if (!cemiterioAtivoId || portariaLat === null || portariaLng === null || latJazigo === null || lngJazigo === null) {
      return;
    }
    let cancelado = false;
    void cemiteriosApi.rota(cemiterioAtivoId, { lat: portariaLat, lng: portariaLng }, { lat: latJazigo, lng: lngJazigo })
      .then((resposta) => {
        if (cancelado || !resposta.encontrada || !resposta.rota) return;
        const trechos = resposta.rota.features.map((f) => f.geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]));
        setRotaReal({ trechos, distanciaMetros: resposta.distancia_metros });
      })
      .catch(() => {});
    return () => { cancelado = true; };
  }, [cemiterioAtivoId, portariaLat, portariaLng, latJazigo, lngJazigo]);

  const rotaPortaria = rotaReal ? rotaReal.trechos.flat() : rotaRetaFallback;
  const distanciaPortariaMetros = rotaReal
    ? rotaReal.distanciaMetros
    : rotaRetaFallback !== null
      ? calcularDistanciaMetros(rotaRetaFallback[0], rotaRetaFallback[1])
      : null;

  const centro =
    cemiterioAtivo?.lat != null && cemiterioAtivo?.lng != null
      ? { lat: cemiterioAtivo.lat, lng: cemiterioAtivo.lng }
      : (parques.dados ?? []).find((p) =>
          cemiterioAtivoId ? p.id === cemiterioAtivoId && p.lat !== null : p.lat !== null
        );
  const inicial: [number, number] = centro ? [centro.lat as number, centro.lng as number] : [-15.78, -47.93];

  /** Exporta a planta humanizada em PNG 2x e PDF, compondo título, legenda, norte e escala (spec: mapa-gis › exportação). */
  const exportarPlanta = async () => {
    if (!mapaContainerRef.current) return;
    setExportando(true);
    setErro(null);
    try {
      const { toPng } = await import('html-to-image');
      const dataUrlMapa = await toPng(mapaContainerRef.current, { cacheBust: true, pixelRatio: 2 });

      const imagemMapa = new Image();
      await new Promise<void>((resolve, reject) => {
        imagemMapa.onload = () => resolve();
        imagemMapa.onerror = () => reject(new Error('Falha ao carregar a imagem do mapa.'));
        imagemMapa.src = dataUrlMapa;
      });

      const nomeCemiterio = cemiterioAtivo?.nome ?? 'Cemitério Municipal';
      const zoomAtual = caixaAtual?.zoom ?? 18;
      const latAtual = centro?.lat ?? inicial[0];
      const larguraFaixa = 90;
      const canvas = document.createElement('canvas');
      canvas.width = imagemMapa.width;
      canvas.height = imagemMapa.height + larguraFaixa;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas indisponível.');

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(imagemMapa, 0, larguraFaixa);

      // Título
      ctx.fillStyle = '#1f2937';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText(`Planta — ${nomeCemiterio}`, 20, 36);
      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#6b7280';
      ctx.fillText(`Gerado em ${new Date().toLocaleDateString('pt-BR')} — SYSGOV`, 20, 58);

      // Legenda de estados
      let xLegenda = 20;
      const yLegenda = 76;
      ctx.font = '12px sans-serif';
      Object.values(ESTADOS).forEach((e) => {
        ctx.fillStyle = e.cor;
        ctx.fillRect(xLegenda, yLegenda - 10, 12, 12);
        ctx.fillStyle = '#374151';
        ctx.fillText(e.rotulo, xLegenda + 16, yLegenda);
        xLegenda += 16 + ctx.measureText(e.rotulo).width + 20;
      });

      // Rosa dos ventos (indicador de norte simplificado)
      const nx = canvas.width - 50;
      const ny = 45;
      ctx.strokeStyle = '#374151';
      ctx.fillStyle = '#374151';
      ctx.beginPath();
      ctx.moveTo(nx, ny - 20);
      ctx.lineTo(nx - 6, ny + 6);
      ctx.lineTo(nx + 6, ny + 6);
      ctx.closePath();
      ctx.fill();
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('N', nx - 4, ny + 22);

      // Barra de escala (100 m reais na latitude/zoom atuais)
      const metrosPorPx = metrosPorPixel(latAtual, zoomAtual) / 2; // /2 porque a imagem está em pixelRatio 2
      const larguraEscalaPx = 100 / metrosPorPx;
      const xEscala = canvas.width - 220;
      const yEscala = larguraFaixa - 16;
      ctx.strokeStyle = '#111827';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(xEscala, yEscala);
      ctx.lineTo(xEscala + larguraEscalaPx, yEscala);
      ctx.stroke();
      ctx.font = '11px sans-serif';
      ctx.fillStyle = '#111827';
      ctx.fillText('100 m', xEscala, yEscala - 4);

      const dataUrlFinal = canvas.toDataURL('image/png');
      const dataHoje = new Date().toISOString().slice(0, 10);
      const slug = nomeCemiterio
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      const nomeArquivo = `planta-${slug || 'cemiterio'}-${dataHoje}`;

      const linkPng = document.createElement('a');
      linkPng.href = dataUrlFinal;
      linkPng.download = `${nomeArquivo}.png`;
      linkPng.click();

      const { default: JsPDF } = await import('jspdf');
      const orientacao = canvas.width >= canvas.height ? 'landscape' : 'portrait';
      const pdf = new JsPDF({ orientation: orientacao, format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const escala = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
      pdf.addImage(dataUrlFinal, 'PNG', 0, 0, canvas.width * escala, canvas.height * escala);
      pdf.save(`${nomeArquivo}.pdf`);
    } catch (e) {
      setErro(erroApi(e));
    } finally {
      setExportando(false);
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
      <Card className="relative overflow-hidden p-0 border border-border">
        {/* Controle de Camadas Base Abertas */}
        <ControleCamadasBase
          provedores={base.dados?.catalogo}
          provedorAtivoId={provedorAtivo.id}
          onMudarProvedor={setProvedorAtivo}
        />

        {/* Ferramentas Flutuantes sobre o Mapa */}
        <div className="absolute left-3 top-3 z-[400] flex flex-col gap-2">
          <FerramentaMedicao
            ativa={modoMedicao}
            pontos={pontosMedicao}
            onAlternar={() => {
              setModoMedicao(!modoMedicao);
              setPontosMedicao([]);
            }}
            onLimpar={() => setPontosMedicao([])}
            onDesfazer={() => setPontosMedicao((pts) => pts.slice(0, -1))}
          />

          <Button
            variant="outline"
            size="sm"
            onClick={() => setModalGpsAberto(true)}
            className="gap-1.5 text-xs shadow-sm bg-background/95 backdrop-blur-sm"
            title="Localização GPS em campo"
          >
            <LocateFixed className="h-3.5 w-3.5 text-primary" />
            <span>Minha Posição GPS</span>
          </Button>

          {rotaPortaria && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalRotaAberto(true)}
              className="gap-1.5 text-xs shadow-sm bg-background/95 backdrop-blur-sm border-primary/40 text-primary"
              title="Como chegar ao jazigo selecionado"
            >
              <Navigation className="h-3.5 w-3.5" />
              <span>Como Chegar ({distanciaPortariaMetros?.toFixed(0)}m{rotaReal ? ' — pelas vias' : ''})</span>
            </Button>
          )}
        </div>

        {/* Alerta antecipado de sobreposição ao desenhar (spec: mapa-gis › validação topológica) */}
        {alertaSobreposicao && (
          <div className="absolute left-1/2 top-3 z-[400] -translate-x-1/2 flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/95 px-3 py-1.5 text-xs font-semibold text-white shadow-md">
            <AlertTriangle className="h-3.5 w-3.5" /> Possível sobreposição com jazigo vizinho
          </div>
        )}

        <MapContainer
          center={inicial}
          zoom={centro ? 17 : 5}
          maxZoom={provedorAtivo.max_zoom}
          className="h-[75vh] w-full"
          aria-label="Mapa dos cemitérios"
        >
          <TileLayer
            key={provedorAtivo.id}
            url={provedorAtivo.url}
            attribution={provedorAtivo.atribuicao}
            maxZoom={provedorAtivo.max_zoom}
          />
          <Carregador onMover={carregar} />

          {/* Camadas Vetoriais GeoJSON — jazigos em zoom de detalhe; em zoom baixo, ver ClusterJazigos abaixo */}
          {CAMADAS.map(
            ({ key }) =>
              visiveis[key] &&
              feicoes[key] &&
              (key !== 'jazigos' || (caixaAtual?.zoom ?? 0) >= ZOOM_DETALHE_JAZIGOS) && (
                <GeoJSON
                  key={`${key}-${versao}-${filtroRapido ?? 'todos'}-${modoPlanta}`}
                  data={feicoes[key] as unknown as ColecaoGeoJson}
                  style={(f) =>
                    estiloFeicao(
                      key,
                      (f?.properties ?? {}) as Record<string, unknown>,
                      selecionado,
                      filtroRapido,
                      modoPlanta
                    )
                  }
                  onEachFeature={(f, camada) => {
                    const p = f.properties as Record<string, unknown>;
                    camada.bindTooltip(String(p.codigo ?? p.nome ?? ''), { sticky: true });
                    if (key === 'jazigos') camada.on('click', () => setSelecionado(Number(p.id)));
                  }}
                />
              )
          )}

          {/* Jazigos clusterizados em zoom baixo (spec: mapa-gis › clusterização) */}
          {visiveis.jazigos && feicoes.jazigos && (caixaAtual?.zoom ?? 0) < ZOOM_DETALHE_JAZIGOS && (
            <ClusterJazigos feicoes={feicoes.jazigos} onSelecionar={setSelecionado} />
          )}

          {/* Vias/alamedas da necrópole ativa */}
          {viasVisiveis && viasFeicoes.map(({ id, via }) => (
            <Polyline
              key={id}
              positions={via.geojson.coordinates.map(([lng, lat]) => [lat, lng] as [number, number])}
              pathOptions={estiloVia(modoPlanta)}
            >
              <Tooltip sticky>{via.via_codigo}</Tooltip>
            </Polyline>
          ))}

          {/* Equipamentos da necrópole ativa (vegetação só aparece no modo humanizado) */}
          {equipamentosVisiveis && amenidadesFeicoes
            .filter((a) => a.tipo !== 'vegetacao' || modoPlanta === 'humanizado')
            .map((a) => (
              <CircleMarker
                key={a.id}
                center={[a.lat, a.lng]}
                radius={a.tipo === 'vegetacao' ? 6 : 9}
                pathOptions={
                  a.tipo === 'vegetacao'
                    ? { color: '#2f6b3a', fillColor: '#4c9a5a', fillOpacity: 0.9, weight: 1 }
                    : { color: '#ffffff', fillColor: '#334155', fillOpacity: 0.95, weight: 2 }
                }
              >
                <Tooltip>{`${ICONE_AMENIDADE[a.tipo]} ${a.rotulo ?? a.tipo}`}</Tooltip>
              </CircleMarker>
            ))}

          {/* Rota Interna Portaria -> Jazigo Selecionado */}
          {rotaPortaria && (
            <>
              <Polyline
                positions={rotaPortaria}
                pathOptions={{
                  color: '#6366f1',
                  weight: 3,
                  dashArray: '6 6',
                  opacity: 0.9,
                }}
              />
              <CircleMarker
                center={rotaPortaria[0]}
                radius={8}
                pathOptions={{ color: '#ffffff', fillColor: '#10b981', fillOpacity: 1, weight: 2 }}
              >
                <Tooltip permanent direction="top" offset={[0, -10]}>
                  Portaria Principal
                </Tooltip>
              </CircleMarker>
            </>
          )}

          {/* Marcador GPS em tempo real */}
          {posicaoGps && (
            <>
              <Circle
                center={[posicaoGps.lat, posicaoGps.lng]}
                radius={posicaoGps.precisao}
                pathOptions={{
                  color: '#3b82f6',
                  fillColor: '#3b82f6',
                  fillOpacity: 0.15,
                  weight: 1,
                }}
              />
              <CircleMarker
                center={[posicaoGps.lat, posicaoGps.lng]}
                radius={7}
                pathOptions={{
                  color: '#ffffff',
                  fillColor: '#2563eb',
                  fillOpacity: 1,
                  weight: 2,
                }}
              >
                <Tooltip permanent direction="bottom">
                  Sua Posição (±{posicaoGps.precisao}m)
                </Tooltip>
              </CircleMarker>
            </>
          )}

          {/* Desenho da Ferramenta de Medição */}
          {modoMedicao && pontosMedicao.length > 0 && (
            <>
              {pontosMedicao.length > 1 && (
                <Polyline
                  positions={pontosMedicao}
                  pathOptions={{
                    color: '#f59e0b',
                    weight: 3,
                    dashArray: '4 4',
                  }}
                />
              )}
              {pontosMedicao.map((pt, idx) => (
                <CircleMarker
                  key={idx}
                  center={pt}
                  radius={5}
                  pathOptions={{
                    color: '#ffffff',
                    fillColor: '#f59e0b',
                    fillOpacity: 1,
                    weight: 2,
                  }}
                />
              ))}
            </>
          )}

          {edita && (
            <Desenho
              modoLinha={desenhandoVia}
              onCriado={(g) => void salvarDesenho(g)}
              onCriadaLinha={(g) => void salvarVia(g)}
              jazigosExistentes={jazigosExistentes}
              onAlertaSobreposicao={setAlertaSobreposicao}
            />
          )}
          <CapturaContainer alvo={mapaContainerRef} />
          <Voar envelope={envelope} />
          <SincronizadorCemiterioAtivo
            cemiterioAtivoId={cemiterioAtivoId}
            cemiterioAtivo={cemiterioAtivo}
            parques={parques.dados}
            focoAtivo={Boolean(focoMapa || envelope)}
          />

          {/* Captura de cliques para medição ou grade */}
          {modoMedicao && (
            <CapturaPontos onPonto={(p) => setPontosMedicao((pts) => [...pts, p])} />
          )}

          {grade.capturando && (
            <CapturaPontos
              onPonto={(p) =>
                setGrade((g) => ({ capturando: g.pontos.length < 1, pontos: [...g.pontos, p] }))
              }
            />
          )}
        </MapContainer>

        <Legenda />
      </Card>

      {/* Painel Lateral */}
      <div className="space-y-4">
        <ControleModoPlanta modo={modoPlanta} onMudar={setModoPlanta} />

        <Busca
          onEscolher={(r) => {
            if (r.envelope) setEnvelope(r.envelope);
            setSelecionado(r.jazigo_id);
          }}
        />

        {/* Filtros Rápidos de Jazigos */}
        <FiltrosRapidosMapa
          filtroAtivo={filtroRapido}
          onFiltroChange={setFiltroRapido}
        />

        {/* Alerta caso a necrópole selecionada ainda não tenha coordenadas cadastradas */}
        {cemiterioAtivo && (cemiterioAtivo.lat == null || cemiterioAtivo.lng == null) && (
          <Card className="border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300 space-y-2">
            <div className="flex items-center gap-1.5 font-semibold">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
              <span>Necrópole sem Coordenadas</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              O cemitério <strong>{cemiterioAtivo.nome}</strong> ainda não possui coordenadas geográficas cadastradas.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setModalEditarNecropole(true)}
              className="w-full h-7 text-xs gap-1.5 border-amber-500/40 text-amber-800 dark:text-amber-200 hover:bg-amber-500/20"
            >
              <MapPin className="h-3.5 w-3.5 text-primary" />
              <span>Definir Coordenadas da Necrópole</span>
            </Button>
          </Card>
        )}

        {/* Camadas Visíveis */}
        <Card className="space-y-2 p-4">
          <h3 className="text-sm font-semibold">Camadas</h3>
          {CAMADAS.map(({ key, rotulo }) => (
            <div key={key} className="flex items-center justify-between text-sm">
              <span>
                {rotulo}
                {key === 'jazigos' && (
                  <span className="text-xs text-muted-foreground"> (zoom ≥ {ZOOM_MINIMO_JAZIGOS})</span>
                )}
              </span>
              <Switch
                label={rotulo}
                checked={visiveis[key]}
                onCheckedChange={(v) => setVisiveis((s) => ({ ...s, [key]: v }))}
              />
            </div>
          ))}
          {cemiterioAtivoId && (
            <>
              <div className="flex items-center justify-between text-sm pt-1 border-t border-border/50">
                <span>Vias / Alamedas</span>
                <Switch label="Vias / Alamedas" checked={viasVisiveis} onCheckedChange={setViasVisiveis} />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Equipamentos</span>
                <Switch label="Equipamentos" checked={equipamentosVisiveis} onCheckedChange={setEquipamentosVisiveis} />
              </div>
            </>
          )}
        </Card>

        {/* Exportação para Engenharia Municipal / QGIS */}
        <BotaoExportacaoGis
          parkId={cemiterioAtivoId}
          nomeCemiterio={cemiterioAtivo?.nome}
        />

        {/* Exportação da planta humanizada (PNG 2x / PDF) — spec: mapa-gis › exportação */}
        {modoPlanta === 'humanizado' && (
          <Button
            variant="outline"
            className="w-full gap-1.5"
            disabled={exportando}
            onClick={() => void exportarPlanta()}
          >
            <Download className="h-4 w-4" />
            {exportando ? 'Exportando planta…' : 'Exportar Planta (PNG/PDF)'}
          </Button>
        )}

        {/* Desenho e Edição de Polígonos */}
        {edita && (
          <Card className="space-y-3 p-4">
            <h3 className="text-sm font-semibold">Desenhar / editar geometria</h3>
            <Select
              value={alvo.tipo}
              onChange={(v) => setAlvo((a) => ({ ...a, tipo: v as Camada }))}
              options={CAMADAS.map((c) => ({ value: c.key, label: c.rotulo }))}
            />
            <Input
              aria-label="ID do alvo"
              className="font-mono tabular-nums"
              placeholder="ID"
              value={alvo.id}
              onChange={(e) => setAlvo((a) => ({ ...a, id: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              Use a barra de desenho do mapa; o polígono é validado contra sobreposições e limites ao salvar.
            </p>
            {can('cemiterios.inventario.manage') && (
              <Button variant="outline" onClick={() => setGrade({ capturando: true, pontos: [] })}>
                <Grid3x3 className="h-4 w-4" /> Gerar jazigos em grade
              </Button>
            )}
            {grade.capturando && (
              <p className="text-xs font-semibold text-primary">
                Clique no mapa: {grade.pontos.length === 0 ? 'ponto de origem' : 'ponto que define a orientação'}.
              </p>
            )}

            {cemiterioAtivoId && (
              <div className="space-y-2 border-t border-border/50 pt-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5">
                    <Route className="h-3.5 w-3.5 text-primary" /> Desenhar via/alameda
                  </span>
                  <Switch label="Desenhar via" checked={desenhandoVia} onCheckedChange={setDesenhandoVia} />
                </div>
                {desenhandoVia && (
                  <>
                    <Input
                      aria-label="Código da via"
                      placeholder="Código da via (ex.: AL-01)"
                      value={novaViaCodigo}
                      onChange={(e) => setNovaViaCodigo(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Trace a linha da via no mapa; ela vira um trecho do grafo de roteirização.
                    </p>
                  </>
                )}
              </div>
            )}
          </Card>
        )}

        <ErroBox erro={erro ?? base.erro} />
      </div>

      {/* Modais Integrados */}
      <ModalDetalheJazigo
        jazigo={selecionado ? { id: selecionado } : null}
        onFechar={() => setSelecionado(null)}
        onAlterado={recarregar}
      />

      {/* Modal Como Chegar / QR Code */}
      {latJazigo !== null && lngJazigo !== null && (
        <ModalComoChegar
          aberto={modalRotaAberto}
          onFechar={() => setModalRotaAberto(false)}
          codigoJazigo={String(jazigoProps?.codigo ?? selecionado ?? '')}
          nomeCemiterio={cemiterioAtivo?.nome ?? 'Cemitério Municipal'}
          lat={latJazigo}
          lng={lngJazigo}
          distanciaPortariaMetros={distanciaPortariaMetros}
        />
      )}

      {/* Modal GPS de Campo */}
      <ModalGpsCampo
        aberto={modalGpsAberto}
        onFechar={() => setModalGpsAberto(false)}
        jazigoSelecionado={
          selecionado
            ? { id: selecionado, codigo: String(jazigoProps?.codigo ?? selecionado) }
            : null
        }
        onCentralizarMapa={(lat, lng) => {
          setPosicaoGps({ lat, lng, precisao: 5 });
          setEnvelope([lng, lat, lng, lat]);
        }}
        onAplicarCoordenadas={async (lat, lng) => {
          if (!selecionado) return;
          await cemiteriosApi.atualizarJazigo(selecionado, { lat, lng });
          recarregar();
        }}
      />

      {/* Modal Criação de Grade */}
      <FormModal
        aberto={!grade.capturando && grade.pontos.length === 2}
        titulo="Gerar jazigos em grade"
        onFechar={() => setGrade({ capturando: false, pontos: [] })}
        iniciais={{
          linhas: '10',
          colunas: '20',
          comprimento_m: '2.50',
          largura_m: '1.20',
          espacamento_m: '0.60',
          padrao: 'Q{linha}-J{n}',
          tipo: 'jazigo',
          capacidade: '3',
        }}
        rotuloEnviar="Gerar"
        campos={[
          { nome: 'setor_id', rotulo: 'ID da quadra', tipo: 'number', obrigatorio: true },
          { nome: 'linhas', rotulo: 'Linhas', tipo: 'number', obrigatorio: true },
          { nome: 'colunas', rotulo: 'Colunas', tipo: 'number', obrigatorio: true },
          { nome: 'comprimento_m', rotulo: 'Comprimento (m)', tipo: 'number', obrigatorio: true },
          { nome: 'largura_m', rotulo: 'Largura (m)', tipo: 'number', obrigatorio: true },
          { nome: 'espacamento_m', rotulo: 'Espaçamento (m)', tipo: 'number', obrigatorio: true },
          { nome: 'padrao', rotulo: 'Padrão de código', obrigatorio: true, dica: 'Use {linha}, {coluna} e {n}.' },
          {
            nome: 'tipo',
            rotulo: 'Tipo',
            tipo: 'select',
            opcoes: [
              { value: 'jazigo', label: 'Jazigo' },
              { value: 'gaveta', label: 'Gaveta' },
              { value: 'cova_publica', label: 'Cova pública' },
            ],
          },
          { nome: 'capacidade', rotulo: 'Capacidade', tipo: 'number', obrigatorio: true },
        ]}
        onEnviar={async (v) => {
          const [origem, direcao] = grade.pontos;
          const { setor_id: setorId, ...resto } = v;
          const r = await cemiteriosApi.gerarGrade(Number(setorId), {
            ...resto,
            origem: [origem[1], origem[0]],
            direcao: [direcao[1], direcao[0]],
            linhas: Number(v.linhas),
            colunas: Number(v.colunas),
            capacidade: Number(v.capacidade),
          });
          setErro({
            status: 200,
            codigo: 'Grade gerada',
            mensagem: `${r.criados} jazigo(s) criado(s); ${r.descartados.length} descartado(s) fora do setor; ${r.duplicados.length} código(s) já existente(s).`,
          });
          recarregar();
        }}
      />

      {/* Modal de Configuração e Coordenadas da Necrópole */}
      <ModalEditarCemiterio
        aberto={modalEditarNecropole}
        onFechar={() => setModalEditarNecropole(false)}
        parque={cemiterioAtivo}
        onSalvo={recarregar}
      />
    </div>
  );
};

/** Recarrega as camadas pela área visível a cada movimento (RF-15, RNF-03). */
const Carregador: React.FC<{ onMover: (caixa: Caixa, zoom: number) => void }> = ({ onMover }) => {
  const mapa = useMapEvents({
    moveend: () => {
      const b = mapa.getBounds();
      onMover(caixaDe(b.getSouth(), b.getWest(), b.getNorth(), b.getEast()), mapa.getZoom());
    },
  });
  useEffect(() => {
    const b = mapa.getBounds();
    onMover(caixaDe(b.getSouth(), b.getWest(), b.getNorth(), b.getEast()), mapa.getZoom());
  }, [mapa, onMover]);
  return null;
};

/** Ferramentas do Leaflet-Geoman: desenho e edição de polígonos. */
/**
 * Ferramentas do Leaflet-Geoman: desenho/edição de polígonos (jazigo/setor/parque) ou, no modo de
 * desenho de via, de linhas — com snap nativo e alerta antecipado de sobreposição (spec: mapa-gis ›
 * validação topológica em tempo real). O alerta é só feedback do cliente; quem bloqueia de fato é o
 * backend ao salvar (`Geo::sobrepoe`).
 */
const Desenho: React.FC<{
  modoLinha: boolean;
  onCriado: (g: Polygon) => void;
  onCriadaLinha: (g: LineString) => void;
  jazigosExistentes: [number, number][][];
  onAlertaSobreposicao: (sobrepoe: boolean) => void;
}> = ({ modoLinha, onCriado, onCriadaLinha, jazigosExistentes, onAlertaSobreposicao }) => {
  const mapa = useMap();

  useEffect(() => {
    mapa.pm.addControls({
      position: 'topleft',
      drawMarker: false,
      drawCircle: false,
      drawCircleMarker: false,
      drawPolyline: modoLinha,
      drawPolygon: !modoLinha,
      drawText: false,
      cutPolygon: false,
      rotateMode: false,
    });
    mapa.pm.setLang('pt_br');
    mapa.pm.setGlobalOptions({ snappable: true, snapDistance: 20 });

    const aoCriar = (e: { layer: Layer }) => {
      const geometria = (e.layer as unknown as { toGeoJSON: () => { geometry: Polygon | LineString } }).toGeoJSON().geometry;
      e.layer.remove();
      onAlertaSobreposicao(false);
      if (geometria.type === 'LineString') onCriadaLinha(geometria as LineString);
      else onCriado(geometria as Polygon);
    };

    // Checagem antecipada (bounding box) enquanto o vértice é adicionado/arrastado — só para polígonos.
    const checarSobreposicao = (e: { layer?: Layer }) => {
      if (modoLinha || !e.layer) return;
      const anel = (e.layer as PoligonoLeaflet).getLatLngs?.()[0] as { lat: number; lng: number }[] | undefined;
      if (!anel || anel.length < 3) return;
      const pontos: [number, number][] = anel.map((p) => [p.lat, p.lng]);
      onAlertaSobreposicao(jazigosExistentes.some((j) => poligonosPodemSobrepor(pontos, j)));
    };

    mapa.on('pm:create', aoCriar);
    mapa.on('pm:vertexadded', checarSobreposicao);
    mapa.on('pm:markerdragend', checarSobreposicao);
    return () => {
      mapa.off('pm:create', aoCriar);
      mapa.off('pm:vertexadded', checarSobreposicao);
      mapa.off('pm:markerdragend', checarSobreposicao);
      mapa.pm.removeControls();
      onAlertaSobreposicao(false);
    };
  }, [mapa, modoLinha, onCriado, onCriadaLinha, jazigosExistentes, onAlertaSobreposicao]);
  return null;
};

/** Zoom animado até o resultado da busca (RF-17). */
const Voar: React.FC<{ envelope: Caixa | null }> = ({ envelope }) => {
  const mapa = useMap();
  useEffect(() => {
    if (envelope) mapa.flyToBounds(limitesDoEnvelope(envelope), { duration: 1.2, maxZoom: 21 });
  }, [mapa, envelope]);
  return null;
};

/**
 * Clusteriza os jazigos em zoom baixo (abaixo de `ZOOM_DETALHE_JAZIGOS`) para não renderizar milhares
 * de polígonos individuais de uma vez (spec: mapa-gis › clusterização), reaproveitando o centroide já
 * calculado por feição.
 */
const ClusterJazigos: React.FC<{ feicoes: FeatureCollection; onSelecionar: (id: number) => void }> = ({ feicoes, onSelecionar }) => {
  const mapa = useMap();

  useEffect(() => {
    const grupo = L.markerClusterGroup({ maxClusterRadius: 60, disableClusteringAtZoom: undefined });

    for (const f of feicoes.features) {
      const coords = f.geometry?.coordinates?.[0];
      if (!Array.isArray(coords) || coords.length === 0) continue;
      const somaLat = coords.reduce((s, [, lat]) => s + lat, 0);
      const somaLng = coords.reduce((s, [lng]) => s + lng, 0);
      const props = (f.properties ?? {}) as Record<string, unknown>;
      const marcador = L.circleMarker([somaLat / coords.length, somaLng / coords.length], {
        radius: 5,
        color: ESTADOS[props.estado as keyof typeof ESTADOS]?.cor ?? '#6b7280',
        fillColor: ESTADOS[props.estado as keyof typeof ESTADOS]?.cor ?? '#6b7280',
        fillOpacity: 0.85,
        weight: 1,
      });
      marcador.bindTooltip(String(props.codigo ?? ''));
      marcador.on('click', () => onSelecionar(Number(props.id)));
      grupo.addLayer(marcador);
    }

    mapa.addLayer(grupo);
    return () => {
      mapa.removeLayer(grupo);
    };
  }, [mapa, feicoes, onSelecionar]);

  return null;
};

/** Só existe para expor o container DOM do Leaflet (fora do React) à exportação de planta em PNG/PDF. */
const CapturaContainer: React.FC<{ alvo: React.MutableRefObject<HTMLElement | null> }> = ({ alvo }) => {
  const mapa = useMap();
  useEffect(() => {
    alvo.current = mapa.getContainer();
  }, [mapa, alvo]);
  return null;
};

/** Centraliza e ajusta o zoom automaticamente para o cemitério selecionado ao abrir a aba ou quando os dados carregam. */
const SincronizadorCemiterioAtivo: React.FC<{
  cemiterioAtivoId: number | null;
  cemiterioAtivo: Parque | null;
  parques: Parque[] | null | undefined;
  focoAtivo: boolean;
}> = ({ cemiterioAtivoId, cemiterioAtivo, parques, focoAtivo }) => {
  const mapa = useMap();
  const focadoRef = React.useRef<number | null>(null);

  // Invalida tamanho do container Leaflet após montagem da aba para evitar problemas de tiles cinzas
  useEffect(() => {
    const timer = setTimeout(() => {
      mapa.invalidateSize();
    }, 150);
    return () => clearTimeout(timer);
  }, [mapa]);

  useEffect(() => {
    if (focoAtivo) return;

    const parque =
      cemiterioAtivo?.lat != null && cemiterioAtivo?.lng != null
        ? cemiterioAtivo
        : (parques ?? []).find(
            (p) =>
              (cemiterioAtivoId ? p.id === cemiterioAtivoId : true) &&
              p.lat != null &&
              p.lng != null
          );

    if (parque?.lat != null && parque?.lng != null) {
      if (focadoRef.current === parque.id) return;
      focadoRef.current = parque.id;
      mapa.flyTo([parque.lat, parque.lng], 17, { duration: 1.2 });
    }
  }, [mapa, cemiterioAtivoId, cemiterioAtivo, parques, focoAtivo]);

  return null;
};

const CapturaPontos: React.FC<{ onPonto: (p: [number, number]) => void }> = ({ onPonto }) => {
  useMapEvents({ click: (e: LeafletMouseEvent) => onPonto([e.latlng.lat, e.latlng.lng]) });
  return null;
};

const Legenda: React.FC = () => (
  <div
    className="absolute bottom-3 left-3 z-[400] rounded-lg border border-border bg-card/95 p-3 text-xs shadow-sm"
    aria-label="Legenda"
  >
    <div className="mb-1 font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">
      Situação dos Túmulos
    </div>
    <div className="grid grid-cols-2 gap-x-3 gap-y-1">
      {Object.values(ESTADOS).map((e) => (
        <div key={e.rotulo} className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: e.cor }} />
          <span>{e.rotulo}</span>
        </div>
      ))}
      <div className="flex items-center gap-1.5 col-span-2 pt-1 border-t border-border/50 text-amber-600 dark:text-amber-400">
        <span className="inline-block h-2.5 w-2.5 rounded-sm border-2 border-dashed border-amber-500" />
        <span>Apto à Exumação (&gt; 3 anos)</span>
      </div>
    </div>
  </div>
);

const ROTULO_TIPO_BUSCA: Record<string, string> = { falecido: 'Falecidos', jazigo: 'Jazigos', concessao: 'Concessões' };

/** Busca unificada com debounce automático (300 ms) e resultados agrupados por tipo (spec: mapa-gis › busca). */
const Busca: React.FC<{ onEscolher: (r: ResultadoBusca) => void }> = ({ onEscolher }) => {
  const [q, setQ] = useState('');
  const [resultados, setResultados] = useState<ResultadoBusca[]>([]);
  const [erro, setErro] = useState<ErroApi | null>(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResultados([]);
      return;
    }
    let cancelado = false;
    cemiteriosApi.buscar(q.trim())
      .then((r) => { if (!cancelado) { setErro(null); setResultados(r); } })
      .catch((e) => { if (!cancelado) setErro(erroApi(e)); });
    return () => { cancelado = true; };
  }, [q]);

  const grupos = useMemo(() => {
    const porTipo = new Map<string, ResultadoBusca[]>();
    for (const r of resultados) {
      porTipo.set(r.tipo, [...(porTipo.get(r.tipo) ?? []), r]);
    }
    return Array.from(porTipo.entries());
  }, [resultados]);

  return (
    <Card className="space-y-2 p-4">
      <SearchInput
        value={q}
        onChange={setQ}
        placeholder="Falecido, jazigo, concessão ou CPF"
        debounce={300}
      />
      <ErroBox erro={erro} />
      <div className="max-h-64 space-y-3 overflow-auto">
        {grupos.map(([tipo, itens]) => (
          <div key={tipo}>
            <p className="px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {ROTULO_TIPO_BUSCA[tipo] ?? tipo}
            </p>
            <ul className="space-y-1">
              {itens.map((r, i) => (
                <li key={`${r.jazigo_id}-${i}`}>
                  <Button
                    variant="ghost"
                    className="h-auto w-full justify-start py-1 text-left"
                    onClick={() => onEscolher(r)}
                  >
                    <span className="block">
                      <span className="block text-sm">{r.rotulo}</span>
                      <span className="text-xs text-muted-foreground">
                        jazigo <Mono>{r.jazigo_codigo}</Mono>
                      </span>
                    </span>
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  );
};
