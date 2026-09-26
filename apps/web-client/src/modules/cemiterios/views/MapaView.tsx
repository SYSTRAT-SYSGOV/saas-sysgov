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
import { GeoJSON, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { Grid3x3, Search } from 'lucide-react';
import { Button, Card, Input, Select, Switch } from '@/components/ui';
import { useCan } from '@/core/rbac/useCan';
import { cemiteriosApi, erroApi, ESTADOS, type ErroApi, type FeatureCollection, type ResultadoBusca } from '../api';
import { caixaDe, estiloFeicao, limitesDoEnvelope, ZOOM_MINIMO_JAZIGOS, type Caixa } from '../mapa.utils';
import { ModalDetalheJazigo } from './ModalDetalheJazigo';
import { ErroBox, FormModal, Mono, useDados } from './comum';
import { useCemiteriosNavigation } from '../CemiteriosContext';

type Camada = 'parques' | 'setores' | 'jazigos';
const CAMADAS: { key: Camada; rotulo: string }[] = [
  { key: 'parques', rotulo: 'Cemitérios' }, { key: 'setores', rotulo: 'Quadras' }, { key: 'jazigos', rotulo: 'Jazigos' },
];
const TIPO_DO_ALVO: Record<Camada, 'parque' | 'setor' | 'jazigo'> = { parques: 'parque', setores: 'setor', jazigos: 'jazigo' };

/** Mapa interativo (spec gis): base de satélite, camadas por bbox, desenho, grade e busca com zoom. */
export const MapaView: React.FC = () => {
  const { can } = useCan();
  const edita = can('cemiterios.gis.edit');
  const base = useDados(() => cemiteriosApi.mapaBase(), []);
  const parques = useDados(() => cemiteriosApi.parques(), []);

  const { focoMapa, limparFocoMapa, cemiterioAtivoId, cemiterioAtivo } = useCemiteriosNavigation();

  const [visiveis, setVisiveis] = useState<Record<Camada, boolean>>({ parques: true, setores: true, jazigos: true });
  const [feicoes, setFeicoes] = useState<Partial<Record<Camada, FeatureCollection>>>({});
  const [versao, setVersao] = useState(0);
  const [erro, setErro] = useState<ErroApi | null>(null);
  const [selecionado, setSelecionado] = useState<number | null>(null);
  const [envelope, setEnvelope] = useState<Caixa | null>(null);
  const [alvo, setAlvo] = useState<{ tipo: Camada; id: string }>({ tipo: 'jazigos', id: '' });
  const [grade, setGrade] = useState<{ capturando: boolean; pontos: [number, number][] }>({ capturando: false, pontos: [] });
  const [caixaAtual, setCaixaAtual] = useState<{ caixa: Caixa; zoom: number } | null>(null);

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

  const centro =
    cemiterioAtivo?.lat != null && cemiterioAtivo?.lng != null
      ? { lat: cemiterioAtivo.lat, lng: cemiterioAtivo.lng }
      : (parques.dados ?? []).find((p) =>
          cemiterioAtivoId ? p.id === cemiterioAtivoId && p.lat !== null : p.lat !== null
        );
  const inicial: [number, number] = centro ? [centro.lat as number, centro.lng as number] : [-15.78, -47.93];

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
      <Card className="relative overflow-hidden p-0">
        {base.dados && (
          <MapContainer center={inicial} zoom={centro ? 17 : 5} maxZoom={base.dados.max_zoom} className="h-[70vh] w-full" aria-label="Mapa dos cemitérios">
            <TileLayer url={base.dados.url} attribution={base.dados.atribuicao} maxZoom={base.dados.max_zoom} />
            <Carregador onMover={carregar} />
            {CAMADAS.map(({ key }) => visiveis[key] && feicoes[key] && (
              <GeoJSON
                key={`${key}-${versao}`}
                data={feicoes[key] as unknown as ColecaoGeoJson}
                style={(f) => estiloFeicao(key, (f?.properties ?? {}) as Record<string, unknown>)}
                onEachFeature={(f, camada) => {
                  const p = f.properties as Record<string, unknown>;
                  camada.bindTooltip(String(p.codigo ?? p.nome ?? ''), { sticky: true });
                  if (key === 'jazigos') camada.on('click', () => setSelecionado(Number(p.id)));
                }}
              />
            ))}
            {edita && <Desenho onCriado={(g) => void salvarDesenho(g)} />}
            <Voar envelope={envelope} />
            {grade.capturando && <CapturaPontos onPonto={(p) => setGrade((g) => ({ capturando: g.pontos.length < 1, pontos: [...g.pontos, p] }))} />}
          </MapContainer>
        )}
        <Legenda />
      </Card>

      <div className="space-y-4">
        <Busca onEscolher={(r) => { if (r.envelope) setEnvelope(r.envelope); setSelecionado(r.jazigo_id); }} />

        <Card className="space-y-2 p-4">
          <h3 className="text-sm font-semibold">Camadas</h3>
          {CAMADAS.map(({ key, rotulo }) => (
            <div key={key} className="flex items-center justify-between text-sm">
              <span>{rotulo}{key === 'jazigos' && <span className="text-xs text-muted-foreground"> (zoom ≥ {ZOOM_MINIMO_JAZIGOS})</span>}</span>
              <Switch label={rotulo} checked={visiveis[key]} onCheckedChange={(v) => setVisiveis((s) => ({ ...s, [key]: v }))} />
            </div>
          ))}
        </Card>

        {edita && (
          <Card className="space-y-3 p-4">
            <h3 className="text-sm font-semibold">Desenhar / editar geometria</h3>
            <Select value={alvo.tipo} onChange={(v) => setAlvo((a) => ({ ...a, tipo: v as Camada }))}
              options={CAMADAS.map((c) => ({ value: c.key, label: c.rotulo }))} />
            <Input aria-label="ID do alvo" className="font-mono tabular-nums" placeholder="ID" value={alvo.id} onChange={(e) => setAlvo((a) => ({ ...a, id: e.target.value }))} />
            <p className="text-xs text-muted-foreground">Use a ferramenta de polígono do mapa; o desenho é validado (contenção, distanciamento e dimensões) ao salvar.</p>
            {can('cemiterios.inventario.manage') && (
              <Button variant="outline" onClick={() => setGrade({ capturando: true, pontos: [] })}>
                <Grid3x3 className="h-4 w-4" /> Gerar jazigos em grade
              </Button>
            )}
            {grade.capturando && <p className="text-xs font-semibold text-primary">Clique no mapa: {grade.pontos.length === 0 ? 'ponto de origem' : 'ponto que define a orientação'}.</p>}
          </Card>
        )}
        <ErroBox erro={erro ?? base.erro} />
      </div>

      <ModalDetalheJazigo jazigo={selecionado ? { id: selecionado } : null} onFechar={() => setSelecionado(null)} onAlterado={recarregar} />

      <FormModal
        aberto={!grade.capturando && grade.pontos.length === 2}
        titulo="Gerar jazigos em grade"
        onFechar={() => setGrade({ capturando: false, pontos: [] })}
        iniciais={{ linhas: '10', colunas: '20', comprimento_m: '2.50', largura_m: '1.20', espacamento_m: '0.60', padrao: 'Q{linha}-J{n}', tipo: 'jazigo', capacidade: '3' }}
        rotuloEnviar="Gerar"
        campos={[
          { nome: 'setor_id', rotulo: 'ID da quadra', tipo: 'number', obrigatorio: true },
          { nome: 'linhas', rotulo: 'Linhas', tipo: 'number', obrigatorio: true }, { nome: 'colunas', rotulo: 'Colunas', tipo: 'number', obrigatorio: true },
          { nome: 'comprimento_m', rotulo: 'Comprimento (m)', tipo: 'number', obrigatorio: true }, { nome: 'largura_m', rotulo: 'Largura (m)', tipo: 'number', obrigatorio: true },
          { nome: 'espacamento_m', rotulo: 'Espaçamento (m)', tipo: 'number', obrigatorio: true },
          { nome: 'padrao', rotulo: 'Padrão de código', obrigatorio: true, dica: 'Use {linha}, {coluna} e {n}.' },
          { nome: 'tipo', rotulo: 'Tipo', tipo: 'select', opcoes: [{ value: 'jazigo', label: 'Jazigo' }, { value: 'gaveta', label: 'Gaveta' }, { value: 'cova_publica', label: 'Cova pública' }] },
          { nome: 'capacidade', rotulo: 'Capacidade', tipo: 'number', obrigatorio: true },
        ]}
        onEnviar={async (v) => {
          const [origem, direcao] = grade.pontos;
          const { setor_id: setorId, ...resto } = v;
          const r = await cemiteriosApi.gerarGrade(Number(setorId), {
            ...resto, origem: [origem[1], origem[0]], direcao: [direcao[1], direcao[0]],
            linhas: Number(v.linhas), colunas: Number(v.colunas), capacidade: Number(v.capacidade),
          });
          setErro({ status: 200, codigo: 'Grade gerada', mensagem: `${r.criados} jazigo(s) criado(s); ${r.descartados.length} descartado(s) fora do setor; ${r.duplicados.length} código(s) já existente(s).` });
          recarregar();
        }}
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
    mapa.pm.addControls({ position: 'topleft', drawMarker: false, drawCircle: false, drawCircleMarker: false, drawPolyline: false, drawText: false, cutPolygon: false, rotateMode: false });
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

const CapturaPontos: React.FC<{ onPonto: (p: [number, number]) => void }> = ({ onPonto }) => {
  useMapEvents({ click: (e: LeafletMouseEvent) => onPonto([e.latlng.lat, e.latlng.lng]) });
  return null;
};

const Legenda: React.FC = () => (
  <div className="absolute bottom-3 left-3 z-[400] rounded-lg border border-border bg-card/95 p-3 text-xs shadow-sm" aria-label="Legenda">
    {Object.values(ESTADOS).map((e) => (
      <div key={e.rotulo} className="flex items-center gap-2">
        <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: e.cor }} />
        {e.rotulo}
      </div>
    ))}
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
        <Input aria-label="Busca" placeholder="Falecido, jazigo, concessão ou CPF" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button type="submit" aria-label="Buscar"><Search className="h-4 w-4" /></Button>
      </form>
      <ErroBox erro={erro} />
      <ul className="max-h-64 space-y-1 overflow-auto">
        {resultados.map((r, i) => (
          <li key={`${r.jazigo_id}-${i}`}>
            <Button variant="ghost" className="h-auto w-full justify-start py-1 text-left" onClick={() => onEscolher(r)}>
              <span className="block">
                <span className="block text-sm">{r.rotulo}</span>
                <span className="text-xs text-muted-foreground">{r.tipo} · jazigo <Mono>{r.jazigo_codigo}</Mono></span>
              </span>
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  );
};
