import React, { useRef, useState } from 'react';
import { Button, Badge } from '@sysgov/ui';
import { Paperclip, Download, Trash2, Upload, FileText } from 'lucide-react';
import { requerimentosApi } from '../api';
import type { Anexo } from '../api';

export interface AnexosListProps {
  anexos: Anexo[];
  onUpload: (arquivo: File) => Promise<void>;
  onDelete?: (anexo: Anexo) => Promise<void>;
  podeAnexar: boolean;
}

const MIMES_ACEITOS = 'application/pdf,image/jpeg,image/png';

function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Lista de anexos de uma proposição ou resposta, com upload/download/exclusão. */
export const AnexosList: React.FC<AnexosListProps> = ({ anexos, onUpload, onDelete, podeAnexar }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [excluindoId, setExcluindoId] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const handleArquivoSelecionado = async (arquivo: File | undefined) => {
    if (!arquivo) return;
    setErro(null);
    setEnviando(true);
    try {
      await onUpload(arquivo);
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Erro ao enviar anexo');
    } finally {
      setEnviando(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleDownload = (anexo: Anexo) => {
    requerimentosApi.baixarAnexo(anexo).catch(() => setErro('Erro ao baixar o anexo.'));
  };

  const handleExcluir = async (anexo: Anexo) => {
    if (!onDelete) return;
    setErro(null);
    setExcluindoId(anexo.id);
    try {
      await onDelete(anexo);
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Erro ao excluir anexo');
    } finally {
      setExcluindoId(null);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Paperclip className="h-4 w-4" />
          Anexos
          {anexos.length > 0 && <Badge variant="info">{anexos.length}</Badge>}
        </h3>
        {podeAnexar && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept={MIMES_ACEITOS}
              className="hidden"
              onChange={(e) => handleArquivoSelecionado(e.target.files?.[0])}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => inputRef.current?.click()}
              disabled={enviando}
              isLoading={enviando}
            >
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              Anexar documento
            </Button>
          </>
        )}
      </div>

      {erro && <p className="text-xs text-rose-600 dark:text-rose-400">{erro}</p>}

      {anexos.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum documento anexado.</p>
      ) : (
        <ul className="space-y-1.5">
          {anexos.map((anexo) => (
            <li
              key={anexo.id}
              className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
            >
              <button
                type="button"
                onClick={() => handleDownload(anexo)}
                className="flex items-center gap-2 min-w-0 flex-1 text-left hover:underline"
              >
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{anexo.nome_arquivo}</span>
              </button>
              <div className="flex items-center gap-2 shrink-0 text-xs text-muted-foreground">
                <span className="font-mono tabular-nums">{formatarTamanho(anexo.tamanho_bytes)}</span>
                {anexo.uploader && <span className="hidden sm:inline">• {anexo.uploader.name}</span>}
                <Button size="icon-sm" variant="ghost" onClick={() => handleDownload(anexo)} aria-label="Baixar anexo">
                  <Download className="h-3.5 w-3.5" />
                </Button>
                {podeAnexar && onDelete && (
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => handleExcluir(anexo)}
                    disabled={excluindoId === anexo.id}
                    aria-label="Excluir anexo"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
