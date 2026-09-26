import React from 'react';
import { Button, Badge } from '@sysgov/ui';
import { CheckSquare, X, AlertTriangle, QrCode, Download } from 'lucide-react';
import { Mono } from './comum';

export interface BarraAcoesLoteProps {
  totalSelecionados: number;
  onLimparSelecao: () => void;
  onInterditarLote: () => void;
  onImprimirLoteQr: () => void;
  onExportarSelecionados: () => void;
  desabilitado?: boolean;
}

export const BarraAcoesLote: React.FC<BarraAcoesLoteProps> = ({
  totalSelecionados,
  onLimparSelecao,
  onInterditarLote,
  onImprimirLoteQr,
  onExportarSelecionados,
  desabilitado = false,
}) => {
  if (totalSelecionados === 0) return null;

  return (
    <div
      role="toolbar"
      aria-label="Ações em Lote"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-card/95 backdrop-blur-md border-2 border-primary/40 shadow-2xl rounded-full px-4 py-2 flex flex-wrap items-center gap-3 text-xs animate-in fade-in slide-in-from-bottom-4 duration-200"
    >
      <div className="flex items-center gap-2 pr-1">
        <CheckSquare className="h-4 w-4 text-primary" />
        <span className="text-muted-foreground font-medium">
          <Mono className="font-bold text-foreground tabular-nums text-sm">
            {totalSelecionados}
          </Mono>{' '}
          unidade(s) selecionada(s)
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onLimparSelecao}
          title="Desmarcar todas"
          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground rounded-full"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="h-4 w-[1px] bg-border shrink-0" />

      <div className="flex items-center gap-2">
        <Button
          variant="destructive"
          size="sm"
          disabled={desabilitado}
          onClick={onInterditarLote}
          className="h-7 text-xs px-2.5 gap-1.5 font-medium"
        >
          <AlertTriangle className="h-3.5 w-3.5" /> Interditar / Manutenção
        </Button>

        <Button
          variant="outline"
          size="sm"
          disabled={desabilitado}
          onClick={onImprimirLoteQr}
          className="h-7 text-xs px-2.5 gap-1.5 font-medium"
        >
          <QrCode className="h-3.5 w-3.5 text-primary" /> Plaquetas QR em Lote
        </Button>

        <Button
          variant="secondary"
          size="sm"
          disabled={desabilitado}
          onClick={onExportarSelecionados}
          className="h-7 text-xs px-2.5 gap-1.5 font-medium"
        >
          <Download className="h-3.5 w-3.5" /> Exportar Seleção
        </Button>
      </div>
    </div>
  );
};
