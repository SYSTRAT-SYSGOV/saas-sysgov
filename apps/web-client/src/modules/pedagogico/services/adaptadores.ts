import type { Aluno, Categoria, Materia as MateriaApi, Professor as ProfessorApi, SituacaoAluno, Trimestre, Turma, Unidade } from '../../escola/api';
import { escolaApi } from '../../escola/api';
import type { Ata, Cronograma, DadosAta, DadosPreConselho, Nota, Ocorrencia, PreConselho as PreConselhoApi, Severidade, StatusAta } from '../api';
import { pedagogicoApi } from '../api';
import type {
  AlunoPedagogico, AtaConselho, CategoriaOcorrencia, ConfigEscola, CronogramaPreConselho, DesempenhoGeral,
  EngajamentoStatus, Materia, ObjetivosStatus, OcorrenciaPedagogica, PeriodoTrimestre, PreConselho,
  Professor, SeveridadeOcorrencia, SocioemocionalStatus, StatusAluno, TurmaPedagogica, TurnoNome,
} from '../types/pedagogico';

/*
 * Adaptadores (D2): convertem o JSON da API para os tipos que as telas já usam e de volta.
 * O tenant é resolvido pelo servidor, por isso `tenant_id` fica vazio nos objetos das telas.
 */

/** Inverte um mapa de rótulos (valor da API → rótulo da tela). */
const inverter = <A extends string, B extends string>(mapa: Record<A, B>): Record<B, A> =>
  Object.fromEntries(Object.entries(mapa).map(([a, b]) => [b, a])) as Record<B, A>;

const SITUACAO: Record<SituacaoAluno, StatusAluno> = { ativo: 'Ativo', transferido: 'Transferido', remanejado: 'Remanejado' };
const SEVERIDADE: Record<Severidade, SeveridadeOcorrencia> = { baixa: 'Baixa', media: 'Média', alta: 'Alta', critica: 'Crítica' };
const STATUS_ATA: Record<StatusAta, AtaConselho['status']> = { rascunho: 'Rascunho', finalizada: 'Finalizada', arquivada: 'Arquivada' };
const DESEMPENHO: Record<PreConselhoApi['desempenho_geral'], DesempenhoGeral> = {
  excelente: 'Excelente', bom: 'Bom', regular: 'Regular', insatisfatorio: 'Insatisfatório',
};
const OBJETIVOS: Record<NonNullable<PreConselhoApi['objetivos_atingidos']>, ObjetivosStatus> = {
  totalmente: 'Totalmente', parcialmente: 'Parcialmente', nao_atingidos: 'Não atingidos',
};
const INSTRUMENTOS: Record<NonNullable<PreConselhoApi['instrumentos_adequados']>, NonNullable<PreConselho['instrumentos_adequados']>> = {
  sim: 'Sim', parcialmente: 'Parcialmente', nao: 'Não',
};
const ENGAJAMENTO: Record<NonNullable<PreConselhoApi['engajamento_nivel']>, EngajamentoStatus> = {
  alta: 'Alta participação', moderada: 'Participação moderada', baixa: 'Baixa participação',
};
const SOCIOEMOCIONAL: Record<NonNullable<PreConselhoApi['socioemocional_status']>, SocioemocionalStatus> = {
  adequado: 'Adequado', necessita_atencao: 'Necessita atenção', critico: 'Crítico',
};

export const situacaoApi = inverter(SITUACAO);
const severidadeApi = inverter(SEVERIDADE);
const desempenhoApi = inverter(DESEMPENHO);
const objetivosApi = inverter(OBJETIVOS);
const instrumentosApi = inverter(INSTRUMENTOS);
const engajamentoApi = inverter(ENGAJAMENTO);
const socioemocionalApi = inverter(SOCIOEMOCIONAL);

/** `1` ↔ `'1º Trimestre'`. */
export const rotuloPeriodo = (periodo: number): CronogramaPreConselho['periodo'] => `${periodo}º Trimestre` as CronogramaPreConselho['periodo'];
export const numeroPeriodo = (rotulo: string | number | undefined): 1 | 2 | 3 => {
  const n = Number(String(rotulo ?? '').match(/[123]/)?.[0]);
  return (n === 2 || n === 3 ? n : 1);
};

/** Aceita `aaaa-mm-dd` ou `dd/mm/aaaa` (as telas usam os dois) e devolve `aaaa-mm-dd`. */
export function dataIso(valor: string | undefined | null): string {
  if (!valor) return new Date().toISOString().slice(0, 10);
  const br = valor.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (br) return `${br[3]}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}`;
  return valor.slice(0, 10);
}

const vazio = (texto: string | undefined | null): string | null => (texto && texto.trim() ? texto.trim() : null);

/* ------------------------------------------------------------------ */
/* API → telas                                                          */
/* ------------------------------------------------------------------ */

export const deTurma = (t: Turma): TurmaPedagogica => ({
  id: t.id,
  tenant_id: '',
  nome: t.nome,
  turno_id: t.turno?.id,
  turno_nome: (t.turno?.nome ?? '') as TurnoNome,
  total_alunos: t.total_alunos ?? 0,
  materias: (t.materias ?? []).map((v) => ({ materia_id: v.materia_id, professor_id: v.professor_user_id })),
  pedagoga_nome: t.pedagoga?.nome,
});

export const deMateria = (m: MateriaApi): Materia => ({ id: m.id, tenant_id: '', nome: m.nome });

export const deAluno = (a: Aluno, totalOcorrencias = 0): AlunoPedagogico => ({
  id: a.id,
  tenant_id: '',
  nome: a.nome,
  cgm: a.cgm ?? undefined,
  numero: a.numero ?? undefined,
  turma_id: a.turma?.id ?? 0,
  turma_nome: a.turma?.nome ?? '',
  mae: a.mae ?? undefined,
  pai: a.pai ?? undefined,
  contato: a.contatos?.[0]?.telefone,
  contatos: (a.contatos ?? []).map((c) => ({ telefone: c.telefone, descricao: c.descricao ?? '' })),
  nascimento: a.nascimento ?? undefined,
  foto: a.tem_foto ? escolaApi.urlFoto(a.id) : undefined,
  status: SITUACAO[a.situacao],
  turma_origem: a.turma_origem?.nome,
  total_ocorrencias: totalOcorrencias,
});

export const deOcorrencia = (o: Ocorrencia, turmaNome: (turmaId: number | null | undefined) => string): OcorrenciaPedagogica => ({
  id: o.id,
  tenant_id: '',
  aluno_id: o.aluno_id,
  aluno_nome: o.aluno?.nome ?? '',
  turma_nome: turmaNome(o.aluno?.turma_id),
  categoria: o.categoria?.nome ?? '',
  descricao: o.descricao,
  data: o.data,
  severidade: SEVERIDADE[o.severidade],
  registrado_por: o.responsavel ?? o.autor?.name ?? undefined,
  anexo_nome: o.anexo_nome ?? undefined,
  anexo_url: o.anexo_nome ? pedagogicoApi.urlAnexo(o.id) : undefined,
});

export const dePreConselho = (p: PreConselhoApi): PreConselho => ({
  id: p.id,
  tenant_id: '',
  turma_id: p.turma_id,
  turma_nome: p.turma?.nome ?? '',
  materia_id: p.materia_id,
  materia_nome: p.materia?.nome,
  ano_letivo: String(p.ano_letivo),
  periodo: rotuloPeriodo(p.periodo),
  data_registro: p.data_registro,
  desempenho_geral: DESEMPENHO[p.desempenho_geral],
  desempenho_justificativa: p.desempenho_justificativa ?? '',
  conteudos_trabalhados: p.conteudos_trabalhados ?? '',
  objetivos_atingidos: p.objetivos_atingidos ? OBJETIVOS[p.objetivos_atingidos] : 'Totalmente',
  obs_pedagogicas: p.obs_pedagogicas ?? '',
  metodologias: p.metodologias ?? undefined,
  metodologias_outras: p.metodologias_outras ?? undefined,
  metodologias_eficacia: p.metodologias_eficacia ?? undefined,
  instrumentos_avaliativos: p.instrumentos_avaliativos ?? undefined,
  instrumentos_adequados: p.instrumentos_adequados ? INSTRUMENTOS[p.instrumentos_adequados] : undefined,
  instrumentos_outros: p.instrumentos_outros ?? undefined,
  instrumentos_obs: p.instrumentos_obs ?? undefined,
  engajamento_nivel: p.engajamento_nivel ? ENGAJAMENTO[p.engajamento_nivel] : 'Participação moderada',
  engajamento_dificuldades: p.engajamento_dificuldades ?? undefined,
  engajamento_potencialidades: p.engajamento_potencialidades ?? undefined,
  dificuldades_aprendizagem: p.dificuldades_aprendizagem ?? undefined,
  estrategias_superacao: p.estrategias_superacao ?? undefined,
  socioemocional_status: p.socioemocional_status ? SOCIOEMOCIONAL[p.socioemocional_status] : 'Adequado',
  socioemocional_descricao: p.socioemocional_descricao ?? undefined,
  // A listagem traz só `alunos_count`; os alunos avaliados vêm no detalhe (GET /pre-conselhos/{id}).
  alunos_avaliados: (p.alunos ?? []).map((a) => ({
    id: a.aluno_id,
    pre_conselho_id: p.id,
    aluno_id: a.aluno_id,
    aluno_nome: a.aluno?.nome ?? '',
    nivel_atencao: a.nivel_atencao,
    dificuldade_identificada: a.dificuldade ?? '',
    encaminhamentos_realizados: a.encaminhamentos ?? '',
    aluno_destaque: a.destaque,
  })),
  criado_em: p.created_at,
});

export const deAta = (a: Ata): AtaConselho => ({
  id: a.id,
  tenant_id: '',
  turma_id: a.turma_id,
  turma_nome: a.turma?.nome ?? '',
  periodo: rotuloPeriodo(a.periodo),
  ano_letivo: String(a.ano_letivo),
  data_reuniao: a.data_reuniao,
  diretor: a.direcao ?? '',
  pedagoga: a.pedagogia ?? '',
  secretario: a.secretaria ?? '',
  deliberacoes: a.deliberacoes ?? '',
  texto_introducao: a.texto_introducao ?? undefined,
  texto_conclusao: a.texto_conclusao ?? undefined,
  assinaturas: a.assinaturas ?? undefined,
  aprovados_count: a.aprovados,
  recuperacao_count: a.recuperacao,
  retidos_count: a.retidos,
  status: STATUS_ATA[a.status],
  atualizado_em: a.updated_at,
});

/** Professor = usuário do órgão; turmas e matérias vêm dos vínculos turma × matéria (D5). */
export function deProfessor(p: ProfessorApi, turmas: Turma[]): Professor {
  const vinculos = turmas.flatMap((t) => (t.materias ?? []).filter((v) => v.professor_user_id === p.id).map((v) => ({ turma: t, v })));
  const turnos = [...new Set(vinculos.map(({ turma }) => turma.turno?.nome).filter(Boolean))];
  return {
    id: p.id,
    tenant_id: '',
    nome: p.name,
    email: p.email,
    especialidade: [...new Set(vinculos.map(({ v }) => v.materia).filter(Boolean))].join(', '),
    turno: turnos.join(', '),
    turmas_atribuidas: [...new Set(vinculos.map(({ turma }) => turma.nome))],
    materias: [...new Set(vinculos.map(({ v }) => v.materia ?? ''))].filter(Boolean),
  };
}

export const deCategoria = (c: Categoria): CategoriaOcorrencia => ({ id: c.id, tenant_id: '', nome: c.nome, cor: c.cor });

export const deTrimestre = (t: Trimestre): PeriodoTrimestre => ({
  id: t.id, tenant_id: '', ano: t.ano_letivo, trimestre: t.numero, data_inicio: t.data_inicio, data_fim: t.data_fim,
});

export const deCronograma = (c: Cronograma): CronogramaPreConselho => ({
  id: c.id, tenant_id: '', ano_letivo: c.ano_letivo, periodo: rotuloPeriodo(c.periodo), data_inicio: c.data_inicio, data_fim: c.data_fim,
});

export const deUnidade = (u: Unidade): ConfigEscola => ({ nome: u.nome, logo: u.tem_logo ? escolaApi.urlLogo : undefined });

/* ------------------------------------------------------------------ */
/* Telas → API                                                          */
/* ------------------------------------------------------------------ */

export function paraOcorrencia(o: Partial<OcorrenciaPedagogica>, categorias: CategoriaOcorrencia[]) {
  const categoria = categorias.find((c) => c.nome.toLocaleLowerCase('pt-BR') === (o.categoria ?? '').toLocaleLowerCase('pt-BR'));
  if (!categoria) throw new Error(`Categoria "${o.categoria ?? ''}" não cadastrada. Cadastre-a em Cadastro Escolar › Categorias.`);
  return {
    aluno_id: o.aluno_id ?? 0,
    categoria_id: categoria.id,
    data: dataIso(o.data),
    descricao: o.descricao ?? '',
    severidade: severidadeApi[o.severidade ?? 'Baixa'] ?? 'baixa',
    responsavel: vazio(o.registrado_por),
  };
}

export function paraPreConselho(p: Partial<PreConselho>): DadosPreConselho {
  return {
    turma_id: p.turma_id ?? 0,
    materia_id: p.materia_id ?? 0,
    ano_letivo: Number(p.ano_letivo) || new Date().getFullYear(),
    periodo: numeroPeriodo(p.periodo),
    data_registro: dataIso(p.data_registro),
    desempenho_geral: desempenhoApi[p.desempenho_geral ?? 'Bom'] ?? 'bom',
    desempenho_justificativa: vazio(p.desempenho_justificativa),
    conteudos_trabalhados: vazio(p.conteudos_trabalhados),
    objetivos_atingidos: p.objetivos_atingidos ? objetivosApi[p.objetivos_atingidos] : null,
    metodologias: p.metodologias?.length ? p.metodologias : null,
    metodologias_outras: vazio(p.metodologias_outras),
    metodologias_eficacia: vazio(p.metodologias_eficacia),
    instrumentos_avaliativos: p.instrumentos_avaliativos?.length ? p.instrumentos_avaliativos : null,
    instrumentos_adequados: p.instrumentos_adequados ? instrumentosApi[p.instrumentos_adequados] : null,
    instrumentos_outros: vazio(p.instrumentos_outros),
    instrumentos_obs: vazio(p.instrumentos_obs),
    engajamento_nivel: p.engajamento_nivel ? engajamentoApi[p.engajamento_nivel] : null,
    engajamento_dificuldades: vazio(p.engajamento_dificuldades),
    engajamento_potencialidades: vazio(p.engajamento_potencialidades),
    dificuldades_aprendizagem: vazio(p.dificuldades_aprendizagem),
    estrategias_superacao: vazio(p.estrategias_superacao),
    socioemocional_status: p.socioemocional_status ? socioemocionalApi[p.socioemocional_status] : null,
    socioemocional_descricao: vazio(p.socioemocional_descricao),
    obs_pedagogicas: vazio(p.obs_pedagogicas),
    alunos: (p.alunos_avaliados ?? []).map((a) => ({
      aluno_id: a.aluno_id,
      nivel_atencao: a.nivel_atencao,
      dificuldade: vazio(a.dificuldade_identificada),
      encaminhamentos: vazio(a.encaminhamentos_realizados),
      destaque: !!a.aluno_destaque,
    })),
  };
}

type LinhaBoletim = { trimestres: [number | null, number | null, number | null]; media: number | null };

/** Boletim do aluno por matéria (Conselho): nota efetiva por trimestre e média truncada, como em GET /notas/medias. */
export function boletimPorMateria(notas: Nota[]): Map<number, LinhaBoletim> {
  const porMateria = new Map<number, LinhaBoletim>();
  for (const n of notas) {
    const linha = porMateria.get(n.materia_id) ?? { trimestres: [null, null, null], media: null };
    const efetiva = Math.max(Number(n.nota), n.nota_recuperacao !== null ? Number(n.nota_recuperacao) : -Infinity);
    linha.trimestres[n.trimestre - 1] = efetiva;
    porMateria.set(n.materia_id, linha);
  }
  for (const linha of porMateria.values()) {
    const lancadas = linha.trimestres.filter((v): v is number => v !== null);
    const media = lancadas.reduce((s, v) => s + v, 0) / lancadas.length;
    linha.media = Math.floor(Number(media.toFixed(6)) * 10) / 10;
  }
  return porMateria;
}

export function paraAta(a: Partial<AtaConselho>): DadosAta {
  return {
    turma_id: a.turma_id,
    ano_letivo: Number(a.ano_letivo) || new Date().getFullYear(),
    periodo: numeroPeriodo(a.periodo),
    data_reuniao: dataIso(a.data_reuniao),
    direcao: vazio(a.diretor),
    pedagogia: vazio(a.pedagoga),
    secretaria: vazio(a.secretario),
    deliberacoes: vazio(a.deliberacoes),
    // Só envia textos e assinaturas quando a tela os trouxe, para não apagar o que já está gravado.
    ...(a.texto_introducao !== undefined ? { texto_introducao: vazio(a.texto_introducao) } : {}),
    ...(a.texto_conclusao !== undefined ? { texto_conclusao: vazio(a.texto_conclusao) } : {}),
    ...(a.assinaturas !== undefined ? { assinaturas: a.assinaturas } : {}),
    aprovados: a.aprovados_count ?? 0,
    recuperacao: a.recuperacao_count ?? 0,
    retidos: a.retidos_count ?? 0,
  };
}
