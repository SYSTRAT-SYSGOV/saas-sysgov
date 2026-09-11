import React from 'react';
import { Button, Select } from '@sysgov/ui';
import { Plus, Trash2 } from 'lucide-react';
import type { FaseLicita, GrauPrioridade, Processo, StatusDfd, StatusProcesso } from '@sysgov/sdk';

/**
 * Um filtro da busca avançada: qual campo do processo/DFD o usuário quer
 * pesquisar e o valor buscado. `campo` é a chave de `CAMPOS_BUSCAVEIS`.
 */
export interface FiltroAvancado {
  campo: string;
  valor: string;
}

type TipoCampoBusca = 'texto' | 'selecao' | 'data';

interface CampoBuscavel {
  campo: string;
  label: string;
  tipo: TipoCampoBusca;
  opcoes?: { value: string; label: string }[];
}

const FASE_OPCOES: { value: FaseLicita; label: string }[] = [
  { value: 'dfd', label: 'DFD' },
  { value: 'etp', label: 'ETP' },
  { value: 'mapa_riscos', label: 'Mapa de Riscos' },
  { value: 'pesquisa_precos', label: 'Pesquisa de Preços' },
  { value: 'tr', label: 'Termo de Referência' },
  { value: 'edital', label: 'Edital' },
  { value: 'concluido', label: 'Concluído' },
];

const STATUS_GERAL_OPCOES: { value: StatusProcesso; label: string }[] = [
  { value: 'em_andamento', label: 'Em Andamento' },
  { value: 'concluido', label: 'Concluído' },
  { value: 'cancelado', label: 'Cancelado' },
];

const DFD_STATUS_OPCOES: { value: StatusDfd; label: string }[] = [
  { value: 'rascunho', label: 'Rascunho' },
  { value: 'em_revisao', label: 'Em Revisão' },
  { value: 'aprovado', label: 'Aprovado' },
  { value: 'rejeitado', label: 'Rejeitado' },
];

const DFD_GRAU_PRIORIDADE_OPCOES: { value: GrauPrioridade; label: string }[] = [
  { value: 'baixa', label: 'Baixa' },
  { value: 'media', label: 'Média' },
  { value: 'alta', label: 'Alta' },
  { value: 'critica', label: 'Crítica' },
];

/**
 * Campos do processo (e do DFD associado) disponíveis na busca avançada.
 * Cobre os campos fixos hoje existentes — não inclui campos_extras
 * configuráveis do DFD (dinâmicos por órgão), fora de escopo por ora.
 */
export const CAMPOS_BUSCAVEIS: CampoBuscavel[] = [
  { campo: 'numero', label: 'Número do Processo', tipo: 'texto' },
  { campo: 'ano', label: 'Ano', tipo: 'texto' },
  { campo: 'objeto', label: 'Objeto', tipo: 'texto' },
  { campo: 'fase_atual', label: 'Fase Atual', tipo: 'selecao', opcoes: FASE_OPCOES },
  { campo: 'status_geral', label: 'Status Geral do Processo', tipo: 'selecao', opcoes: STATUS_GERAL_OPCOES },
  { campo: 'dfd_status', label: 'Status do DFD', tipo: 'selecao', opcoes: DFD_STATUS_OPCOES },
  { campo: 'dfd_grau_prioridade', label: 'Grau de Prioridade (DFD)', tipo: 'selecao', opcoes: DFD_GRAU_PRIORIDADE_OPCOES },
  { campo: 'dfd_area_requisitante', label: 'Área Requisitante (DFD)', tipo: 'texto' },
  { campo: 'dfd_numero_pca', label: 'Nº no PCA (DFD)', tipo: 'texto' },
  { campo: 'criado_em', label: 'Criado em', tipo: 'data' },
];

const criarFiltroVazio = (): FiltroAvancado => ({ campo: CAMPOS_BUSCAVEIS[0].campo, valor: '' });

interface BuscaAvancadaProcessosProps {
  filtros: FiltroAvancado[];
  onChange: (filtros: FiltroAvancado[]) => void;
}

/**
 * Editor da busca avançada: o usuário escolhe quais campos do processo
 * (e do DFD associado) quer pesquisar, um filtro por linha — cada um some
 * assim que o valor é apagado (não precisa remover a linha pra "desligar"
 * aquele filtro). Fica dentro de um Accordion recolhido por padrão em
 * LicitaModule (ver ProcessosTab).
 */
export const BuscaAvancadaProcessos: React.FC<BuscaAvancadaProcessosProps> = ({ filtros, onChange }) => {
  const updateFiltro = (index: number, patch: Partial<FiltroAvancado>) => {
    onChange(filtros.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  };

  const removeFiltro = (index: number) => {
    onChange(filtros.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {filtros.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nenhum filtro adicionado — clique em "Adicionar filtro" para pesquisar por um campo específico do processo ou do DFD.
        </p>
      )}
      {filtros.map((filtro, index) => {
        const campoInfo = CAMPOS_BUSCAVEIS.find((c) => c.campo === filtro.campo) ?? CAMPOS_BUSCAVEIS[0];
        return (
          <div key={index} className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[220px_1fr_auto]">
            <Select
              value={filtro.campo}
              onChange={(v) => updateFiltro(index, { campo: v, valor: '' })}
              options={CAMPOS_BUSCAVEIS.map((c) => ({ value: c.campo, label: c.label }))}
            />
            {campoInfo.tipo === 'selecao' ? (
              <Select
                value={filtro.valor || null}
                onChange={(v) => updateFiltro(index, { valor: v })}
                options={campoInfo.opcoes ?? []}
                placeholder="Selecione..."
              />
            ) : (
              <input
                type={campoInfo.tipo === 'data' ? 'date' : 'text'}
                value={filtro.valor}
                onChange={(e) => updateFiltro(index, { valor: e.target.value })}
                placeholder={campoInfo.tipo === 'data' ? undefined : `Buscar por ${campoInfo.label.toLowerCase()}...`}
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            )}
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeFiltro(index)}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        );
      })}

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          leftIcon={<Plus className="h-3.5 w-3.5" />}
          onClick={() => onChange([...filtros, criarFiltroVazio()])}
        >
          Adicionar filtro
        </Button>
        {filtros.length > 0 && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange([])}>
            Limpar filtros
          </Button>
        )}
      </div>
    </div>
  );
};

/**
 * Aplica os filtros da busca avançada sobre a lista de processos já
 * carregada (filtro client-side, como a busca simples por número/objeto
 * já existente) — todos os filtros com valor preenchido são combinados
 * com E (o processo precisa satisfazer todos). Um filtro com valor vazio
 * (linha recém-adicionada, ainda não preenchida) não restringe nada.
 */
export function aplicarFiltrosAvancados(processos: Processo[], filtros: FiltroAvancado[]): Processo[] {
  const ativos = filtros.filter((f) => f.valor !== '');
  if (ativos.length === 0) return processos;

  return processos.filter((p) =>
    ativos.every((f) => {
      const valorBusca = f.valor.toLowerCase();
      switch (f.campo) {
        case 'numero':
          return p.numero.toLowerCase().includes(valorBusca);
        case 'ano':
          return String(p.ano).includes(f.valor);
        case 'objeto':
          return (p.objeto ?? '').toLowerCase().includes(valorBusca);
        case 'fase_atual':
          return p.fase_atual === f.valor;
        case 'status_geral':
          return p.status_geral === f.valor;
        case 'dfd_status':
          return p.dfd?.status === f.valor;
        case 'dfd_grau_prioridade':
          return p.dfd?.grau_prioridade === f.valor;
        case 'dfd_area_requisitante':
          return (p.dfd?.area_requisitante ?? '').toLowerCase().includes(valorBusca);
        case 'dfd_numero_pca':
          return (p.dfd?.numero_pca ?? '').toLowerCase().includes(valorBusca);
        case 'criado_em':
          // <input type="date"> devolve "AAAA-MM-DD" — compara só o dia,
          // ignorando o horário do created_at (datetime ISO completo).
          return p.created_at.slice(0, 10) === f.valor;
        default:
          return true;
      }
    }),
  );
}

export default BuscaAvancadaProcessos;
