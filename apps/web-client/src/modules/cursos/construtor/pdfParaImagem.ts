/**
 * Converte a primeira página de um PDF em PNG no navegador (design D2): o servidor só aceita
 * imagem de fundo. O pdf.js é carregado sob demanda, só quando alguém escolhe um PDF.
 * O lado maior sai com ~2480 px (A4 a 300 dpi), o mesmo limite do servidor.
 */
export async function pdfParaImagem(arquivo: File, ladoMaiorPx = 2480): Promise<Blob> {
  const pdfjs = await import('pdfjs-dist');
  const { default: worker } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker;

  const documento = await pdfjs.getDocument({ data: new Uint8Array(await arquivo.arrayBuffer()) }).promise;
  const pagina = await documento.getPage(1);
  const base = pagina.getViewport({ scale: 1 });
  const viewport = pagina.getViewport({ scale: ladoMaiorPx / Math.max(base.width, base.height) });

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const contexto = canvas.getContext('2d');
  if (!contexto) throw new Error('O navegador não conseguiu desenhar o PDF.');
  contexto.fillStyle = '#ffffff';
  contexto.fillRect(0, 0, canvas.width, canvas.height);
  await pagina.render({ canvasContext: contexto, viewport }).promise;
  await documento.destroy();

  return new Promise((resolve, reject) => {
    canvas.toBlob((png) => (png ? resolve(png) : reject(new Error('Não foi possível converter o PDF.'))), 'image/png');
  });
}

/** Fundo escolhido: imagem vai direto; PDF é convertido antes. */
export async function prepararFundo(arquivo: File): Promise<{ blob: Blob; nome: string }> {
  if (arquivo.type === 'application/pdf' || arquivo.name.toLowerCase().endsWith('.pdf')) {
    return { blob: await pdfParaImagem(arquivo), nome: arquivo.name.replace(/\.pdf$/i, '') + '.png' };
  }
  return { blob: arquivo, nome: arquivo.name };
}
