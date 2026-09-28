import React from 'react';
import { Search, Filter, X, Calendar, UserCheck } from 'lucide-react';
import { Button, Input, Select } from '@/components/ui';

export interface EstadoFiltrosOperacoes {
  busca: string;
  situacao: string;
  tipo: string;
  equipe: string;
  dataInicio: string;
  dataFim: string;
}

interface FiltrosAvancadosOperacoesProps {
  filtros: EstadoFiltrosOperacoes;
  onAlterarFiltros: (novos: Partial<EstadoFiltrosOperacoes>) => void;
  onLimparFiltros: () => void;
  totalAtivos: number;
}

export const FiltrosAvancadosOperacoes: React.FC<FiltrosAvancadosOperacoesProps> = ({
  filtros,
  onAlterarFiltros,
  onLimparFiltros,
  totalAtivos,
}) => {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3.5 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-2.5">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-primary" />
          <h3 className="text-xs font-semibold text-foreground">Filtros Avançados de Operações</h3>
          {totalAtivos > 0 && (
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
              {totalAtivos} {totalAtivos === 1 ? 'filtro ativo' : 'filtros ativos'}
            </span>
          )}
        </div>

        {totalAtivos > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onLimparFiltros}
            className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1 px-2"
          >
            <X className="h-3 w-3" />
            <span>Limpar filtros</span>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {/* Busca Textual Unificada */}
        <div className="lg:col-span-2">
          <label className="text-[11px] font-medium text-muted-foreground block mb-1">
            Busca Rápida (Nº OS, Falecido, Jazigo)
          </label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={filtros.busca}
              onChange={(e) => onAlterarFiltros({ busca: e.target.value })}
              placeholder="Digite número, nome ou túmulo..."
              className="text-xs pl-8 h-8"
            />
          </div>
        </div>

        {/* Situação da OS */}
        <div>
          <label className="text-[11px] font-medium text-muted-foreground block mb-1">
            Situação da OS
          </label>
          <Select
            value={filtros.situacao}
            onChange={(v) => onAlterarFiltros({ situacao: v })}
            options={[
              { value: 'todas', label: 'Todas as Situações' },
              { value: 'emitida', label: 'Emitida / Pendente' },
              { value: 'em_execucao', label: 'Em Execução' },
              { value: 'concluida', label: 'Concluída' },
              { value: 'suspensa', label: 'Suspensa' },
              { value: 'cancelada', label: 'Cancelada' },
            ]}
          />
        </div>

        {/* Tipo de Operação */}
        <div>
          <label className="text-[11px] font-medium text-muted-foreground block mb-1">
            Tipo de Operação
          </label>
          <Select
            value={filtros.tipo}
            onChange={(v) => onAlterarFiltros({ tipo: v })}
            options={[
              { value: 'todos', label: 'Todos os Tipos' },
              { value: 'inumacao', label: 'Inumação / Sepultamento' },
              { value: 'exumacao', label: 'Exumação' },
              { value: 'trasladacao', label: 'Trasladação' },
              { value: 'demolicao', label: 'Demolição / Obra' },
            ]}
          />
        </div>

        {/* Período Agendado: Data Início */}
        <div>
          <label className="text-[11px] font-medium text-muted-foreground block mb-1">
            Agendada De
          </label>
          <Input
            type="date"
            value={filtros.dataInicio}
            onChange={(e) => onAlterarFiltros({ dataInicio: e.target.value })}
            className="text-xs font-mono h-8"
          />
        </div>

        {/* Período Agendado: Data Fim */}
        <div>
          <label className="text-[11px] font-medium text-muted-foreground block mb-1">
            Agendada Até
          </label>
          <Input
            type="date"
            value={filtros.dataFim}
            onChange={(e) => onAlterarFiltros({ dataFim: e.target.value })}
            className="text-xs font-mono h-8"
          />
        </div>
      </div>
    </div>
  );
};
