import { useEffect, useState } from 'react';
import { apiClient } from '@/core/api/client';

/**
 * Arquivos privados da API (foto do aluno, logo da unidade, anexos) exigem o header de autenticação,
 * então não dá para usar a URL direto no <img src>. Baixa como blob e devolve um objectURL,
 * revogado ao trocar de URL ou desmontar. `url = null` não busca nada.
 */
export function useArquivoAutenticado(url: string | null): { src: string | null; carregando: boolean } {
  const [src, setSrc] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!url) {
      setSrc(null);
      return;
    }
    let cancelado = false;
    let objeto: string | null = null;
    setCarregando(true);
    apiClient
      .get<Blob>(url, { responseType: 'blob' })
      .then((resposta) => {
        if (cancelado) return;
        objeto = URL.createObjectURL(resposta.data);
        setSrc(objeto);
      })
      .catch(() => {
        if (!cancelado) setSrc(null);
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });

    return () => {
      cancelado = true;
      if (objeto) URL.revokeObjectURL(objeto);
    };
  }, [url]);

  return { src, carregando };
}
