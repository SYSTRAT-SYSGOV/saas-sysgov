import React from 'react';
import { Badge } from '@sysgov/ui';
import { ShieldCheck, ExternalLink } from 'lucide-react';

export interface SignatureStatusProps {
  tipo: 'sha256_interno' | 'icp_brasil';
  hash?: string | null;
  urlDocumentoAssinado?: string | null;
  certificadoSerial?: string | null;
  assinadoEm?: string | null;
  className?: string;
}

export const SignatureStatus: React.FC<SignatureStatusProps> = ({
  tipo,
  hash,
  urlDocumentoAssinado,
  certificadoSerial,
  assinadoEm,
  className = '',
}) => {
  const isIcp = tipo === 'icp_brasil';
  const safeHash = hash || '';
  const displayHash =
    safeHash.length > 16
      ? `${safeHash.slice(0, 8)}...${safeHash.slice(-8)}`
      : safeHash || 'Pendente';

  return (
    <div
      className={`flex items-center gap-2 p-2 rounded-md border bg-muted/30 dark:bg-muted/10 border-border/50 ${className}`}
      data-testid="signature-status"
    >
      <div className="flex items-center gap-1.5 shrink-0">
        {isIcp ? (
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <div className="h-3.5 w-3.5 rounded-full bg-slate-400 dark:bg-slate-600" />
        )}
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {isIcp ? 'Assinatura ICP-Brasil' : 'Selo Interno SHA-256'}
        </span>
      </div>

      <div className="h-4 w-px bg-border mx-1" />

      <div className="flex items-center gap-2 overflow-hidden">
        <span
          className="font-mono text-[10px] tabular-nums text-foreground truncate max-w-[140px]"
          title={safeHash || undefined}
        >
          {displayHash}
        </span>

        {isIcp && urlDocumentoAssinado && (
          <a
            href={urlDocumentoAssinado}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline flex items-center gap-0.5 text-[10px] font-medium"
            title="Validar certificado no PSC externo"
          >
            Validar <ExternalLink className="h-2.5 w-2.5" />
          </a>
        )}
      </div>

      {isIcp && certificadoSerial && (
        <Badge variant="outline" className="text-[9px] font-mono ml-auto">
          SN: {certificadoSerial.slice(-8)}
        </Badge>
      )}
    </div>
  );
};

