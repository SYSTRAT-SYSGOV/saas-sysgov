import * as React from 'react';
import { Editor } from '@tinymce/tinymce-react';
import type { Editor as TinyMCEEditor } from 'tinymce';

// Self-hosted TinyMCE (sem depender de conta/quota da TinyMCE Cloud) —
// os módulos abaixo empacotam o próprio editor junto do bundle da
// aplicação; `licenseKey="gpl"` é o modo de uso correto para essa forma
// de distribuição (self-hosted, sob GPL).
import 'tinymce/tinymce';
import 'tinymce/models/dom/model';
import 'tinymce/themes/silver';
import 'tinymce/icons/default';
import 'tinymce/skins/ui/oxide/skin.css';
import 'tinymce/skins/ui/oxide/content.css';
import 'tinymce/skins/content/default/content.css';
import 'tinymce/plugins/lists';
import 'tinymce/plugins/link';
import 'tinymce/plugins/table';
import 'tinymce/plugins/code';

export interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minHeight?: number;
  id?: string;
  'aria-invalid'?: boolean;
}

/**
 * Editor de texto rico (WYSIWYG) usado nos campos de texto longo do
 * Licita (justificativa, texto de documentos legais, campos extras
 * configuráveis do tipo texto_longo). TinyMCE self-hospedado — ver
 * comentário dos imports acima.
 *
 * O HTML produzido aqui é sanitizado no backend antes de persistir e
 * deve ser sanitizado de novo (dompurify) no frontend antes de ser
 * exibido com dangerouslySetInnerHTML — nunca confiar só no editor.
 */
const RichTextEditorInner: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder,
  disabled = false,
  minHeight = 240,
  id,
  'aria-invalid': ariaInvalid,
}) => {
  return (
    <div
      id={id}
      aria-invalid={ariaInvalid}
      className="rounded-md border border-input aria-invalid:border-destructive [&_.tox-tinymce]:rounded-md [&_.tox-tinymce]:border-0"
    >
      <Editor
        licenseKey="gpl"
        disabled={disabled}
        value={value}
        onEditorChange={(html: string) => onChange(html)}
        init={{
          height: minHeight,
          menubar: false,
          statusbar: false,
          placeholder,
          plugins: ['lists', 'link', 'table', 'code'],
          toolbar:
            'undo redo | blocks | bold italic underline | bullist numlist | link table | code',
          content_style: 'body { font-family: inherit; font-size: 14px; }',
          skin: false,
          content_css: false,
          setup: (editor: TinyMCEEditor) => {
            editor.on('init', () => {
              if (disabled) {
                editor.mode.set('readonly');
              }
            });
          },
        }}
      />
    </div>
  );
};

export default RichTextEditorInner;
