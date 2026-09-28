import { useState, useCallback } from 'react';
import { cemiteriosApi, erroApi } from '../api';
import type { SucessaoDocumento, TipoDocumentoSucessao, ErroApi } from '../api';

export function useSucessaoDocumentos(sucessaoId: number | null) {
  const [documentos, setDocumentos] = useState<SucessaoDocumento[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<ErroApi | null>(null);

  const carregar = useCallback(async () => {
    if (!sucessaoId) return;
    setCarregando(true);
    setErro(null);
    try {
      const sucessao = await cemiteriosApi.sucessao(sucessaoId);
      setDocumentos(sucessao.documentos ?? []);
      return sucessao.documentos ?? [];
    } catch (e) {
      setErro(erroApi(e));
      return [];
    } finally {
      setCarregando(false);
    }
  }, [sucessaoId]);

  const upload = useCallback(
    async (tipo: TipoDocumentoSucessao, arquivo: File): Promise<SucessaoDocumento | null> => {
      if (!sucessaoId) return null;
      setEnviando(true);
      setErro(null);
      try {
        const res = await cemiteriosApi.uploadDocumento(sucessaoId, tipo, arquivo);
        setDocumentos((prev) => [...prev, res]);
        return res;
      } catch (e) {
        setErro(erroApi(e));
        return null;
      } finally {
        setEnviando(false);
      }
    },
    [sucessaoId]
  );

  const download = useCallback(
    async (documentoId: number): Promise<string | null> => {
      if (!sucessaoId) return null;
      setErro(null);
      try {
        const res = await cemiteriosApi.downloadDocumento(sucessaoId, documentoId);
        window.open(res.download_url, '_blank', 'noopener,noreferrer');
        return res.download_url;
      } catch (e) {
        setErro(erroApi(e));
        return null;
      }
    },
    [sucessaoId]
  );

  const excluir = useCallback(
    async (documentoId: number): Promise<boolean> => {
      if (!sucessaoId) return false;
      setErro(null);
      try {
        await cemiteriosApi.excluirDocumento(sucessaoId, documentoId);
        setDocumentos((prev) => prev.filter((d) => d.id !== documentoId));
        return true;
      } catch (e) {
        setErro(erroApi(e));
        return false;
      }
    },
    [sucessaoId]
  );

  return { documentos, carregando, enviando, erro, carregar, upload, download, excluir, recarregar: carregar };
}
