import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui';
import { pessoasApi, erroApi, type Pessoa, type ErroApi } from '../api';
import { PessoaDetailView } from './PessoaDetailView';
import { ErroBox } from './comum';
import { useCan } from '@/core/rbac/useCan';

export interface ModalFichaPessoaProps {
  pessoaId: number | null;
  onFechar: () => void;
  onAtualizado?: () => void;
}

export const ModalFichaPessoa: React.FC<ModalFichaPessoaProps> = ({
  pessoaId,
  onFechar,
  onAtualizado,
}) => {
  const { can } = useCan();
  const podeGerenciar = can('cadastros.pessoas.manage');
  const podePromover = can('cadastros.pessoas.promote');
  const podeExcluir = can('cadastros.pessoas.delete');

  const [pessoa, setPessoa] = useState<Pessoa | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<ErroApi | null>(null);

  const carregar = async (id: number) => {
    setCarregando(true);
    setErro(null);
    try {
      const p = await pessoasApi.obter(id);
      setPessoa(p);
    } catch (e) {
      setErro(erroApi(e));
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (pessoaId) {
      void carregar(pessoaId);
    } else {
      setPessoa(null);
      setErro(null);
    }
  }, [pessoaId]);

  if (!pessoaId) return null;

  if (carregando && !pessoa) {
    return (
      <Modal open onClose={onFechar} title="Consultando Cadastro Central..." size="md">
        <div className="flex flex-col items-center justify-center p-8 space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">Carregando dados da pessoa física no MDM...</span>
        </div>
      </Modal>
    );
  }

  if (erro && !pessoa) {
    return (
      <Modal open onClose={onFechar} title="Não foi possível carregar a ficha cadastral" size="md">
        <div className="space-y-4 p-2">
          <ErroBox erro={erro} />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onFechar}
              className="px-3 py-1.5 text-xs bg-muted hover:bg-muted/80 rounded-md"
            >
              Fechar
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  if (!pessoa) return null;

  return (
    <PessoaDetailView
      pessoa={pessoa}
      podeGerenciar={podeGerenciar}
      podePromover={podePromover}
      podeExcluir={podeExcluir}
      onFechar={onFechar}
      onAtualizado={async () => {
        await carregar(pessoa.id);
        onAtualizado?.();
      }}
      onExcluido={async () => {
        onFechar();
        onAtualizado?.();
      }}
      onPromover={() => {}}
      onSalvarEdicaoCivil={async (dados) => {
        await pessoasApi.atualizar(pessoa.id, dados);
        await carregar(pessoa.id);
        onAtualizado?.();
      }}
    />
  );
};

export default ModalFichaPessoa;
