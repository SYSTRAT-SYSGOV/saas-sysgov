import { useEffect, useState } from 'react';
import { sysgovApi, type PaginaOrgao } from '@sysgov/sdk';
import { applyWhiteLabelTheme } from '@/config/theme';

interface Estado {
  carregando: boolean;
  pagina: PaginaOrgao | null;
  naoEncontrado: boolean;
}

/**
 * Identidade + boas-vindas do órgão (design D7) — usado por toda página pública de inscrição
 * (catálogo, curso, cadastro). Aplica a cor do órgão no tema em runtime, mesmo mecanismo do
 * portal público de Cemitérios (`applyWhiteLabelTheme`) — a identidade nunca fica embutida no
 * código, sempre vem da API.
 */
export function usePaginaOrgao(orgao: string | undefined): Estado {
  const [estado, setEstado] = useState<Estado>({ carregando: true, pagina: null, naoEncontrado: false });

  useEffect(() => {
    if (!orgao) {
      setEstado({ carregando: false, pagina: null, naoEncontrado: true });
      return;
    }

    let cancelado = false;
    setEstado({ carregando: true, pagina: null, naoEncontrado: false });

    sysgovApi.cursos
      .getPaginaOrgao(orgao)
      .then((pagina) => {
        if (cancelado) return;
        applyWhiteLabelTheme(pagina.identidade.cor_primaria ?? undefined);
        setEstado({ carregando: false, pagina, naoEncontrado: false });
      })
      .catch(() => {
        if (!cancelado) setEstado({ carregando: false, pagina: null, naoEncontrado: true });
      });

    return () => {
      cancelado = true;
    };
  }, [orgao]);

  return estado;
}
