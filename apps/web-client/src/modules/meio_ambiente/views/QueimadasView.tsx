import React, { useCallback, useEffect, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import { Badge, Button, Card, Dialog, Input } from '@sysgov/ui';
import { Flame, Plus, UserCheck } from 'lucide-react';
import { useCan } from '@/core/rbac/useCan';
import {
  meioAmbienteApi,
  erroApi,
  type OcorrenciaQueimada,
  type QueimadaFeatureCollection,
} from '../api';

export const QueimadasView: React.FC = () => {
  const { can } = useCan();
  const podeRegistrar = can('meio_ambiente.queimadas.registrar');

  const [ocorrencias, setOcorrencias] = useState<OcorrenciaQueimada[]>([]);
  const [mapa, setMapa] = useState<QueimadaFeatureCollection | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [modalNova, setModalNova] = useState(false);
  const [ocorrenciaResponsavel, setOcorrenciaResponsavel] = useState<OcorrenciaQueimada | null>(null);

  const carregar = useCallback(async () => {
    setErro(null);
    try {
      const [lista, feicoes] = await Promise.all([meioAmbienteApi.listarOcorrenciasQueimada(), meioAmbienteApi.mapaOcorrenciasQueimada()]);
      setOcorrencias(lista);
      setMapa(feicoes);
    } catch (e) {
      setErro(erroApi(e).mensagem);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold"><Flame className="h-4 w-4" /> Ocorrências de Queimada</h3>
        {podeRegistrar && <Button size="sm" onClick={() => setModalNova(true)}><Plus className="mr-1 h-4 w-4" /> Nova Ocorrência</Button>}
      </div>

      {erro && <div className="mb-4 rounded-md bg-rose-950/60 p-3 text-sm text-rose-400">{erro}</div>}

      <Card className="mb-4 overflow-hidden p-0">
        <div style={{ height: 400 }}>
          <MapContainer center={[-25.43, -49.27]} zoom={11} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
            {mapa?.features.map((f) => (
              <CircleMarker
                key={f.properties.id}
                center={[f.geometry.coordinates[1], f.geometry.coordinates[0]]}
                radius={8}
                pathOptions={{ color: f.properties.situacao === 'responsavel_identificado' ? '#10b981' : '#ef4444', fillOpacity: 0.7 }}
              >
                <Popup>
                  {f.properties.data_ocorrencia} — {f.properties.area_queimada_ha ?? '—'} ha<br />
                  {f.properties.situacao === 'responsavel_identificado' ? 'Responsável identificado' : 'Responsável não identificado'}
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      </Card>

      <div className="grid gap-3">
        {ocorrencias.map((o) => (
          <Card key={o.id} className="flex items-center justify-between p-4">
            <div>
              <div className="font-medium">{o.data_ocorrencia} — {o.area_queimada_ha ?? '—'} ha</div>
              <div className="text-xs text-muted-foreground">
                {o.auto_infracao_ambiental_id ? `Auto de infração #${o.auto_infracao_ambiental_id} aberto` : 'Sem auto de infração'}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={o.situacao === 'responsavel_identificado' ? 'success' : 'warning'}>
                {o.situacao === 'responsavel_identificado' ? 'Identificado' : 'Não identificado'}
              </Badge>
              {podeRegistrar && o.situacao === 'responsavel_nao_identificado' && (
                <Button variant="ghost" size="sm" onClick={() => setOcorrenciaResponsavel(o)}><UserCheck className="mr-1 h-4 w-4" /> Identificar responsável</Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {modalNova && (
        <NovaOcorrenciaModal onClose={() => setModalNova(false)} onCriada={() => { setModalNova(false); void carregar(); }} />
      )}
      {ocorrenciaResponsavel && (
        <ResponsavelModal ocorrencia={ocorrenciaResponsavel} onClose={() => setOcorrenciaResponsavel(null)} onVinculado={() => { setOcorrenciaResponsavel(null); void carregar(); }} />
      )}
    </div>
  );
};

const NovaOcorrenciaModal: React.FC<{ onClose: () => void; onCriada: () => void }> = ({ onClose, onCriada }) => {
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [areaQueimadaHa, setAreaQueimadaHa] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const salvar = async () => {
    setSalvando(true);
    setErro(null);
    try {
      await meioAmbienteApi.registrarOcorrenciaQueimada({
        data_ocorrencia: data,
        latitude: Number(latitude),
        longitude: Number(longitude),
        area_queimada_ha: areaQueimadaHa ? Number(areaQueimadaHa) : null,
      });
      onCriada();
    } catch (e) {
      setErro(erroApi(e).mensagem);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open onClose={onClose} title="Nova Ocorrência de Queimada" footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button onClick={salvar} disabled={salvando || !latitude || !longitude}>Salvar</Button></>}>
      <div className="space-y-4">
        {erro && <div className="rounded-md bg-rose-950/60 p-3 text-sm text-rose-400">{erro}</div>}
        <Input label="Data da Ocorrência" type="date" value={data} onChange={(e) => setData(e.target.value)} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Latitude" type="number" value={latitude} onChange={(e) => setLatitude(e.target.value)} />
          <Input label="Longitude" type="number" value={longitude} onChange={(e) => setLongitude(e.target.value)} />
        </div>
        <Input label="Área Queimada (ha)" type="number" value={areaQueimadaHa} onChange={(e) => setAreaQueimadaHa(e.target.value)} />
      </div>
    </Dialog>
  );
};

const ResponsavelModal: React.FC<{ ocorrencia: OcorrenciaQueimada; onClose: () => void; onVinculado: () => void }> = ({ ocorrencia, onClose, onVinculado }) => {
  const [empreendimentoId, setEmpreendimentoId] = useState('');
  const [execucaoVistoriaId, setExecucaoVistoriaId] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const salvar = async () => {
    setSalvando(true);
    setErro(null);
    try {
      await meioAmbienteApi.vincularResponsavelQueimada(ocorrencia.id, {
        responsavel_empreendimento_id: empreendimentoId ? Number(empreendimentoId) : undefined,
        execucao_vistoria_id: execucaoVistoriaId ? Number(execucaoVistoriaId) : undefined,
      });
      onVinculado();
    } catch (e) {
      setErro(erroApi(e).mensagem);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open onClose={onClose} title="Identificar Responsável" footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button onClick={salvar} disabled={salvando}>Salvar</Button></>}>
      <div className="space-y-4">
        {erro && <div className="rounded-md bg-rose-950/60 p-3 text-sm text-rose-400">{erro}</div>}
        <Input label="ID do Empreendimento Responsável" value={empreendimentoId} onChange={(e) => setEmpreendimentoId(e.target.value)} />
        <Input label="ID da Execução de Vistoria (opcional — abre auto de infração)" value={execucaoVistoriaId} onChange={(e) => setExecucaoVistoriaId(e.target.value)} />
        <p className="text-xs text-muted-foreground">
          Informar a execução de vistoria abre automaticamente o auto de infração ambiental vinculado a este empreendimento.
        </p>
      </div>
    </Dialog>
  );
};
