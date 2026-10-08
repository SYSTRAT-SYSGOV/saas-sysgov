export interface OpcoesCompressaoImagem {
  maxDimension?: number;
  quality?: number;
}

/**
 * Redimensiona (maior lado até `maxDimension`) e reexporta como JPEG, para reduzir o
 * payload de fotos capturadas em campo antes de enfileirar para sincronização.
 */
export async function compressImage(
  arquivo: File | Blob,
  { maxDimension = 1920, quality = 0.8 }: OpcoesCompressaoImagem = {},
): Promise<Blob> {
  const bitmap = await createImageBitmap(arquivo);

  try {
    const maiorLado = Math.max(bitmap.width, bitmap.height);
    const escala = maiorLado > maxDimension ? maxDimension / maiorLado : 1;
    const largura = Math.round(bitmap.width * escala);
    const altura = Math.round(bitmap.height * escala);

    const canvas = document.createElement('canvas');
    canvas.width = largura;
    canvas.height = altura;

    const contexto = canvas.getContext('2d');
    if (!contexto) {
      throw new Error('Não foi possível obter o contexto 2D do canvas para compressão de imagem.');
    }

    contexto.drawImage(bitmap, 0, 0, largura, altura);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Falha ao comprimir a imagem.'))),
        'image/jpeg',
        quality,
      );
    });
  } finally {
    bitmap.close();
  }
}
