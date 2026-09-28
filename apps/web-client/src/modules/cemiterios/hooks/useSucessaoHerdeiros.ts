import { useState, useCallback } from 'react';
import { cemiteriosApi, erroApi } from '../api';
import type { SucessaoHerdeiro, HerdeirosSucessaoInput, ErroApi } from '../api';

export function useSucessaoHerdeiros(sucessaoId: number | null) {
  const [herdeiros, setHerdeiros] = useState<SucessaoHerdeiro[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<ErroApi | null>(null);

  const carregar = useCallback(async () => {
    if (!sucessaoId) return;
    setCarregando(true);
    setErro(null);
    try {
      const sucessao = await cemiteriosApi.sucessao(sucessaoId);
      setHerdeiros(sucessao.herdeiros ?? []);
      return sucessao.herdeiros ?? [];
    } catch (e) {
      setErro(erroApi(e));
      return [];
    } finally {
      setCarregando(false);
    }
  }, [sucessaoId]);

  const salvar = useCallback(
    async (dados: HerdeirosSucessaoInput): Promise<SucessaoHerdeiro[] | null> => {
      if (!sucessaoId) return null;
      setErro(null);
      try {
        const res = await cemiteriosApi.adicionarHerdeiros(sucessaoId, dados);
        setHerdeiros(res);
        return res;
      } catch (e) {
        setErro(erroApi(e));
        return null;
      }
    },
    [sucessaoId]
  );

  const remover = useCallback(
    async (herdeiroId: number): Promise<boolean> => {
      if (!sucessaoId) return false;
      setErro(null);
      try {
        await cemiteriosApi.removerHerdeiro(sucessaoId, herdeiroId);
        setHerdeiros((prev) => prev.filter((h) => h.id !== herdeiroId));
        return true;
      } catch (e) {
        setErro(erroApi(e));
        return false;
      }
    },
    [sucessaoId]
  );

  return { herdeiros, carregando, erro, carregar, salvar, remover, recarregar: carregar };
}
