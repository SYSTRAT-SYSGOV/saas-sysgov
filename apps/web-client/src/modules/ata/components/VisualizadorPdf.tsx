import React, { useEffect, useRef, useState } from 'react';
import { Printer } from 'lucide-react';
import { Button, Modal } from '@sysgov/ui';

/**
 * PDF da ata num modal (blob: URL — o arquivo é privado e vem com o token). "Imprimir" usa o próprio PDF,
 * então a impressão sai idêntica ao documento.
 */
export const VisualizadorPdf: React.FC<{ blob: Blob; titulo: string; imprimirAoAbrir?: boolean; aoFechar: () => void }> = ({ blob, titulo, imprimirAoAbrir = false, aoFechar }) => {
  const [url, setUrl] = useState<string | null>(null);
  const quadro = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const u = URL.createObjectURL(blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' }));
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);

  const imprimir = () => quadro.current?.contentWindow?.print();

  return (
    <Modal open onClose={aoFechar} title={titulo} size="full" footer={<><Button variant="outline" onClick={aoFechar}>Fechar</Button><Button onClick={imprimir}><Printer className="mr-1 h-4 w-4" />Imprimir</Button></>}>
      {url && (
        <iframe
          ref={quadro}
          src={url}
          title={titulo}
          className="h-[75vh] w-full rounded-md border"
          onLoad={() => {
            if (imprimirAoAbrir) setTimeout(imprimir, 300);
          }}
        />
      )}
    </Modal>
  );
};
