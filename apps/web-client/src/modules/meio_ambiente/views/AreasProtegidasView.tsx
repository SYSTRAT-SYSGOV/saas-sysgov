import React, { useCallback, useEffect, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { CircleMarker, GeoJSON, MapContainer, Popup, TileLayer } from 'react-leaflet';
import { Button, Card, Dialog, Input, Select, Textarea } from '@sysgov/ui';
import { Plus } from 'lucide-react';
import { useCan } from '@/core/rbac/useCan';
import {
  meioAmbienteApi,
  erroApi,
  type AreaProtegidaFeatureCollection,
  type GeoJsonFeatureCollection,
  type TipoAreaProtegida,
} from '../api';

const TIPOS: { value: TipoAreaProtegida; label: string }[] = [
  { value: 'app', label: 'Área de Preservação Permanente (APP)' },
  { value: 'reserva_legal', label: 'Reserva Legal' },
  { value: 'unidade_conservacao', label: 'Unidade de Conservação' },
];

const COR_POR_TIPO: Record<TipoAreaProtegida, string> = {
  app: '#10b981',
  reserva_legal: '#6366f1',
  unidade_conservacao: '#f59e0b',
};

/**
 * Desenho interativo de polígono ainda não implementado nesta tela — o cadastro
 * recebe as coordenadas do anel externo coladas como JSON `[[lng,lat], ...]`. Ver
 * openspec/changes/criar-modulo-meio-ambiente/tasks.md (Fase 7, nota de implementação).
 */
export const AreasProtegidasView: React.FC = () => {
  const { can } = useCan();
  const podeGerenciar = can('meio_ambiente.areas_protegidas.manage');

  const [filtroTipo, setFiltroTipo] = useState<TipoAreaProtegida | ''>('');
  const [areas, setAreas] = useState<AreaProtegidaFeatureCollection | null>(null);
  const [empreendimentos, setEmpreendimentos] = useState<GeoJsonFeatureCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modalNovo, setModalNovo] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const [a, e] = await Promise.all([
        meioAmbienteApi.mapaAreasProtegidas(filtroTipo ? { tipo: filtroTipo } : undefined),
        meioAmbienteApi.mapaEmpreendimentos(),
      ]);
      setAreas(a);
      setEmpreendimentos(e);
    } catch (err) {
      setErro(erroApi(err).mensagem);
    } finally {
      setLoading(false);
    }
  }, [filtroTipo]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="w-72">
          <Select
            label="Filtrar por tipo"
            value={filtroTipo}
            onChange={(v) => setFiltroTipo(v as TipoAreaProtegida)}
            options={[{ value: '', label: 'Todos os tipos' }, ...TIPOS]}
          />
        </div>
        {podeGerenciar && (
          <Button size="sm" onClick={() => setModalNovo(true)}><Plus className="mr-1 h-4 w-4" /> Nova Área Protegida</Button>
        )}
      </div>

      {erro && <div className="mb-4 rounded-md bg-rose-950/60 p-3 text-sm text-rose-400">{erro}</div>}

      <Card className="overflow-hidden p-0">
        <div style={{ height: 520 }}>
          {!loading && (
            <MapContainer center={[-25.43, -49.27]} zoom={11} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
              {areas?.features.map((f) => (
                <GeoJSON
                  key={f.properties.id}
                  data={f as never}
                  style={{ color: COR_POR_TIPO[f.properties.tipo], weight: 2, fillOpacity: 0.25 }}
                >
                </GeoJSON>
              ))}
              {empreendimentos?.features.map((f) => (
                <CircleMarker
                  key={f.properties.id}
                  center={[f.geometry.coordinates[1], f.geometry.coordinates[0]]}
                  radius={6}
                  pathOptions={{ color: '#ef4444', fillOpacity: 0.8 }}
                >
                  <Popup>{f.properties.razao_social ?? 'Empreendimento'}</Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          )}
        </div>
      </Card>

      {modalNovo && (
        <NovaAreaProtegidaModal onClose={() => setModalNovo(false)} onCriada={() => { setModalNovo(false); void carregar(); }} />
      )}
    </div>
  );
};

const NovaAreaProtegidaModal: React.FC<{ onClose: () => void; onCriada: () => void }> = ({ onClose, onCriada }) => {
  const [tipo, setTipo] = useState<TipoAreaProtegida>('app');
  const [subtipo, setSubtipo] = useState('');
  const [atoLegal, setAtoLegal] = useState('');
  const [coordenadas, setCoordenadas] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const salvar = async () => {
    setSalvando(true);
    setErro(null);
    try {
      const anel = JSON.parse(coordenadas) as [number, number][];
      await meioAmbienteApi.cadastrarAreaProtegida({
        tipo,
        subtipo: subtipo || undefined,
        ato_legal: atoLegal || undefined,
        geometria: { type: 'Polygon', coordinates: [anel] },
      });
      onCriada();
    } catch (e) {
      setErro(e instanceof SyntaxError ? 'Coordenadas inválidas — informe um JSON de pares [longitude, latitude].' : erroApi(e).mensagem);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open onClose={onClose} title="Nova Área Protegida" size="lg" footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button onClick={salvar} disabled={salvando || !coordenadas}>Salvar</Button></>}>
      <div className="space-y-4">
        {erro && <div className="rounded-md bg-rose-950/60 p-3 text-sm text-rose-400">{erro}</div>}
        <Select label="Tipo" value={tipo} onChange={(v) => setTipo(v as TipoAreaProtegida)} options={TIPOS} />
        <Input label="Subtipo (opcional)" value={subtipo} onChange={(e) => setSubtipo(e.target.value)} placeholder="Ex.: parque_municipal" />
        <Input label="Ato Legal (opcional)" value={atoLegal} onChange={(e) => setAtoLegal(e.target.value)} placeholder="Ex.: Lei Municipal 1234/2020" />
        <div>
          <label className="mb-1 block text-sm font-medium">Coordenadas do anel externo (JSON)</label>
          <Textarea
            placeholder="[[-49.27,-25.43],[-49.26,-25.43],[-49.26,-25.42],[-49.27,-25.42],[-49.27,-25.43]]"
            value={coordenadas}
            onChange={(e) => setCoordenadas(e.target.value)}
          />
        </div>
        <p className="text-xs text-muted-foreground">Desenho interativo do polígono ainda não disponível — cole os pares [longitude, latitude] do anel externo, com o primeiro e o último ponto iguais.</p>
      </div>
    </Dialog>
  );
};
