import React from 'react';
import { Search, RotateCcw, Filter } from 'lucide-react';
import { Button, Input, Select, Badge } from '@/components/ui';
import type { Setor, FiltrosConcessoesAvancados } from '../api';

export const MODALIDADE_OPCOES = [
  { value: 'todas', label: 'Todas as modalidades' },
  { value: 'temporaria', label: 'Temporária' },
  { value: 'perpetua', label: 'Perpétua' },
];

export const SITUACAO_OPCOES = [
  { value: 'todas', label: 'Todas as situações' },
  { value: 'vigente', label: 'Vigente' },
  { value: 'expirada', label: 'Expirada' },
  { value: 'extinta', label: 'Extinta' },
];

export const FINANCEIRO_OPCOES = [
  { value: 'todas', label: 'Todas as situações fiscais' },
  { value: 'adimplente', label: 'Adimplente (sem débitos)' },
  { value: 'inadimplente', label: 'Inadimplente (débitos vencidos)' },
  { value: 'sem_guias', label: 'Sem guias emitidas' },
];

export const VENCIMENTO_OPCOES = [
  { value: 'todas', label: 'Qualquer prazo' },
  { value: '30', label: 'A vencer em até 30 dias' },
  { value: '60', label: 'A vencer em até 60 dias' },
  { value: '90', label: 'A vencer em até 90 dias' },
];

export interface ConcessoesFiltrosProps {
  filtros: FiltrosConcessoesAvancados;
  onFiltrosChange: (novos: Partial<FiltrosConcessoesAvancados>) => void;
  onLimparFiltros: () => void;
  setoresDisponiveis: Setor[];
  totalRegistros: number;
  carregando?: boolean;
}

export const ConcessoesFiltros: React.FC<ConcessoesFiltrosProps> = ({
  filtros,
  onFiltrosChange,
  onLimparFiltros,
  setoresDisponiveis,
  totalRegistros,
  carregando = false,
}) => {
  const opcoesSetores = [
    { value: 'todos', label: 'Todos os setores/quadras' },
    ...setoresDisponiveis.map((s) => ({ value: String(s.id), label: s.descricao ? `${s.codigo} (${s.descricao})` : `Setor ${s.codigo}` })),
  ];

  const [expandido, setExpandido] = React.useState(false);

  const filtrosAtivos = [
    Boolean(filtros.setorId),
    Boolean(filtros.modalidade && filtros.modalidade !== 'todas'),
    Boolean(filtros.situacao && filtros.situacao !== 'todas'),
    Boolean(filtros.pendenciaRegularizacao),
    Boolean(filtros.financeiro && filtros.financeiro !== 'todas'),
    Boolean(filtros.venceEm && filtros.venceEm !== 'todas'),
    Boolean(filtros.busca.trim()),
  ].filter(Boolean).length;

  const temFiltroAtivo = filtrosAtivos > 0;

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3.5 shadow-2xs">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-primary shrink-0" />
          <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Filtros Avançados de Concessões</span>
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
            <strong className="text-foreground">{totalRegistros}</strong> {totalRegistros === 1 ? 'concessão' : 'concessões'}
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
            value={filtros.situacao ?? 'todas'}
            onChange={(val) => onFiltrosChange({ situacao: (val as FiltrosConcessoesAvancados['situacao']) || 'todas' })}
            options={SITUACAO_OPCOES}
          />
        </div>
        <div>
          <Select
            label="Modalidade"
            value={filtros.modalidade ?? 'todas'}
            onChange={(val) => onFiltrosChange({ modalidade: (val as FiltrosConcessoesAvancados['modalidade']) || 'todas' })}
            options={MODALIDADE_OPCOES}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">Buscar (número, processo, jazigo, concessionário)</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Ex.: 12/2026, PROC-2026/..., JAZ-042, Maria..."
              value={filtros.busca}
              onChange={(e) => onFiltrosChange({ busca: e.target.value })}
              className="pl-8 text-xs font-mono h-9"
            />
          </div>
        </div>
      </div>

      {(expandido || temFiltroAtivo) && (
        <div className="pt-3 border-t border-border/50 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-muted/10 p-3 rounded-md">
          <div>
            <Select
              label="Setor / Quadra"
              value={filtros.setorId ?? 'todos'}
              onChange={(val) => onFiltrosChange({ setorId: !val || val === 'todos' ? null : val })}
              options={opcoesSetores}
              disabled={setoresDisponiveis.length === 0}
            />
          </div>
          <div>
            <Select
              label="Situação Financeira"
              value={filtros.financeiro ?? 'todas'}
              onChange={(val) => onFiltrosChange({ financeiro: (val as FiltrosConcessoesAvancados['financeiro']) || 'todas' })}
              options={FINANCEIRO_OPCOES}
            />
          </div>
          <div>
            <Select
              label="Vencimento (temporárias)"
              value={filtros.venceEm ?? 'todas'}
              onChange={(val) => onFiltrosChange({ venceEm: (val as FiltrosConcessoesAvancados['venceEm']) || 'todas' })}
              options={VENCIMENTO_OPCOES}
            />
          </div>
          <div>
            <Select
              label="Pendência de Regularização"
              value={filtros.pendenciaRegularizacao ? 'sim' : 'todas'}
              onChange={(val) => onFiltrosChange({ pendenciaRegularizacao: val === 'sim' })}
              options={[
                { value: 'todas', label: 'Todas' },
                { value: 'sim', label: 'Somente com pendência (sucessão)' },
              ]}
            />
          </div>
        </div>
      )}
    </div>
  );
};
