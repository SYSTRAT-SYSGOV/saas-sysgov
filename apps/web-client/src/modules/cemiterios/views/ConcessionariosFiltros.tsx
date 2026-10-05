import React from 'react';
import { Search, RotateCcw, Filter } from 'lucide-react';
import { Button, Input, Select, Badge } from '@/components/ui';

export interface FiltrosConcessionarios {
  busca: string;
  tipoDoc: 'todos' | 'cpf' | 'cnpj';
  origem: 'todos' | 'mdm' | 'legado';
  situacaoVital: 'todas' | 'regular' | 'falecido';
  baseLegal: 'todas' | 'execucao_contrato' | 'obrigacao_legal' | 'consentimento';
}

export const TIPO_DOC_OPCOES = [
  { value: 'todos', label: 'Todos os tipos de doc.' },
  { value: 'cpf', label: 'Pessoa Física (CPF)' },
  { value: 'cnpj', label: 'Pessoa Jurídica (CNPJ)' },
];

export const ORIGEM_OPCOES = [
  { value: 'todos', label: 'Todas as origens' },
  { value: 'mdm', label: 'Vinculado ao MDM (Cadastro Central)' },
  { value: 'legado', label: 'Registro Legado (Sem vínculo MDM)' },
];

export const SITUACAO_VITAL_OPCOES = [
  { value: 'todas', label: 'Todas as situações vitais' },
  { value: 'regular', label: 'Regular (Titular Vivo)' },
  { value: 'falecido', label: 'Titular Falecido (Alerta de Sucessão)' },
];

export const BASE_LEGAL_OPCOES = [
  { value: 'todas', label: 'Todas as bases legais' },
  { value: 'execucao_contrato', label: 'Execução de contrato' },
  { value: 'obrigacao_legal', label: 'Obrigação legal' },
  { value: 'consentimento', label: 'Consentimento do titular' },
];

export interface ConcessionariosFiltrosProps {
  filtros: FiltrosConcessionarios;
  onFiltrosChange: (novos: Partial<FiltrosConcessionarios>) => void;
  onLimparFiltros: () => void;
  totalRegistros: number;
  carregando?: boolean;
}

export const ConcessionariosFiltros: React.FC<ConcessionariosFiltrosProps> = ({
  filtros,
  onFiltrosChange,
  onLimparFiltros,
  totalRegistros,
  carregando = false,
}) => {
  const [expandido, setExpandido] = React.useState(false);

  const filtrosAtivos = [
    Boolean(filtros.tipoDoc && filtros.tipoDoc !== 'todos'),
    Boolean(filtros.origem && filtros.origem !== 'todos'),
    Boolean(filtros.situacaoVital && filtros.situacaoVital !== 'todas'),
    Boolean(filtros.baseLegal && filtros.baseLegal !== 'todas'),
    Boolean(filtros.busca.trim()),
  ].filter(Boolean).length;

  const temFiltroAtivo = filtrosAtivos > 0;

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3.5 shadow-2xs">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-primary shrink-0" />
          <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Filtros Avançados de Concessionários</span>
          {temFiltroAtivo && (
            <Badge variant="outline" className="text-[10px] text-primary border-primary/40 font-mono">
              {filtrosAtivos} {filtrosAtivos === 1 ? 'filtro ativo' : 'filtros ativos'}
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpandido((prev) => !prev)}
            className="h-7 text-xs px-2.5 gap-1.5 font-medium ml-2"
          >
            {expandido ? 'Menos Filtros' : 'Filtros Avançados'}
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground font-mono tabular-nums">
            <strong className="text-foreground">{totalRegistros}</strong> {totalRegistros === 1 ? 'concessionário' : 'concessionários'}
          </span>
          {temFiltroAtivo && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onLimparFiltros}
              disabled={carregando}
              className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1.5 px-2"
            >
              <RotateCcw className="h-3 w-3" /> Limpar Filtros
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={filtros.busca}
            onChange={(e) => onFiltrosChange({ busca: e.target.value })}
            placeholder="Buscar concessionário por nome, CPF/CNPJ mascarado, e-mail ou telefone..."
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="w-full sm:w-48 shrink-0">
          <Select
            value={filtros.origem}
            onChange={(val) => onFiltrosChange({ origem: (val as FiltrosConcessionarios['origem']) || 'todos' })}
            options={ORIGEM_OPCOES}
            placeholder="Origem cadastral"
          />
        </div>

        <div className="w-full sm:w-56 shrink-0">
          <Select
            value={filtros.situacaoVital}
            onChange={(val) => onFiltrosChange({ situacaoVital: (val as FiltrosConcessionarios['situacaoVital']) || 'todas' })}
            options={SITUACAO_VITAL_OPCOES}
            placeholder="Situação vital"
          />
        </div>
      </div>

      {expandido && (
        <div className="pt-3 border-t border-border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">Tipo de Documento</label>
            <Select
              value={filtros.tipoDoc}
              onChange={(val) => onFiltrosChange({ tipoDoc: (val as FiltrosConcessionarios['tipoDoc']) || 'todos' })}
              options={TIPO_DOC_OPCOES}
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">Origem no Cadastro Central</label>
            <Select
              value={filtros.origem}
              onChange={(val) => onFiltrosChange({ origem: (val as FiltrosConcessionarios['origem']) || 'todos' })}
              options={ORIGEM_OPCOES}
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">Situação Vital / Sucessão</label>
            <Select
              value={filtros.situacaoVital}
              onChange={(val) => onFiltrosChange({ situacaoVital: (val as FiltrosConcessionarios['situacaoVital']) || 'todas' })}
              options={SITUACAO_VITAL_OPCOES}
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">Base Legal (LGPD)</label>
            <Select
              value={filtros.baseLegal}
              onChange={(val) => onFiltrosChange({ baseLegal: (val as FiltrosConcessionarios['baseLegal']) || 'todas' })}
              options={BASE_LEGAL_OPCOES}
            />
          </div>
        </div>
      )}
    </div>
  );
};
