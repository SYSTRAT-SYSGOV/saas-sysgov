import React, { useEffect, useState } from 'react';
import { Modal, Button, Badge } from '@sysgov/ui';
import { Printer, Copy, Check, QrCode as QrIcon, ShieldCheck } from 'lucide-react';
import { cemiteriosApi, type Inumacao, type Jazigo } from '../api';
import { gerarQrCodeDataUrl, gerarUrlConsultaJazigo } from '../qrcode.utils';

export interface ModalQrCodeJazigoProps {
  aberto: boolean;
  jazigo: Jazigo | null;
  ocupantes?: Inumacao[];
  onFechar: () => void;
}

export const ModalQrCodeJazigo: React.FC<ModalQrCodeJazigoProps> = ({
  aberto,
  jazigo,
  ocupantes: ocupantesProp,
  onFechar,
}) => {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [copiado, setCopiado] = useState(false);
  const [ocupantesInternos, setOcupantesInternos] = useState<Inumacao[]>([]);

  const ocupantes = ocupantesProp !== undefined ? ocupantesProp : ocupantesInternos;

  const urlConsulta = jazigo
    ? gerarUrlConsultaJazigo({ id: jazigo.id, codigo: jazigo.codigo })
    : '';

  useEffect(() => {
    if (!jazigo || !aberto) {
      setDataUrl('');
      return;
    }

    let ativo = true;
    gerarQrCodeDataUrl(urlConsulta, { largura: 280, margem: 1 })
      .then((url) => {
        if (ativo) setDataUrl(url);
      })
      .catch((err) => {
        console.error('Erro ao gerar QR Code:', err);
      });

    if (ocupantesProp === undefined) {
      cemiteriosApi.inumacoes({ plot_id: jazigo.id }).then((res) => {
        if (ativo && res?.data) setOcupantesInternos(res.data);
      });
    }

    return () => {
      ativo = false;
    };
  }, [jazigo, aberto, urlConsulta, ocupantesProp]);

  const copiarLink = async () => {
    if (!urlConsulta) return;
    try {
      await navigator.clipboard.writeText(urlConsulta);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // fallback caso navigator.clipboard esteja bloqueado
    }
  };

  const acionarImpressao = () => {
    window.print();
  };

  if (!jazigo) return null;

  return (
    <>
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #secao-plaqueta-impressao,
          #secao-plaqueta-impressao * {
            visibility: visible !important;
          }
          #secao-plaqueta-impressao {
            position: fixed !important;
            left: 50% !important;
            top: 20mm !important;
            transform: translateX(-50%) !important;
            width: 105mm !important;
            height: 74mm !important;
            margin: 0 !important;
            padding: 5mm !important;
            background: #ffffff !important;
            color: #000000 !important;
            border: 2px solid #000000 !important;
            border-radius: 4px !important;
            box-shadow: none !important;
            page-break-inside: avoid !important;
          }
          #secao-plaqueta-impressao .nao-imprimir {
            display: none !important;
          }
        }
      `}</style>

      <Modal
        open={aberto}
        onClose={onFechar}
        title={`Identificação Física — ${jazigo.codigo}`}
        description="Plaqueta técnica patrimonial com QR Code para fixação na lápide/sepultura e fiscalização em campo."
        className="max-w-md"
      >
        <div className="space-y-4 py-2">
          {/* Card com a Plaqueta Formatada */}
          <div
            id="secao-plaqueta-impressao"
            className="border-2 border-border/80 bg-card rounded-lg p-4 shadow-sm relative overflow-hidden"
          >
            {/* Cabeçalho da Plaqueta */}
            <div className="flex items-center justify-between border-b border-border/60 pb-2.5 mb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Município · Gestão de Necrópoles
                </span>
                <span className="text-xs font-semibold text-foreground truncate max-w-[200px] block">
                  {jazigo.cemiterio?.nome ?? 'Cemitério Municipal'}
                </span>
              </div>
              <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider gap-1">
                <ShieldCheck className="h-3 w-3 text-primary" /> SIGCM
              </Badge>
            </div>

            {/* Conteúdo Central: QR Code + Dados Técnicos */}
            <div className="flex items-center gap-4">
              <div className="w-28 h-28 bg-white p-1 rounded border border-border/60 shrink-0 flex items-center justify-center">
                {dataUrl ? (
                  <img
                    src={dataUrl}
                    alt={`QR Code da unidade ${jazigo.codigo}`}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <QrIcon className="h-10 w-10 text-muted-foreground animate-pulse" />
                )}
              </div>

              <div className="space-y-1.5 flex-1 min-w-0">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase block font-medium">Código da Unidade</span>
                  <span className="font-mono text-lg font-bold text-foreground tabular-nums tracking-tight block">
                    {jazigo.codigo}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1 text-[11px]">
                  <div>
                    <span className="text-muted-foreground text-[10px] block">Setor / Quadra:</span>
                    <span className="font-mono font-semibold text-foreground">
                      {jazigo.setor?.codigo ?? '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px] block">Tipo:</span>
                    <span className="font-medium text-foreground capitalize">
                      {jazigo.tipo.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] pt-1 border-t border-border/40">
                  <span className="text-muted-foreground text-[10px] block">Capacidade Física:</span>
                  <span className="font-mono font-semibold text-foreground tabular-nums">
                    {jazigo.capacidade} gaveta(s)
                  </span>
                </div>
              </div>
            </div>

            {/* Ocupante(s) atual(is) — exibido só quando há inumação confirmada, nunca no QR Code */}
            {ocupantes.length > 0 && (
              <div className="mt-3 pt-2 border-t border-border/60 text-[11px]">
                <span className="text-muted-foreground text-[10px] uppercase block font-medium">
                  {ocupantes.length > 1 ? 'Ocupantes' : 'Ocupante'}
                </span>
                {ocupantes.map((oc) => (
                  <span key={oc.id} className="font-semibold text-foreground block truncate">
                    {oc.falecido?.nome ?? 'Restos não identificados'}
                  </span>
                ))}
              </div>
            )}

            {/* Rodapé da Plaqueta */}
            <div className="mt-3 pt-2 border-t border-border/60 flex items-center justify-between text-[9px] text-muted-foreground">
              <span>Leitura por câmera para consulta oficial</span>
              <span className="font-mono">{jazigo.id.toString().padStart(6, '0')}</span>
            </div>
          </div>

          {/* Link direto para cópia rápida */}
          <div className="bg-muted/40 p-2.5 rounded-md border border-border text-xs flex items-center justify-between gap-2">
            <span className="font-mono text-[11px] text-muted-foreground truncate select-all">
              {urlConsulta}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={copiarLink}
              className="h-7 text-xs px-2 shrink-0 gap-1"
            >
              {copiado ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
              {copiado ? 'Copiado' : 'Copiar'}
            </Button>
          </div>

          {/* Ações do Modal */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" size="sm" onClick={onFechar}>
              Fechar
            </Button>
            <Button size="sm" onClick={acionarImpressao} className="gap-1.5 font-medium">
              <Printer className="h-3.5 w-3.5" /> Imprimir Plaqueta
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
