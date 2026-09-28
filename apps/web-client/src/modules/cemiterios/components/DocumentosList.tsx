import React, { useState, useCallback } from 'react';
import { Button, Modal, Input, Field, Select } from '@/components/ui';
import { Upload, Trash2, Download, FileText, FileImage, File } from 'lucide-react';
import type { SucessaoDocumento, TipoDocumentoSucessao } from '../api';
import { useSucessaoDocumentos } from '../hooks/useSucessaoDocumentos';
import { ErroBox, Mono } from '../views/comum';
import { TIPO_DOCUMENTO_LABELS } from './sucessao.utils';

interface DocumentosListProps {
  sucessaoId: number;
  readonly?: boolean;
}

const TIPO_DOCUMENTO_OPTIONS: { value: TipoDocumentoSucessao; label: string }[] = [
  { value: 'certidao_obito', label: 'Certidão de Óbito' },
  { value: 'inventario', label: 'Inventário' },
  { value: 'formal_partilha', label: 'Formal de Partilha' },
  { value: 'escritura', label: 'Escritura Pública' },
  { value: 'alvara', label: 'Alvará' },
  { value: 'procuracao', label: 'Procuração' },
  { value: 'outro', label: 'Outro' },
];

function IconeDocumento(tipo: TipoDocumentoSucessao) {
  switch (tipo) {
    case 'certidao_obito':
    case 'escritura':
    case 'inventario':
    case 'formal_partilha':
      return <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
    case 'alvara':
    case 'procuracao':
      return <FileImage className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />;
    default:
      return <File className="h-5 w-5 text-slate-600 dark:text-slate-400" />;
  }
}

export const DocumentosList: React.FC<DocumentosListProps> = ({ sucessaoId, readonly = false }) => {
  const { documentos, carregando, enviando, erro, carregar, upload, download, excluir } = useSucessaoDocumentos(sucessaoId);
  const [modalUpload, setModalUpload] = useState(false);
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null);
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumentoSucessao>('certidao_obito');

  const handleUpload = useCallback(async () => {
    if (!arquivoSelecionado) return;
    await upload(tipoDocumento, arquivoSelecionado);
    setModalUpload(false);
    setArquivoSelecionado(null);
    await carregar();
  }, [arquivoSelecionado, tipoDocumento, upload, carregar]);

  const handleExcluir = useCallback(
    async (doc: SucessaoDocumento) => {
      if (!confirm(`Remover ${TIPO_DOCUMENTO_LABELS[doc.tipo] ?? doc.tipo}?`)) return;
      await excluir(doc.id);
      await carregar();
    },
    [excluir, carregar]
  );

  return (
    <div className="space-y-4">
      <ErroBox erro={erro} />

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Documentos do Processo</h3>
        {!readonly && (
          <Button size="sm" variant="outline" onClick={() => setModalUpload(true)} disabled={enviando}>
            <Upload className="h-4 w-4 mr-1" /> Enviar Documento
          </Button>
        )}
      </div>

      {carregando ? (
        <div className="py-8 text-center text-sm text-muted-foreground">Carregando documentos…</div>
      ) : documentos.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          Nenhum documento anexado a este processo.
        </div>
      ) : (
        <div className="space-y-2">
          {documentos.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"
            >
              <div className="flex items-center gap-3">
                {IconeDocumento(doc.tipo)}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {TIPO_DOCUMENTO_LABELS[doc.tipo as keyof typeof TIPO_DOCUMENTO_LABELS] ?? doc.tipo}
                    </span>
                    <Mono className="text-xs text-muted-foreground">
                      {doc.hash.slice(0, 8)}…
                    </Mono>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Anexado em {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => download(doc.id)}
                  className="p-1 text-muted-foreground hover:text-foreground"
                  title="Baixar"
                >
                  <Download className="h-4 w-4" />
                </button>
                {!readonly && (
                  <button
                    onClick={() => handleExcluir(doc)}
                    className="p-1 text-rose-600 hover:text-rose-700"
                    title="Remover"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalUpload}
        onClose={() => setModalUpload(false)}
        title="Enviar Documento"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setModalUpload(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleUpload} disabled={enviando || !arquivoSelecionado}>
              {enviando ? 'Enviando…' : 'Enviar'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Field label="Tipo de Documento" required>
            <Select
              value={tipoDocumento}
              onChange={(v) => setTipoDocumento(v as TipoDocumentoSucessao)}
              options={TIPO_DOCUMENTO_OPTIONS}
              placeholder="Selecione…"
            />
          </Field>
          <Field label="Arquivo" required>
            <input
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => setArquivoSelecionado(e.target.files?.[0] ?? null)}
              className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary/10 file:text-primary file:cursor-pointer"
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
};

export default DocumentosList;
