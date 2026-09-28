import { useState, useCallback } from 'react';
import { cemiteriosApi, erroApi } from '../api';
import type { Sucessao, AtualizarSucessaoInput, TransicaoSucessaoInput, ErroApi } from '../api';

export function useSucessao(id: number | null) {
  const [dados, setDados] = useState<Sucessao | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<ErroApi | null>(null);

  const carregar = useCallback(async () => {
    if (!id) return;
    setCarregando(true);
    setErro(null);
    try {
      const res = await cemiteriosApi.sucessao(id);
      setDados(res);
      return res;
    } catch (e) {
      setErro(erroApi(e));
      return null;
    } finally {
      setCarregando(false);
    }
  }, [id]);

  const atualizar = useCallback(
    async (dados: AtualizarSucessaoInput): Promise<Sucessao | null> => {
      if (!id) return null;
      setErro(null);
      try {
        const res = await cemiteriosApi.atualizarSucessao(id, dados);
        setDados(res);
        return res;
      } catch (e) {
        setErro(erroApi(e));
        return null;
      }
    },
    [id]
  );

  const transicao = useCallback(
    async (dados: TransicaoSucessaoInput): Promise<Sucessao | null> => {
      if (!id) return null;
      setErro(null);
      try {
        const res = await cemiteriosApi.transicionarSucessao(id, dados);
        setDados(res);
        return res;
      } catch (e) {
        setErro(erroApi(e));
        return null;
      }
    },
    [id]
  );

  const excluir = useCallback(async (): Promise<boolean> => {
    if (!id) return false;
    setErro(null);
    try {
      await cemiteriosApi.excluirSucessao(id);
      setDados(null);
      return true;
    } catch (e) {
      setErro(erroApi(e));
      return false;
    }
  }, [id]);

  return { dados, carregando, erro, carregar, atualizar, transicao, excluir, recarregar: carregar };
}
