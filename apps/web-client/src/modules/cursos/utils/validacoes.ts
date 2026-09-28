import type { LiberacaoInput, RegraLiberacao } from '@sysgov/sdk';

/** Regra de liberação como o formulário a mantém (tudo em texto, como vem dos campos). */
export interface LiberacaoForm {
  regra: RegraLiberacao;
  dias: string;
  aulaId: string;
}

export const LIBERACAO_IMEDIATA: LiberacaoForm = { regra: 'imediata', dias: '', aulaId: '' };

export function liberacaoDe(item?: { liberacao_regra: RegraLiberacao; liberacao_dias: number | null; aula_id: number | null } | null): LiberacaoForm {
  if (!item) return LIBERACAO_IMEDIATA;
  return { regra: item.liberacao_regra, dias: item.liberacao_dias === null ? '' : String(item.liberacao_dias), aulaId: item.aula_id === null ? '' : String(item.aula_id) };
}

/** Mesmas regras do backend: "no início da aula" exige aula; "dias após" exige de 0 a 365. */
export function validarLiberacao(l: LiberacaoForm): string | null {
  if (l.regra === 'inicio_aula' && !l.aulaId) return 'A liberação "no início da aula" exige escolher a aula.';
  if (l.regra === 'dias_apos_inicio') {
    const dias = Number(l.dias);
    if (l.dias.trim() === '' || !Number.isInteger(dias) || dias < 0 || dias > 365) return 'Informe de 0 a 365 dias para a liberação após o início da turma.';
  }
  return null;
}

export function liberacaoParaApi(l: LiberacaoForm): LiberacaoInput {
  return {
    liberacao_regra: l.regra,
    liberacao_dias: l.regra === 'dias_apos_inicio' ? Number(l.dias) : null,
    aula_id: l.aulaId ? Number(l.aulaId) : null,
  };
}

export interface AlternativaForm {
  texto: string;
  correta: boolean;
}

export const ALTERNATIVAS_MIN = 2;
export const ALTERNATIVAS_MAX = 6;

/** Objetiva: de 2 a 6 alternativas, todas com texto e exatamente uma correta. */
export function validarAlternativas(alternativas: AlternativaForm[]): string | null {
  if (alternativas.length < ALTERNATIVAS_MIN || alternativas.length > ALTERNATIVAS_MAX) {
    return `Uma questão objetiva precisa de ${ALTERNATIVAS_MIN} a ${ALTERNATIVAS_MAX} alternativas.`;
  }
  if (alternativas.some((a) => a.texto.trim() === '')) return 'Toda alternativa precisa de um texto.';
  if (alternativas.filter((a) => a.correta).length !== 1) return 'Marque exatamente uma alternativa correta.';
  return null;
}

/** Nota mínima do curso: vazia (sem nota mínima) ou de 0 a 10. */
export function validarNotaMinima(valor: string): string | null {
  if (valor.trim() === '') return null;
  const nota = Number(valor.replace(',', '.'));
  if (Number.isNaN(nota) || nota < 0 || nota > 10) return 'A nota mínima deve estar na escala de 0 a 10.';
  return null;
}

/** Vírgula ou ponto decimal → número (ou nulo se vazio). */
export function paraNumero(valor: string): number | null {
  if (valor.trim() === '') return null;
  return Number(valor.replace(',', '.'));
}

/** Tamanho máximo do PDF de um material (o backend também confere). */
export const PDF_MAX_BYTES = 20 * 1024 * 1024;

export function validarPdf(arquivo: File): string | null {
  if (arquivo.size > PDF_MAX_BYTES) return 'O PDF pode ter no máximo 20 MB.';
  if (arquivo.type !== 'application/pdf' && !arquivo.name.toLowerCase().endsWith('.pdf')) return 'Envie um arquivo PDF.';
  return null;
}
