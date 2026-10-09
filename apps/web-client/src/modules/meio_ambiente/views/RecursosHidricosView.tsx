import React, { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Card, Dialog, Input, Select } from '@sysgov/ui';
import { Droplets, Plus } from 'lucide-react';
import { useCan } from '@/core/rbac/useCan';
import {
  meioAmbienteApi,
  erroApi,
  type Empreendimento,
  type FinalidadeOutorga,
  type LicencaLancamentoEfluente,
  type OutorgaAgua,
  type TipoCaptacao,
} from '../api';

const TIPOS_CAPTACAO: { value: TipoCaptacao; label: string }[] = [
  { value: 'poco', label: 'Poço' },
  { value: 'captacao_superficial', label: 'Captação Superficial' },
];

const FINALIDADES: { value: FinalidadeOutorga; label: string }[] = [
  { value: 'abastecimento', label: 'Abastecimento' },
  { value: 'irrigacao', label: 'Irrigação' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'outra', label: 'Outra' },
];

export const RecursosHidricosView: React.FC = () => {
  const { can } = useCan();
  const podeGerenciar = can('meio_ambiente.recursos_hidricos.manage');

  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([]);
  const [empreendimentoId, setEmpreendimentoId] = useState<number | null>(null);
  const [outorgas, setOutorgas] = useState<OutorgaAgua[]>([]);
  const [licencas, setLicencas] = useState<LicencaLancamentoEfluente[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [modalOutorga, setModalOutorga] = useState(false);
  const [modalLicenca, setModalLicenca] = useState(false);
  const [medicaoParametroId, setMedicaoParametroId] = useState<number | null>(null);

  useEffect(() => {
    void meioAmbienteApi.listarEmpreendimentos({ per_page: 100 }).then((r) => {
      setEmpreendimentos(r.data);
      if (r.data.length > 0) setEmpreendimentoId(r.data[0].id);
    });
  }, []);

  const carregar = useCallback(async () => {
    if (empreendimentoId === null) return;
    setErro(null);
    try {
      setOutorgas(await meioAmbienteApi.listarOutorgasAgua(empreendimentoId));
      setLicencas(await meioAmbienteApi.listarLicencasEfluente(empreendimentoId));
    } catch (e) {
      setErro(erroApi(e).mensagem);
    }
  }, [empreendimentoId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="w-80">
          <Select
            label="Empreendimento"
            value={empreendimentoId}
            onChange={(v) => setEmpreendimentoId(Number(v))}
            options={empreendimentos.map((e) => ({ value: e.id, label: e.razao_social ?? e.titular_nome ?? `#${e.id}` }))}
          />
        </div>
        {podeGerenciar && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setModalOutorga(true)}><Plus className="mr-1 h-4 w-4" /> Outorga</Button>
            <Button size="sm" onClick={() => setModalLicenca(true)}><Plus className="mr-1 h-4 w-4" /> Licença de Efluente</Button>
          </div>
        )}
      </div>

      {erro && <div className="mb-4 rounded-md bg-rose-950/60 p-3 text-sm text-rose-400">{erro}</div>}

      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><Droplets className="h-4 w-4" /> Outorgas de Uso da Água</h3>
      <div className="mb-6 grid gap-3">
        {outorgas.length === 0 && <Card className="p-4 text-center text-sm text-muted-foreground">Nenhuma outorga cadastrada.</Card>}
        {outorgas.map((o) => (
          <Card key={o.id} className="flex items-center justify-between p-4">
            <div>
              <div className="font-medium">{TIPOS_CAPTACAO.find((t) => t.value === o.tipo_captacao)?.label} — {o.vazao_m3_hora} m³/h</div>
              <div className="text-xs text-muted-foreground">{FINALIDADES.find((f) => f.value === o.finalidade)?.label} · Válida até {o.validade_em}</div>
            </div>
          </Card>
        ))}
      </div>

      <h3 className="mb-2 text-sm font-semibold">Licenças de Lançamento de Efluentes</h3>
      <div className="grid gap-3">
        {licencas.length === 0 && <Card className="p-4 text-center text-sm text-muted-foreground">Nenhuma licença cadastrada.</Card>}
        {licencas.map((l) => (
          <Card key={l.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium">Licença #{l.id} — válida até {l.validade_em}</div>
              {l.tem_nao_conformidade && <Badge variant="danger">Não conformidade</Badge>}
            </div>
            <div className="mt-3 space-y-2">
              {l.parametros.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <span>{p.parametro} {p.limite_min !== null && p.limite_max !== null ? `(${p.limite_min} a ${p.limite_max}${p.unidade ? ` ${p.unidade}` : ''})` : ''}</span>
                  {podeGerenciar && <Button variant="ghost" size="sm" onClick={() => setMedicaoParametroId(p.id)}>Registrar medição</Button>}
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {modalOutorga && empreendimentoId !== null && (
        <NovaOutorgaModal empreendimentoId={empreendimentoId} onClose={() => setModalOutorga(false)} onCriada={() => { setModalOutorga(false); void carregar(); }} />
      )}
      {modalLicenca && empreendimentoId !== null && (
        <NovaLicencaModal empreendimentoId={empreendimentoId} onClose={() => setModalLicenca(false)} onCriada={() => { setModalLicenca(false); void carregar(); }} />
      )}
      {medicaoParametroId !== null && (
        <MedicaoModal parametroId={medicaoParametroId} onClose={() => setMedicaoParametroId(null)} onRegistrada={() => { setMedicaoParametroId(null); void carregar(); }} />
      )}
    </div>
  );
};

const NovaOutorgaModal: React.FC<{ empreendimentoId: number; onClose: () => void; onCriada: () => void }> = ({ empreendimentoId, onClose, onCriada }) => {
  const [tipoCaptacao, setTipoCaptacao] = useState<TipoCaptacao>('poco');
  const [vazao, setVazao] = useState('');
  const [finalidade, setFinalidade] = useState<FinalidadeOutorga>('industrial');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const salvar = async () => {
    setSalvando(true);
    setErro(null);
    try {
      await meioAmbienteApi.cadastrarOutorgaAgua(empreendimentoId, { tipo_captacao: tipoCaptacao, vazao_m3_hora: Number(vazao), finalidade });
      onCriada();
    } catch (e) {
      setErro(erroApi(e).mensagem);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open onClose={onClose} title="Nova Outorga de Água" footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button onClick={salvar} disabled={salvando || !vazao}>Salvar</Button></>}>
      <div className="space-y-4">
        {erro && <div className="rounded-md bg-rose-950/60 p-3 text-sm text-rose-400">{erro}</div>}
        <Select label="Tipo de Captação" value={tipoCaptacao} onChange={(v) => setTipoCaptacao(v as TipoCaptacao)} options={TIPOS_CAPTACAO} />
        <Input label="Vazão (m³/h)" type="number" value={vazao} onChange={(e) => setVazao(e.target.value)} />
        <Select label="Finalidade" value={finalidade} onChange={(v) => setFinalidade(v as FinalidadeOutorga)} options={FINALIDADES} />
      </div>
    </Dialog>
  );
};

interface ParametroForm { parametro: string; limite_min: string; limite_max: string; unidade: string }

const NovaLicencaModal: React.FC<{ empreendimentoId: number; onClose: () => void; onCriada: () => void }> = ({ empreendimentoId, onClose, onCriada }) => {
  const [parametros, setParametros] = useState<ParametroForm[]>([{ parametro: '', limite_min: '', limite_max: '', unidade: '' }]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const atualizarParametro = (i: number, campo: keyof ParametroForm, valor: string) => {
    setParametros((prev) => prev.map((p, idx) => (idx === i ? { ...p, [campo]: valor } : p)));
  };

  const salvar = async () => {
    setSalvando(true);
    setErro(null);
    try {
      await meioAmbienteApi.cadastrarLicencaEfluente(
        empreendimentoId,
        parametros
          .filter((p) => p.parametro)
          .map((p) => ({
            parametro: p.parametro,
            limite_min: p.limite_min ? Number(p.limite_min) : undefined,
            limite_max: p.limite_max ? Number(p.limite_max) : undefined,
            unidade: p.unidade || undefined,
          })),
      );
      onCriada();
    } catch (e) {
      setErro(erroApi(e).mensagem);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open onClose={onClose} title="Nova Licença de Lançamento de Efluentes" size="lg" footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button onClick={salvar} disabled={salvando}>Salvar</Button></>}>
      <div className="space-y-4">
        {erro && <div className="rounded-md bg-rose-950/60 p-3 text-sm text-rose-400">{erro}</div>}
        {parametros.map((p, i) => (
          <div key={i} className="grid grid-cols-4 gap-2">
            <Input label="Parâmetro" value={p.parametro} onChange={(e) => atualizarParametro(i, 'parametro', e.target.value)} placeholder="Ex.: pH" />
            <Input label="Limite Mín." type="number" value={p.limite_min} onChange={(e) => atualizarParametro(i, 'limite_min', e.target.value)} />
            <Input label="Limite Máx." type="number" value={p.limite_max} onChange={(e) => atualizarParametro(i, 'limite_max', e.target.value)} />
            <Input label="Unidade" value={p.unidade} onChange={(e) => atualizarParametro(i, 'unidade', e.target.value)} placeholder="mg/L" />
          </div>
        ))}
        <Button variant="ghost" size="sm" onClick={() => setParametros((prev) => [...prev, { parametro: '', limite_min: '', limite_max: '', unidade: '' }])}>
          + Adicionar parâmetro
        </Button>
      </div>
    </Dialog>
  );
};

const MedicaoModal: React.FC<{ parametroId: number; onClose: () => void; onRegistrada: () => void }> = ({ parametroId, onClose, onRegistrada }) => {
  const [valor, setValor] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const salvar = async () => {
    setSalvando(true);
    setErro(null);
    try {
      await meioAmbienteApi.registrarMedicaoEfluente(parametroId, Number(valor));
      onRegistrada();
    } catch (e) {
      setErro(erroApi(e).mensagem);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open onClose={onClose} title="Registrar Medição" footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button onClick={salvar} disabled={salvando || !valor}>Salvar</Button></>}>
      <div className="space-y-4">
        {erro && <div className="rounded-md bg-rose-950/60 p-3 text-sm text-rose-400">{erro}</div>}
        <Input label="Valor Medido" type="number" value={valor} onChange={(e) => setValor(e.target.value)} />
      </div>
    </Dialog>
  );
};
