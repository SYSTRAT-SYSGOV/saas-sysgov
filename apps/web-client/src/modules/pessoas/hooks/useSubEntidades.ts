import { useCallback, useState } from 'react';
import {
  pessoasApi,
  erroApi,
  type ErroApi,
  type PessoaDocumento,
  type PessoaEndereco,
  type PessoaContato,
} from '../api';

export function useSubEntidades(onAtualizado?: () => Promise<void> | void) {
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState<ErroApi | null>(null);

  // Documentos
  const adicionarDocumento = useCallback(
    async (
      pessoaId: number,
      dados: {
        tipo: PessoaDocumento['tipo'];
        numero: string;
        orgao_emissor?: string;
        uf_emissao?: string;
        data_emissao?: string;
      }
    ) => {
      setSalvando(true);
      setErro(null);
      try {
        const doc = await pessoasApi.adicionarDocumento(pessoaId, dados);
        if (onAtualizado) await onAtualizado();
        return doc;
      } catch (e) {
        const err = erroApi(e);
        setErro(err);
        return null;
      } finally {
        setSalvando(false);
      }
    },
    [onAtualizado]
  );

  const atualizarDocumento = useCallback(
    async (pessoaId: number, documentoId: number, dados: Partial<PessoaDocumento>) => {
      setSalvando(true);
      setErro(null);
      try {
        const doc = await pessoasApi.atualizarDocumento(pessoaId, documentoId, dados);
        if (onAtualizado) await onAtualizado();
        return doc;
      } catch (e) {
        const err = erroApi(e);
        setErro(err);
        return null;
      } finally {
        setSalvando(false);
      }
    },
    [onAtualizado]
  );

  const excluirDocumento = useCallback(
    async (pessoaId: number, documentoId: number) => {
      setExcluindo(true);
      setErro(null);
      try {
        const res = await pessoasApi.excluirDocumento(pessoaId, documentoId);
        if (onAtualizado) await onAtualizado();
        return res;
      } catch (e) {
        const err = erroApi(e);
        setErro(err);
        return null;
      } finally {
        setExcluindo(false);
      }
    },
    [onAtualizado]
  );

  // Endereços
  const adicionarEndereco = useCallback(
    async (pessoaId: number, dados: Partial<PessoaEndereco>) => {
      setSalvando(true);
      setErro(null);
      try {
        const end = await pessoasApi.adicionarEndereco(pessoaId, dados);
        if (onAtualizado) await onAtualizado();
        return end;
      } catch (e) {
        const err = erroApi(e);
        setErro(err);
        return null;
      } finally {
        setSalvando(false);
      }
    },
    [onAtualizado]
  );

  const atualizarEndereco = useCallback(
    async (pessoaId: number, enderecoId: number, dados: Partial<PessoaEndereco>) => {
      setSalvando(true);
      setErro(null);
      try {
        const end = await pessoasApi.atualizarEndereco(pessoaId, enderecoId, dados);
        if (onAtualizado) await onAtualizado();
        return end;
      } catch (e) {
        const err = erroApi(e);
        setErro(err);
        return null;
      } finally {
        setSalvando(false);
      }
    },
    [onAtualizado]
  );

  const excluirEndereco = useCallback(
    async (pessoaId: number, enderecoId: number) => {
      setExcluindo(true);
      setErro(null);
      try {
        const res = await pessoasApi.excluirEndereco(pessoaId, enderecoId);
        if (onAtualizado) await onAtualizado();
        return res;
      } catch (e) {
        const err = erroApi(e);
        setErro(err);
        return null;
      } finally {
        setExcluindo(false);
      }
    },
    [onAtualizado]
  );

  // Contatos
  const adicionarContato = useCallback(
    async (
      pessoaId: number,
      dados: {
        tipo: PessoaContato['tipo'];
        valor: string;
        principal?: boolean;
        autoriza_notificacoes?: boolean;
      }
    ) => {
      setSalvando(true);
      setErro(null);
      try {
        const ctc = await pessoasApi.adicionarContato(pessoaId, dados);
        if (onAtualizado) await onAtualizado();
        return ctc;
      } catch (e) {
        const err = erroApi(e);
        setErro(err);
        return null;
      } finally {
        setSalvando(false);
      }
    },
    [onAtualizado]
  );

  const atualizarContato = useCallback(
    async (pessoaId: number, contatoId: number, dados: Partial<PessoaContato>) => {
      setSalvando(true);
      setErro(null);
      try {
        const ctc = await pessoasApi.atualizarContato(pessoaId, contatoId, dados);
        if (onAtualizado) await onAtualizado();
        return ctc;
      } catch (e) {
        const err = erroApi(e);
        setErro(err);
        return null;
      } finally {
        setSalvando(false);
      }
    },
    [onAtualizado]
  );

  const excluirContato = useCallback(
    async (pessoaId: number, contatoId: number) => {
      setExcluindo(true);
      setErro(null);
      try {
        const res = await pessoasApi.excluirContato(pessoaId, contatoId);
        if (onAtualizado) await onAtualizado();
        return res;
      } catch (e) {
        const err = erroApi(e);
        setErro(err);
        return null;
      } finally {
        setExcluindo(false);
      }
    },
    [onAtualizado]
  );

  return {
    salvando,
    excluindo,
    erro,
    setErro,
    limparErro: () => setErro(null),
    // Documentos
    adicionarDocumento,
    atualizarDocumento,
    excluirDocumento,
    // Endereços
    adicionarEndereco,
    atualizarEndereco,
    excluirEndereco,
    // Contatos
    adicionarContato,
    atualizarContato,
    excluirContato,
  };
}
