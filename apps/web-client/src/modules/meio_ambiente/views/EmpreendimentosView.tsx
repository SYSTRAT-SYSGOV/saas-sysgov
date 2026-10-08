import React, { useCallback, useEffect, useMemo, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import type { ColumnDef } from '@tanstack/react-table';
import { Button, Card, Input, Select, PessoaPicker, Switch } from '@sysgov/ui';
import { Building2, MapPin, Plus, UserCog } from 'lucide-react';
import { DataTable } from '@/components/ui/DataTable';
import { ScreenState } from '@/components/ui/ScreenState';
import { Dialog } from '@sysgov/ui';
import { useCan } from '@/core/rbac/useCan';
import { usePessoaPicker } from '@/modules/pessoas/hooks';
import {
  meioAmbienteApi,
  erroApi,
  type Empreendimento,
  type GeoJsonFeatureCollection,
  type NovoEmpreendimentoInput,
  type NovoResponsavelTecnicoInput,
  type Porte,
  type TipoRegistroProfissional,
} from '../api';

const PORTES: { value: Porte; label: string }[] = [
  { value: 'pequeno', label: 'Pequeno' },
  { value: 'medio', label: 'Médio' },
  { value: 'grande', label: 'Grande' },
];

const TIPOS_REGISTRO: { value: TipoRegistroProfissional; label: string }[] = [
  { value: 'CREA', label: 'CREA' },
  { value: 'CRBio', label: 'CRBio' },
];

const TIPO_TITULAR_PF = 'pf';
const TIPO_TITULAR_PJ = 'pj';

export const EmpreendimentosView: React.FC = () => {
  const { can } = useCan();
  const podeGerenciar = can('meio_ambiente.empreendimentos.manage');

  const [aba, setAba] = useState<'lista' | 'mapa'>('lista');
  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([]);
  const [geoJson, setGeoJson] = useState<GeoJsonFeatureCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [modalNovo, setModalNovo] = useState(false);
  const [modalResponsavel, setModalResponsavel] = useState<Empreendimento | null>(null);

  const carregarLista = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const resposta = await meioAmbienteApi.listarEmpreendimentos({ per_page: 50 });
      setEmpreendimentos(resposta.data);
    } catch (e) {
      setErro(erroApi(e).mensagem);
    } finally {
      setLoading(false);
    }
  }, []);

  const carregarMapa = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const resposta = await meioAmbienteApi.mapaEmpreendimentos();
      setGeoJson(resposta);
    } catch (e) {
      setErro(erroApi(e).mensagem);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (aba === 'lista') void carregarLista();
    else void carregarMapa();
  }, [aba, carregarLista, carregarMapa]);

  const colunas = useMemo<ColumnDef<Empreendimento, unknown>[]>(
    () => [
      {
        id: 'identificacao',
        header: 'Empreendimento',
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.razao_social ?? row.original.titular_nome ?? '—'}</div>
            <div className="font-mono text-xs text-muted-foreground">{row.original.cnpj ?? 'Pessoa física'}</div>
          </div>
        ),
      },
      { id: 'atividade', header: 'Atividade', accessorKey: 'atividade' },
      {
        id: 'porte',
        header: 'Porte',
        cell: ({ row }) => PORTES.find((p) => p.value === row.original.porte)?.label ?? row.original.porte,
      },
      {
        id: 'responsavel',
        header: 'Responsável Técnico',
        cell: ({ row }) =>
          row.original.responsavel_tecnico ? (
            <span className="text-sm">{row.original.responsavel_tecnico.nome} ({row.original.responsavel_tecnico.tipo_registro})</span>
          ) : (
            <span className="text-sm text-amber-600">Pendente</span>
          ),
      },
      {
        id: 'acoes',
        header: '',
        cell: ({ row }) =>
          podeGerenciar && (
            <Button variant="ghost" size="sm" onClick={() => setModalResponsavel(row.original)}>
              <UserCog className="mr-1 h-4 w-4" /> Responsável técnico
            </Button>
          ),
      },
    ],
    [podeGerenciar],
  );

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-2">
          <Button variant={aba === 'lista' ? 'default' : 'ghost'} size="sm" onClick={() => setAba('lista')}>
            <Building2 className="mr-1 h-4 w-4" /> Lista
          </Button>
          <Button variant={aba === 'mapa' ? 'default' : 'ghost'} size="sm" onClick={() => setAba('mapa')}>
            <MapPin className="mr-1 h-4 w-4" /> Mapa
          </Button>
        </div>
        {podeGerenciar && (
          <Button size="sm" onClick={() => setModalNovo(true)}>
            <Plus className="mr-1 h-4 w-4" /> Novo Empreendimento
          </Button>
        )}
      </div>

      {erro && <div className="mb-4 rounded-md bg-rose-950/60 p-3 text-sm text-rose-400">{erro}</div>}

      {aba === 'lista' ? (
        <DataTable columns={colunas} data={empreendimentos} loading={loading} emptyText="Nenhum empreendimento cadastrado." />
      ) : (
        <Card className="overflow-hidden p-0">
          <ScreenState type={loading ? 'loading' : 'ready'}>
            <div style={{ height: 480 }}>
              <MapContainer center={[-25.43, -49.27]} zoom={11} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
                {geoJson?.features.map((f) => (
                  <CircleMarker
                    key={f.properties.id}
                    center={[f.geometry.coordinates[1], f.geometry.coordinates[0]]}
                    radius={8}
                    pathOptions={{ color: '#10b981', fillOpacity: 0.7 }}
                  >
                    <Popup>
                      <strong>{f.properties.razao_social ?? 'Empreendimento'}</strong>
                      <br />
                      {f.properties.atividade} · {f.properties.porte}
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
            </div>
          </ScreenState>
        </Card>
      )}

      {modalNovo && (
        <NovoEmpreendimentoModal
          onClose={() => setModalNovo(false)}
          onCriado={() => {
            setModalNovo(false);
            void carregarLista();
          }}
        />
      )}

      {modalResponsavel && (
        <ResponsavelTecnicoModal
          empreendimento={modalResponsavel}
          onClose={() => setModalResponsavel(null)}
          onVinculado={() => {
            setModalResponsavel(null);
            void carregarLista();
          }}
        />
      )}
    </div>
  );
};

const NovoEmpreendimentoModal: React.FC<{ onClose: () => void; onCriado: () => void }> = ({ onClose, onCriado }) => {
  const { buscarPessoas, selectedPessoa, setSelectedPessoa } = usePessoaPicker();
  const [tipoTitular, setTipoTitular] = useState<typeof TIPO_TITULAR_PF | typeof TIPO_TITULAR_PJ>(TIPO_TITULAR_PJ);
  const [dados, setDados] = useState<Partial<NovoEmpreendimentoInput>>({ porte: 'medio' });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const salvar = async () => {
    setSalvando(true);
    setErro(null);
    try {
      await meioAmbienteApi.criarEmpreendimento({
        titular_pessoa_id: tipoTitular === TIPO_TITULAR_PF ? (selectedPessoa?.id ?? null) : null,
        cnpj: tipoTitular === TIPO_TITULAR_PJ ? dados.cnpj ?? null : null,
        razao_social: tipoTitular === TIPO_TITULAR_PJ ? dados.razao_social ?? null : null,
        atividade: dados.atividade ?? '',
        porte: dados.porte ?? 'medio',
        impacto_significativo: dados.impacto_significativo ?? false,
        valor_empreendimento_centavos: dados.valor_empreendimento_centavos ?? null,
        latitude: Number(dados.latitude ?? 0),
        longitude: Number(dados.longitude ?? 0),
      });
      onCriado();
    } catch (e) {
      setErro(erroApi(e).mensagem);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open onClose={onClose} title="Novo Empreendimento" size="lg" footer={
      <>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={salvar} disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</Button>
      </>
    }>
      <div className="space-y-4">
        {erro && <div className="rounded-md bg-rose-950/60 p-3 text-sm text-rose-400">{erro}</div>}

        <div className="flex gap-2">
          <Button variant={tipoTitular === TIPO_TITULAR_PJ ? 'default' : 'ghost'} size="sm" onClick={() => setTipoTitular(TIPO_TITULAR_PJ)}>Pessoa Jurídica</Button>
          <Button variant={tipoTitular === TIPO_TITULAR_PF ? 'default' : 'ghost'} size="sm" onClick={() => setTipoTitular(TIPO_TITULAR_PF)}>Pessoa Física (Cadastro Único)</Button>
        </div>

        {tipoTitular === TIPO_TITULAR_PJ ? (
          <>
            <Input label="CNPJ" value={dados.cnpj ?? ''} onChange={(e) => setDados((d) => ({ ...d, cnpj: e.target.value }))} placeholder="Somente números" maxLength={14} />
            <Input label="Razão Social" value={dados.razao_social ?? ''} onChange={(e) => setDados((d) => ({ ...d, razao_social: e.target.value }))} />
          </>
        ) : (
          <PessoaPicker value={selectedPessoa?.id ?? null} onChange={(_, pessoa) => setSelectedPessoa(pessoa ?? null)} onSearch={buscarPessoas} canCreate={false} />
        )}

        <Input label="Atividade" value={dados.atividade ?? ''} onChange={(e) => setDados((d) => ({ ...d, atividade: e.target.value }))} placeholder="Ex.: agroindústria, indústria química..." />
        <Select label="Porte" value={dados.porte ?? 'medio'} onChange={(v) => setDados((d) => ({ ...d, porte: v as Porte }))} options={PORTES} />

        <div className="flex items-center gap-2">
          <Switch checked={dados.impacto_significativo ?? false} onCheckedChange={(checked) => setDados((d) => ({ ...d, impacto_significativo: checked }))} />
          <span className="text-sm">Empreendimento de impacto ambiental significativo (sujeito a compensação ambiental)</span>
        </div>
        {dados.impacto_significativo && (
          <Input
            label="Valor do Empreendimento (R$)"
            type="number"
            value={dados.valor_empreendimento_centavos ? dados.valor_empreendimento_centavos / 100 : ''}
            onChange={(e) => setDados((d) => ({ ...d, valor_empreendimento_centavos: Math.round(Number(e.target.value) * 100) }))}
          />
        )}

        <div className="grid grid-cols-2 gap-4">
          <Input label="Latitude" type="number" value={dados.latitude ?? ''} onChange={(e) => setDados((d) => ({ ...d, latitude: Number(e.target.value) }))} />
          <Input label="Longitude" type="number" value={dados.longitude ?? ''} onChange={(e) => setDados((d) => ({ ...d, longitude: Number(e.target.value) }))} />
        </div>
      </div>
    </Dialog>
  );
};

const ResponsavelTecnicoModal: React.FC<{ empreendimento: Empreendimento; onClose: () => void; onVinculado: () => void }> = ({ empreendimento, onClose, onVinculado }) => {
  const [dados, setDados] = useState<NovoResponsavelTecnicoInput>({
    nome: empreendimento.responsavel_tecnico?.nome ?? '',
    registro_profissional: empreendimento.responsavel_tecnico?.registro_profissional ?? '',
    tipo_registro: empreendimento.responsavel_tecnico?.tipo_registro ?? 'CREA',
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const salvar = async () => {
    setSalvando(true);
    setErro(null);
    try {
      await meioAmbienteApi.vincularResponsavelTecnico(empreendimento.id, dados);
      onVinculado();
    } catch (e) {
      setErro(erroApi(e).mensagem);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open onClose={onClose} title={`Responsável Técnico — ${empreendimento.razao_social ?? empreendimento.titular_nome ?? ''}`} footer={
      <>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={salvar} disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</Button>
      </>
    }>
      <div className="space-y-4">
        {erro && <div className="rounded-md bg-rose-950/60 p-3 text-sm text-rose-400">{erro}</div>}
        <Input label="Nome" value={dados.nome} onChange={(e) => setDados((d) => ({ ...d, nome: e.target.value }))} />
        <Select label="Tipo de Registro" value={dados.tipo_registro} onChange={(v) => setDados((d) => ({ ...d, tipo_registro: v as TipoRegistroProfissional }))} options={TIPOS_REGISTRO} />
        <Input label="Número do Registro" value={dados.registro_profissional} onChange={(e) => setDados((d) => ({ ...d, registro_profissional: e.target.value }))} placeholder="Ex.: CREA-PR 123456" />
      </div>
    </Dialog>
  );
};
