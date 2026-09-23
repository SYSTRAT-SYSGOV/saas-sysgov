import React from 'react';
import { Search, RotateCcw, Filter, Building2, Layers } from 'lucide-react';
import { Button, Input, Select, Badge } from '@sysgov/ui';
import { ESTADOS, type Parque, type Setor } from '../api';

export const TIPOS_JAZIGO_OPCOES = [
  { value: 'todos', label: 'Todos os tipos' },
  { value: 'jazigo', label: 'Jazigo Tradicional' },
  { value: 'gaveta', label: 'Gaveta Modular' },
  { value: 'ossuario', label: 'Ossuário / Nicho' },
  { value: 'cova_publica', label: 'Cova Pública' },
];

export const FAIXAS_OCUPACAO = [
  { value: 'todas', label: 'Todas as ocupações' },
  { value: 'vazio', label: 'Totalmente Livre (0%)' },
  { value: 'parcial', label: 'Parcialmente Ocupado' },
  { value: 'lotado', label: 'Capacidade Esgotada (100%)' },
];

export interface InventarioFiltrosState {
  parqueId: string | null;
  setorId: string | null;
  tipo: string | null;
  estado: string | null;
  faixaOcupacao: 'todas' | 'vazio' | 'parcial' | 'lotado';
  busca: string;
}

export interface InventarioFiltrosProps {
  filtros: InventarioFiltrosState;
  onFiltrosChange: (novos: Partial<InventarioFiltrosState>) => void;
  onLimparFiltros: () => void;
  parques: Parque[];
  setoresDisponiveis: Setor[];
  totalRegistros: number;
  totalFiltrados: number;
  carregando?: boolean;
}

export const InventarioFiltros: React.FC<InventarioFiltrosProps> = ({
  filtros,
  onFiltrosChange,
  onLimparFiltros,
  parques,
  setoresDisponiveis,
  totalRegistros,
  totalFiltrados,
  carregando = false,
}) => {
  const opcoesParques = [
    { value: 'todos', label: 'Todos os cemitérios' },
    ...parques.map((p) => ({
      value: String(p.id),
      label: `${p.codigo} — ${p.nome}`,
    })),
  ];

  const opcoesSetores = [
    { value: 'todos', label: 'Todos os setores/quadras' },
    ...setoresDisponiveis.map((s) => ({
      value: String(s.id),
      label: s.descricao ? `${s.codigo} (${s.descricao})` : `Setor ${s.codigo}`,
    })),
  ];

  const opcoesEstados = [
    { value: 'todos', label: 'Todos os estados' },
    ...Object.entries(ESTADOS).map(([val, item]) => ({
      value: val,
      label: item.rotulo,
    })),
  ];

  const temFiltroAtivo =
    Boolean(filtros.parqueId) ||
    Boolean(filtros.setorId) ||
    (Boolean(filtros.tipo) && filtros.tipo !== 'todos') ||
    (Boolean(filtros.estado) && filtros.estado !== 'todos') ||
    filtros.faixaOcupacao !== 'todas' ||
    Boolean(filtros.busca.trim());

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3.5 shadow-2xs">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-primary shrink-0" />
          <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
            Filtros Avançados de Inventário
          </span>
          {temFiltroAtivo && (
            <Badge variant="outline" className="text-[10px] text-primary border-primary/40 font-mono">
              Filtros Ativos
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground font-mono tabular-nums">
            Exibindo <strong className="text-foreground">{totalFiltrados}</strong> de{' '}
            <strong className="text-foreground">{totalRegistros}</strong> unidades
          </span>
          {temFiltroAtivo && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onLimparFiltros}
              disabled={carregando}
              className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1.5 px-2"
              title="Limpar todos os filtros"
            >
              <RotateCcw className="h-3 w-3" />
              Limpar
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {/* Filtro: Cemitério */}
        <div>
          <Select
            label="Cemitério / Necrópole"
            value={filtros.parqueId ?? 'todos'}
            onChange={(val) => {
              const novoParque = !val || val === 'todos' ? null : val;
              // Ao mudar de cemitério, reseta setor se ele não pertencer ao novo parque
              onFiltrosChange({ parqueId: novoParque, setorId: null });
            }}
            options={opcoesParques}
          />
        </div>

        {/* Filtro: Setor/Quadra */}
        <div>
          <Select
            label="Setor / Quadra"
            value={filtros.setorId ?? 'todos'}
            onChange={(val) => {
              onFiltrosChange({ setorId: !val || val === 'todos' ? null : val });
            }}
            options={opcoesSetores}
            disabled={setoresDisponiveis.length === 0}
          />
        </div>

        {/* Filtro: Tipo de Unidade */}
        <div>
          <Select
            label="Tipo de Sepultura"
            value={filtros.tipo ?? 'todos'}
            onChange={(val) => {
              onFiltrosChange({ tipo: !val || val === 'todos' ? null : val });
            }}
            options={TIPOS_JAZIGO_OPCOES}
          />
        </div>

        {/* Filtro: Estado Operacional */}
        <div>
          <Select
            label="Estado Operacional"
            value={filtros.estado ?? 'todos'}
            onChange={(val) => {
              onFiltrosChange({ estado: !val || val === 'todos' ? null : val });
            }}
            options={opcoesEstados}
          />
        </div>

        {/* Filtro: Faixa de Ocupação */}
        <div>
          <Select
            label="Nível de Ocupação"
            value={filtros.faixaOcupacao}
            onChange={(val) => {
              onFiltrosChange({
                faixaOcupacao: (val as InventarioFiltrosState['faixaOcupacao']) || 'todas',
              });
            }}
            options={FAIXAS_OCUPACAO}
          />
        </div>

        {/* Busca Textual */}
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">
            Buscar Código / Termo
          </label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Ex: JAZ-042..."
              value={filtros.busca}
              onChange={(e) => onFiltrosChange({ busca: e.target.value })}
              className="pl-8 text-xs font-mono h-9"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
