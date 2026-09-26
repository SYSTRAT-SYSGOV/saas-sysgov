import React, { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { Button, Input, Modal, Select, Switch } from '@sysgov/ui';
import { sysgovApi, type InstrutorResumo, type Modalidade, type Turma, type TurmaInput } from '@sysgov/sdk';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { paraInputDataHora } from '../utils/formatos';
import { ErroFormulario } from './ErroFormulario';
import { UsuarioPicker } from './UsuarioPicker';

interface Props {
  open: boolean;
  cursoId: number;
  turma?: Turma | null;
  onClose: () => void;
  onSalvo: (turma: Turma) => void;
}

interface Estado {
  nome: string;
  data_inicio: string;
  data_fim: string;
  inscricoes_inicio: string;
  inscricoes_fim: string;
  vagas: string;
  modalidade: Modalidade;
  local: string;
  link: string;
  aprovacao_manual: boolean;
}

const vazio: Estado = {
  nome: '', data_inicio: '', data_fim: '', inscricoes_inicio: '', inscricoes_fim: '',
  vagas: '30', modalidade: 'presencial', local: '', link: '', aprovacao_manual: false,
};

export const TurmaFormModal: React.FC<Props> = ({ open, cursoId, turma, onClose, onSalvo }) => {
  const [form, setForm] = useState<Estado>(vazio);
  const [instrutores, setInstrutores] = useState<InstrutorResumo[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setErro(null);
    setInstrutores(turma?.instrutores ?? []);
    setForm(
      turma
        ? {
            nome: turma.nome,
            data_inicio: turma.data_inicio.slice(0, 10),
            data_fim: turma.data_fim.slice(0, 10),
            inscricoes_inicio: paraInputDataHora(turma.inscricoes_inicio),
            inscricoes_fim: paraInputDataHora(turma.inscricoes_fim),
            vagas: String(turma.vagas),
            modalidade: turma.modalidade,
            local: turma.local ?? '',
            link: turma.link ?? '',
            aprovacao_manual: turma.aprovacao_manual,
          }
        : vazio,
    );
  }, [open, turma]);

  const set = <K extends keyof Estado>(campo: K) => (valor: Estado[K]) => setForm((f) => ({ ...f, [campo]: valor }));
  const exigeLocal = form.modalidade !== 'online';
  const exigeLink = form.modalidade !== 'presencial';

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (instrutores.length === 0) {
      setErro('Escolha ao menos um instrutor.');
      return;
    }
    setSalvando(true);
    setErro(null);
    const dados: TurmaInput = {
      nome: form.nome,
      data_inicio: form.data_inicio,
      data_fim: form.data_fim,
      inscricoes_inicio: form.inscricoes_inicio,
      inscricoes_fim: form.inscricoes_fim,
      vagas: Number(form.vagas),
      modalidade: form.modalidade,
      local: exigeLocal ? form.local : null,
      link: exigeLink ? form.link : null,
      aprovacao_manual: form.aprovacao_manual,
      instrutores: instrutores.map((i) => i.id),
    };
    try {
      onSalvo(turma ? await sysgovApi.cursos.atualizarTurma(turma.id, dados) : await sysgovApi.cursos.criarTurma(cursoId, dados));
    } catch (err) {
      setErro(getApiErrorMessage(err, 'Não foi possível salvar a turma.'));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={turma ? 'Editar turma' : 'Nova turma'} icon={<Users className="h-5 w-5" />} size="xl">
      <form onSubmit={salvar} className="space-y-4">
        <ErroFormulario mensagem={erro} />
        <Input label="Nome da turma" value={form.nome} onChange={(e) => set('nome')(e.target.value)} required maxLength={150} placeholder="Ex.: Turma 2026/1" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Início das aulas" type="date" value={form.data_inicio} onChange={(e) => set('data_inicio')(e.target.value)} required className="font-mono tabular-nums" />
          <Input label="Fim das aulas" type="date" value={form.data_fim} onChange={(e) => set('data_fim')(e.target.value)} required className="font-mono tabular-nums" />
          <Input label="Inscrições a partir de" type="datetime-local" value={form.inscricoes_inicio} onChange={(e) => set('inscricoes_inicio')(e.target.value)} required className="font-mono tabular-nums" />
          <Input label="Inscrições até" type="datetime-local" value={form.inscricoes_fim} onChange={(e) => set('inscricoes_fim')(e.target.value)} required className="font-mono tabular-nums" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Vagas" type="number" min={1} value={form.vagas} onChange={(e) => set('vagas')(e.target.value)} required className="font-mono tabular-nums" />
          <Select
            label="Modalidade"
            value={form.modalidade}
            onChange={(v) => set('modalidade')(v as Modalidade)}
            options={[
              { value: 'presencial', label: 'Presencial' },
              { value: 'online', label: 'Online' },
              { value: 'hibrido', label: 'Híbrido' },
            ]}
          />
        </div>
        {exigeLocal && <Input label="Local" value={form.local} onChange={(e) => set('local')(e.target.value)} required maxLength={255} />}
        {exigeLink && <Input label="Link da sala virtual" type="url" value={form.link} onChange={(e) => set('link')(e.target.value)} required maxLength={500} />}
        <div className="flex items-center gap-3">
          <Switch id="aprovacao-manual" checked={form.aprovacao_manual} onCheckedChange={(v) => set('aprovacao_manual')(v)} label="Exigir aprovação das inscrições" />
          <label htmlFor="aprovacao-manual" className="text-sm text-foreground">
            Exigir aprovação das inscrições pelo Administrador
          </label>
        </div>
        <UsuarioPicker label="Instrutores" selecionados={instrutores} onChange={setInstrutores} />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={salvando}>
            {turma ? 'Salvar' : 'Criar turma'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default TurmaFormModal;
