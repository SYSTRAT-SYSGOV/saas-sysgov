import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface LogoTenantProps {
  /** `settings.customLogoUrl` do tenant. */
  src?: string | null;
  /** Nome do órgão: vira a inicial quando não há logo ou a imagem não carrega. */
  nome?: string | null;
  className?: string;
}

/** Logo do tenant no topo da home; sem logo (ou com a imagem quebrada), a inicial do nome do órgão. */
export const LogoTenant: React.FC<LogoTenantProps> = ({ src, nome, className }) => {
  const [falhou, setFalhou] = useState(false);

  // Um logo novo (troca de tenant ou de upload) merece nova tentativa.
  useEffect(() => { setFalhou(false); }, [src]);

  if (src && !falhou) {
    return (
      <img
        src={src}
        alt={nome ? `Logo de ${nome}` : 'Logo do órgão'}
        onError={() => setFalhou(true)}
        className={cn('h-14 w-14 shrink-0 rounded-2xl border border-border bg-white object-contain p-1.5', className)}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      data-testid="logo-tenant-inicial"
      className={cn('flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-xl font-bold text-primary', className)}
    >
      {nome?.trim().charAt(0).toUpperCase() || 'S'}
    </span>
  );
};
