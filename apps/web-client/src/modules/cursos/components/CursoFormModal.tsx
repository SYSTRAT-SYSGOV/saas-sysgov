import React, { useEffect, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { Button, Input, Modal, Select } from '@sysgov/ui';
import { sysgovApi, type Curso, type CursoInput, type TipoCurso } from '@sysgov/sdk';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { validarNotaMinima, paraNumero } from '../utils/validacoes';
import { CampoTexto } from './CampoTexto';
import { ErroFormulario } from './ErroFormulario';

interface Props {
  open: boolean;
  curso?: Curso | null;
  onClose: () => void;
  onSalvo: (curso: Curso) => void;
}

const vazio = { tipo: 'curso' as TipoCurso, titulo: '', descricao: '', horas: '', minutos: '0', frequencia_minima: '75', nota_minima: '' };

/** Criação e edição de curso/evento. Carga horária digitada em horas e minutos, gravada em minutos. */
export const CursoFormModal: React.FC<Props> = ({ open, curso, onClose, onSalvo }) => {
  const [form, setForm] = useState(vazio);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setErro(null);
    setForm(
      curso
        ? {
            tipo: curso.tipo,
            titulo: curso.titulo,
            descricao: curso.descricao ?? '',
            horas: String(Math.floor(curso.carga_horaria_minutos / 60)),
            minutos: String(curso.carga_horaria_minutos % 60),
            frequencia_minima: String(curso.frequencia_minima),
            nota_minima: curso.nota_minima === null ? '' : String(Number(curso.nota_minima)),
          }
        : vazio,
    );
  }, [open, curso]);

  const cargaMinutos = (Number(form.horas) || 0) * 60 + (Number(form.minutos) || 0);

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cargaMinutos <= 0) {
      setErro('Informe a carga horária.');
      return;
    }
    // Evento não tem avaliação: não leva nota mínima (o servidor também recusa).
    const problemaNota = form.tipo === 'curso' ? validarNotaMinima(form.nota_minima) : null;
    if (problemaNota) {
      setErro(problemaNota);
      return;
    }
    setSalvando(true);
    setErro(null);
    const dados: CursoInput = {
      tipo: form.tipo,
      titulo: form.titulo,
      descricao: form.descricao || null,
      carga_horaria_minutos: cargaMinutos,
      frequencia_minima: Number(form.frequencia_minima),
      nota_minima: form.tipo === 'curso' ? paraNumero(form.nota_minima) : null,
    };
    try {
      onSalvo(curso ? await sysgovApi.cursos.atualizarCurso(curso.id, dados) : await sysgovApi.cursos.criarCurso(dados));
    } catch (err) {
      setErro(getApiErrorMessage(err, 'Não foi possível salvar o curso.'));
    } finally {
      setSalvando(false);
    }
  };

  const set = (campo: keyof typeof vazio) => (valor: string) => setForm((f) => ({ ...f, [campo]: valor }));

  return (
    <Modal open={open} onClose={onClose} title={curso ? 'Editar curso' : 'Novo curso ou evento'} icon={<BookOpen className="h-5 w-5" />} size="lg">
      <form onSubmit={salvar} className="space-y-4">
        <ErroFormulario mensagem={erro} />
        <Select
          label="Tipo"
          value={form.tipo}
          onChange={set('tipo')}
          options={[
            { value: 'curso', label: 'Curso', hint: 'Uma ou mais turmas, com aulas' },
            { value: 'evento', label: 'Evento', hint: 'Palestra ou workshop — turma única' },
          ]}
        />
        <Input label="Título" value={form.titulo} onChange={(e) => set('titulo')(e.target.value)} required maxLength={255} />
        <CampoTexto label="Descrição" value={form.descricao} onChange={(e) => set('descricao')(e.target.value)} rows={4} maxLength={10000} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Input label="Carga horária (horas)" type="number" min={0} value={form.horas} onChange={(e) => set('horas')(e.target.value)} className="font-mono tabular-nums" />
          <Input label="Minutos" type="number" min={0} max={59} value={form.minutos} onChange={(e) => set('minutos')(e.target.value)} className="font-mono tabular-nums" />
          <Input
            label="Frequência mínima (%)"
            type="number"
            min={0}
            max={100}
            value={form.frequencia_minima}
            onChange={(e) => set('frequencia_minima')(e.target.value)}
            className="font-mono tabular-nums"
          />
          <Input
            label="Nota mínima (0 a 10)"
            type="number"
            step="0.01"
            value={form.tipo === 'curso' ? form.nota_minima : ''}
            onChange={(e) => set('nota_minima')(e.target.value)}
            disabled={form.tipo === 'evento'}
            helperText={form.tipo === 'evento' ? 'Eventos não têm avaliação' : 'Vazio = só a frequência conta'}
            className="font-mono tabular-nums"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={salvando}>
            {curso ? 'Salvar' : 'Criar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CursoFormModal;
