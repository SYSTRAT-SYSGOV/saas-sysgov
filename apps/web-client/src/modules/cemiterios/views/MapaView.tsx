import React, { useCallback, useEffect, useState } from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
// O bundle do leaflet-geoman-free é um UMD que espera `window.L` (Leaflet como script
// global) em vez do pacote ESM — precisa ser definido antes deste import.
(window as unknown as { L: typeof L }).L = L;
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import type { FeatureCollection as ColecaoGeoJson, Polygon } from 'geojson';
import type { Layer, LeafletMouseEvent, Polygon as PoligonoLeaflet } from 'leaflet';
import { Circle, CircleMarker, GeoJSON, MapContainer, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import { Grid3x3, Search, LocateFixed, Navigation, MapPin, AlertTriangle } from 'lucide-react';
import { Button, Card, Input, Select, Switch } from '@/components/ui';
import { useCan } from '@/core/rbac/useCan';
import {
  cemiteriosApi,
  erroApi,
  ESTADOS,
  type ErroApi,
  type FeatureCollection,
  type Parque,
  type ProvedorMapaBase,
  type ResultadoBusca,
} from '../api';
import {
  caixaDe,
  calcularDistanciaMetros,
  estiloFeicao,
  limitesDoEnvelope,
  ZOOM_MINIMO_JAZIGOS,
  type Caixa,
} from '../mapa.utils';
import { ModalDetalheJazigo } from './ModalDetalheJazigo';
import { ErroBox, FormModal, Mono, useDados } from './comum';
import { useCemiteriosNavigation } from '../CemiteriosContext';
import { ControleCamadasBase, PROVEDORES_PADRAO } from './ControleCamadasBase';
import { ModalComoChegar } from './ModalComoChegar';
import { ModalGpsCampo } from './ModalGpsCampo';
import { FerramentaMedicao } from './FerramentaMedicao';
import { FiltrosRapidosMapa, type FiltroRapidoStatus } from './FiltrosRapidosMapa';
import { BotaoExportacaoGis } from './BotaoExportacaoGis';
import { ModalEditarCemiterio } from './ModalEditarCemiterio';

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

  const { focoMapa, limparFocoMapa, cemiterioAtivoId, cemiterioAtivo } = useCemiteriosNavigation();

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

  // Edição de dados/coordenadas da necrópole
  const [modalEditarNecropole, setModalEditarNecropole] = useState(false);

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

  const rotaPortaria: [number, number][] | null =
    portariaLat !== null && portariaLng !== null && latJazigo !== null && lngJazigo !== null
      ? [
          [portariaLat, portariaLng],
          [latJazigo, lngJazigo],
        ]
      : null;

  const distanciaPortariaMetros =
    rotaPortaria !== null
      ? calcularDistanciaMetros(rotaPortaria[0], rotaPortaria[1])
      : null;

  const centro =
    cemiterioAtivo?.lat != null && cemiterioAtivo?.lng != null
      ? { lat: cemiterioAtivo.lat, lng: cemiterioAtivo.lng }
      : (parques.dados ?? []).find((p) =>
          cemiterioAtivoId ? p.id === cemiterioAtivoId && p.lat !== null : p.lat !== null
        );
  const inicial: [number, number] = centro ? [centro.lat as number, centro.lng as number] : [-15.78, -47.93];

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
              <span>Como Chegar ({distanciaPortariaMetros?.toFixed(0)}m)</span>
            </Button>
          )}
        </div>

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

          {/* Camadas Vetoriais GeoJSON */}
          {CAMADAS.map(
            ({ key }) =>
              visiveis[key] &&
              feicoes[key] && (
                <GeoJSON
                  key={`${key}-${versao}-${filtroRapido ?? 'todos'}`}
                  data={feicoes[key] as unknown as ColecaoGeoJson}
                  style={(f) =>
                    estiloFeicao(
                      key,
                      (f?.properties ?? {}) as Record<string, unknown>,
                      selecionado,
                      filtroRapido
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

          {edita && <Desenho onCriado={(g) => void salvarDesenho(g)} />}
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
        </Card>

        {/* Exportação para Engenharia Municipal / QGIS */}
        <BotaoExportacaoGis
          parkId={cemiterioAtivoId}
          nomeCemiterio={cemiterioAtivo?.nome}
        />

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
const Desenho: React.FC<{ onCriado: (g: Polygon) => void }> = ({ onCriado }) => {
  const mapa = useMap();
  useEffect(() => {
    mapa.pm.addControls({
      position: 'topleft',
      drawMarker: false,
      drawCircle: false,
      drawCircleMarker: false,
      drawPolyline: false,
      drawText: false,
      cutPolygon: false,
      rotateMode: false,
    });
    mapa.pm.setLang('pt_br');
    const aoCriar = (e: { layer: Layer }) => {
      const geo = (e.layer as PoligonoLeaflet).toGeoJSON().geometry as Polygon;
      e.layer.remove();
      onCriado(geo);
    };
    mapa.on('pm:create', aoCriar);
    return () => {
      mapa.off('pm:create', aoCriar);
      mapa.pm.removeControls();
    };
  }, [mapa, onCriado]);
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

const Busca: React.FC<{ onEscolher: (r: ResultadoBusca) => void }> = ({ onEscolher }) => {
  const [q, setQ] = useState('');
  const [resultados, setResultados] = useState<ResultadoBusca[]>([]);
  const [erro, setErro] = useState<ErroApi | null>(null);

  const buscar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (q.trim().length < 2) return;
    try {
      setErro(null);
      setResultados(await cemiteriosApi.buscar(q.trim()));
    } catch (e) {
      setErro(erroApi(e));
    }
  };

  return (
    <Card className="space-y-2 p-4">
      <form onSubmit={buscar} className="flex gap-2">
        <Input
          aria-label="Busca"
          placeholder="Falecido, jazigo, concessão ou CPF"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Button type="submit" aria-label="Buscar">
          <Search className="h-4 w-4" />
        </Button>
      </form>
      <ErroBox erro={erro} />
      <ul className="max-h-64 space-y-1 overflow-auto">
        {resultados.map((r, i) => (
          <li key={`${r.jazigo_id}-${i}`}>
            <Button
              variant="ghost"
              className="h-auto w-full justify-start py-1 text-left"
              onClick={() => onEscolher(r)}
            >
              <span className="block">
                <span className="block text-sm">{r.rotulo}</span>
                <span className="text-xs text-muted-foreground">
                  {r.tipo} · jazigo <Mono>{r.jazigo_codigo}</Mono>
                </span>
              </span>
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  );
};
