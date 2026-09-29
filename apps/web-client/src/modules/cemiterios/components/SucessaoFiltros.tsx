import React from 'react';
import { Search, RotateCcw, Filter } from 'lucide-react';
import { Button, Input, Select, Badge } from '@/components/ui';
import type { EstadoSucessao, ViaSucessao } from '../api';
import { ESTADO_LABELS } from '../hooks/useSucessaoTransicoes';
import { VIA_LABELS } from './sucessao.utils';

export interface SucessaoFiltrosState {
  estado: EstadoSucessao | 'todos';
  via: ViaSucessao | 'todas';
  dataFalecimentoInicio: string;
  dataFalecimentoFim: string;
  busca: string;
}

export const SUCESSAO_FILTROS_INICIAIS: SucessaoFiltrosState = {
  estado: 'todos',
  via: 'todas',
  dataFalecimentoInicio: '',
  dataFalecimentoFim: '',
  busca: '',
};

const ESTADO_OPCOES = [
  { value: 'todos', label: 'Todas as situações' },
  ...(Object.entries(ESTADO_LABELS) as [EstadoSucessao, string][]).map(([value, label]) => ({ value, label })),
];

const VIA_OPCOES = [
  { value: 'todas', label: 'Todas as vias' },
  ...(Object.entries(VIA_LABELS) as [ViaSucessao, string][]).map(([value, label]) => ({ value, label })),
];

export interface SucessaoFiltrosProps {
  filtros: SucessaoFiltrosState;
  onFiltrosChange: (novos: Partial<SucessaoFiltrosState>) => void;
  onLimparFiltros: () => void;
  totalRegistros: number;
  carregando?: boolean;
}

/** Filtros avançados da sub-aba Processos de Sucessão — mesmo padrão de ConcessoesFiltros. */
export const SucessaoFiltros: React.FC<SucessaoFiltrosProps> = ({
  filtros,
  onFiltrosChange,
  onLimparFiltros,
  totalRegistros,
  carregando = false,
}) => {
  const [expandido, setExpandido] = React.useState(false);

  const filtrosAtivos = [
    Boolean(filtros.estado && filtros.estado !== 'todos'),
    Boolean(filtros.via && filtros.via !== 'todas'),
    Boolean(filtros.dataFalecimentoInicio),
    Boolean(filtros.dataFalecimentoFim),
    Boolean(filtros.busca.trim()),
  ].filter(Boolean).length;

  const temFiltroAtivo = filtrosAtivos > 0;

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3.5 shadow-2xs">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-primary shrink-0" />
          <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Filtros de Processos</span>
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
            <strong className="text-foreground">{totalRegistros}</strong> {totalRegistros === 1 ? 'processo' : 'processos'}
          </span>
          {temFiltroAtivo && (
            <Button variant="ghost" size="sm" onClick={onLimparFiltros} disabled={carregando} className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1.5 px-2">
              <RotateCcw className="h-3 w-3" /> Limpar Filtros
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div>
          <Select
            label="Situação"
            value={filtros.estado}
            onChange={(val) => onFiltrosChange({ estado: (val as SucessaoFiltrosState['estado']) || 'todos' })}
            options={ESTADO_OPCOES}
          />
        </div>
        <div>
          <Select
            label="Via de Sucessão"
            value={filtros.via}
            onChange={(val) => onFiltrosChange({ via: (val as SucessaoFiltrosState['via']) || 'todas' })}
            options={VIA_OPCOES}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">Buscar (processo, herdeiro, concessão)</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Ex.: PROC-SUC-2026/..., JAZ-042, Maria..."
              value={filtros.busca}
              onChange={(e) => onFiltrosChange({ busca: e.target.value })}
              className="pl-8 text-xs font-mono h-9"
            />
          </div>
        </div>
      </div>

      {(expandido || temFiltroAtivo) && (
        <div className="pt-3 border-t border-border/50 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-muted/10 p-3 rounded-md">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Falecimento a partir de</label>
            <Input
              type="date"
              value={filtros.dataFalecimentoInicio}
              onChange={(e) => onFiltrosChange({ dataFalecimentoInicio: e.target.value })}
              className="text-xs h-9"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Falecimento até</label>
            <Input
              type="date"
              value={filtros.dataFalecimentoFim}
              onChange={(e) => onFiltrosChange({ dataFalecimentoFim: e.target.value })}
              className="text-xs h-9"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SucessaoFiltros;
