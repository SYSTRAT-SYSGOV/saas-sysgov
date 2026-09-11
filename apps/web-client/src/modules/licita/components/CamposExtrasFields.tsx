import React from 'react';
import { Select, RichTextEditor } from '@sysgov/ui';
import type { CampoConfig } from '@sysgov/sdk';

interface CamposExtrasFieldsProps {
  campos: CampoConfig[];
  valores: Record<string, unknown>;
  onChange: (valores: Record<string, unknown>) => void;
  disabled?: boolean;
}

/**
 * Renderiza um input por campo extra configurado pelo órgão (ver
 * CamposConfiguracaoPage) — reaproveitado por qualquer artefato que
 * venha a suportar campos configuráveis (hoje só o DFD).
 */
export const CamposExtrasFields: React.FC<CamposExtrasFieldsProps> = ({ campos, valores, onChange, disabled }) => {
  const setValor = (key: string, valor: unknown) => {
    onChange({ ...valores, [key]: valor });
  };

  const camposOrdenados = [...campos].sort((a, b) => a.ordem - b.ordem);

  return (
    <div className="space-y-4">
      {camposOrdenados.map((campo) => {
        const valor = valores[campo.key];

        return (
          <div key={campo.key}>
            <label className="block text-sm font-medium text-foreground mb-1">
              {campo.label} {campo.obrigatorio && '*'}
            </label>

            {campo.tipo === 'texto_longo' && (
              <RichTextEditor
                value={typeof valor === 'string' ? valor : ''}
                onChange={(html) => setValor(campo.key, html)}
                disabled={disabled}
                minHeight={160}
              />
            )}

            {campo.tipo === 'texto' && (
              <input
                type="text"
                disabled={disabled}
                required={campo.obrigatorio}
                value={typeof valor === 'string' ? valor : ''}
                onChange={(e) => setValor(campo.key, e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-ring"
              />
            )}

            {campo.tipo === 'numero' && (
              <input
                type="number"
                disabled={disabled}
                required={campo.obrigatorio}
                value={typeof valor === 'number' ? valor : ''}
                onChange={(e) => setValor(campo.key, e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono tabular-nums text-foreground disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-ring"
              />
            )}

            {campo.tipo === 'data' && (
              <input
                type="date"
                disabled={disabled}
                required={campo.obrigatorio}
                value={typeof valor === 'string' ? valor : ''}
                onChange={(e) => setValor(campo.key, e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono tabular-nums text-foreground disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-ring"
              />
            )}

            {campo.tipo === 'booleano' && (
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  disabled={disabled}
                  checked={Boolean(valor)}
                  onChange={(e) => setValor(campo.key, e.target.checked)}
                  className="rounded border-input text-primary focus:ring-primary"
                />
                Sim
              </label>
            )}

            {campo.tipo === 'selecao' && (
              <Select
                value={typeof valor === 'string' ? valor : ''}
                onChange={(v) => setValor(campo.key, v)}
                options={(campo.opcoes ?? []).map((o) => ({ value: o, label: o }))}
                disabled={disabled}
              />
            )}

            {campo.ajuda && <p className="mt-1 text-xs text-muted-foreground">{campo.ajuda}</p>}
          </div>
        );
      })}
    </div>
  );
};

export default CamposExtrasFields;
