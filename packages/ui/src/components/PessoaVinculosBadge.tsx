import * as React from 'react';
import { Badge, type BadgeProps } from './badge';
import { cn } from '../lib/utils';

export type TipoVinculoPessoa =
  | 'servidor_carreira'
  | 'estagiario'
  | 'comissionado'
  | 'clt'
  | 'municipe'
  | 'contribuinte'
  | 'aluno'
  | 'paciente';

export interface PessoaVinculoData {
  id?: number;
  tipo_vinculo: TipoVinculoPessoa;
  matricula?: string | null;
  inicio?: string | null;
  fim?: string | null;
}

const tipoVinculoLabels: Record<TipoVinculoPessoa, string> = {
  servidor_carreira: 'Servidor Efetivo',
  comissionado: 'Comissionado',
  estagiario: 'Estagiário',
  clt: 'Empregado CLT',
  municipe: 'Munícipe',
  contribuinte: 'Contribuinte',
  aluno: 'Aluno',
  paciente: 'Paciente',
};

const tipoVinculoVariants: Record<TipoVinculoPessoa, BadgeProps['variant']> = {
  servidor_carreira: 'indigo',
  comissionado: 'gold',
  estagiario: 'cyan',
  clt: 'neutral',
  municipe: 'primary',
  contribuinte: 'warning',
  aluno: 'info',
  paciente: 'cyan',
};

export interface PessoaVinculosBadgeProps {
  vinculo: PessoaVinculoData;
  showMatricula?: boolean;
  className?: string;
}

export const PessoaVinculosBadge: React.FC<PessoaVinculosBadgeProps> = ({
  vinculo,
  showMatricula = true,
  className,
}) => {
  const label = tipoVinculoLabels[vinculo.tipo_vinculo] ?? vinculo.tipo_vinculo;
  const variant = tipoVinculoVariants[vinculo.tipo_vinculo] ?? 'neutral';

  return (
    <Badge variant={variant} className={cn('text-xs gap-1 font-medium', className)}>
      <span>{label}</span>
      {showMatricula && vinculo.matricula && (
        <span className="font-mono tabular-nums opacity-85 border-l border-current/25 pl-1 ml-0.5 text-[11px]">
          Matrícula: {vinculo.matricula}
        </span>
      )}
    </Badge>
  );
};

export interface PessoaVinculosListProps {
  vinculos?: PessoaVinculoData[];
  maxVisible?: number;
  className?: string;
}

export const PessoaVinculosList: React.FC<PessoaVinculosListProps> = ({
  vinculos = [],
  maxVisible = 3,
  className,
}) => {
  if (!vinculos || vinculos.length === 0) {
    return (
      <span className="text-xs text-gov-text-secondary/70 italic">Sem vínculos registrados</span>
    );
  }

  const visiveis = vinculos.slice(0, maxVisible);
  const restantes = vinculos.length - maxVisible;

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {visiveis.map((v, i) => (
        <PessoaVinculosBadge key={v.id ?? `${v.tipo_vinculo}-${i}`} vinculo={v} />
      ))}
      {restantes > 0 && (
        <Badge variant="neutral" className="text-xs">
          +{restantes}
        </Badge>
      )}
    </div>
  );
};
