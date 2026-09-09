import * as React from 'react';
import { cn } from '../lib/utils';
import type { RichTextEditorProps } from './RichTextEditorInner';

export type { RichTextEditorProps } from './RichTextEditorInner';

// TinyMCE (o pacote em si + skins/plugins) é pesado e usado só nas telas
// que realmente têm campos de texto rico (Licita) — carregado sob demanda
// via React.lazy/import() em vez de import estático, para:
// 1) não inflar o bundle de apps que nunca usam RichTextEditor;
// 2) não quebrar ambientes sem `window.matchMedia` (ex.: jsdom nos testes
//    de outros componentes) — um import estático aqui seria avaliado
//    assim que qualquer coisa de @sysgov/ui fosse importada, mesmo sem
//    nunca renderizar o editor.
const LazyRichTextEditorInner = React.lazy(() => import('./RichTextEditorInner'));

const RichTextEditorFallback: React.FC<Pick<RichTextEditorProps, 'minHeight'>> = ({ minHeight = 240 }) => (
  <div
    className={cn('w-full animate-pulse rounded-md border border-input bg-muted/40')}
    style={{ height: minHeight }}
  />
);

/**
 * Editor de texto rico (WYSIWYG) usado nos campos de texto longo do
 * Licita (justificativa, texto de documentos legais, campos extras
 * configuráveis do tipo texto_longo). Ver RichTextEditorInner.tsx para a
 * implementação real (TinyMCE self-hospedado) — carregada sob demanda.
 *
 * O HTML produzido aqui é sanitizado no backend antes de persistir e
 * deve ser sanitizado de novo (dompurify) no frontend antes de ser
 * exibido com dangerouslySetInnerHTML — nunca confiar só no editor.
 */
export const RichTextEditor: React.FC<RichTextEditorProps> = (props) => (
  <React.Suspense fallback={<RichTextEditorFallback minHeight={props.minHeight} />}>
    <LazyRichTextEditorInner {...props} />
  </React.Suspense>
);

export default RichTextEditor;
