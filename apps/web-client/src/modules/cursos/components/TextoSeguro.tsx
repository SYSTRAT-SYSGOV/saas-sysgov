import React, { useMemo } from 'react';
import { cn } from '@sysgov/ui';
import { sanitizarHtml } from '../utils/htmlSeguro';

/** Exibe HTML do servidor já sanitizado (DOMPurify). */
export const TextoSeguro: React.FC<{ html: string | null | undefined; className?: string }> = ({ html, className }) => {
  const limpo = useMemo(() => sanitizarHtml(html), [html]);
  return <div className={cn('prose prose-sm max-w-none text-sm text-foreground [&_a]:text-primary [&_a]:underline', className)} dangerouslySetInnerHTML={{ __html: limpo }} />;
};

/** Resposta dissertativa: texto puro, com as quebras de linha preservadas (nunca interpretado como HTML). */
export const TextoPuro: React.FC<{ texto: string | null | undefined; className?: string }> = ({ texto, className }) => (
  <p className={cn('whitespace-pre-wrap break-words text-sm text-foreground', className)}>{texto}</p>
);
