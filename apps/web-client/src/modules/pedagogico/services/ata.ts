import type { MembroEquipe } from '../../escola/api';
import type { Professor } from '../types/pedagogico';

/*
 * Texto da ata do conselho de classe montado com dados do sistema (D17): unidade do Cadastro Escolar, data da
 * reunião, equipe gestora cadastrada por nome e professores vinculados à turma. O que não está cadastrado é
 * omitido — nunca há nome inventado.
 */

export interface EquipeAta {
  diretor: string;
  auxiliares: string[];
  secretaria: string[];
  pedagogas: string[];
  docentes: string[];
}

export function equipeDaAta(equipe: MembroEquipe[], professores: Professor[], turma: string): EquipeAta {
  const doCargo = (cargo: MembroEquipe['cargo']) => equipe.filter((m) => m.cargo === cargo).map((m) => m.nome);
  return {
    diretor: doCargo('diretor')[0] ?? '',
    auxiliares: doCargo('diretor_auxiliar'),
    secretaria: doCargo('secretaria'),
    pedagogas: doCargo('pedagoga'),
    docentes: professores.filter((p) => p.turmas_atribuidas.includes(turma)).map((p) => p.nome),
  };
}

/** "A", "A e B", "A, B e C". */
export function juntarNomes(nomes: string[]): string {
  return nomes.length <= 1 ? (nomes[0] ?? '') : `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`;
}

const UNIDADES = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze',
  'catorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const DEZENAS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

/** 1–99 por extenso. */
function extenso(n: number): string {
  if (n < 20) return UNIDADES[n];
  const d = DEZENAS[Math.floor(n / 10)];
  return n % 10 === 0 ? d : `${d} e ${UNIDADES[n % 10]}`;
}

/** "Aos vinte e nove dias do mês de setembro de dois mil e vinte e seis" (anos 2000–2099). */
export function dataPorExtenso(data: Date): string {
  const dia = data.getDate();
  const resto = data.getFullYear() - 2000;
  const ano = `dois mil${resto > 0 ? ` e ${extenso(resto)}` : ''}`;
  const inicio = dia === 1 ? 'Ao primeiro dia' : `Aos ${extenso(dia)} dias`;
  return `${inicio} do mês de ${MESES[data.getMonth()]} de ${ano}`;
}

/** "do Colégio X" / "da Escola Y". */
function nasDependencias(escola: string): string {
  if (!escola) return 'nas dependências desta unidade escolar';
  return `nas dependências ${/^(escola|creche|unidade|faculdade|institui)/i.test(escola) ? 'da' : 'do'} ${escola}`;
}

export interface DadosIntroducao {
  data: Date;
  escola: string;
  turma: string;
  turno?: string;
  periodo: string;
  ano: number;
  diretor: string;
  auxiliares: string[];
  /** Pedagoga escolhida na ata entre as cadastradas no Corpo Docente. */
  pedagoga: string;
  docentes: string[];
}

function textoDirecao(diretor: string, auxiliares: string[]): string {
  const aux = auxiliares.length
    ? `${auxiliares.length === 1 ? 'pelo diretor auxiliar' : 'pelos diretores auxiliares'} ${juntarNomes(auxiliares)}`
    : '';
  if (diretor && aux) return `a Direção representada por ${diretor} e ${aux}`;
  if (diretor) return `a Direção representada por ${diretor}`;
  if (aux) return `a Direção representada ${aux}`;
  return 'a Direção';
}

export function introducaoAta({ data, escola, turma, turno, periodo, ano, diretor, auxiliares, pedagoga, docentes }: DadosIntroducao): string {
  const periodoTurno = turno ? ` do período da ${turno}` : '';
  const pedagogia = pedagoga ? `a equipe pedagógica${periodoTurno} composta por ${pedagoga}` : `a equipe pedagógica${periodoTurno}`;
  const corpo = docentes.length ? `o corpo docente da turma (${juntarNomes(docentes)})` : 'o corpo docente desta instituição de ensino';
  return `${dataPorExtenso(data)}, reuniram-se ${nasDependencias(escola)} ${textoDirecao(diretor, auxiliares)}, ${pedagogia} e ${corpo}, `
    + `para a realização do Conselho de Classe referente ao ${periodo} do ano letivo de ${ano}, do ${turma}. ${TEXTO_PADRAO}`;
}

/** Trecho descritivo padrão (metodologias e avaliação), editável na tela antes de finalizar a ata. */
const TEXTO_PADRAO = 'Neste Conselho de Classe foram discutidos individualmente assuntos relevantes ao processo de ensino e aprendizagem, envolvendo rendimento escolar, número de faltas e demais aspectos relacionados ao desenvolvimento acadêmico e às individualidades dos estudantes. A equipe docente relatou que, durante o trimestre, foram utilizadas diferentes metodologias de ensino, tais como aulas expositivas dialogadas, utilização de tecnologias digitais, resolução de exercícios, trabalhos em grupo e metodologias ativas, buscando diversificar as práticas pedagógicas conforme previsto no Plano de Trabalho Docente. Com relação ao processo avaliativo, foram ofertadas no decorrer do trimestre, no mínimo, quatro avaliações, REDS (Recursos Educacionais Digitais) bem como duas oportunidades de recuperação, com instrumentos e valores diferenciados, oportunizando aos estudantes diferentes formas de demonstrar seus conhecimentos e alcançar a média trimestral mínima de 6,0 (seis vírgula zero). Entretanto, conforme apontamentos levantados no pré-conselho e discutidos pela equipe docente, alguns estudantes apresentam pontos de atenção relacionados à falta de comprometimento com os estudos, não entrega de atividades, ausência de registro dos conteúdos no caderno, dificuldades de aprendizagem e atenção, indisciplina, além de faltas injustificadas e recorrentes. Após análise coletiva, foram destacados os seguintes estudantes com dificuldades relacionadas como pontos de atenção:';
