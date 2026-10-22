import type { ElementoAssinatura, ElementoLeiaute, ElementoTexto, OrientacaoCertificado } from '@sysgov/sdk';
import { PAGINAS, limitar } from './leiaute';

/**
 * Regras do construtor por curso (D8): o texto principal, o QR code e o código de autenticidade
 * estão sempre no leiaute; os elementos opcionais avulsos e as assinaturas entram e saem pelos
 * checkboxes. Posições iniciais em proporção da página, para paisagem e retrato.
 */

export const OPCIONAIS = [
  { campo: 'titulo', rotulo: 'Tipo de Certificado' },
  { campo: 'participante', rotulo: 'Nome do Participante' },
  { campo: 'curso', rotulo: 'Nome do Curso' },
  { campo: 'data_emissao', rotulo: 'Data de Emissão' },
  { campo: 'complementar', rotulo: 'Texto Complementar' },
] as const;

export type CampoOpcional = (typeof OPCIONAIS)[number]['campo'];

/** Ids fixos dos elementos sempre presentes. */
export const FIXOS = { corpo: 'corpo', qrcode: 'qrcode', codigo: 'codigo' } as const;

type Inicial = Pick<ElementoTexto, 'tamanho' | 'negrito' | 'alinhamento'> & { y: number; margem: number };

/** y e margem em fração da página. */
const INICIAIS: Record<CampoOpcional | 'corpo', Inicial> = {
  titulo: { y: 0.22, margem: 0.06, tamanho: 24, negrito: false, alinhamento: 'centro' },
  participante: { y: 0.33, margem: 0.08, tamanho: 22, negrito: true, alinhamento: 'centro' },
  corpo: { y: 0.42, margem: 0.12, tamanho: 14, negrito: false, alinhamento: 'centro' },
  curso: { y: 0.56, margem: 0.12, tamanho: 16, negrito: true, alinhamento: 'centro' },
  data_emissao: { y: 0.63, margem: 0.12, tamanho: 12, negrito: false, alinhamento: 'centro' },
  complementar: { y: 0.68, margem: 0.12, tamanho: 11, negrito: false, alinhamento: 'centro' },
};

export function elementoDeCampo(campo: CampoOpcional | 'corpo', orientacao: OrientacaoCertificado): ElementoTexto {
  const [w, h] = PAGINAS[orientacao];
  const ini = INICIAIS[campo];
  return limitar({
    id: campo, tipo: 'texto', campo, texto: null, x: w * ini.margem, y: h * ini.y, largura: w * (1 - 2 * ini.margem),
    fonte: 'sans', tamanho: ini.tamanho, cor: '#000000', negrito: ini.negrito, caixa_alta: false, alinhamento: ini.alinhamento,
  }, orientacao);
}

/** Leiaute de partida: texto principal, QR code e código de autenticidade. */
export function leiauteInicial(orientacao: OrientacaoCertificado): ElementoLeiaute[] {
  const [, h] = PAGINAS[orientacao];
  return [
    elementoDeCampo('corpo', orientacao),
    limitar({ id: FIXOS.qrcode, tipo: 'qrcode', x: 40, y: h - 150, largura: 90 }, orientacao),
    limitar({
      id: FIXOS.codigo, tipo: 'texto', campo: null, texto: 'Código de Validação: {CODIGO_CERTIFICADO}', x: 40, y: h - 52, largura: 220,
      fonte: 'sans', tamanho: 8, cor: '#000000', negrito: false, caixa_alta: false, alinhamento: 'esquerda',
    }, orientacao),
  ];
}

/** Assinatura nova, ao lado das já marcadas, na faixa de baixo da página. */
export function elementoDeAssinatura(assinaturaId: number, jaMarcadas: number, orientacao: OrientacaoCertificado): ElementoAssinatura {
  const [w, h] = PAGINAS[orientacao];
  const largura = 160;
  // 1ª no centro, 2ª à direita, 3ª à esquerda.
  const x = w / 2 - largura / 2 + [0, 1, -1][jaMarcadas % 3] * (largura + 20);
  return limitar({
    id: `ass-${assinaturaId}`, tipo: 'assinatura', assinatura_id: assinaturaId, x, y: h - 170, largura,
    mostrar_textos: true, tamanho: 10, cor: '#000000',
  }, orientacao);
}

export function temCampo(elementos: ElementoLeiaute[], campo: string): boolean {
  return elementos.some((e) => e.tipo === 'texto' && e.campo === campo);
}

export function temAssinatura(elementos: ElementoLeiaute[], assinaturaId: number): boolean {
  return elementos.some((e) => e.tipo === 'assinatura' && e.assinatura_id === assinaturaId);
}

/** Marca ou desmarca um elemento opcional avulso. */
export function alternarCampo(elementos: ElementoLeiaute[], campo: CampoOpcional, marcar: boolean, orientacao: OrientacaoCertificado): ElementoLeiaute[] {
  if (!marcar) return elementos.filter((e) => !(e.tipo === 'texto' && e.campo === campo));
  return temCampo(elementos, campo) ? elementos : [...elementos, elementoDeCampo(campo, orientacao)];
}

/** Marca ou desmarca uma assinatura (e o selo dela, se houver). */
export function alternarAssinatura(elementos: ElementoLeiaute[], assinaturaId: number, marcar: boolean, orientacao: OrientacaoCertificado): ElementoLeiaute[] {
  if (!marcar) return elementos.filter((e) => !((e.tipo === 'assinatura' || e.tipo === 'selo') && e.assinatura_id === assinaturaId));
  if (temAssinatura(elementos, assinaturaId)) return elementos;
  const marcadas = elementos.filter((e) => e.tipo === 'assinatura').length;
  return [...elementos, elementoDeAssinatura(assinaturaId, marcadas, orientacao)];
}

/** Garante os elementos fixos (texto principal, QR e código) num leiaute carregado. */
export function comFixos(elementos: ElementoLeiaute[], orientacao: OrientacaoCertificado): ElementoLeiaute[] {
  const lista = [...elementos];
  const iniciais = leiauteInicial(orientacao);
  if (!temCampo(lista, 'corpo')) lista.unshift(iniciais[0]);
  if (!lista.some((e) => e.tipo === 'qrcode')) lista.push(iniciais[1]);
  const temCodigo = lista.some((e) => e.tipo === 'texto' && (e.campo === 'codigo' || /\{\{\s*codigo\s*\}\}|\{CODIGO_CERTIFICADO\}/.test(e.texto ?? '')));
  if (!temCodigo) lista.push(iniciais[2]);
  return lista;
}

/** Elementos fixos não saem pela lixeira nem pelo Delete. */
export function elementoFixo(el: ElementoLeiaute): boolean {
  return el.tipo === 'qrcode' || el.id === FIXOS.codigo || (el.tipo === 'texto' && el.campo === 'corpo');
}
