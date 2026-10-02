import React from 'react';
import { Badge } from '@sysgov/ui';
import { cn } from '@/lib/utils';
import {
  FileText, Send, CheckCircle2, Clock, AlertTriangle,
  Archive, Ban, Hourglass, FileCheck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type StatusProposicao =
  | 'protocolado'
  | 'em_tramitacao_interna'
  | 'encaminhado'
  | 'recebido'
  | 'respondido'
  | 'aprovado'
  | 'rejeitado'
  | 'arquivado'
  | 'vencido';

/** Exportado pra telas que precisam do rótulo/cor sem renderizar o badge inteiro (ex.: Relatórios). */
export const statusConfig: Record<StatusProposicao, {
  label: string;
  variant: 'default' | 'success' | 'warning' | 'danger' | 'info';
  icon: LucideIcon;
}> = {
  protocolado:            { label: 'Protocolado',            variant: 'info',    icon: FileText },
  em_tramitacao_interna:  { label: 'Em Tramitação Interna',  variant: 'info',    icon: Hourglass },
  encaminhado:            { label: 'Encaminhado',            variant: 'warning', icon: Send },
  recebido:               { label: 'Recebido',               variant: 'info',    icon: CheckCircle2 },
  respondido:             { label: 'Respondido',             variant: 'success', icon: FileCheck },
  aprovado:               { label: 'Aprovado',               variant: 'success', icon: CheckCircle2 },
  rejeitado:              { label: 'Rejeitado',              variant: 'danger',  icon: Ban },
  arquivado:              { label: 'Arquivado',              variant: 'default', icon: Archive },
  vencido:                { label: 'Vencido',                variant: 'danger',  icon: AlertTriangle },
};

interface StatusBadgeProposicaoProps {
  status: StatusProposicao;
  className?: string;
}

export const StatusBadgeProposicao: React.FC<StatusBadgeProposicaoProps> = ({ status, className }) => {
  const config = statusConfig[status] ?? statusConfig.protocolado;
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={cn('gap-1', className)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
};