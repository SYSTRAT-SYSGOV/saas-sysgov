import { useCallback, useState } from 'react';
import { pessoasApi, erroApi, type ErroApi, type PessoaVinculo, type TipoVinculo } from '../api';

export function useVinculos(onAtualizado?: () => Promise<void> | void) {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<ErroApi | null>(null);

  const adicionarVinculo = useCallback(
    async (
      pessoaId: number,
      dados: { tipo_vinculo: TipoVinculo; matricula?: string; inicio?: string }
    ): Promise<PessoaVinculo | null> => {
      setEnviando(true);
      setErro(null);
      try {
        const vinculo = await pessoasApi.adicionarVinculo(pessoaId, dados);
        if (onAtualizado) await onAtualizado();
        return vinculo;
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

  const encerrarVinculo = useCallback(
    async (pessoaId: number, vinculoId: number, fim?: string): Promise<PessoaVinculo | null> => {
      setEnviando(true);
      setErro(null);
      try {
        const vinculo = await pessoasApi.encerrarVinculo(pessoaId, vinculoId, fim);
        if (onAtualizado) await onAtualizado();
        return vinculo;
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
    adicionarVinculo,
    encerrarVinculo,
  };
}
