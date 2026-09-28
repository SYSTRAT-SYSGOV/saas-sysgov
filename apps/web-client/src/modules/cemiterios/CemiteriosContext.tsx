import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { Parque } from './api';
import { cemiteriosApi } from './api';
import { useCan } from '@/core/rbac/useCan';

export type ModoVisaoCemiterios = 'selecao' | 'administracao_geral' | 'gestao_necropole';

export interface FocoMapa {
  jazigoId: number;
  codigo: string;
  lat?: number | null;
  lng?: number | null;
}

export interface CemiteriosContextValue {
  // Navegação de abas e mapa (compatibilidade total)
  abaAtiva: string;
  setAbaAtiva: (aba: string) => void;
  focoMapa: FocoMapa | null;
  navegarParaMapa: (alvo: FocoMapa) => void;
  limparFocoMapa: () => void;

  // Gestão de necrópoles e controle de acesso
  cemiteriosDisponiveis: Parque[];
  cemiterioAtivoId: number | null;
  cemiterioAtivo: Parque | null;
  isCarregandoCemiterios: boolean;
  erroCarregamento: string | null;
  modoVisao: ModoVisaoCemiterios;
  isGestorMunicipal: boolean;
  temMultiplosCemiterios: boolean;
  selecionarCemiterio: (id: number) => void;
  abrirAdministracaoGeral: () => void;
  voltarParaSelecao: () => void;
  recarregarCemiterios: () => Promise<void>;
}

export const CemiteriosContext = createContext<CemiteriosContextValue | null>(null);

export interface CemiteriosNavigationProviderProps {
  children: React.ReactNode;
  abaInicial?: string;
  onAbaChange?: (aba: string) => void;
  cemiteriosIniciais?: Parque[];
  isGestorMunicipal?: boolean;
  modoVisaoInicial?: ModoVisaoCemiterios;
  cemiterioAtivoIdInicial?: number | null;
}

export const CemiteriosNavigationProvider: React.FC<CemiteriosNavigationProviderProps> = ({
  children,
  abaInicial = 'inventario',
  onAbaChange,
  cemiteriosIniciais,
  isGestorMunicipal: isGestorProp,
  modoVisaoInicial,
  cemiterioAtivoIdInicial,
}) => {
  let canAdmin = false;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { can } = useCan();
    canAdmin = can('cemiterios.admin') || can('admin');
  } catch {
    canAdmin = false;
  }
  const isGestorMunicipal = isGestorProp !== undefined ? isGestorProp : canAdmin;

  const [abaAtiva, setAbaAtivaInterno] = useState<string>(abaInicial);
  const [focoMapa, setFocoMapa] = useState<FocoMapa | null>(null);

  const [cemiterios, setCemiterios] = useState<Parque[]>(cemiteriosIniciais ?? []);
  const [isCarregando, setIsCarregando] = useState<boolean>(!cemiteriosIniciais);
  const [erro, setErro] = useState<string | null>(null);

  // Determina modo e cemitério ativo iniciais
  const calcularEstadoInicial = (lista: Parque[]) => {
    if (modoVisaoInicial) {
      return {
        modo: modoVisaoInicial,
        ativoId: cemiterioAtivoIdInicial ?? (lista.length === 1 ? lista[0].id : null),
      };
    }
    if (lista.length === 1) {
      return {
        modo: 'gestao_necropole' as ModoVisaoCemiterios,
        ativoId: lista[0].id,
      };
    }
    if (lista.length > 1 && cemiterioAtivoIdInicial) {
      return {
        modo: 'gestao_necropole' as ModoVisaoCemiterios,
        ativoId: cemiterioAtivoIdInicial,
      };
    }
    return {
      modo: 'selecao' as ModoVisaoCemiterios,
      ativoId: null,
    };
  };

  const estadoInicial = calcularEstadoInicial(cemiteriosIniciais ?? []);
  const [modoVisao, setModoVisao] = useState<ModoVisaoCemiterios>(estadoInicial.modo);
  const [cemiterioAtivoId, setCemiterioAtivoId] = useState<number | null>(estadoInicial.ativoId);

  const carregarParques = useCallback(async () => {
    setIsCarregando(true);
    setErro(null);
    try {
      const parques = await cemiteriosApi.parques();
      const lista = Array.isArray(parques) ? parques : [];
      setCemiterios(lista);

      // Aplica triagem (gatekeeper)
      if (!modoVisaoInicial && cemiterioAtivoId === null) {
        if (lista.length === 1) {
          setCemiterioAtivoId(lista[0].id);
          setModoVisao('gestao_necropole');
        } else {
          setModoVisao('selecao');
        }
      }
    } catch (e: unknown) {
      setErro('Não foi possível carregar os cemitérios cadastrados.');
    } finally {
      setIsCarregando(false);
    }
  }, [modoVisaoInicial, cemiterioAtivoId]);

  useEffect(() => {
    if (!cemiteriosIniciais) {
      carregarParques();
    }
  }, [cemiteriosIniciais, carregarParques]);

  const setAbaAtiva = useCallback(
    (novaAba: string) => {
      setAbaAtivaInterno(novaAba);
      onAbaChange?.(novaAba);
    },
    [onAbaChange]
  );

  const navegarParaMapa = useCallback(
    (alvo: FocoMapa) => {
      setFocoMapa(alvo);
      setAbaAtiva('mapa');
    },
    [setAbaAtiva]
  );

  const limparFocoMapa = useCallback(() => {
    setFocoMapa(null);
  }, []);

  const selecionarCemiterio = useCallback((id: number) => {
    setCemiterioAtivoId(id);
    setModoVisao('gestao_necropole');
  }, []);

  const abrirAdministracaoGeral = useCallback(() => {
    setModoVisao('administracao_geral');
  }, []);

  const voltarParaSelecao = useCallback(() => {
    setCemiterioAtivoId(null);
    setModoVisao('selecao');
  }, []);

  const cemiterioAtivo = useMemo(() => {
    if (cemiterioAtivoId === null) return null;
    return cemiterios.find((c) => c.id === cemiterioAtivoId) ?? null;
  }, [cemiterios, cemiterioAtivoId]);

  const temMultiplosCemiterios = cemiterios.length > 1;

  const value = useMemo<CemiteriosContextValue>(
    () => ({
      abaAtiva,
      setAbaAtiva,
      focoMapa,
      navegarParaMapa,
      limparFocoMapa,

      cemiteriosDisponiveis: cemiterios,
      cemiterioAtivoId,
      cemiterioAtivo,
      isCarregandoCemiterios: isCarregando,
      erroCarregamento: erro,
      modoVisao,
      isGestorMunicipal,
      temMultiplosCemiterios,
      selecionarCemiterio,
      abrirAdministracaoGeral,
      voltarParaSelecao,
      recarregarCemiterios: carregarParques,
    }),
    [
      abaAtiva,
      setAbaAtiva,
      focoMapa,
      navegarParaMapa,
      limparFocoMapa,
      cemiterios,
      cemiterioAtivoId,
      cemiterioAtivo,
      isCarregando,
      erro,
      modoVisao,
      isGestorMunicipal,
      temMultiplosCemiterios,
      selecionarCemiterio,
      abrirAdministracaoGeral,
      voltarParaSelecao,
      carregarParques,
    ]
  );

  return <CemiteriosContext.Provider value={value}>{children}</CemiteriosContext.Provider>;
};

/** Alias semântico para CemiteriosNavigationProvider. */
export const CemiteriosProvider = CemiteriosNavigationProvider;

export function useCemiteriosNavigation(): CemiteriosContextValue {
  const context = useContext(CemiteriosContext);
  if (!context) {
    // Retorna fallback gracioso caso renderizado fora do Provider
    return {
      abaAtiva: 'inventario',
      setAbaAtiva: () => {},
      focoMapa: null,
      navegarParaMapa: () => {},
      limparFocoMapa: () => {},
      cemiteriosDisponiveis: [],
      cemiterioAtivoId: null,
      cemiterioAtivo: null,
      isCarregandoCemiterios: false,
      erroCarregamento: null,
      modoVisao: 'gestao_necropole',
      isGestorMunicipal: false,
      temMultiplosCemiterios: false,
      selecionarCemiterio: () => {},
      abrirAdministracaoGeral: () => {},
      voltarParaSelecao: () => {},
      recarregarCemiterios: async () => {},
    };
  }
  return context;
}

/** Hook preferencial para consumo de contexto de cemitérios. */
export const useCemiteriosContext = useCemiteriosNavigation;
