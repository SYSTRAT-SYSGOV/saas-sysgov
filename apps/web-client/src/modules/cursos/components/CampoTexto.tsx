import React from 'react';

/**
 * Textarea no mesmo visual do Input do @sysgov/ui (que não tem variante
 * multilinha) — mesmo padrão dos formulários do módulo Licita.
 */
export const CampoTexto: React.FC<React.ComponentProps<'textarea'> & { label: string }> = ({ label, id, ...props }) => {
  const campoId = id ?? `campo-${label.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div>
      <label htmlFor={campoId} className="mb-1 block text-sm font-medium text-foreground">
        {label}
      </label>
      <textarea
        id={campoId}
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        {...props}
      />
    </div>
  );
};
