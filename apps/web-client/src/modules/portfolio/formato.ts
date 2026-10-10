import type { AlunoPortfolio, Desempenho, Periodo } from './api';

export function formatarAvaliacao(valor: number | null): string {
  return valor === null ? '—' : valor.toFixed(1).replace('.', ',');
}

/** "8,5" → 8.5; null se vazio, não numérico, fora de 0–10 ou com mais de uma casa decimal. */
export function lerAvaliacao(texto: string): number | null {
  const limpo = texto.trim().replace(',', '.');
  if (!/^\d{1,2}(\.\d)?$/.test(limpo)) return null;
  const valor = Number(limpo);
  return valor >= 0 && valor <= 10 ? valor : null;
}

/** Data de hoje (AAAA-MM-DD) no fuso do navegador — toISOString() é UTC e, no Brasil, vira o dia seguinte após as 21h. */
export function hojeLocal(agora: Date = new Date()): string {
  const dois = (n: number) => String(n).padStart(2, '0');
  return `${agora.getFullYear()}-${dois(agora.getMonth() + 1)}-${dois(agora.getDate())}`;
}

export function rotuloPeriodo(p: Periodo): string {
  return p.trimestre ? `${p.trimestre}º trimestre de ${p.ano}` : `Ano letivo ${p.ano}`;
}

export function paramsPeriodo(p: Periodo): Record<string, number> {
  return p.trimestre ? { ano: p.ano, trimestre: p.trimestre } : { ano: p.ano };
}

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function filtrarAlunos(alunos: AlunoPortfolio[], busca: string): AlunoPortfolio[] {
  const termo = semAcento(busca.trim());
  return termo ? alunos.filter((a) => semAcento(a.nome).includes(termo)) : alunos;
}

export function dadosGraficos(d: Desempenho) {
  const materias = d.por_materia.map((m) => ({ ...m, materia: m.materia ?? 'Sem matéria' }));
  return {
    barras: materias.filter((m) => m.media !== null).map((m) => ({ materia: m.materia, media: m.media as number })),
    rosca: materias.map((m) => ({ materia: m.materia, quantidade: m.quantidade })),
    linha: (d.por_trimestre ?? []).map((t) => ({ trimestre: `${t.trimestre}º tri`, media: t.media })),
  };
}
