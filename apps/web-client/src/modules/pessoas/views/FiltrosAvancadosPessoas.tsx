import React, { useMemo } from 'react';
import { Filter, Search, X } from 'lucide-react';
import { Accordion, Button, Card, Input, Select } from '@/components/ui';
import { TIPOS_VINCULO, type TipoVinculo, type TipoPessoa } from '../api';

const opcoesVinculo = Object.entries(TIPOS_VINCULO).map(([value, label]) => ({ value, label }));

const opcoesTipoPessoa = [
  { value: 'todos', label: 'Todos' },
  { value: 'fisica', label: 'Pessoa Física' },
  { value: 'juridica', label: 'Pessoa Jurídica' },
];

const opcoesStatus = [
  { value: 'ativo', label: 'Ativo' },
  { value: 'inativo', label: 'Inativo' },
];

const opcoesSituacaoVital = [
  { value: 'todos', label: 'Todos' },
  { value: 'vivo', label: 'Vivo(a)' },
  { value: 'falecido', label: 'Falecido(a)' },
];

const opcoesSexo = [
  { value: 'todos', label: 'Todos' },
  { value: 'M', label: 'Masculino' },
  { value: 'F', label: 'Feminino' },
  { value: 'Outro', label: 'Outro' },
];

export interface FiltrosAvancadosPessoasProps {
  busca: string;
  onBuscaChange: (valor: string) => void;
  tipo: TipoPessoa | null;
  onTipoChange: (valor: TipoPessoa | null) => void;
  tipoVinculo: TipoVinculo | null;
  onTipoVinculoChange: (valor: TipoVinculo | null) => void;
  status: 'ativo' | 'inativo' | null;
  onStatusChange: (valor: 'ativo' | 'inativo' | null) => void;
  falecido: boolean | null;
  onFalecidoChange: (valor: boolean | null) => void;
  sexo: string | null;
  onSexoChange: (valor: string | null) => void;
  dataNascimentoDe: string;
  onDataNascimentoDeChange: (valor: string) => void;
  dataNascimentoAte: string;
  onDataNascimentoAteChange: (valor: string) => void;
  onLimparFiltros: () => void;
}

/** Barra de filtros avançados da listagem de pessoas, no mesmo formato de `FiltrosAvancadosOperacoes` (Cemitérios). */
export const FiltrosAvancadosPessoas: React.FC<FiltrosAvancadosPessoasProps> = ({
  busca,
  onBuscaChange,
  tipo,
  onTipoChange,
  tipoVinculo,
  onTipoVinculoChange,
  status,
  onStatusChange,
  falecido,
  onFalecidoChange,
  sexo,
  onSexoChange,
  dataNascimentoDe,
  onDataNascimentoDeChange,
  dataNascimentoAte,
  onDataNascimentoAteChange,
  onLimparFiltros,
}) => {
  const totalAtivos = useMemo(
    () =>
      [
        Boolean(busca.trim()),
        Boolean(tipo),
        Boolean(tipoVinculo),
        Boolean(status),
        falecido !== null,
        Boolean(sexo),
        Boolean(dataNascimentoDe),
        Boolean(dataNascimentoAte),
      ].filter(Boolean).length,
    [busca, tipo, tipoVinculo, status, falecido, sexo, dataNascimentoDe, dataNascimentoAte]
  );

  const grid = (
    <div className="space-y-3">
      {totalAtivos > 0 && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={onLimparFiltros}
            className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1 px-2"
          >
            <X className="h-3 w-3" />
            <span>Limpar filtros</span>
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <label className="text-[11px] font-medium text-muted-foreground block mb-1">Buscar por Nome ou CPF</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={busca}
              onChange={(e) => onBuscaChange(e.target.value)}
              placeholder="Digite nome ou CPF…"
              className="text-xs pl-8 h-8"
            />
          </div>
        </div>

        <div>
          <label className="text-[11px] font-medium text-muted-foreground block mb-1">Tipo de Pessoa</label>
          <Select
            value={tipo ?? 'todos'}
            onChange={(v) => onTipoChange(v === 'todos' ? null : (v as TipoPessoa))}
            options={opcoesTipoPessoa}
          />
        </div>

        <div>
          <label className="text-[11px] font-medium text-muted-foreground block mb-1">Tipo de Vínculo</label>
          <Select
            value={tipoVinculo}
            onChange={(v) => onTipoVinculoChange(v as TipoVinculo)}
            options={opcoesVinculo}
            placeholder="Todos os vínculos"
          />
        </div>

        <div>
          <label className="text-[11px] font-medium text-muted-foreground block mb-1">Status</label>
          <Select
            value={status}
            onChange={(v) => onStatusChange(v as 'ativo' | 'inativo')}
            options={opcoesStatus}
            placeholder="Todos os status"
          />
        </div>

        <div>
          <label className="text-[11px] font-medium text-muted-foreground block mb-1">Situação Vital</label>
          <Select
            value={falecido === null ? 'todos' : falecido ? 'falecido' : 'vivo'}
            onChange={(v) => onFalecidoChange(v === 'todos' ? null : v === 'falecido')}
            options={opcoesSituacaoVital}
          />
        </div>

        <div>
          <label className="text-[11px] font-medium text-muted-foreground block mb-1">Sexo</label>
          <Select
            value={sexo ?? 'todos'}
            onChange={(v) => onSexoChange(v === 'todos' ? null : v)}
            options={opcoesSexo}
          />
        </div>

        <div>
          <label className="text-[11px] font-medium text-muted-foreground block mb-1">Nascimento De</label>
          <Input
            aria-label="Nascimento De"
            type="date"
            value={dataNascimentoDe}
            onChange={(e) => onDataNascimentoDeChange(e.target.value)}
            className="text-xs font-mono h-8"
          />
        </div>

        <div>
          <label className="text-[11px] font-medium text-muted-foreground block mb-1">Nascimento Até</label>
          <Input
            aria-label="Nascimento Até"
            type="date"
            value={dataNascimentoAte}
            onChange={(e) => onDataNascimentoAteChange(e.target.value)}
            className="text-xs font-mono h-8"
          />
        </div>
      </div>
    </div>
  );

  return (
    <Card className="gap-0 py-0">
      <Accordion
        icon={<Filter className="h-4 w-4 text-primary" />}
        items={[
          {
            value: 'filtros',
            title: (
              <span className="inline-flex items-center gap-2 text-xs font-semibold text-foreground">
                Filtros Avançados de Pessoas
                {totalAtivos > 0 && (
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                    {totalAtivos} {totalAtivos === 1 ? 'filtro ativo' : 'filtros ativos'}
                  </span>
                )}
              </span>
            ),
            children: grid,
          },
        ]}
      />
    </Card>
  );
};
