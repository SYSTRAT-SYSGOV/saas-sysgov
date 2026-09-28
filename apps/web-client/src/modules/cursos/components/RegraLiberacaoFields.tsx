import React from 'react';
import { Input, Select } from '@sysgov/ui';
import type { Aula, RegraLiberacao } from '@sysgov/sdk';
import { REGRA_LIBERACAO } from '../utils/formatos';
import type { LiberacaoForm } from '../utils/validacoes';

interface Props {
  value: LiberacaoForm;
  onChange: (proximo: LiberacaoForm) => void;
  aulas: Pick<Aula, 'id' | 'titulo' | 'ordem'>[];
}

const OPCOES = (Object.keys(REGRA_LIBERACAO) as RegraLiberacao[]).map((regra) => ({
  value: regra,
  label: REGRA_LIBERACAO[regra],
  hint: { imediata: 'Liberado assim que a inscrição é confirmada', inicio_aula: 'No início da aula, na agenda de cada turma', dias_apos_inicio: 'À 00:00 (Brasília) do dia N após o início da turma' }[regra],
}));

/**
 * Regra de liberação por turma, igual para materiais e avaliações (o
 * cálculo é do servidor). A aula vinculada é opcional, mas obrigatória
 * na regra "no início da aula".
 */
export const RegraLiberacaoFields: React.FC<Props> = ({ value, onChange, aulas }) => (
  <div className="space-y-3 rounded-lg border border-border p-3">
    <Select label="Liberação" value={value.regra} onChange={(regra) => onChange({ ...value, regra: regra as RegraLiberacao })} options={OPCOES} />
    {value.regra === 'dias_apos_inicio' && (
      <Input
        label="Dias após o início da turma"
        type="number"
        min={0}
        max={365}
        value={value.dias}
        onChange={(e) => onChange({ ...value, dias: e.target.value })}
        helperText="De 0 a 365. Zero libera no dia do início da turma."
        className="font-mono tabular-nums"
      />
    )}
    <Select
      label={value.regra === 'inicio_aula' ? 'Aula (obrigatória)' : 'Aula vinculada (opcional)'}
      value={value.aulaId === '' ? null : value.aulaId}
      onChange={(aulaId) => onChange({ ...value, aulaId })}
      placeholder="Sem aula vinculada"
      emptyText="O curso ainda não tem aulas"
      options={[{ value: '', label: 'Sem aula vinculada' }, ...aulas.map((a) => ({ value: String(a.id), label: `${a.ordem}. ${a.titulo}` }))]}
    />
  </div>
);

export default RegraLiberacaoFields;
