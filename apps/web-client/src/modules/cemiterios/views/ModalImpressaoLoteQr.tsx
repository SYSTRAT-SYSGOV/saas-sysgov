import React, { useEffect, useState } from 'react';
import { Modal, Button, Badge } from '@sysgov/ui';
import { Printer, QrCode as QrIcon, ShieldCheck } from 'lucide-react';
import type { Jazigo } from '../api';
import { gerarQrCodeDataUrl, gerarUrlConsultaJazigo } from '../qrcode.utils';
import { Mono } from './comum';

export interface ModalImpressaoLoteQrProps {
  aberto: boolean;
  jazigos: Jazigo[];
  onFechar: () => void;
}

export const ModalImpressaoLoteQr: React.FC<ModalImpressaoLoteQrProps> = ({
  aberto,
  jazigos,
  onFechar,
}) => {
  const [mapaQrCodes, setMapaQrCodes] = useState<Record<number, string>>({});
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!aberto || jazigos.length === 0) {
      setMapaQrCodes({});
      return;
    }

    let ativo = true;
    setCarregando(true);

    const promessas = jazigos.map(async (j) => {
      const url = gerarUrlConsultaJazigo({ id: j.id, codigo: j.codigo });
      const dataUrl = await gerarQrCodeDataUrl(url, { largura: 180, margem: 1 });
      return { id: j.id, dataUrl };
    });

    Promise.all(promessas)
      .then((resultados) => {
        if (!ativo) return;
        const mapa: Record<number, string> = {};
        resultados.forEach((r) => {
          mapa[r.id] = r.dataUrl;
        });
        setMapaQrCodes(mapa);
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, [aberto, jazigos]);

  const acionarImpressao = () => {
    window.print();
  };

  return (
    <>
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #grade-impressao-lote-qr,
          #grade-impressao-lote-qr * {
            visibility: visible !important;
          }
          #grade-impressao-lote-qr {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            margin: 0 !important;
            padding: 10mm !important;
            background: #ffffff !important;
            color: #000000 !important;
            box-shadow: none !important;
            border: none !important;
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 6mm !important;
          }
          .cartao-etiqueta-lote {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            border: 2px solid #000000 !important;
            background: #ffffff !important;
            color: #000000 !important;
            padding: 4mm !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      <Modal
        open={aberto}
        onClose={onFechar}
        title="Emissão Coletiva de Plaquetas QR Code"
        description={`Grade de impressão para ${jazigos.length} plaqueta(s) selecionada(s) (Folha padrão A4 de etiquetas).`}
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        <div className="space-y-4 py-2">
          {/* Grade de Plaquetas */}
          <div
            id="grade-impressao-lote-qr"
            className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-1 max-h-[60vh] overflow-y-auto print:max-h-none print:overflow-visible"
          >
            {jazigos.map((j) => {
              const qrSrc = mapaQrCodes[j.id];
              return (
                <div
                  key={j.id}
                  className="cartao-etiqueta-lote border-2 border-border/80 bg-card rounded-lg p-3 text-xs flex flex-col justify-between shadow-2xs relative"
                >
                  <div className="flex items-center justify-between border-b border-border/60 pb-1.5 mb-2">
                    <div className="truncate pr-2">
                      <span className="text-[9px] uppercase font-bold text-muted-foreground block">
                        Cemitério Municipal
                      </span>
                      <span className="font-semibold text-foreground truncate block">
                        {j.cemiterio?.nome ?? 'Necrópole Municipal'}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[9px] uppercase font-mono tracking-wider shrink-0 gap-1">
                      <ShieldCheck className="h-3 w-3 text-primary" /> SIGCM
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-20 h-20 bg-white p-1 rounded border border-border/60 shrink-0 flex items-center justify-center">
                      {qrSrc ? (
                        <img
                          src={qrSrc}
                          alt={`QR Code ${j.codigo}`}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <QrIcon className="h-8 w-8 text-muted-foreground animate-pulse" />
                      )}
                    </div>

                    <div className="space-y-1 flex-1 min-w-0">
                      <span className="text-[9px] uppercase text-muted-foreground block font-medium">Unidade</span>
                      <span className="font-mono text-base font-bold text-foreground tabular-nums block">
                        {j.codigo}
                      </span>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                        <span>Setor: <Mono className="font-semibold text-foreground">{j.setor?.codigo ?? '—'}</Mono></span>
                        <span>Cap: <Mono className="font-semibold text-foreground">{j.capacidade}</Mono></span>
                      </div>
                      <span className="text-[10px] capitalize text-muted-foreground block">
                        {j.tipo.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 pt-1 border-t border-border/60 flex items-center justify-between text-[8px] text-muted-foreground">
                    <span>Leitura por câmera para consulta</span>
                    <span className="font-mono">ID {j.id}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Rodapé com botões */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-xs text-muted-foreground">
              Total a imprimir: <strong className="text-foreground">{jazigos.length} etiqueta(s)</strong>
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onFechar}>
                Fechar
              </Button>
              <Button
                size="sm"
                disabled={carregando}
                onClick={acionarImpressao}
                className="gap-1.5 font-medium"
              >
                <Printer className="h-3.5 w-3.5" /> Imprimir Folha de Etiquetas
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};
