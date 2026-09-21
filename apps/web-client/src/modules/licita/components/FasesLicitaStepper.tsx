import React from 'react';
import { Check, Lock } from 'lucide-react';
import type { FaseLicita, Processo } from '@sysgov/sdk';
import { cn } from '@/lib/utils';

type EstadoPasso = 'aprovado' | 'atual' | 'bloqueado' | 'em_breve';

interface Passo {
  fase: FaseLicita;
  label: string;
  estado: EstadoPasso;
}

const FASE_LABEL: Record<FaseLicita, string> = {
  dfd: 'DFD',
  em_elaboracao: 'Em Elaboração',
  aprovacao_ordenador: 'Aprovação do Ordenador',
  etp: 'ETP',
  mapa_riscos: 'Mapa de Riscos',
  pesquisa_precos: 'Pesquisa de Preços',
  tr: 'Termo de Referência',
  edital: 'Edital',
  concluido: 'Concluído',
};

/**
 * Passos exibidos no passo a passo, na ordem — não deriva mais de
 * `Object.keys(FASE_LABEL)` porque `em_elaboracao`/`concluido` são valores
 * de `Processo.fase_atual`, não documentos próprios com tela.
 */
const PASSOS_EXIBIDOS: FaseLicita[] = ['dfd', 'etp', 'mapa_riscos', 'pesquisa_precos', 'tr', 'edital', 'aprovacao_ordenador'];

/** Fases com tela própria implementada hoje. */
export type FaseLicitaImplementada = 'dfd' | 'etp' | 'mapa_riscos' | 'pesquisa_precos' | 'tr' | 'edital' | 'aprovacao_ordenador';

/** As demais fases aparecem no passo a passo como "em breve", sem link. */
const FASES_IMPLEMENTADAS: FaseLicita[] = ['dfd', 'etp', 'mapa_riscos', 'pesquisa_precos', 'tr', 'edital', 'aprovacao_ordenador'];

interface FasesLicitaStepperProps {
  processo: Processo;
  /** Fase cuja tela está aberta agora — pode ser diferente da fase_atual do processo (usuário navegando livremente entre os documentos). */
  faseAtiva: FaseLicitaImplementada;
  onSelecionar: (fase: FaseLicitaImplementada) => void;
}

/**
 * Passo a passo das fases do Licita, fixo no topo de toda tela de documento
 * do processo. Diferente do desenho original: depois do DFD aprovado, ETP,
 * Mapa de Riscos e Pesquisa de Preços não se bloqueiam mais em cadeia — a
 * equipe de planejamento pode abrir e editar qualquer um deles a qualquer
 * momento (não há mais aprovação individual por fase). O único gate real é
 * o DFD no início e a Aprovação do Ordenador no final (ver
 * AprovacaoOrdenadorPage).
 */
export const FasesLicitaStepper: React.FC<FasesLicitaStepperProps> = ({ processo, faseAtiva, onSelecionar }) => {
  const dfdAprovado = processo.dfd?.status === 'aprovado';
  const processoConcluido = processo.fase_atual === 'concluido';

  const passos: Passo[] = PASSOS_EXIBIDOS.map((fase) => {
    if (!FASES_IMPLEMENTADAS.includes(fase)) {
      return { fase, label: FASE_LABEL[fase], estado: 'em_breve' };
    }

    if (fase === 'dfd') {
      return { fase, label: FASE_LABEL[fase], estado: dfdAprovado ? 'aprovado' : 'atual' };
    }

    if (fase === 'aprovacao_ordenador') {
      if (processoConcluido) return { fase, label: FASE_LABEL[fase], estado: 'aprovado' };
      return { fase, label: FASE_LABEL[fase], estado: dfdAprovado ? 'atual' : 'bloqueado' };
    }

    // ETP / Mapa de Riscos / Pesquisa de Preços / TR / Edital: liberados
    // juntos assim que o DFD está aprovado, sem depender do status um do
    // outro.
    const status =
      fase === 'etp' ? processo.etp?.status
      : fase === 'mapa_riscos' ? processo.mapa_risco?.status
      : fase === 'pesquisa_precos' ? processo.pesquisa_preco?.status
      : fase === 'tr' ? processo.tr?.status
      : processo.edital?.status;
    if (status === 'aprovado') return { fase, label: FASE_LABEL[fase], estado: 'aprovado' };
    return { fase, label: FASE_LABEL[fase], estado: dfdAprovado ? 'atual' : 'bloqueado' };
  });

  return (
    <div className="flex items-center overflow-x-auto rounded-lg border border-border bg-muted/30 px-3 py-3">
      {passos.map((passo, index) => {
        const clicavel = (passo.estado === 'aprovado' || passo.estado === 'atual') && passo.fase !== faseAtiva;
        const ativo = passo.fase === faseAtiva;

        return (
          <React.Fragment key={passo.fase}>
            {index > 0 && (
              <div
                className={cn(
                  'h-px w-6 shrink-0 sm:w-10',
                  passos[index - 1].estado === 'aprovado' ? 'bg-success' : 'bg-border',
                )}
              />
            )}
            <button
              type="button"
              disabled={!clicavel}
              // `clicavel` só é true pra fases em FASES_IMPLEMENTADAS (estado
              // 'aprovado'/'atual' nunca é atribuído às demais) — cast seguro.
              onClick={() => clicavel && onSelecionar(passo.fase as FaseLicitaImplementada)}
              title={passo.estado === 'bloqueado' || passo.estado === 'em_breve' ? 'Ainda não disponível' : passo.label}
              className={cn(
                'flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                ativo && 'bg-primary text-primary-foreground',
                !ativo && passo.estado === 'aprovado' && 'text-success hover:bg-success/10 cursor-pointer',
                !ativo && passo.estado === 'atual' && 'text-foreground hover:bg-muted cursor-pointer',
                (passo.estado === 'bloqueado' || passo.estado === 'em_breve') && 'text-muted-foreground/50 cursor-not-allowed',
              )}
            >
              <span
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                  ativo && 'bg-primary-foreground/20',
                  !ativo && passo.estado === 'aprovado' && 'bg-success/15',
                  !ativo && passo.estado === 'atual' && 'bg-muted',
                  (passo.estado === 'bloqueado' || passo.estado === 'em_breve') && 'bg-muted/50',
                )}
              >
                {passo.estado === 'aprovado' ? (
                  <Check className="h-3 w-3" />
                ) : passo.estado === 'bloqueado' || passo.estado === 'em_breve' ? (
                  <Lock className="h-2.5 w-2.5" />
                ) : (
                  index + 1
                )}
              </span>
              <span className="whitespace-nowrap">{passo.label}</span>
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default FasesLicitaStepper;
