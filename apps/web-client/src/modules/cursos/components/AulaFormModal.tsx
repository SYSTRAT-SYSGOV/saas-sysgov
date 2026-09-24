import React, { useEffect, useState } from 'react';
import { ListOrdered } from 'lucide-react';
import { Button, Input, Modal } from '@sysgov/ui';
import { sysgovApi, type Aula } from '@sysgov/sdk';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { CampoTexto } from './CampoTexto';
import { ErroFormulario } from './ErroFormulario';

interface Props {
  open: boolean;
  cursoId: number;
  aula?: Aula | null;
  onClose: () => void;
  onSalvo: () => void;
}

export const AulaFormModal: React.FC<Props> = ({ open, cursoId, aula, onClose, onSalvo }) => {
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [duracao, setDuracao] = useState('120');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setErro(null);
    setTitulo(aula?.titulo ?? '');
    setDescricao(aula?.descricao ?? '');
    setDuracao(String(aula?.duracao_minutos ?? 120));
  }, [open, aula]);

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    const dados = { titulo, descricao: descricao || null, duracao_minutos: Number(duracao) };
    try {
      if (aula) await sysgovApi.cursos.atualizarAula(aula.id, dados);
      else await sysgovApi.cursos.criarAula(cursoId, dados);
      onSalvo();
    } catch (err) {
      setErro(getApiErrorMessage(err, 'Não foi possível salvar a aula.'));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={aula ? 'Editar aula' : 'Nova aula'} icon={<ListOrdered className="h-5 w-5" />} size="md">
      <form onSubmit={salvar} className="space-y-4">
        <ErroFormulario mensagem={erro} />
        <Input label="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} required maxLength={255} />
        <CampoTexto label="Conteúdo" value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} />
        <Input label="Duração (minutos)" type="number" min={1} max={1440} value={duracao} onChange={(e) => setDuracao(e.target.value)} required className="font-mono tabular-nums" />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={salvando}>
            Salvar
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default AulaFormModal;
