import React, { useState } from 'react';
import { AlertCard, Button, Field, Input, Modal } from '@/components/ui';
import { pessoasApi, erroApi, type ErroApi, type Pessoa } from '../api';
import { ErroBox } from './comum';
import { useFormValidationModal } from '@/lib/useFormValidationModal';

interface PessoaExistente {
  id: number;
  nome: string;
  cpf_mascarado: string;
}

export interface RegularizarDocumentoModalProps {
  pessoa: Pessoa;
  /** Pode mesclar cadastros (permissão `cadastros.pessoas.merge`). */
  podeMesclar: boolean;
  onFechar: () => void;
  /** CPF informado: a pessoa continua a mesma, só deixa de estar pendente. */
  onRegularizado: () => void | Promise<void>;
  /** A pessoa foi absorvida por outra que já tinha o CPF; a ficha atual deixa de existir. */
  onMesclado: () => void | Promise<void>;
}

function mascararCpf(valor: string): string {
  const d = valor.replace(/\D/g, '').slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
}

/** Informa o CPF de uma pessoa com documento pendente; se o CPF já é de outra pessoa, oferece a mesclagem. */
export const RegularizarDocumentoModal: React.FC<RegularizarDocumentoModalProps> = ({
  pessoa,
  podeMesclar,
  onFechar,
  onRegularizado,
  onMesclado,
}) => {
  const [cpf, setCpf] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<ErroApi | null>(null);
  const { tratarErro } = useFormValidationModal();
  const [existente, setExistente] = useState<PessoaExistente | null>(null);

  const regularizar = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    setExistente(null);
    try {
      await pessoasApi.regularizarDocumento(pessoa.id, cpf.replace(/\D/g, ''));
      await onRegularizado();
    } catch (err) {
      const e = erroApi(err);
      if (e.codigo === 'documento_ja_cadastrado' && e.dados?.mesclagem_disponivel === true) {
        setExistente(e.dados.pessoa_existente as PessoaExistente);
      } else {
        setErro(e);
      }
    } finally {
      setEnviando(false);
    }
  };

  const mesclar = async () => {
    if (!existente) return;
    setEnviando(true);
    setErro(null);
    try {
      await pessoasApi.mesclar(pessoa.id, existente.id);
      await onMesclado();
    } catch (err) {
      if (!tratarErro(err)) setErro(erroApi(err));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal
      open
      onClose={onFechar}
      title="Regularizar documento"
      description={`Informe o CPF de ${pessoa.nome}. O cadastro, os vínculos e as referências nos módulos são mantidos.`}
      size="md"
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onFechar} disabled={enviando}>
            Cancelar
          </Button>
          {!existente && (
            <Button size="sm" onClick={(ev) => void regularizar(ev as unknown as React.FormEvent)} disabled={enviando || cpf.replace(/\D/g, '').length !== 11}>
              {enviando ? 'Salvando…' : 'Regularizar'}
            </Button>
          )}
        </div>
      }
    >
      <form onSubmit={(e) => void regularizar(e)} className="space-y-4">
        <ErroBox erro={erro} />

        <Field label="CPF" required>
          <Input
            inputMode="numeric"
            value={cpf}
            onChange={(e) => setCpf(mascararCpf(e.target.value))}
            placeholder="000.000.000-00"
            className="font-mono tabular-nums"
            disabled={enviando}
            autoFocus
          />
        </Field>

        {existente && (
          <AlertCard
            priority="warning"
            title="Este CPF já pertence a outra pessoa"
            description={`${existente.nome} (${existente.cpf_mascarado}) já está cadastrada com este CPF. ${
              podeMesclar
                ? 'Se são a mesma pessoa, mescle os cadastros: este cadastro é absorvido e todas as referências passam para o cadastro existente.'
                : 'Se são a mesma pessoa, peça a quem tem permissão de mesclar cadastros.'
            }`}
          />
        )}
        {existente && podeMesclar && (
          <div className="flex justify-end">
            <Button type="button" size="sm" onClick={() => void mesclar()} disabled={enviando}>
              {enviando ? 'Mesclando…' : `Mesclar com ${existente.nome}`}
            </Button>
          </div>
        )}
      </form>
    </Modal>
  );
};
