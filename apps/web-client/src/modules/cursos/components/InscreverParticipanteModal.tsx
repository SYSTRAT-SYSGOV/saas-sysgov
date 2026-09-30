import React, { useEffect, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { Button, Modal } from '@sysgov/ui';
import { sysgovApi, type InstrutorResumo } from '@sysgov/sdk';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { STATUS_INSCRICAO } from '../utils/formatos';
import { useCamposInscricao } from '../utils/useCamposInscricao';
import { CamposInscricaoForm } from './CamposInscricaoForm';
import { ErroFormulario } from './ErroFormulario';
import { UsuarioPicker } from './UsuarioPicker';

interface Props {
  open: boolean;
  turmaId: number;
  cursoId: number;
  onClose: () => void;
  onSalvo: (mensagem: string) => void;
}

/** Inscrição direta pelo Administrador: dispensa período e aprovação, mas ainda pede os campos do formulário (D9). */
export const InscreverParticipanteModal: React.FC<Props> = ({ open, turmaId, cursoId, onClose, onSalvo }) => {
  const [usuario, setUsuario] = useState<InstrutorResumo[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const { campos, carregando: carregandoCampos, erroCarga, valores, setValor, validar, respostas } = useCamposInscricao(cursoId, open);

  useEffect(() => {
    if (open) {
      setUsuario([]);
      setErro(null);
    }
  }, [open]);

  const salvar = async () => {
    if (usuario.length === 0) return;
    const problema = validar();
    if (problema) {
      setErro(problema);
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      const inscricao = await sysgovApi.cursos.inscreverUsuario(turmaId, usuario[0].id, respostas());
      onSalvo(`${usuario[0].name} inscrito(a): ${STATUS_INSCRICAO[inscricao.status].label.toLowerCase()}.`);
    } catch (e) {
      setErro(getApiErrorMessage(e, 'Não foi possível inscrever.'));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Inscrever participante"
      icon={<UserPlus className="h-5 w-5" />}
      size="md"
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={salvar} isLoading={salvando} disabled={usuario.length === 0 || carregandoCampos}>
            Inscrever
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <ErroFormulario mensagem={erro ?? erroCarga} />
        <p className="text-sm text-muted-foreground">A inscrição direta dispensa o período de inscrição e a aprovação. Se a turma estiver lotada, entra na lista de espera.</p>
        <UsuarioPicker label="Participante" selecionados={usuario} onChange={setUsuario} unico />
        {!carregandoCampos && <CamposInscricaoForm campos={campos} valores={valores} onChange={setValor} />}
      </div>
    </Modal>
  );
};

export default InscreverParticipanteModal;
