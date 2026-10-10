/**
 * Fotos escolhidas no navegador viram JPEG de no máximo 1600 px antes do envio (design D4): o navegador lê WebP e
 * aplica a orientação da câmera, o que o PHP do container não faz, e o envio fica bem abaixo do limite de upload.
 */
export const TIPOS_ACEITOS = ['image/jpeg', 'image/png', 'image/webp'];
export const TAMANHO_MAXIMO = 5 * 1024 * 1024;

export function validarArquivo(arquivo: File): string | null {
  if (!TIPOS_ACEITOS.includes(arquivo.type)) return 'Escolha uma foto JPG, PNG ou WebP.';
  if (arquivo.size > TAMANHO_MAXIMO) return 'A foto deve ter no máximo 5 MB.';
  return null;
}

export function dimensoesReduzidas(largura: number, altura: number, max = 1600): { largura: number; altura: number } {
  const escala = Math.min(1, max / Math.max(largura, altura));
  return { largura: Math.max(1, Math.round(largura * escala)), altura: Math.max(1, Math.round(altura * escala)) };
}

export async function reduzirImagem(arquivo: File, max = 1600): Promise<Blob> {
  const bitmap = await createImageBitmap(arquivo, { imageOrientation: 'from-image' });
  const { largura, altura } = dimensoesReduzidas(bitmap.width, bitmap.height, max);
  const canvas = document.createElement('canvas');
  canvas.width = largura;
  canvas.height = altura;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Não foi possível preparar a imagem.');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, largura, altura);
  ctx.drawImage(bitmap, 0, 0, largura, altura);
  bitmap.close();
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Não foi possível preparar a imagem.'))), 'image/jpeg', 0.85),
  );
}
