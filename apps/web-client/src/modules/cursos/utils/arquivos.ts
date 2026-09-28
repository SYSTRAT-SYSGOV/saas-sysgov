/**
 * O PDF de um material só sai autenticado: o SDK baixa como blob e aqui ele
 * abre numa aba nova (mesmo padrão do PDF do certificado). Não existe URL
 * pública nem assinada para compartilhar.
 */
export function abrirPdfEmNovaAba(blob: Blob): void {
  const pdf = blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' });
  const url = URL.createObjectURL(pdf);
  window.open(url, '_blank', 'noopener,noreferrer');
  // A aba nova já carregou o blob; liberar depois evita vazar memória sem cortar a leitura.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
