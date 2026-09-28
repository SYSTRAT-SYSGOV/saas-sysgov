import React from 'react';
import { Search, RotateCcw, Filter, Building2, Layers, User } from 'lucide-react';
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

export const OPCOES_CONCESSAO = [
  { value: 'todas', label: 'Todas as concessões' },
  { value: 'com_concessao', label: 'Com Concessão Vigente' },
  { value: 'sem_concessao', label: 'Sem Concessão (Vago)' },
  { value: 'vencida', label: 'Concessão Vencida' },
  { value: 'sucessao', label: 'Em Processo de Sucessão' },
];

export const OPCOES_FINANCEIRO = [
  { value: 'todas', label: 'Todas as situações fiscais' },
  { value: 'adimplente', label: 'Adimplente (Sem débitos)' },
  { value: 'inadimplente', label: 'Inadimplente (Débitos vencidos)' },
  { value: 'sem_guias', label: 'Sem guias emitidas' },
];

export const OPCOES_SIG = [
  { value: 'todos', label: 'Todos (Mapeamento SIG)' },
  { value: 'com_gps', label: 'Georreferenciados (GPS)' },
  { value: 'sem_gps', label: 'Sem coordenadas GPS' },
];

export const OPCOES_REGULATORIAS = [
  { value: 'todos', label: 'Todos os status regulatórios' },
  { value: 'exumacao_elegivel', label: 'Elegível p/ Exumação' },
  { value: 'concessao_vencida', label: 'Concessão Vencida' },
  { value: 'concessao_a_vencer', label: 'Concessão a Vencer' },
  { value: 'critico', label: 'Crítico / Manutenção' },
];

export interface InventarioFiltrosState {
  parqueId: string | null;
  setorId: string | null;
  tipo: string | null;
  estado: string | null;
  faixaOcupacao: 'todas' | 'vazio' | 'parcial' | 'lotado';
  concessaoStatus?: 'todas' | 'com_concessao' | 'sem_concessao' | 'vencida' | 'sucessao';
  financeiroStatus?: 'todas' | 'adimplente' | 'inadimplente' | 'sem_guias';
  georreferenciado?: 'todos' | 'com_gps' | 'sem_gps';
  criterioRegulatorio?: 'todos' | 'exumacao_elegivel' | 'concessao_vencida' | 'concessao_a_vencer' | 'critico';
  busca: string;
  sepultado?: string;
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
  ocultarFiltroCemiterio?: boolean;
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
  ocultarFiltroCemiterio = false,
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

  const [expandido, setExpandido] = React.useState(true);

  const filtrosAtivos = [
    Boolean(filtros.parqueId),
    Boolean(filtros.setorId),
    Boolean(filtros.tipo && filtros.tipo !== 'todos'),
    Boolean(filtros.estado && filtros.estado !== 'todos'),
    filtros.faixaOcupacao !== 'todas',
    Boolean(filtros.concessaoStatus && filtros.concessaoStatus !== 'todas'),
    Boolean(filtros.financeiroStatus && filtros.financeiroStatus !== 'todas'),
    Boolean(filtros.georreferenciado && filtros.georreferenciado !== 'todos'),
    Boolean(filtros.criterioRegulatorio && filtros.criterioRegulatorio !== 'todos'),
    Boolean(filtros.busca.trim()),
    Boolean(filtros.sepultado?.trim()),
  ].filter(Boolean).length;

  const temFiltroAtivo = filtrosAtivos > 0;
  const temFiltroAvancadoAtivo = [
    filtros.faixaOcupacao !== 'todas',
    Boolean(filtros.concessaoStatus && filtros.concessaoStatus !== 'todas'),
    Boolean(filtros.financeiroStatus && filtros.financeiroStatus !== 'todas'),
    Boolean(filtros.georreferenciado && filtros.georreferenciado !== 'todos'),
    Boolean(filtros.criterioRegulatorio && filtros.criterioRegulatorio !== 'todos'),
    Boolean(filtros.sepultado?.trim()),
  ].some(Boolean);

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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpandido((prev) => !prev)}
            className={`h-7 text-xs px-2.5 gap-1.5 font-medium ml-2 ${
              temFiltroAvancadoAtivo ? 'border-primary/50 text-primary bg-primary/5' : ''
            }`}
          >
            <span>{expandido ? 'Menos Filtros' : 'Filtros Avançados'}</span>
            {temFiltroAvancadoAtivo && !expandido && (
              <span className="h-1.5 w-1.5 rounded-full bg-primary inline-block" />
            )}
          </Button>
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
              Limpar Filtros
            </Button>
          )}
        </div>
      </div>

      {/* Linha 1: Filtros Principais */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 ${ocultarFiltroCemiterio ? 'xl:grid-cols-4' : 'xl:grid-cols-5'} gap-3`}>
        {/* Filtro: Cemitério */}
        {!ocultarFiltroCemiterio && (
          <div>
            <Select
              label="Cemitério / Necrópole"
              value={filtros.parqueId ?? 'todos'}
              onChange={(val) => {
                const novoParque = !val || val === 'todos' ? null : val;
                onFiltrosChange({ parqueId: novoParque, setorId: null });
              }}
              options={opcoesParques}
            />
          </div>
        )}

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

      {/* Linha 2: Filtros Avançados Expansíveis */}
      {(expandido || temFiltroAvancadoAtivo) && (
        <div className="pt-3 border-t border-border/50 space-y-3 bg-muted/10 p-3 rounded-md">
          {/* Campo de Livre Pesquisa do Sepultado */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-primary" />
              <span>Pesquisa Livre de Sepultado (Nome, CPF, Certidão de Óbito, Médico, Cartório...)</span>
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Digite o nome do falecido, certidão de óbito, cartório, médico/CRM, coveiro..."
                value={filtros.sepultado ?? ''}
                onChange={(e) => onFiltrosChange({ sepultado: e.target.value })}
                className="pl-8 text-xs font-mono h-9 bg-background"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {/* Filtro: Situação da Concessão */}
            <div>
              <Select
                label="Situação da Concessão"
                value={filtros.concessaoStatus ?? 'todas'}
                onChange={(val) => {
                  onFiltrosChange({
                    concessaoStatus: (val as InventarioFiltrosState['concessaoStatus']) || 'todas',
                  });
                }}
                options={OPCOES_CONCESSAO}
              />
            </div>

          {/* Filtro: Situação Fiscal / Financeira */}
          <div>
            <Select
              label="Situação Financeira"
              value={filtros.financeiroStatus ?? 'todas'}
              onChange={(val) => {
                onFiltrosChange({
                  financeiroStatus: (val as InventarioFiltrosState['financeiroStatus']) || 'todas',
                });
              }}
              options={OPCOES_FINANCEIRO}
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

          {/* Filtro: Georreferenciamento SIG */}
          <div>
            <Select
              label="Georreferenciamento (SIG)"
              value={filtros.georreferenciado ?? 'todos'}
              onChange={(val) => {
                onFiltrosChange({
                  georreferenciado: (val as InventarioFiltrosState['georreferenciado']) || 'todos',
                });
              }}
              options={OPCOES_SIG}
            />
          </div>

            <div>
              <Select
                label="Alerta Regulatório"
                value={filtros.criterioRegulatorio ?? 'todos'}
                onChange={(val) => {
                  onFiltrosChange({
                    criterioRegulatorio: (val as InventarioFiltrosState['criterioRegulatorio']) || 'todos',
                  });
                }}
                options={OPCOES_REGULATORIAS}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
