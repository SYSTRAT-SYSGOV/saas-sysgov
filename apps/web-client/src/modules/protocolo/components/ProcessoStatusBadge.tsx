import React from 'react';
import { Badge } from '@sysgov/ui';
import type { ProtocoloSdk } from '@sysgov/sdk';

interface ProcessoStatusBadgeProps {
  status: ProtocoloSdk.ProcessoStatus;
  className?: string;
}

export function ProcessoStatusBadge({ status, className }: ProcessoStatusBadgeProps) {
  switch (status) {
    case 'aberto':
      return (
        <Badge variant="cyan" className={className}>
          Aberto
        </Badge>
      );
    case 'em_tramitacao':
      return (
        <Badge variant="indigo" className={className}>
          Em Tramitação
        </Badge>
      );
    case 'aguardando':
      return (
        <Badge variant="warning" className={className}>
          Aguardando
        </Badge>
      );
    case 'concluido':
      return (
        <Badge variant="success" className={className}>
          Concluído
        </Badge>
      );
    case 'arquivado':
      return (
        <Badge variant="neutral" className={className}>
          Arquivado
        </Badge>
      );
    default:
      return (
        <Badge variant="neutral" className={className}>
          {status}
        </Badge>
      );
  }
}
