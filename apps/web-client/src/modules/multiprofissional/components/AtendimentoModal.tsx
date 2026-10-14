import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { Button, Checkbox, Input, Modal, Select, Textarea } from '@sysgov/ui';
import { multiApi, mensagemDeErro, type Atendimento, type Opcoes, type Ref } from '../api';
import { BuscaAluno, ListaEscolhidos, SelecaoMultipla } from './Selecao';

function agoraLocal(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function turnoDe(dataHora: string): string {
  const hora = Number(dataHora.slice(11, 13));
  return hora < 12 ? 'manha' : hora < 18 ? 'tarde' : 'noite';
}

/** Registro/edição de atendimento: estudantes, profissionais, tipos e relato (com opção de sigilo — D6). */
export const AtendimentoModal: React.FC<{
  opcoes: Opcoes;
  atendimento?: Atendimento | null;
  alunoInicial?: Ref | null;
  aoFechar: () => void;
  aoSalvar: () => void;
}> = ({ opcoes, atendimento, alunoInicial, aoFechar, aoSalvar }) => {
  const inicio = atendimento?.data_hora ?? agoraLocal();
  const [dados, setDados] = useState({
    data_hora: inicio,
    turno: atendimento?.turno ?? turnoDe(inicio),
    escola_id: atendimento ? String(atendimento.escola.id) : (opcoes.escolas.length === 1 ? String(opcoes.escolas[0].id) : ''),
    equipe_id: atendimento?.equipe ? String(atendimento.equipe.id) : '0',
    relato: atendimento?.relato ?? '',
    sigiloso: atendimento?.sigiloso ?? false,
  });
  const [alunos, setAlunos] = useState<Ref[]>(atendimento?.alunos ?? (alunoInicial ? [alunoInicial] : []));
  const [profissionais, setProfissionais] = useState<number[]>(
    atendimento?.profissionais.map((p) => p.id) ?? (opcoes.meu_profissional_id ? [opcoes.meu_profissional_id] : []),
  );
  const [tipos, setTipos] = useState<number[]>(atendimento?.tipos.map((t) => t.id) ?? []);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const relatoOculto = atendimento ? !atendimento.relato_visivel : false;

  const campo = (k: keyof typeof dados) => (v: string | boolean) => setDados((d) => ({ ...d, [k]: v }));

  const salvar = async () => {
    setErro(null);
    if (!dados.escola_id) return setErro('Escolha a escola do atendimento.');
    if (alunos.length === 0) return setErro('Inclua ao menos um estudante.');
    if (profissionais.length === 0) return setErro('Marque ao menos um profissional.');
    if (tipos.length === 0) return setErro('Marque ao menos um tipo de atendimento.');
    setSalvando(true);
    try {
      await multiApi.salvarAtendimento(atendimento?.id ?? null, {
        data_hora: dados.data_hora.replace('T', ' '),
        turno: dados.turno,
        escola_id: Number(dados.escola_id),
        equipe_id: Number(dados.equipe_id) || null,
        relato: dados.relato,
        sigiloso: dados.sigiloso,
        alunos: alunos.map((a) => a.id),
        profissionais,
        tipos,
      });
      aoSalvar();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal
      open
      onClose={aoFechar}
      title={atendimento ? 'Editar atendimento' : 'Registrar atendimento'}
      size="xl"
      footer={<><Button variant="outline" onClick={aoFechar}>Cancelar</Button><Button onClick={() => void salvar()} isLoading={salvando} disabled={relatoOculto}>Salvar</Button></>}
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Data e hora *" type="datetime-local" value={dados.data_hora} onChange={(e) => { campo('data_hora')(e.target.value); if (e.target.value) campo('turno')(turnoDe(e.target.value)); }} />
          <Select label="Turno *" value={dados.turno} onChange={campo('turno')} options={opcoes.turnos.map((t) => ({ value: t.valor, label: t.rotulo }))} />
          <Select label="Escola *" value={dados.escola_id} onChange={campo('escola_id')} placeholder="Selecione…" emptyText="Nenhuma escola cadastrada no módulo Escola."
            options={opcoes.escolas.map((e) => ({ value: e.id, label: e.nome }))} />
          <Select label="Equipe" value={dados.equipe_id} onChange={campo('equipe_id')} placeholder="Sem equipe"
            options={[{ value: 0, label: 'Sem equipe' }, ...opcoes.equipes.map((e) => ({ value: e.id, label: e.nome }))]} />
        </div>

        <div className="space-y-2">
          <BuscaAluno aoEscolher={(a) => setAlunos((l) => (l.some((x) => x.id === a.id) ? l : [...l, { id: a.id, nome: a.nome }]))} />
          <ListaEscolhidos itens={alunos} aoRemover={(id) => setAlunos((l) => l.filter((x) => x.id !== id))} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <SelecaoMultipla titulo="Profissionais *" itens={opcoes.profissionais} marcados={profissionais} aoMudar={setProfissionais} vazio="Cadastre os profissionais na aba Profissionais." />
          <SelecaoMultipla titulo="Tipos de atendimento *" itens={opcoes.tipos_atendimento} marcados={tipos} aoMudar={setTipos} vazio="Cadastre os tipos na aba Cadastros." />
        </div>

        {relatoOculto ? (
          <p className="rounded-md border p-3 text-sm text-muted-foreground"><Lock className="mr-1 inline h-4 w-4" />Registro sigiloso — você não tem acesso ao relato.</p>
        ) : (
          <div className="space-y-1">
            <label htmlFor="relato-atendimento" className="text-sm font-semibold">Relato do atendimento</label>
            <Textarea id="relato-atendimento" rows={6} value={dados.relato} maxLength={20000} onChange={(e) => campo('relato')(e.target.value)} />
          </div>
        )}

        <label className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:bg-amber-950/30">
          <Checkbox checked={dados.sigiloso} onCheckedChange={(v) => campo('sigiloso')(v === true)} />
          <span><span className="inline-flex items-center gap-1 font-semibold"><Lock className="h-3.5 w-3.5" />Registro sigiloso</span><br />
            O relato só aparece para você, para os profissionais do atendimento e para a coordenação.</span>
        </label>
        {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
      </div>
    </Modal>
  );
};
