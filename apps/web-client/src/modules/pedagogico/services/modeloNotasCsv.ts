import type { AlunoPedagogico, Materia, TurmaPedagogica } from '../types/pedagogico';

/** Cabeçalho aceito por POST /pedagogico/notas/importar. */
export const CABECALHO_NOTAS_CSV = ['TURMA', 'NUMERO', 'MATERIA', 'TRIMESTRE', 'NOTA'] as const;

const celula = (valor: string | number): string => {
  const texto = String(valor);
  return /[;"\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
};

/**
 * Planilha modelo (separador ";", como o Excel em pt-BR abre): uma linha por aluno numerado da turma
 * e por matéria vinculada a ela, com a NOTA em branco para preencher. Linha que continuar em branco é
 * ignorada na importação.
 */
export function modeloNotasCsv(
  turma: TurmaPedagogica,
  materias: Materia[],
  alunos: AlunoPedagogico[],
  trimestre: 1 | 2 | 3,
  materiaId?: number,
): string {
  const vinculadas = new Set((turma.materias ?? []).map((v) => v.materia_id));
  const materiasDoModelo = materias.filter((m) => vinculadas.has(m.id) && (materiaId === undefined || m.id === materiaId));
  const alunosDoModelo = alunos
    .filter((a) => a.turma_id === turma.id && a.numero != null)
    .sort((a, b) => a.numero! - b.numero!);

  const linhas = materiasDoModelo.flatMap((m) =>
    alunosDoModelo.map((a) => [turma.nome, a.numero!, m.nome, trimestre, ''].map(celula).join(';')),
  );
  return [CABECALHO_NOTAS_CSV.join(';'), ...linhas].join('\r\n') + '\r\n';
}
