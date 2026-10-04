import * as React from 'react';
import { User, ExternalLink, ShieldCheck, Mail, Phone } from 'lucide-react';
import { Card, CardContent } from './card';
import { Badge } from './badge';
import { Button } from './button';
import { PessoaVinculosList, type PessoaVinculoData } from './PessoaVinculosBadge';
import { cn } from '../lib/utils';

export interface PessoaCardData {
  id: number;
  nome: string;
  nome_social?: string | null;
  cpf_mascarado: string;
  status?: 'ativo' | 'inativo' | 'falecido';
  falecido?: boolean;
  data_falecimento?: string | null;
  email?: string | null;
  telefone?: string | null;
  vinculos?: PessoaVinculoData[];
}

export interface PessoaCardProps {
  pessoa: PessoaCardData;
  onViewDetails?: (id: number) => void;
  viewDetailsUrl?: string;
  compact?: boolean;
  className?: string;
}

export const PessoaCard: React.FC<PessoaCardProps> = ({
  pessoa,
  onViewDetails,
  viewDetailsUrl,
  compact = false,
  className,
}) => {
  const isFalecido = pessoa.falecido || pessoa.status === 'falecido';
  const isAtivo = !isFalecido && pessoa.status !== 'inativo';

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center justify-between p-3 rounded-lg border border-gov-border bg-white dark:bg-[#101a3a] dark:border-[#1a2a52]',
          className
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-9 rounded-full bg-gov-primary/10 text-gov-primary flex items-center justify-center shrink-0">
            <User className="size-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm text-gov-text-primary truncate">{pessoa.nome}</span>
              {pessoa.nome_social && (
                <span className="text-xs text-gov-text-secondary">({pessoa.nome_social})</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-gov-text-secondary mt-0.5">
              <span className="font-mono tabular-nums">{pessoa.cpf_mascarado}</span>
              {isFalecido ? (
                <span className="inline-flex items-center px-1.5 py-0 h-4 rounded text-[10px] font-semibold bg-neutral-800 text-neutral-200 border border-neutral-700">
                  Falecido(a)
                </span>
              ) : (
                <Badge variant={isAtivo ? 'success' : 'neutral'} className="text-[10px] px-1.5 py-0 h-4">
                  {isAtivo ? 'Ativo' : 'Inativo'}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {(onViewDetails || viewDetailsUrl) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewDetails?.(pessoa.id)}
            asChild={Boolean(viewDetailsUrl)}
            className="shrink-0 text-gov-primary hover:text-gov-primary-dark ml-2 text-xs h-8"
          >
            {viewDetailsUrl ? (
              <a href={viewDetailsUrl} target="_blank" rel="noreferrer">
                <span>Ver cadastro</span>
                <ExternalLink className="size-3.5 ml-1" />
              </a>
            ) : (
              <>
                <span>Ver cadastro</span>
                <ExternalLink className="size-3.5 ml-1" />
              </>
            )}
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={cn('overflow-hidden border-gov-border dark:border-[#1a2a52]', className)}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="size-11 rounded-full bg-gov-primary/10 text-gov-primary flex items-center justify-center shrink-0 mt-0.5">
              <User className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-semibold text-base text-gov-text-primary">{pessoa.nome}</h4>
                {pessoa.nome_social && (
                  <span className="text-xs text-gov-text-secondary italic">({pessoa.nome_social})</span>
                )}
                {isFalecido ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-neutral-800 text-neutral-200 border border-neutral-700">
                    Falecido(a) {pessoa.data_falecimento ? `(${pessoa.data_falecimento})` : ''}
                  </span>
                ) : (
                  <Badge variant={isAtivo ? 'success' : 'neutral'} className="text-xs">
                    {isAtivo ? 'Ativo' : 'Inativo'}
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-gov-text-secondary">
                <span className="flex items-center gap-1 shrink-0">
                  <ShieldCheck className="size-3.5 text-gov-primary" />
                  CPF: <strong className="font-mono tabular-nums text-gov-text-primary">{pessoa.cpf_mascarado}</strong>
                </span>
                {pessoa.email && (
                  <span className="flex items-center gap-1 truncate max-w-[240px]" title={pessoa.email}>
                    <Mail className="size-3.5 shrink-0" />
                    <span className="truncate">{pessoa.email}</span>
                  </span>
                )}
                {pessoa.telefone && (
                  <span className="flex items-center gap-1 font-mono tabular-nums shrink-0">
                    <Phone className="size-3.5" />
                    <span>{pessoa.telefone}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {(onViewDetails || viewDetailsUrl) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewDetails?.(pessoa.id)}
              asChild={Boolean(viewDetailsUrl)}
              className="shrink-0 text-xs h-8"
            >
              {viewDetailsUrl ? (
                <a href={viewDetailsUrl} target="_blank" rel="noreferrer">
                  <span>Ver cadastro civil</span>
                  <ExternalLink className="size-3.5 ml-1.5" />
                </a>
              ) : (
                <>
                  <span>Ver cadastro civil</span>
                  <ExternalLink className="size-3.5 ml-1.5" />
                </>
              )}
            </Button>
          )}
        </div>

        {pessoa.vinculos && pessoa.vinculos.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gov-border/60 dark:border-[#1a2a52]/60">
            <span className="text-xs font-medium text-gov-text-secondary block mb-1.5">
              Vínculos Funcionais:
            </span>
            <PessoaVinculosList vinculos={pessoa.vinculos} />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export interface PessoaSummaryProps {
  nome: string;
  cpf_mascarado: string;
  className?: string;
}

export const PessoaSummary: React.FC<PessoaSummaryProps> = ({
  nome,
  cpf_mascarado,
  className,
}) => {
  return (
    <div className={cn('inline-flex items-center gap-2 text-sm', className)}>
      <span className="font-medium text-gov-text-primary truncate">{nome}</span>
      <span className="text-xs text-gov-text-secondary font-mono tabular-nums bg-gov-border/30 dark:bg-white/5 px-1.5 py-0.5 rounded">
        {cpf_mascarado}
      </span>
    </div>
  );
};
