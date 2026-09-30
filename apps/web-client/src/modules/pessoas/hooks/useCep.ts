import { useState, useCallback } from 'react';
import { consultarCep, type ConsultaCepResultado } from '../services/cep';

export function useCep() {
  const [buscando, setBuscando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const buscarCep = useCallback(async (cep: string): Promise<ConsultaCepResultado | null> => {
    const limpo = cep.replace(/\D/g, '');
    if (limpo.length !== 8) {
      setErro('Informe um CEP com 8 dígitos.');
      return null;
    }

    setBuscando(true);
    setErro(null);

    try {
      const res = await consultarCep(limpo);
      if (!res) {
        setErro('CEP não localizado.');
        return null;
      }
      return res;
    } catch {
      setErro('Não foi possível consultar o CEP no momento.');
      return null;
    } finally {
      setBuscando(false);
    }
  }, []);

  return {
    buscando,
    erro,
    limparErro: () => setErro(null),
    limparErroCep: () => setErro(null),
    buscarCep,
  };
}
