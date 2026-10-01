import React from 'react';
import { Input, Select, Switch } from '@sysgov/ui';
import type { CampoInscricao } from '@sysgov/sdk';
import { CampoTexto } from './CampoTexto';

interface Props {
  campos: CampoInscricao[];
  valores: Record<number, string>;
  onChange: (campoId: number, valor: string) => void;
}

/** Campos extras do formulário de inscrição (design D9), um input por tipo. */
export const CamposInscricaoForm: React.FC<Props> = ({ campos, valores, onChange }) => {
  if (campos.length === 0) return null;

  return (
    <div className="space-y-4">
      {campos.map((campo) => {
        const rotulo = campo.obrigatorio ? `${campo.rotulo} (obrigatório)` : campo.rotulo;
        const valor = valores[campo.id] ?? '';

        switch (campo.tipo) {
          case 'texto':
            return <Input key={campo.id} label={rotulo} value={valor} onChange={(e) => onChange(campo.id, e.target.value)} maxLength={2000} />;
          case 'texto_longo':
            return <CampoTexto key={campo.id} label={rotulo} value={valor} onChange={(e) => onChange(campo.id, e.target.value)} rows={3} maxLength={20000} />;
          case 'numero':
            return <Input key={campo.id} type="number" label={rotulo} value={valor} onChange={(e) => onChange(campo.id, e.target.value)} className="font-mono tabular-nums" />;
          case 'data':
            return <Input key={campo.id} type="date" label={rotulo} value={valor} onChange={(e) => onChange(campo.id, e.target.value)} className="font-mono tabular-nums" />;
          case 'selecao':
            return (
              <Select
                key={campo.id}
                label={rotulo}
                value={valor || null}
                onChange={(v) => onChange(campo.id, v)}
                options={(campo.opcoes ?? []).map((o) => ({ value: o, label: o }))}
              />
            );
          case 'caixa_marcacao':
            return (
              <div key={campo.id} className="flex items-center gap-3">
                <Switch id={`campo-resposta-${campo.id}`} checked={valor === 'sim'} onCheckedChange={(v) => onChange(campo.id, v ? 'sim' : 'nao')} label={rotulo} />
                <label htmlFor={`campo-resposta-${campo.id}`} className="text-sm text-foreground">
                  {rotulo}
                </label>
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
};

export default CamposInscricaoForm;
