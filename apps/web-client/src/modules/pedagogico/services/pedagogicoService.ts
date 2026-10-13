import type { Turma, MembroEquipe } from '../../escola/api';
import { escolaApi } from '../../escola/api';
import type { Frequencia, Nota, Presenca, ResultadoImportacaoNotas, TotalFaltas } from '../api';
import { pedagogicoApi } from '../api';
import type {
  AlunoPedagogico, AtaConselho, CategoriaOcorrencia, ConfigEscola, CronogramaPreConselho, Materia,
  OcorrenciaPedagogica, PedagogicoStats, PeriodoTrimestre, PreConselho, Professor, TurmaPedagogica,
} from '../types/pedagogico';
import {
  deAluno, deAta, deCategoria, deCronograma, deMateria, deOcorrencia, dePreConselho, deProfessor,
  deTrimestre, deTurma, deUnidade, paraAta, paraOcorrencia, paraPreConselho, situacaoApi,
} from './adaptadores';

/*
 * Fachada do Pedagógico (D3): o módulo raiz chama `carregar()` ao abrir; as leituras síncronas
 * usadas pelas telas leem este cache; as mutações chamam a API e recarregam só o que mudou.
 * Nenhum dado de negócio fica no navegador.
 */

interface Cache {
  turmasApi: Turma[];
  turmas: TurmaPedagogica[];
  materias: Materia[];
  alunos: AlunoPedagogico[];
  preConselhos: PreConselho[];
  ocorrencias: OcorrenciaPedagogica[];
  professores: Professor[];
  atas: AtaConselho[];
  categorias: CategoriaOcorrencia[];
  trimestres: PeriodoTrimestre[];
  cronogramas: CronogramaPreConselho[];
  unidade: ConfigEscola;
  /** Equipe gestora cadastrada por nome (D17). */
  equipe: MembroEquipe[];
}

const cache: Cache = {
  turmasApi: [], turmas: [], materias: [], alunos: [], preConselhos: [], ocorrencias: [], professores: [],
  atas: [], categorias: [], trimestres: [], cronogramas: [], unidade: { nome: '' }, equipe: [],
};

/** Ano letivo corrente (o módulo trabalha sempre no ano em curso). */
export const anoLetivoAtual = (): number => new Date().getFullYear();

const porNome = <T extends { nome: string }>(lista: T[]): T[] => lista.slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
const nomeTurma = (turmaId: number | null | undefined): string => cache.turmas.find((t) => t.id === turmaId)?.nome ?? '';

/* ---------- Recargas por recurso ---------- */

async function recarregarTurmas(): Promise<void> {
  const [turmas, professores] = await Promise.all([escolaApi.turmas(), escolaApi.professores()]);
  cache.turmasApi = turmas;
  cache.turmas = turmas.map(deTurma);
  cache.professores = porNome(professores.map((p) => deProfessor(p, turmas)));
}

async function recarregarAlunos(): Promise<void> {
  const [alunos, totais] = await Promise.all([escolaApi.todosAlunos(), pedagogicoApi.totaisOcorrencias()]);
  const total = new Map(totais.map((t) => [t.aluno_id, t.total]));
  cache.alunos = alunos.map((a) => deAluno(a, total.get(a.id) ?? 0));
  await recarregarMedias();
}

/** Média anual calculada no servidor a partir das notas lançadas; aluno sem nota fica sem média. */
async function recarregarMedias(): Promise<void> {
  const media = new Map((await pedagogicoApi.medias(anoLetivoAtual())).map((m) => [m.aluno_id, m.media]));
  cache.alunos = cache.alunos.map((a) => ({ ...a, media_geral: media.get(a.id) }));
}

async function recarregarOcorrencias(): Promise<void> {
  cache.ocorrencias = (await pedagogicoApi.todasOcorrencias()).map((o) => deOcorrencia(o, nomeTurma));
  const total = new Map<number, number>();
  cache.ocorrencias.forEach((o) => total.set(o.aluno_id, (total.get(o.aluno_id) ?? 0) + 1));
  cache.alunos = cache.alunos.map((a) => ({ ...a, total_ocorrencias: total.get(a.id) ?? 0 }));
}

async function recarregarPreConselhos(): Promise<void> {
  cache.preConselhos = (await pedagogicoApi.preConselhos()).map(dePreConselho);
}

async function recarregarAtas(): Promise<void> {
  cache.atas = (await pedagogicoApi.atas()).map(deAta);
}

/** `data:image/...;base64,...` (o que o formulário de aluno produz) → File para o upload. */
async function arquivoDeDataUrl(dataUrl: string, nome: string): Promise<File> {
  const blob = await (await fetch(dataUrl)).blob();
  return new File([blob], nome, { type: blob.type });
}

/* ---------- Fachada ---------- */

export const pedagogicoService = {
  /** Preenche o cache a partir da API. Lança o erro da API para o módulo raiz exibir. */
  async carregar(): Promise<void> {
    const [materias, categorias, trimestres, cronogramas, unidade, equipe] = await Promise.all([
      escolaApi.materias(), escolaApi.categorias(), escolaApi.trimestres(), pedagogicoApi.cronogramas(), escolaApi.unidade(), escolaApi.equipe(),
    ]);
    cache.equipe = equipe;
    cache.materias = materias.map(deMateria);
    cache.categorias = categorias.map(deCategoria);
    cache.trimestres = trimestres.map(deTrimestre);
    cache.cronogramas = cronogramas.map(deCronograma);
    cache.unidade = deUnidade(unidade);
    await Promise.all([recarregarTurmas(), recarregarAlunos(), recarregarPreConselhos(), recarregarAtas()]);
    // Ocorrências dependem das turmas (nome) e ajustam o total dos alunos.
    await recarregarOcorrencias();
  },

  /* ---- Leituras síncronas do cache ---- */

  getStats(): PedagogicoStats {
    const { alunos, atas, ocorrencias } = cache;
    const mes = new Date().toISOString().slice(0, 7);
    const comMedia = alunos.filter((a) => a.media_geral !== undefined);
    const finalizadas = atas.filter((a) => a.status !== 'Rascunho');
    const avaliados = finalizadas.reduce((s, a) => s + a.aprovados_count + a.recuperacao_count + a.retidos_count, 0);
    const aprovados = finalizadas.reduce((s, a) => s + a.aprovados_count, 0);
    return {
      total_alunos: alunos.length,
      total_turmas: cache.turmas.length,
      total_professores: cache.professores.length,
      media_geral_escola: comMedia.length ? Number((comMedia.reduce((s, a) => s + (a.media_geral ?? 0), 0) / comMedia.length).toFixed(1)) : 0,
      alunos_atencao_alta: alunos.filter((a) => a.nivel_atencao === 'alto').length,
      alunos_atencao_media: alunos.filter((a) => a.nivel_atencao === 'medio').length,
      conselhos_realizados: finalizadas.length,
      ocorrencias_mes: ocorrencias.filter((o) => o.data.startsWith(mes)).length,
      taxa_aprovacao_estimada: avaliados ? Number(((aprovados / avaliados) * 100).toFixed(1)) : 0,
    };
  },

  getTurmas(): TurmaPedagogica[] { return cache.turmas; },
  getMaterias(): Materia[] { return porNome(cache.materias); },
  getAlunos(turmaId?: number): AlunoPedagogico[] { return turmaId ? cache.alunos.filter((a) => a.turma_id === turmaId) : cache.alunos; },
  getOcorrencias(alunoId?: number): OcorrenciaPedagogica[] { return alunoId ? cache.ocorrencias.filter((o) => o.aluno_id === alunoId) : cache.ocorrencias; },
  getPreConselhos(turmaId?: number): PreConselho[] { return turmaId ? cache.preConselhos.filter((p) => p.turma_id === turmaId) : cache.preConselhos; },
  getAtas(): AtaConselho[] { return cache.atas; },
  getProfessores(): Professor[] { return cache.professores; },
  getEscola(): ConfigEscola { return cache.unidade; },
  getEquipe(): MembroEquipe[] { return cache.equipe; },
  /** Recarrega a equipe gestora após cadastrar/alterar pedagogas no Corpo Docente. */
  async recarregarEquipe(): Promise<void> { cache.equipe = await escolaApi.equipe(); },
  getCategorias(): CategoriaOcorrencia[] { return porNome(cache.categorias); },
  getTrimestres(): PeriodoTrimestre[] { return cache.trimestres.slice().sort((a, b) => b.ano - a.ano || a.trimestre - b.trimestre); },
  getCronogramas(): CronogramaPreConselho[] {
    return cache.cronogramas.slice().sort((a, b) => b.ano_letivo - a.ano_letivo || b.data_inicio.localeCompare(a.data_inicio));
  },

  /* ---- Notas (consulta direta, sem cache: dependem de turma × matéria) ---- */

  notasDaTurma(turmaId: number, materiaId: number): Promise<Nota[]> {
    return pedagogicoApi.notas({ turma_id: turmaId, materia_id: materiaId, ano_letivo: anoLetivoAtual() });
  },

  /**
   * Lança as notas digitadas de uma turma × matéria: um PUT por trimestre com os alunos que têm nota nele
   * (nota em branco não é enviada — a API não apaga nota). Depois recarrega as médias do painel.
   */
  async lancarNotas(turmaId: number, materiaId: number, notas: Record<number, Partial<Record<1 | 2 | 3, number>>>): Promise<number> {
    let lancadas = 0;
    for (const trimestre of [1, 2, 3] as const) {
      const lote = Object.entries(notas)
        .filter(([, n]) => n[trimestre] !== undefined)
        .map(([alunoId, n]) => ({ aluno_id: Number(alunoId), nota: n[trimestre]! }));
      if (!lote.length) continue;
      await pedagogicoApi.lancarNotas({ turma_id: turmaId, materia_id: materiaId, ano_letivo: anoLetivoAtual(), trimestre, notas: lote });
      lancadas += lote.length;
    }
    await recarregarMedias();
    return lancadas;
  },

  /** Importa notas de um CSV do ano letivo atual e recarrega as médias do painel. */
  async importarNotas(arquivo: File): Promise<ResultadoImportacaoNotas> {
    const resultado = await pedagogicoApi.importarNotas(arquivo, anoLetivoAtual());
    if (resultado.importadas > 0) await recarregarMedias();
    return resultado;
  },

  /* ---- Frequência (consulta direta por turma e período) ---- */

  frequenciasPeriodo(turmaId: number, dataInicio: string, dataFim: string): Promise<Frequencia[]> {
    return pedagogicoApi.frequenciasPeriodo(turmaId, dataInicio, dataFim);
  },

  totaisFaltas(dataInicio: string, dataFim: string, turmaId?: number): Promise<TotalFaltas[]> {
    return pedagogicoApi.totaisFaltas(dataInicio, dataFim, turmaId);
  },

  async registrarChamada(turmaId: number, data: string, aulas: number, presencas: Record<number, Presenca>): Promise<number> {
    const registros = Object.entries(presencas).map(([alunoId, presenca]) => ({ aluno_id: Number(alunoId), presenca }));
    return (await pedagogicoApi.registrarFrequencia({ turma_id: turmaId, data, aulas, registros })).registrados;
  },

  /* ---- Mutações ---- */

  async saveAluno(aluno: Partial<AlunoPedagogico>): Promise<AlunoPedagogico> {
    const contatos = aluno.contatos?.length
      ? aluno.contatos.filter((c) => c.telefone.trim()).map((c) => ({ telefone: c.telefone.trim(), descricao: c.descricao || null }))
      : (aluno.contato ?? '').split('/').map((t) => t.trim()).filter(Boolean).map((telefone) => ({ telefone, descricao: null }));
    const dados = {
      nome: aluno.nome,
      cgm: aluno.cgm || null,
      numero: aluno.numero ?? null,
      turma_id: aluno.turma_id || null,
      nascimento: aluno.nascimento || null,
      mae: aluno.mae || null,
      pai: aluno.pai || null,
      situacao: situacaoApi[aluno.status ?? 'Ativo'],
      contatos,
    };
    const salvo = aluno.id ? await escolaApi.atualizarAluno(aluno.id, dados) : await escolaApi.criarAluno(dados);
    if (aluno.foto?.startsWith('data:')) await escolaApi.enviarFoto(salvo.id, await arquivoDeDataUrl(aluno.foto, `aluno-${salvo.id}.jpg`));
    await Promise.all([recarregarAlunos(), recarregarTurmas()]);
    return cache.alunos.find((a) => a.id === salvo.id) ?? deAluno(salvo);
  },

  async deleteAluno(id: number): Promise<void> {
    await escolaApi.excluirAluno(id);
    await Promise.all([recarregarAlunos(), recarregarTurmas()]);
  },

  async saveOcorrencia(dados: Partial<OcorrenciaPedagogica>, anexo?: File | null): Promise<OcorrenciaPedagogica> {
    const corpo = paraOcorrencia(dados, cache.categorias);
    const salva = dados.id
      ? await pedagogicoApi.atualizarOcorrencia(dados.id, corpo, anexo)
      : await pedagogicoApi.registrarOcorrencia(corpo, anexo);
    await recarregarOcorrencias();
    return cache.ocorrencias.find((o) => o.id === salva.id) ?? deOcorrencia(salva, nomeTurma);
  },

  async deleteOcorrencia(id: number): Promise<void> {
    await pedagogicoApi.excluirOcorrencia(id);
    await recarregarOcorrencias();
  },

  async savePreConselho(dados: Partial<PreConselho>): Promise<PreConselho> {
    const salva = await pedagogicoApi.salvarPreConselho(paraPreConselho(dados));
    await recarregarPreConselhos();
    return dePreConselho(salva);
  },

  async saveAta(dados: Partial<AtaConselho>): Promise<AtaConselho> {
    const corpo = paraAta(dados);
    const salva = dados.id ? await pedagogicoApi.atualizarAta(dados.id, corpo) : await pedagogicoApi.criarAta(corpo);
    await recarregarAtas();
    return deAta(salva);
  },

  /**
   * Professores são usuários do órgão (Usuários e Acessos); aqui só se gravam os vínculos
   * turma × matéria (D5). `turmas_atribuidas`/`materias` vêm pelos nomes usados na tela.
   */
  async saveProfessor(prof: Partial<Professor>): Promise<Professor> {
    if (!prof.id) throw new Error('Cadastre o professor em Usuários e Acessos; aqui você vincula turmas e matérias.');
    const turmas = new Set(prof.turmas_atribuidas ?? []);
    const materias = new Set(prof.materias ?? []);
    const idMateria = new Map(cache.materias.map((m) => [m.nome, m.id]));
    const alteradas = cache.turmasApi.map((t) => {
      const vinculos = (t.materias ?? []).map((v) => ({ materia_id: v.materia_id, professor_user_id: v.professor_user_id }));
      const antes = JSON.stringify(vinculos);
      vinculos.forEach((v) => { if (v.professor_user_id === prof.id) v.professor_user_id = null; });
      if (turmas.has(t.nome)) {
        materias.forEach((nome) => {
          const materiaId = idMateria.get(nome);
          if (!materiaId) return;
          const vinculo = vinculos.find((v) => v.materia_id === materiaId);
          if (vinculo) vinculo.professor_user_id = prof.id!;
          else vinculos.push({ materia_id: materiaId, professor_user_id: prof.id! });
        });
      }
      return JSON.stringify(vinculos) === antes ? null : { id: t.id, vinculos };
    }).filter((t): t is { id: number; vinculos: { materia_id: number; professor_user_id: number | null }[] } => t !== null);
    await Promise.all(alteradas.map((t) => escolaApi.vincularMaterias(t.id, t.vinculos)));
    await recarregarTurmas();
    return cache.professores.find((p) => p.id === prof.id) ?? (prof as Professor);
  },

  /** Remove o professor de todas as turmas (o usuário continua existindo). */
  async deleteProfessor(id: number): Promise<void> {
    await this.saveProfessor({ id, turmas_atribuidas: [], materias: [] });
  },
};
