import React, { useState } from 'react';
import { Vote } from 'lucide-react';
import { Button, Input, Modal, Select } from '@sysgov/ui';
import { erroApi } from '../../escola/api';
import { campanhaApi, type Campanha, type DadosCampanha } from '../api';

export const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
const CARGOS = ['Presidente', 'Governador', 'Senador', 'Deputado Federal', 'Deputado Estadual', 'Prefeito', 'Vereador'];

const VAZIO: DadosCampanha = { nome: '', ano: new Date().getFullYear(), cargo: 'Deputado Estadual', uf: 'PR', meta_votos_global: 0, status: 'ativa' };

/** Cadastro e edição dos dados da campanha (nome, eleição, cargo, UF de atuação, meta global, status). */
export const CampanhaFormModal: React.FC<{ campanha: Campanha | 'nova' | null; onFechar: () => void; onSalva: (c: Campanha, nova: boolean) => Promise<void> | void }> = ({ campanha, onFechar, onSalva }) => {
  const [form, setForm] = useState<DadosCampanha>(VAZIO);
  const [atual, setAtual] = useState<Campanha | 'nova' | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  if (campanha !== atual) {
    setAtual(campanha);
    setForm(campanha && campanha !== 'nova' ? { nome: campanha.nome, ano: campanha.ano, cargo: campanha.cargo, uf: campanha.uf, meta_votos_global: campanha.meta_votos_global, status: campanha.status } : VAZIO);
    setErro(null);
  }
  const nova = campanha === 'nova';

  const salvar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSalvando(true);
    setErro(null);
    try {
      const salva = nova ? await campanhaApi.criarCampanha(form) : await campanhaApi.atualizarCampanha((campanha as Campanha).id, form);
      await onSalva(salva, nova);
    } catch (e) {
      setErro(erroApi(e).mensagem);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal
      open={campanha !== null}
      onClose={onFechar}
      title={nova ? 'Nova campanha' : 'Dados da campanha'}
      icon={<Vote className="h-5 w-5" />}
      size="lg"
      footer={<><Button variant="outline" onClick={onFechar} disabled={salvando}>Cancelar</Button><Button type="submit" form="form-campanha" isLoading={salvando}>Salvar</Button></>}
    >
      <form id="form-campanha" onSubmit={salvar} className="space-y-3">
        <Input label="Nome da campanha *" placeholder="Ex.: Deputado Estadual 2026" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} required maxLength={200} />
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Ano da eleição *" type="number" min={2000} max={2100} value={form.ano} onChange={(e) => setForm((f) => ({ ...f, ano: Number(e.target.value) }))} required className="font-mono tabular-nums" />
          <Select label="Cargo" value={form.cargo} onChange={(v) => setForm((f) => ({ ...f, cargo: v }))} options={CARGOS.map((c) => ({ value: c, label: c }))} />
          <Select label="UF de atuação" value={form.uf} onChange={(v) => setForm((f) => ({ ...f, uf: v }))} options={UFS.map((u) => ({ value: u, label: u }))} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Meta global de votos" type="number" min={0} value={form.meta_votos_global ?? 0} onChange={(e) => setForm((f) => ({ ...f, meta_votos_global: Number(e.target.value) }))} className="font-mono tabular-nums" />
          {!nova && <Select label="Status" value={form.status ?? 'ativa'} onChange={(v) => setForm((f) => ({ ...f, status: v as DadosCampanha['status'] }))} options={[{ value: 'ativa', label: 'Ativa' }, { value: 'encerrada', label: 'Encerrada (só consulta)' }]} />}
        </div>
        {erro && <p className="text-sm font-medium text-destructive" role="alert">{erro}</p>}
      </form>
    </Modal>
  );
};
