import { useCallback, useEffect, useRef, useState } from 'react';

import { erroApi } from './api';

/**
 * Carga de dados da API com estado de carregamento e erro (equivalente ao useDados do Coding Standard).
 * `recarregar()` repete a busca; a resposta de uma busca antiga nunca sobrescreve a mais nova.
 */
export function useCarga<T>(buscar: () => Promise<T>, dependencias: unknown[] = []): {
  dados: T | null;
  carregando: boolean;
  erro: string | null;
  recarregar: () => Promise<void>;
  definir: (dados: T) => void;
} {
  const [dados, setDados] = useState<T | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const ultima = useRef(0);

  const recarregar = useCallback(async () => {
    const minha = ++ultima.current;
    setCarregando(true);
    setErro(null);
    try {
      const resultado = await buscar();
      if (minha === ultima.current) setDados(resultado);
    } catch (e) {
      if (minha === ultima.current) setErro(erroApi(e).mensagem);
    } finally {
      if (minha === ultima.current) setCarregando(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencias);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  return { dados, carregando, erro, recarregar, definir: setDados };
}
