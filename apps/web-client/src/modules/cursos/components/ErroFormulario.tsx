import React from 'react';

export const ErroFormulario: React.FC<{ mensagem: string | null }> = ({ mensagem }) =>
  mensagem ? (
    <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {mensagem}
    </div>
  ) : null;
