import React, { useState } from 'react';
import { ExternalLink, Navigation, Copy, Check, QrCode } from 'lucide-react';
import { Button, Modal } from '@/components/ui';

interface ModalComoChegarProps {
  aberto: boolean;
  onFechar: () => void;
  codigoJazigo: string;
  nomeCemiterio: string;
  lat: number;
  lng: number;
  distanciaPortariaMetros?: number | null;
}

export const ModalComoChegar: React.FC<ModalComoChegarProps> = ({
  aberto,
  onFechar,
  codigoJazigo,
  nomeCemiterio,
  lat,
  lng,
  distanciaPortariaMetros,
}) => {
  const [copiado, setCopiado] = useState(false);

  if (!aberto) return null;

  const urlGoogle = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  const urlWaze = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
  const urlQrCode = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(urlGoogle)}`;

  const copiarLink = async () => {
    try {
      await navigator.clipboard.writeText(urlGoogle);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <Modal
      open={aberto}
      onOpenChange={(open) => !open && onFechar()}
      title={`Como Chegar ao Jazigo ${codigoJazigo}`}
    >
      <div className="space-y-4 p-4 text-foreground sm:p-6">
        <div className="flex items-center gap-2">
          <Navigation className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Como Chegar ao Jazigo {codigoJazigo}</h2>
        </div>

        <p className="text-sm text-muted-foreground">
          Localização georreferenciada no <strong className="text-foreground">{nomeCemiterio}</strong>.
          {distanciaPortariaMetros != null && (
            <span className="block mt-1 font-mono text-xs text-primary font-medium">
              Distância a pé a partir da portaria principal: aproximadamente {distanciaPortariaMetros.toFixed(0)} metros.
            </span>
          )}
        </p>

        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-muted/40 p-4">
          <div className="relative mb-2 flex h-44 w-44 items-center justify-center rounded-md bg-white p-2 shadow-sm">
            <img
              src={urlQrCode}
              alt={`QR Code para localização do jazigo ${codigoJazigo}`}
              className="h-full w-full object-contain"
              loading="lazy"
            />
          </div>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <QrCode className="h-3.5 w-3.5" /> Aponte a câmera do celular para abrir o trajeto
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-3">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>Coordenadas Geográficas:</span>
            <span className="font-mono text-foreground font-semibold">{lat.toFixed(6)}, {lng.toFixed(6)}</span>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <a
              href={urlGoogle}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Abrir no Google Maps
            </a>
            <a
              href={urlWaze}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-2 text-xs font-medium text-secondary-foreground transition-opacity hover:opacity-90"
            >
              <Navigation className="h-3.5 w-3.5" /> Abrir no Waze
            </a>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" size="sm" onClick={copiarLink} className="gap-1.5">
            {copiado ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            {copiado ? 'Link Copiado!' : 'Copiar Link'}
          </Button>
          <Button variant="ghost" size="sm" onClick={onFechar}>
            Fechar
          </Button>
        </div>
      </div>
    </Modal>
  );
};
