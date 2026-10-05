import { useCallback, useState } from 'react';
import { pessoasApi, erroApi, type ErroApi, type PessoaSocio, type PapelSocio } from '../api';

export function useSocios(onAtualizado?: () => Promise<void> | void) {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<ErroApi | null>(null);

  const adicionarSocio = useCallback(
    async (
      pessoaId: number,
      dados: { socio_pessoa_id: number; percentual_participacao?: number; papel?: PapelSocio; data_entrada?: string }
    ): Promise<PessoaSocio | null> => {
      setEnviando(true);
      setErro(null);
      try {
        const socio = await pessoasApi.adicionarSocio(pessoaId, dados);
        if (onAtualizado) await onAtualizado();
        return socio;
      } catch (e) {
        const err = erroApi(e);
        setErro(err);
        return null;
      } finally {
        setEnviando(false);
      }
    },
    [onAtualizado]
  );

  const encerrarSocio = useCallback(
    async (pessoaId: number, socioId: number, fim?: string): Promise<PessoaSocio | null> => {
      setEnviando(true);
      setErro(null);
      try {
        const socio = await pessoasApi.encerrarSocio(pessoaId, socioId, fim);
        if (onAtualizado) await onAtualizado();
        return socio;
      } catch (e) {
        const err = erroApi(e);
        setErro(err);
        return null;
      } finally {
        setEnviando(false);
      }
    },
    [onAtualizado]
  );

  return {
    enviando,
    erro,
    setErro,
    limparErro: () => setErro(null),
    adicionarSocio,
    encerrarSocio,
  };
}
