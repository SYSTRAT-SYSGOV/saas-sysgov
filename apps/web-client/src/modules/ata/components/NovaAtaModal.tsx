import React, { useState } from 'react';
import { Lock, Trash2, UserPlus } from 'lucide-react';
import { Button, Checkbox, Input, Modal, Select } from '@sysgov/ui';
import { ataApi, mensagemDeErro, type Opcoes, type ParticipanteEntrada, type Ref } from '../api';
import { useFormValidationModal } from '@/lib/useFormValidationModal';

interface Linha extends ParticipanteEntrada { chave: string }

function agoraLocal(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

/** Nova ata: dados da reunião e participantes (Cadastro de Pessoas ou nome avulso — D2). */
export const NovaAtaModal: React.FC<{ opcoes: Opcoes; aoFechar: () => void; aoCriar: (id: number) => void }> = ({ opcoes, aoFechar, aoCriar }) => {
  const [dados, setDados] = useState({
    titulo: '', tipo_id: '', org_unit_id: opcoes.secretarias.length === 1 ? String(opcoes.secretarias[0].id) : '',
    data_reuniao: agoraLocal(), local: '', cidade: '', redator: opcoes.redator_sugerido, sigilosa: false,
  });
  const [participantes, setParticipantes] = useState<Linha[]>([]);
  const [avulso, setAvulso] = useState('');
  const [busca, setBusca] = useState('');
  const [achadas, setAchadas] = useState<Ref[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const { modal: modalValidacao, validar, tratarErro } = useFormValidationModal();

  const campo = (k: keyof typeof dados) => (v: string | boolean) => setDados((d) => ({ ...d, [k]: v }));
  const adicionar = (p: ParticipanteEntrada) => setParticipantes((l) => [...l, { ...p, chave: Math.random().toString(36).slice(2) }]);

  const buscar = async (q: string) => {
    setBusca(q);
    if (q.trim().length < 3) return setAchadas([]);
    try {
      setAchadas(await ataApi.pessoas(q.trim()));
    } catch {
      setAchadas([]);
    }
  };

  const salvar = async () => {
    setErro(null);
    if (!validar([['Título', dados.titulo], ['Secretaria', dados.org_unit_id], ['Redator', dados.redator], ['Participantes', participantes]])) return;
    setSalvando(true);
    try {
      const ata = await ataApi.criar({
        ...dados,
        org_unit_id: Number(dados.org_unit_id),
        tipo_id: dados.tipo_id ? Number(dados.tipo_id) : null,
        participantes: participantes.map(({ pessoa_id, nome, cargo }) => ({ pessoa_id: pessoa_id ?? null, nome, cargo: cargo || null })),
      });
      aoCriar(ata.id);
    } catch (e) {
      if (!tratarErro(e)) setErro(mensagemDeErro(e));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal
      open
      onClose={aoFechar}
      title="Nova ata"
      size="xl"
      footer={<><Button variant="outline" onClick={aoFechar}>Cancelar</Button><Button onClick={() => void salvar()} isLoading={salvando}>Criar e redigir</Button></>}
    >
      {modalValidacao}
      <div className="space-y-4">
        <Input label="Título da ata *" value={dados.titulo} onChange={(e) => campo('titulo')(e.target.value)} maxLength={255} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label="Secretaria *" value={dados.org_unit_id} onChange={campo('org_unit_id')} placeholder="Selecione…" emptyText="Você não está lotado em nenhuma secretaria."
            options={opcoes.secretarias.map((s) => ({ value: s.id, label: s.sigla ? `${s.sigla} — ${s.nome}` : s.nome }))} />
          <Select label="Tipo de ata" value={dados.tipo_id} onChange={campo('tipo_id')} placeholder="Selecione…" options={opcoes.tipos.map((t) => ({ value: t.id, label: t.nome }))} />
          <Input label="Data e hora da reunião *" type="datetime-local" value={dados.data_reuniao} onChange={(e) => campo('data_reuniao')(e.target.value)} />
          <Input label="Redator *" value={dados.redator} onChange={(e) => campo('redator')(e.target.value)} />
          <Input label="Local da reunião" value={dados.local} onChange={(e) => campo('local')(e.target.value)} />
          <Input label="Cidade" value={dados.cidade} onChange={(e) => campo('cidade')(e.target.value)} />
        </div>

        <label className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:bg-amber-950/30">
          <Checkbox checked={dados.sigilosa} onCheckedChange={(v) => campo('sigilosa')(v === true)} />
          <span><span className="inline-flex items-center gap-1 font-semibold"><Lock className="h-3.5 w-3.5" />Ata sigilosa</span><br />
            Só você e os gestores de atas poderão abrir o conteúdo e o PDF. Os demais veem apenas “Ata sigilosa” na lista.</span>
        </label>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Participantes que assinam *</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="relative">
              <Input label="Buscar no Cadastro de Pessoas" value={busca} onChange={(e) => void buscar(e.target.value)} placeholder="Digite ao menos 3 letras" />
              {achadas.length > 0 && (
                <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-background shadow">
                  {achadas.map((p) => (
                    <li key={p.id}>
                      <button type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-accent" onClick={() => { adicionar({ pessoa_id: p.id, nome: p.nome }); setBusca(''); setAchadas([]); }}>{p.nome}</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1"><Input label="Ou nome avulso" value={avulso} onChange={(e) => setAvulso(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && avulso.trim()) { adicionar({ nome: avulso.trim() }); setAvulso(''); } }} /></div>
              <Button variant="outline" disabled={!avulso.trim()} onClick={() => { adicionar({ nome: avulso.trim() }); setAvulso(''); }}><UserPlus className="h-4 w-4" /></Button>
            </div>
          </div>
          {participantes.length > 0 && (
            <ul className="divide-y rounded-md border">
              {participantes.map((p, i) => (
                <li key={p.chave} className="flex items-center gap-2 px-3 py-2 text-sm">
                  <span className="w-6 font-mono text-xs text-muted-foreground">{i + 1}.</span>
                  <span className="flex-1">{p.nome}{p.pessoa_id ? <span className="ml-2 text-xs text-muted-foreground">(Cadastro de Pessoas)</span> : null}</span>
                  <div className="w-48"><Input value={p.cargo ?? ''} placeholder="Cargo (opcional)" aria-label={`Cargo de ${p.nome}`} onChange={(e) => setParticipantes((l) => l.map((x) => (x.chave === p.chave ? { ...x, cargo: e.target.value } : x)))} /></div>
                  <Button variant="ghost" size="sm" aria-label={`Remover ${p.nome}`} onClick={() => setParticipantes((l) => l.filter((x) => x.chave !== p.chave))}><Trash2 className="h-4 w-4" /></Button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
      </div>
    </Modal>
  );
};
