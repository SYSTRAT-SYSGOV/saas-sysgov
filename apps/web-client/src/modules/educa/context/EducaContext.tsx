import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '@/core/api/client';

export interface EducaEscola {
  id: string;
  nome: string;
  sigla?: string;
  codigo_inep?: string;
}

export interface EducaAnoLetivo {
  id: string;
  ano: number;
  status: 'planning' | 'active' | 'frozen' | 'evaluation_phase' | 'closed';
  total_dias_letivos?: number;
}

interface EducaContextData {
  escolaAtivaId: string | null;
  setEscolaAtivaId: (id: string | null) => void;
  escolaAtiva: EducaEscola | null;
  anoLetivoAtivo: number;
  setAnoLetivoAtivo: (ano: number) => void;
  anoLetivoObj: EducaAnoLetivo | null;
  escolas: EducaEscola[];
  anosLetivos: EducaAnoLetivo[];
  carregando: boolean;
  recarregar: () => Promise<void>;
}

const EducaContext = createContext<EducaContextData | undefined>(undefined);

export const EducaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [escolas, setEscolas] = useState<EducaEscola[]>([]);
  const [anosLetivos, setAnosLetivos] = useState<EducaAnoLetivo[]>([]);
  const [escolaAtivaId, setEscolaAtivaId] = useState<string | null>(null);
  const [anoLetivoAtivo, setAnoLetivoAtivo] = useState<number>(new Date().getFullYear());
  const [carregando, setCarregando] = useState<boolean>(true);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    try {
      const [resEscolas, resAnos] = await Promise.allSettled([
        apiClient.get('/educa/core/escolas'),
        apiClient.get('/educa/core/anos-letivos'),
      ]);

      let loadedEscolas: EducaEscola[] = [];
      if (resEscolas.status === 'fulfilled' && resEscolas.value?.data?.data) {
        loadedEscolas = resEscolas.value.data.data;
        setEscolas(loadedEscolas);
      }

      let loadedAnos: EducaAnoLetivo[] = [];
      if (resAnos.status === 'fulfilled' && resAnos.value?.data?.data) {
        loadedAnos = resAnos.value.data.data;
        setAnosLetivos(loadedAnos);
      }

      // Inicializa seleções padrão se não definidas
      if (loadedEscolas.length > 0 && !escolaAtivaId) {
        setEscolaAtivaId(loadedEscolas[0].id);
      }
      if (loadedAnos.length > 0) {
        const ativo = loadedAnos.find((a) => a.status === 'active') || loadedAnos[0];
        setAnoLetivoAtivo(ativo.ano);
      }
    } catch {
      // Falha graciosa mantendo estados anteriores
    } finally {
      setCarregando(false);
    }
  }, [escolaAtivaId]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  const escolaAtiva = useMemo(() => {
    return escolas.find((e) => e.id === escolaAtivaId) || null;
  }, [escolas, escolaAtivaId]);

  const anoLetivoObj = useMemo(() => {
    return anosLetivos.find((a) => a.ano === anoLetivoAtivo) || null;
  }, [anosLetivos, anoLetivoAtivo]);

  const value = useMemo(
    () => ({
      escolaAtivaId,
      setEscolaAtivaId,
      escolaAtiva,
      anoLetivoAtivo,
      setAnoLetivoAtivo,
      anoLetivoObj,
      escolas,
      anosLetivos,
      carregando,
      recarregar,
    }),
    [
      escolaAtivaId,
      escolaAtiva,
      anoLetivoAtivo,
      anoLetivoObj,
      escolas,
      anosLetivos,
      carregando,
      recarregar,
    ]
  );

  return <EducaContext.Provider value={value}>{children}</EducaContext.Provider>;
};

export const useEduca = (): EducaContextData => {
  const context = useContext(EducaContext);
  if (!context) {
    throw new Error('useEduca deve ser utilizado dentro de um EducaProvider');
  }
  return context;
};
