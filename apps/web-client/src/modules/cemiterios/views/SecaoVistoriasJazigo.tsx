import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from '@sysgov/ui';
import { ClipboardCheck, Plus, AlertTriangle, ShieldCheck, Image as ImageIcon, ZoomIn } from 'lucide-react';
import { formatarData, type Vistoria } from '../api';
import { Mono } from './comum';
import { ModalFotoVistoria } from './ModalFotoVistoria';

export interface SecaoVistoriasJazigoProps {
  vistorias: Vistoria[];
  onNovaVistoria: () => void;
  podeEditar?: boolean;
}

export const SecaoVistoriasJazigo: React.FC<SecaoVistoriasJazigoProps> = ({
  vistorias,
  onNovaVistoria,
  podeEditar = false,
}) => {
  const [fotoAmpliada, setFotoAmpliada] = useState<{ url: string; data?: string } | null>(null);

  const getRiscoBadge = (risco: string) => {
    switch (risco?.toLowerCase()) {
      case 'alto':
        return <Badge variant="destructive" className="text-[10px] uppercase font-bold">Risco Alto</Badge>;
      case 'medio':
        return <Badge variant="secondary" className="text-[10px] uppercase font-semibold text-amber-500 border-amber-500/30">Risco Médio</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] uppercase font-medium text-emerald-500">Risco Baixo</Badge>;
    }
  };

  return (
    <>
      <Card className="gap-0 py-0 overflow-hidden shadow-2xs">
        <CardHeader className="p-3 border-b border-border bg-muted/30 flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <ClipboardCheck className="h-3.5 w-3.5 text-primary" /> Vistorias e Laudos de Conservação
          </CardTitle>
          {podeEditar && (
            <Button
              variant="outline"
              size="sm"
              onClick={onNovaVistoria}
              className="h-6 text-[11px] px-2 gap-1 font-medium"
            >
              <Plus className="h-3 w-3" /> Nova Vistoria
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-3 text-xs">
          {vistorias.length > 0 ? (
            <div className="space-y-3">
              {vistorias.map((v) => (
                <div
                  key={v.id}
                  className="p-2.5 rounded-lg border border-border/70 bg-card/60 space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-border/40 pb-1.5">
                    <div className="flex items-center gap-2">
                      <Mono className="font-bold text-foreground text-xs">{formatarData(v.data)}</Mono>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        Conservação: {v.estado_conservacao}
                      </Badge>
                    </div>
                    <div>{getRiscoBadge(v.risco)}</div>
                  </div>

                  {v.observacoes && (
                    <p className="text-muted-foreground text-xs leading-relaxed italic">
                      "{v.observacoes}"
                    </p>
                  )}

                  {/* Galeria de Fotos */}
                  {v.fotos && v.fotos.length > 0 && (
                    <div className="pt-1.5 space-y-1">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                        Registros Fotográficos ({v.fotos.length}):
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {v.fotos.map((f, i) => {
                          const src = f.url || (f as any).caminho || '';
                          return (
                            <button
                              key={f.id || i}
                              type="button"
                              onClick={() => setFotoAmpliada({ url: src, data: f.capturada_em })}
                              className="group relative w-14 h-14 rounded-md overflow-hidden border border-border/80 bg-muted hover:border-primary transition-all focus:outline-none focus:ring-1 focus:ring-primary"
                              title="Clique para ampliar"
                            >
                              {src ? (
                                <img
                                  src={src}
                                  alt={`Foto ${i + 1}`}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <ZoomIn className="h-4 w-4 text-white" />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-3 space-y-1.5">
              <p className="text-muted-foreground text-xs italic">
                Nenhuma vistoria técnica registrada para esta unidade.
              </p>
              {podeEditar && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onNovaVistoria}
                  className="h-7 text-xs text-primary gap-1 font-medium"
                >
                  <Plus className="h-3.5 w-3.5" /> Registrar Primeira Vistoria
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <ModalFotoVistoria
        aberto={fotoAmpliada !== null}
        fotoUrl={fotoAmpliada?.url ?? null}
        capturadaEm={fotoAmpliada?.data}
        onFechar={() => setFotoAmpliada(null)}
      />
    </>
  );
};
