import type { AlinhamentoTexto, AssinaturaOrgao, ElementoLeiaute, ElementoTexto, OrientacaoCertificado } from '@sysgov/sdk';

/**
 * Regras do construtor visual no navegador (espelho de LeiauteCertificado no backend). Tudo em
 * pontos sobre a página A4 — a tela só aplica uma escala, então o que se vê é onde sai no PDF.
 */

export const PAGINAS: Record<OrientacaoCertificado, [number, number]> = { paisagem: [842, 595], retrato: [595, 842] };
export const LARGURA_MIN = 10;
export const MAX_ELEMENTOS = 40;
export const TAMANHO_MIN = 6;
export const TAMANHO_MAX = 72;

/** Valores de exemplo para desenhar os campos no construtor. */
export const EXEMPLO: Record<string, string> = {
  participante: 'Maria da Silva Exemplo',
  curso: 'Curso de Exemplo',
  carga_horaria: '20 horas',
  periodo: '01/09/2026 a 30/09/2026',
  data_emissao: '30/09/2026',
  orgao: 'Prefeitura Municipal',
  nota: '9,50',
  codigo: 'EXEM-PLO0-0000',
  cpf: '123.456.789-00',
  empresa: 'Empresa Exemplo Ltda.',
  cnpj: '00.000.000/0001-00',
  carga_horas: '20',
  data_extenso: '30 de setembro de 2026',
  data_conclusao: '30/09/2026',
  responsavel: 'Responsável pelo curso',
  conteudo_programatico: 'Módulo 1 — Fundamentos\nMódulo 2 — Prática',
};

/**
 * Variáveis do texto no formato do sistema de referência ({NOME}) → valor em EXEMPLO/`dados`.
 * Espelho de ModeloCertificadoService::VARIAVEIS.
 */
export const VARIAVEIS: Record<string, string> = {
  NOME: 'participante',
  CPF: 'cpf',
  EMPRESA: 'empresa',
  CNPJ: 'cnpj',
  CURSO: 'curso',
  CARGA_HORARIA: 'carga_horas',
  DATA: 'data_extenso',
  DATA_CONCLUSAO: 'data_conclusao',
  CODIGO_CERTIFICADO: 'codigo',
  RESPONSAVEL: 'responsavel',
  CONTEUDO_PROGRAMATICO: 'conteudo_programatico',
};

/** Dica de cada variável nos botões de inserir. */
export const DESCRICAO_VARIAVEL: Record<string, string> = {
  NOME: 'Nome do participante',
  CPF: 'CPF do participante',
  EMPRESA: 'Empresa do participante (sem empresa: Autônomo)',
  CNPJ: 'CNPJ da empresa do participante',
  CURSO: 'Nome do curso',
  CARGA_HORARIA: 'Carga horária em horas (só o número)',
  DATA: 'Cidade e data de emissão por extenso',
  DATA_CONCLUSAO: 'Data de conclusão (dd/mm/aaaa)',
  CODIGO_CERTIFICADO: 'Código de validação do certificado',
  RESPONSAVEL: 'Responsável pelo curso',
  CONTEUDO_PROGRAMATICO: 'Conteúdo programático do curso',
};

/** Marcação inserida no texto para a variável. */
export const marcador = (variavel: string): string => `{${variavel}}`;

/** Variáveis oferecidas em texto livre (as mesmas do servidor). */
export const CAMPOS_TEXTO_LIVRE = Object.keys(VARIAVEIS);

/** Campos no formato antigo ({{participante}}) que continuam valendo nos textos já gravados. */
const CAMPOS_ANTIGOS = ['participante', 'curso', 'carga_horaria', 'periodo', 'data_emissao', 'orgao', 'nota', 'codigo'];

/** Variáveis ({NOME}) e campos antigos ({{participante}}) desconhecidos num texto. */
export function variaveisDesconhecidas(texto: string, variaveis: string[] = CAMPOS_TEXTO_LIVRE): string[] {
  const antigos = [...texto.matchAll(/\{\{\s*([^}]*?)\s*\}\}/g)].map((m) => m[1]).filter((c) => !CAMPOS_ANTIGOS.includes(c)).map((c) => `{{${c}}}`);
  const novas = [...texto.matchAll(/(?<!\{)\{([A-Z][A-Z_]*)\}(?!\})/g)].map((m) => m[1]).filter((v) => !variaveis.includes(v)).map(marcador);
  return [...antigos, ...novas];
}

export const ROTULO_CAMPO: Record<string, string> = {
  participante: 'Nome do participante',
  curso: 'Curso',
  carga_horaria: 'Carga horária',
  periodo: 'Período',
  data_emissao: 'Data de emissão',
  orgao: 'Órgão',
  nota: 'Nota',
  codigo: 'Código de autenticidade',
  titulo: 'Tipo de certificado (título)',
  corpo: 'Texto do certificado',
  complementar: 'Texto complementar',
};

export const ALINHAMENTO_CSS: Record<AlinhamentoTexto, 'left' | 'center' | 'right' | 'justify'> = {
  esquerda: 'left', centro: 'center', direita: 'right', justificado: 'justify',
};

const arred = (n: number): number => Math.round(n * 10) / 10;

/** Pixels da tela → pontos da página (e vice-versa) para uma largura de tela. */
export function escalaPara(larguraTelaPx: number, orientacao: OrientacaoCertificado): number {
  return larguraTelaPx / PAGINAS[orientacao][0];
}

/** Mantém o elemento dentro da página (largura mínima, sem passar das bordas). */
export function limitar<T extends ElementoLeiaute>(el: T, orientacao: OrientacaoCertificado): T {
  const [w, h] = PAGINAS[orientacao];
  // Campo numérico vazio ou evento sem coordenadas não pode virar NaN no leiaute.
  const num = (v: number, padrao: number): number => (Number.isFinite(v) ? v : padrao);
  el = { ...el, x: num(el.x, 0), y: num(el.y, 0), largura: num(el.largura, LARGURA_MIN) };
  const largura = arred(Math.min(Math.max(el.largura, LARGURA_MIN), w));
  const altura = el.tipo === 'qrcode' ? largura : 0;
  return {
    ...el,
    largura,
    x: arred(Math.min(Math.max(el.x, 0), w - largura)),
    y: arred(Math.min(Math.max(el.y, 0), Math.max(0, h - Math.max(altura, 1)))),
  };
}

/** Move por um deslocamento em pixels de tela, convertido para pontos. */
export function mover<T extends ElementoLeiaute>(el: T, dxPx: number, dyPx: number, escala: number, orientacao: OrientacaoCertificado): T {
  return limitar({ ...el, x: el.x + dxPx / escala, y: el.y + dyPx / escala }, orientacao);
}

export function redimensionar<T extends ElementoLeiaute>(el: T, dxPx: number, escala: number, orientacao: OrientacaoCertificado): T {
  return limitar({ ...el, largura: el.largura + dxPx / escala }, orientacao);
}

let sequencia = 0;
export function novoId(prefixo: string): string {
  sequencia += 1;
  return `${prefixo}-${Date.now().toString(36)}-${sequencia}`;
}

export function novoTexto(orientacao: OrientacaoCertificado, origem: { campo?: string; texto?: string }): ElementoTexto {
  const [w, h] = PAGINAS[orientacao];
  return limitar({
    id: novoId('texto'), tipo: 'texto', campo: origem.campo ?? null, texto: origem.texto ?? null,
    x: w * 0.2, y: h * 0.45, largura: w * 0.6, fonte: 'sans', tamanho: 14, cor: '#1b2a41',
    negrito: false, caixa_alta: false, alinhamento: 'centro',
  }, orientacao);
}

/** Problemas que o servidor também recusaria — mostrados antes de salvar. */
export function problemas(elementos: ElementoLeiaute[], camposTextoLivre: string[]): string[] {
  const erros: string[] = [];
  const qrs = elementos.filter((e) => e.tipo === 'qrcode').length;
  if (qrs === 0) erros.push('Adicione o QR code de validação.');
  if (qrs > 1) erros.push('Deixe só um QR code de validação.');
  if (elementos.length > MAX_ELEMENTOS) erros.push(`Use no máximo ${MAX_ELEMENTOS} elementos.`);
  elementos.forEach((e, i) => {
    if (e.tipo !== 'texto') return;
    if (!e.campo && !(e.texto ?? '').trim()) erros.push(`Elemento ${i + 1}: texto vazio.`);
    const desconhecidos = variaveisDesconhecidas(e.texto ?? '', camposTextoLivre);
    if (desconhecidos.length) erros.push(`Elemento ${i + 1}: variável desconhecida ${desconhecidos[0]}.`);
  });
  return erros;
}

/** Textos do modelo usados pelos campos `titulo`, `corpo` e `complementar` (com campos dinâmicos). */
export interface TextosDoModelo {
  titulo: string;
  corpo: string;
  complementar?: string | null;
  /** Valores reais que substituem os de exemplo (ex.: o curso escolhido no construtor). */
  valores?: Record<string, string>;
}

/** Texto exibido no construtor para um elemento de texto, com valores de exemplo. */
export function textoExemplo(el: ElementoTexto, textos: TextosDoModelo): string {
  const valores: Record<string, string> = {
    ...EXEMPLO, ...textos.valores, titulo: textos.titulo,
  };
  valores.corpo = preencher(textos.corpo, valores);
  valores.complementar = preencher(textos.complementar ?? '', valores);
  const bruto = el.campo ? valores[el.campo] ?? '' : preencher(el.texto ?? '', valores);
  return el.caixa_alta ? bruto.toLocaleUpperCase('pt-BR') : bruto;
}

/** Nome do elemento nos painéis e no rótulo acessível da página. */
export function rotuloElemento(el: ElementoLeiaute, assinaturas: Map<number, AssinaturaOrgao>): string {
  switch (el.tipo) {
    case 'texto':
      return el.campo ? ROTULO_CAMPO[el.campo] ?? el.campo : 'Texto livre';
    case 'qrcode':
      return 'QR code de validação';
    case 'logotipo':
      return 'Logotipo';
    case 'assinatura':
      return `Assinatura — ${assinaturas.get(el.assinatura_id)?.nome ?? 'assinatura'}`;
    case 'selo':
      return `Selo — ${assinaturas.get(el.assinatura_id)?.nome ?? 'assinatura'}`;
  }
}

function preencher(texto: string, valores: Record<string, string> = EXEMPLO): string {
  return texto
    .replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (m, c: string) => valores[c] ?? m)
    .replace(/(?<!\{)\{([A-Z][A-Z_]*)\}(?!\})/g, (m, v: string) => (VARIAVEIS[v] ? valores[VARIAVEIS[v]] ?? m : m));
}
