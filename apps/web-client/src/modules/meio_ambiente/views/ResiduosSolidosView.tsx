import React, { useCallback, useEffect, useState } from 'react';
import { Button, Card, Dialog, Input, Select } from '@sysgov/ui';
import { Recycle, Plus, Truck } from 'lucide-react';
import { useCan } from '@/core/rbac/useCan';
import {
  meioAmbienteApi,
  erroApi,
  type CategoriaLogisticaReversa,
  type DestinacaoResiduo,
  type GeradorResiduo,
  type PontoLogisticaReversa,
  type TipoColeta,
  type TipoGeradorResiduo,
} from '../api';

const TIPOS_GERADOR: { value: TipoGeradorResiduo; label: string }[] = [
  { value: 'domiciliar', label: 'Domiciliar' },
  { value: 'comercial', label: 'Comercial' },
  { value: 'industrial', label: 'Industrial' },
];

const CATEGORIAS_LOGISTICA: { value: CategoriaLogisticaReversa; label: string }[] = [
  { value: 'eletronicos', label: 'Eletrônicos' },
  { value: 'pilhas_baterias', label: 'Pilhas e Baterias' },
];

export const ResiduosSolidosView: React.FC = () => {
  const { can } = useCan();
  const podeGerenciar = can('meio_ambiente.residuos.manage');

  const [aba, setAba] = useState<'geradores' | 'logistica-reversa'>('geradores');
  const [geradores, setGeradores] = useState<GeradorResiduo[]>([]);
  const [pontos, setPontos] = useState<PontoLogisticaReversa[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [modalNovoGerador, setModalNovoGerador] = useState(false);
  const [modalNovoPonto, setModalNovoPonto] = useState(false);
  const [geradorColeta, setGeradorColeta] = useState<GeradorResiduo | null>(null);
  const [pontoEntrega, setPontoEntrega] = useState<PontoLogisticaReversa | null>(null);

  const carregar = useCallback(async () => {
    setErro(null);
    try {
      setGeradores(await meioAmbienteApi.listarGeradoresResiduo());
      setPontos(await meioAmbienteApi.listarPontosLogisticaReversa());
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
        <div className="flex gap-2">
          <Button variant={aba === 'geradores' ? 'default' : 'ghost'} size="sm" onClick={() => setAba('geradores')}>
            <Recycle className="mr-1 h-4 w-4" /> Geradores e Coletas
          </Button>
          <Button variant={aba === 'logistica-reversa' ? 'default' : 'ghost'} size="sm" onClick={() => setAba('logistica-reversa')}>
            <Truck className="mr-1 h-4 w-4" /> Logística Reversa
          </Button>
        </div>
        {podeGerenciar && aba === 'geradores' && (
          <Button size="sm" onClick={() => setModalNovoGerador(true)}><Plus className="mr-1 h-4 w-4" /> Novo Gerador</Button>
        )}
        {podeGerenciar && aba === 'logistica-reversa' && (
          <Button size="sm" onClick={() => setModalNovoPonto(true)}><Plus className="mr-1 h-4 w-4" /> Novo Ponto</Button>
        )}
      </div>

      {erro && <div className="mb-4 rounded-md bg-rose-950/60 p-3 text-sm text-rose-400">{erro}</div>}

      {aba === 'geradores' ? (
        <div className="grid gap-3">
          {geradores.length === 0 && <Card className="p-6 text-center text-sm text-muted-foreground">Nenhum gerador cadastrado.</Card>}
          {geradores.map((g) => (
            <Card key={g.id} className="flex items-center justify-between p-4">
              <div>
                <div className="font-medium">{g.nome ?? `Gerador #${g.id}`}</div>
                <div className="text-xs text-muted-foreground">{TIPOS_GERADOR.find((t) => t.value === g.tipo)?.label} — {g.total_coletado_kg} kg coletados</div>
              </div>
              {podeGerenciar && <Button variant="ghost" size="sm" onClick={() => setGeradorColeta(g)}>Registrar coleta</Button>}
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-3">
          {pontos.length === 0 && <Card className="p-6 text-center text-sm text-muted-foreground">Nenhum ponto de logística reversa cadastrado.</Card>}
          {pontos.map((p) => (
            <Card key={p.id} className="flex items-center justify-between p-4">
              <div>
                <div className="font-medium">{p.nome}</div>
                <div className="text-xs text-muted-foreground">{CATEGORIAS_LOGISTICA.find((c) => c.value === p.categoria)?.label} — {p.total_acumulado_kg} kg acumulados</div>
              </div>
              {podeGerenciar && <Button variant="ghost" size="sm" onClick={() => setPontoEntrega(p)}>Registrar entrega</Button>}
            </Card>
          ))}
        </div>
      )}

      {modalNovoGerador && (
        <NovoGeradorModal onClose={() => setModalNovoGerador(false)} onCriado={() => { setModalNovoGerador(false); void carregar(); }} />
      )}
      {modalNovoPonto && (
        <NovoPontoModal onClose={() => setModalNovoPonto(false)} onCriado={() => { setModalNovoPonto(false); void carregar(); }} />
      )}
      {geradorColeta && (
        <ColetaModal gerador={geradorColeta} onClose={() => setGeradorColeta(null)} onRegistrada={() => { setGeradorColeta(null); void carregar(); }} />
      )}
      {pontoEntrega && (
        <EntregaModal ponto={pontoEntrega} onClose={() => setPontoEntrega(null)} onRegistrada={() => { setPontoEntrega(null); void carregar(); }} />
      )}
    </div>
  );
};

const NovoGeradorModal: React.FC<{ onClose: () => void; onCriado: () => void }> = ({ onClose, onCriado }) => {
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<TipoGeradorResiduo>('domiciliar');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const salvar = async () => {
    setSalvando(true);
    setErro(null);
    try {
      await meioAmbienteApi.cadastrarGeradorResiduo({ nome: nome || undefined, tipo });
      onCriado();
    } catch (e) {
      setErro(erroApi(e).mensagem);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open onClose={onClose} title="Novo Gerador de Resíduos" footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button onClick={salvar} disabled={salvando}>Salvar</Button></>}>
      <div className="space-y-4">
        {erro && <div className="rounded-md bg-rose-950/60 p-3 text-sm text-rose-400">{erro}</div>}
        <Input label="Nome (opcional)" value={nome} onChange={(e) => setNome(e.target.value)} />
        <Select label="Tipo" value={tipo} onChange={(v) => setTipo(v as TipoGeradorResiduo)} options={TIPOS_GERADOR} />
      </div>
    </Dialog>
  );
};

const NovoPontoModal: React.FC<{ onClose: () => void; onCriado: () => void }> = ({ onClose, onCriado }) => {
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState<CategoriaLogisticaReversa>('pilhas_baterias');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const salvar = async () => {
    setSalvando(true);
    setErro(null);
    try {
      await meioAmbienteApi.cadastrarPontoLogisticaReversa({ nome, categoria });
      onCriado();
    } catch (e) {
      setErro(erroApi(e).mensagem);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open onClose={onClose} title="Novo Ponto de Logística Reversa" footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button onClick={salvar} disabled={salvando || !nome}>Salvar</Button></>}>
      <div className="space-y-4">
        {erro && <div className="rounded-md bg-rose-950/60 p-3 text-sm text-rose-400">{erro}</div>}
        <Input label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
        <Select label="Categoria" value={categoria} onChange={(v) => setCategoria(v as CategoriaLogisticaReversa)} options={CATEGORIAS_LOGISTICA} />
      </div>
    </Dialog>
  );
};

const ColetaModal: React.FC<{ gerador: GeradorResiduo; onClose: () => void; onRegistrada: () => void }> = ({ gerador, onClose, onRegistrada }) => {
  const [tipoColeta, setTipoColeta] = useState<TipoColeta>('regular');
  const [rota, setRota] = useState('');
  const [volumeKg, setVolumeKg] = useState('');
  const [destinacao, setDestinacao] = useState<DestinacaoResiduo>('aterro');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const salvar = async () => {
    setSalvando(true);
    setErro(null);
    try {
      await meioAmbienteApi.registrarColetaResiduo(gerador.id, { tipo_coleta: tipoColeta, rota: rota || undefined, volume_kg: Number(volumeKg), destinacao });
      onRegistrada();
    } catch (e) {
      setErro(erroApi(e).mensagem);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open onClose={onClose} title={`Registrar Coleta — ${gerador.nome ?? `Gerador #${gerador.id}`}`} footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button onClick={salvar} disabled={salvando || !volumeKg}>Salvar</Button></>}>
      <div className="space-y-4">
        {erro && <div className="rounded-md bg-rose-950/60 p-3 text-sm text-rose-400">{erro}</div>}
        <Select label="Tipo de Coleta" value={tipoColeta} onChange={(v) => setTipoColeta(v as TipoColeta)} options={[{ value: 'regular', label: 'Regular' }, { value: 'seletiva', label: 'Seletiva' }]} />
        <Input label="Rota (opcional)" value={rota} onChange={(e) => setRota(e.target.value)} />
        <Input label="Volume (kg)" type="number" value={volumeKg} onChange={(e) => setVolumeKg(e.target.value)} />
        <Select label="Destinação" value={destinacao} onChange={(v) => setDestinacao(v as DestinacaoResiduo)} options={[{ value: 'aterro', label: 'Aterro' }, { value: 'reciclagem', label: 'Reciclagem' }]} />
      </div>
    </Dialog>
  );
};

const EntregaModal: React.FC<{ ponto: PontoLogisticaReversa; onClose: () => void; onRegistrada: () => void }> = ({ ponto, onClose, onRegistrada }) => {
  const [quantidadeKg, setQuantidadeKg] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const salvar = async () => {
    setSalvando(true);
    setErro(null);
    try {
      await meioAmbienteApi.registrarEntregaLogisticaReversa(ponto.id, Number(quantidadeKg));
      onRegistrada();
    } catch (e) {
      setErro(erroApi(e).mensagem);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open onClose={onClose} title={`Registrar Entrega — ${ponto.nome}`} footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button onClick={salvar} disabled={salvando || !quantidadeKg}>Salvar</Button></>}>
      <div className="space-y-4">
        {erro && <div className="rounded-md bg-rose-950/60 p-3 text-sm text-rose-400">{erro}</div>}
        <Input label="Quantidade (kg)" type="number" value={quantidadeKg} onChange={(e) => setQuantidadeKg(e.target.value)} />
      </div>
    </Dialog>
  );
};
