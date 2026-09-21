import React from 'react';
import { Select } from '@sysgov/ui';
import type { CampoConfig } from '@sysgov/sdk';
import { RichTextEditorWithIa } from './RichTextEditorWithIa';

interface CampoExtraFieldProps {
  campo: CampoConfig;
  valor: unknown;
  onChange: (key: string, valor: unknown) => void;
  disabled?: boolean;
}

/**
 * Renderiza o input de um único campo extra configurado pelo órgão (ver
 * CamposConfiguracaoPage) — extraído de `CamposExtrasFields` para poder ser
 * intercalado com campos nativos numa mesma aba (ver TrForm, primeiro
 * formulário a misturar seções nativas configuráveis com campos extras na
 * mesma lista reordenável).
 */
export const CampoExtraField: React.FC<CampoExtraFieldProps> = ({ campo, valor, onChange, disabled }) => {
  const setValor = (v: unknown) => onChange(campo.key, v);

  return (
    <div>
      {/* O label de texto_longo já vem embutido no header do
          RichTextEditorWithIa (junto do botão "Sugerir com IA") —
          renderizá-lo aqui de novo duplicaria o texto. */}
      {campo.tipo !== 'texto_longo' && (
        <label className="block text-sm font-medium text-foreground mb-1">
          {campo.label} {campo.obrigatorio && '*'}
        </label>
      )}

      {campo.tipo === 'texto_longo' && (
        <RichTextEditorWithIa
          label={`${campo.label}${campo.obrigatorio ? ' *' : ''}`}
          value={typeof valor === 'string' ? valor : ''}
          onChange={(html) => setValor(html)}
          disabled={disabled}
          minHeight={160}
          campo={campo.label}
          contexto={campo.ajuda}
        />
      )}

      {/* Nenhum destes usa `required` nativo, mesmo quando
          `campo.obrigatorio` é true (indicado só pelo "*" no label
          acima) — o atributo HTML bloqueia o submit com um balão do
          próprio navegador antes do handleSubmit rodar, então a
          ValidationErrorModal padrão do sistema nunca chegava a
          aparecer para um campo extra obrigatório vazio. A
          obrigatoriedade é sempre validada no backend
          (CampoConfiguracaoService::validarRespostas). */}
      {campo.tipo === 'texto' && (
        <input
          type="text"
          disabled={disabled}
          value={typeof valor === 'string' ? valor : ''}
          onChange={(e) => setValor(e.target.value)}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-ring"
        />
      )}

      {campo.tipo === 'numero' && (
        <input
          type="number"
          disabled={disabled}
          value={typeof valor === 'number' ? valor : ''}
          onChange={(e) => setValor(e.target.value === '' ? '' : Number(e.target.value))}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono tabular-nums text-foreground disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-ring"
        />
      )}

      {campo.tipo === 'data' && (
        <input
          type="date"
          disabled={disabled}
          value={typeof valor === 'string' ? valor : ''}
          onChange={(e) => setValor(e.target.value)}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono tabular-nums text-foreground disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-ring"
        />
      )}

      {campo.tipo === 'booleano' && (
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            disabled={disabled}
            checked={Boolean(valor)}
            onChange={(e) => setValor(e.target.checked)}
            className="rounded border-input text-primary focus:ring-primary"
          />
          Sim
        </label>
      )}

      {campo.tipo === 'selecao' && (
        <Select
          value={typeof valor === 'string' ? valor : ''}
          onChange={(v) => setValor(v)}
          options={(campo.opcoes ?? []).map((o) => ({ value: o, label: o }))}
          disabled={disabled}
        />
      )}

      {campo.ajuda && <p className="mt-1 text-xs text-muted-foreground">{campo.ajuda}</p>}
    </div>
  );
};

interface CamposExtrasFieldsProps {
  campos: CampoConfig[];
  valores: Record<string, unknown>;
  onChange: (valores: Record<string, unknown>) => void;
  disabled?: boolean;
}

/**
 * Renderiza um input por campo extra configurado pelo órgão (ver
 * CamposConfiguracaoPage) — reaproveitado por qualquer artefato que
 * venha a suportar campos configuráveis.
 */
export const CamposExtrasFields: React.FC<CamposExtrasFieldsProps> = ({ campos, valores, onChange, disabled }) => {
  const setValor = (key: string, valor: unknown) => {
    onChange({ ...valores, [key]: valor });
  };

  const camposOrdenados = [...campos].sort((a, b) => a.ordem - b.ordem);

  return (
    <div className="space-y-4">
      {camposOrdenados.map((campo) => (
        <CampoExtraField key={campo.key} campo={campo} valor={valores[campo.key]} onChange={setValor} disabled={disabled} />
      ))}
    </div>
  );
};

export default CamposExtrasFields;
