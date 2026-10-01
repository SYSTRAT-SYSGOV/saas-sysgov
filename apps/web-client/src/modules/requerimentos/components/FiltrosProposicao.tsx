import React from 'react';
import { Button, Input, Select } from '@sysgov/ui';
import type { SelectOption } from '@sysgov/ui';
import { Search, X } from 'lucide-react';

export interface FiltrosProposicaoValues {
  tipo_slug?: string;
  status?: string;
  exercicio?: string;
  area_tematica?: string;
}

interface FiltrosProposicaoProps {
  tipos: SelectOption[];
  filtros: FiltrosProposicaoValues;
  onChange: (filtros: FiltrosProposicaoValues) => void;
  onLimpar: () => void;
}

const statusOptions: SelectOption[] = [
  { value: 'protocolado', label: 'Protocolado' },
  { value: 'em_tramitacao_interna', label: 'Em Tramitação Interna' },
  { value: 'encaminhado', label: 'Encaminhado' },
  { value: 'recebido', label: 'Recebido' },
  { value: 'respondido', label: 'Respondido' },
  { value: 'aprovado', label: 'Aprovado' },
  { value: 'rejeitado', label: 'Rejeitado' },
  { value: 'arquivado', label: 'Arquivado' },
  { value: 'vencido', label: 'Vencido' },
];

const exercicioOptions: SelectOption[] = Array.from({ length: 10 }, (_, i) => {
  const ano = new Date().getFullYear() - i;
  return { value: String(ano), label: String(ano) };
});

export const FiltrosProposicao: React.FC<FiltrosProposicaoProps> = ({
  tipos,
  filtros,
  onChange,
  onLimpar,
}) => {
  const temFiltros = filtros.tipo_slug || filtros.status || filtros.exercicio || filtros.area_tematica;

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="w-48">
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipo</label>
        <Select
          value={filtros.tipo_slug ?? ''}
          onChange={(val) => onChange({ ...filtros, tipo_slug: val || undefined })}
          options={[{ value: '', label: 'Todos os tipos' }, ...tipos]}
          className="h-9"
        />
      </div>

      <div className="w-40">
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
        <Select
          value={filtros.status ?? ''}
          onChange={(val) => onChange({ ...filtros, status: val || undefined })}
          options={[{ value: '', label: 'Todos' }, ...statusOptions]}
          className="h-9"
        />
      </div>

      <div className="w-32">
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Exercício</label>
        <Select
          value={filtros.exercicio ?? ''}
          onChange={(val) => onChange({ ...filtros, exercicio: val || undefined })}
          options={[{ value: '', label: 'Todos' }, ...exercicioOptions]}
          className="h-9"
        />
      </div>

      <div className="w-48">
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Área Temática</label>
        <Input
          value={filtros.area_tematica ?? ''}
          onChange={(e) => onChange({ ...filtros, area_tematica: e.target.value || undefined })}
          placeholder="Buscar área..."
          className="h-9"
        />
      </div>

      {temFiltros && (
        <Button variant="outline" size="sm" onClick={onLimpar} className="h-9">
          <X className="h-4 w-4 mr-1" />
          Limpar
        </Button>
      )}
    </div>
  );
};