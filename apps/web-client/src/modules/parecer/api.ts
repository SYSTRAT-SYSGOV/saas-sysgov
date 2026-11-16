import { useEffect, useState } from 'react';
import { apiClient } from '@/core/api/client';

/* Tipos — espelham o JSON de api/parecer (Modules/Parecer). */

export type Conceito = 'A' | 'EP' | 'NA';
export type CodigoMateria = 'LP' | 'MAT' | 'CIE' | 'HIS' | 'GEO' | 'EF' | 'ART' | 'ER';

export interface Catalogo {
  materias: Record<CodigoMateria, string>;
  series: Record<string, string>;
  conceitos: Record<Conceito, string>;
  funcoes: Record<string, { rotulo: string; materias: CodigoMateria[] }>;
  media_aprovacao: number;
  aulas_por_dia: number;
  gestor: boolean;
  auditoria: boolean;
}

export interface TurmaParecer {
  turma_id: number;
  nome: string;
  serie: number;
  turno: string | null;
  alunos_ativos: number;
  regente: string | null;
  materias: CodigoMateria[];
}

export interface AlunoTurma {
  id: number;
  numero: number | null;
  nome: string;
  cgm: string | null;
  nascimento: string | null;
  situacao: string;
  tem_foto: boolean;
  celular: string | null;
  progresso: Record<'1' | '2' | '3', number>;
}

export interface TurmaAlunos {
  turma: { id: number; nome: string; serie: number; turno: string | null; ano_letivo: number };
  habilidades_por_trimestre: Record<'1' | '2' | '3', number>;
  materias: CodigoMateria[];
  alunos: AlunoTurma[];
}

export interface HabilidadeAvaliada {
  id: number;
  descricao: string;
  trimestres: string;
  conceitos: Partial<Record<'1' | '2' | '3', Conceito>>;
}

export interface TelaAvaliacao {
  aluno: { id: number; nome: string; numero: number | null; tem_foto: boolean; nascimento: string | null; celular: string | null; turma_id: number; turma: string | null; turno: string | null; serie: number };
  tri: number;
  materia: CodigoMateria;
  materias: CodigoMateria[];
  progresso: Partial<Record<CodigoMateria, { total: number; feitos: number }>>;
  colunas: number[];
  habilidades: HabilidadeAvaliada[];
  observacao: string;
  /** Só na visão Geral (tri 0): observação de cada trimestre que tiver texto. */
  observacoes: Partial<Record<'1' | '2' | '3', string>> | null;
  anterior: number | null;
  proximo: number | null;
}

export interface Habilidade {
  id: number;
  serie: number;
  materia: CodigoMateria;
  ordem: number;
  descricao: string;
  codigo_bncc: string | null;
  trimestres: string;
  ativo: boolean;
}

export interface TelaConteudos {
  serie: number;
  materia: CodigoMateria;
  visiveis: Record<string, CodigoMateria[]>;
  pode_editar: boolean;
  bncc_configurada: boolean;
  contagem: Partial<Record<CodigoMateria, number>>;
  por_trimestre: Record<'1' | '2' | '3', number>;
  habilidades: Habilidade[];
}

export interface ItemBncc { codigo: string; descricao: string; unidade_tematica: string | null; objeto_conhecimento: string | null }

export interface TelaNotas {
  serie: number;
  materia: CodigoMateria;
  materias: CodigoMateria[];
  trimestres: number[];
  media_aprovacao: number;
  alunos: { id: number; numero: number | null; nome: string; situacao: string }[];
  notas: Record<string, Record<string, number>>;
}

export interface GradeFrequencia {
  tri: string;
  periodos: Record<string, [string, string]>;
  dias: string[];
  alunos: { id: number; numero: number | null; nome: string; situacao: string; celular: string | null }[];
  registros: { aluno_id: number; data: string; status: 'C' | 'F'; aulas: number; faltas: number }[];
}

export interface ChamadaDia {
  data: string;
  mes: string;
  lancados: string[];
  aulas: number;
  salvo: boolean;
  pode_apagar: boolean;
  alunos: { id: number; numero: number | null; nome: string; tem_foto: boolean; celular: string | null; status: 'C' | 'F' }[];
}

export interface Categoria { id: number; nome: string; cor: string }
export interface Ocorrencia {
  id: number;
  aluno_id: number;
  aluno: string | null;
  data: string;
  categoria: Categoria | null;
  descricao: string;
  registrado_nome: string | null;
  anexo_nome: string | null;
  pode_mexer: boolean;
}
export interface OcorrenciasAluno { aluno: { id: number; nome: string; turma_id: number; turma: string | null; celular: string | null }; categorias: Categoria[]; ocorrencias: Ocorrencia[] }
export interface OcorrenciasTurma { categorias: Categoria[]; alunos: { id: number; nome: string; situacao: string; celular: string | null; total: number }[]; ocorrencias: Ocorrencia[] }

export interface FolhaParecer {
  aluno: { id: number; nome: string; tem_foto: boolean };
  turma: { id: number; nome: string; serie: string; turno: string | null; ano_letivo: number };
  trimestre: number;
  paragrafos: { materia: CodigoMateria; rotulo: string; texto: string }[];
  observacoes_gerais: string | null;
  assinaturas: { rotulo: string; nome: string | null }[];
}
export interface Impressao { escola: { id: number; nome: string; tem_logo: boolean }; folhas: FolhaParecer[] }

export interface LinhaConceitos { a: number; ep: number; na: number; total: number }
export interface Relatorio {
  filtros: { ano: number; tri: number; serie: number; turma: number; materia: string };
  turmas: { turma_id: number; nome: string; serie: number; turno: string | null }[];
  materias_visiveis: CodigoMateria[];
  geral: LinhaConceitos;
  por_serie: (LinhaConceitos & { rotulo: string })[];
  por_turma: (LinhaConceitos & { turma_id: number; rotulo: string; turno: string | null })[];
  por_materia: (LinhaConceitos & { materia: CodigoMateria; rotulo: string })[];
  por_aluno: (LinhaConceitos & { aluno_id: number; nome: string; serie: string; turma: string; turno: string | null })[];
  comparativo: null | {
    aluno: { id: number; nome: string; turma: string; serie: string; turno: string | null };
    linhas: (LinhaConceitos & { rotulo: string; tipo: 'aluno' | 'turma' | 'outra' | 'serie' })[];
    outras: number;
    materias: CodigoMateria[];
    m_aluno: Partial<Record<CodigoMateria, LinhaConceitos>>;
    m_turma: Partial<Record<CodigoMateria, LinhaConceitos>>;
    m_serie: Partial<Record<CodigoMateria, LinhaConceitos>>;
  };
}

export interface RegistroAuditoria { id: number; data: string; usuario: string | null; acao: string; recurso: string; descricao: string | null; antes: Record<string, unknown> | null; depois: Record<string, unknown> | null; ip: string | null }
export interface TelaAuditoria { de: string; ate: string; resumo: Record<string, number>; pessoas: { id: number; name: string }[]; data: RegistroAuditoria[]; current_page: number; last_page: number; total: number }

export interface TurmaConfig { turma_id: number; nome: string; turno: string | null; serie: number | null; funcoes: Record<string, number> }

const BASE = '/parecer';
const get = async <T,>(url: string, params?: object): Promise<T> => (await apiClient.get<T>(BASE + url, { params })).data;
const put = async <T,>(url: string, body?: unknown): Promise<T> => (await apiClient.put<T>(BASE + url, body)).data;
const post = async <T,>(url: string, body?: unknown): Promise<T> => (await apiClient.post<T>(BASE + url, body)).data;
const del = async <T,>(url: string, params?: object): Promise<T> => (await apiClient.delete<T>(BASE + url, { params })).data;

/** Baixa um arquivo autenticado (CSV, anexo) e oferece para salvar. */
async function baixar(url: string, params: object, nome: string): Promise<void> {
  const resp = await apiClient.get<Blob>(BASE + url, { params, responseType: 'blob' });
  const href = URL.createObjectURL(resp.data);
  const a = document.createElement('a');
  a.href = href;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(href);
}

export const parecerApi = {
  catalogo: () => get<Catalogo>('/catalogo'),
  turmas: (ano: number) => get<{ habilidades_por_serie: Record<string, number>; turmas: TurmaParecer[] }>('/turmas', { ano }),
  alunos: (turmaId: number) => get<TurmaAlunos>(`/turmas/${turmaId}/alunos`),
  configuracoes: (ano: number) => get<{ turmas: TurmaConfig[]; equipe: { id: number; nome: string }[] }>('/turmas/configuracoes', { ano }),
  configurar: (turmaId: number, serie: number, funcoes: Record<string, number | null>) => put(`/turmas/${turmaId}/configuracao`, { serie, funcoes }),
  removerConfiguracao: (turmaId: number) => del(`/turmas/${turmaId}/configuracao`),

  avaliacao: (alunoId: number, tri: number, materia?: string) => get<TelaAvaliacao>(`/alunos/${alunoId}/avaliacao`, { tri, materia }),
  salvarAvaliacao: (alunoId: number, dados: { tri: number; materia: string; conceitos: Record<number, string>; observacao?: string }) =>
    put<{ mudancas: number; observacao: boolean }>(`/alunos/${alunoId}/avaliacao`, dados),

  conteudos: (serie?: number, materia?: string) => get<TelaConteudos>('/habilidades', { serie, materia }),
  criarHabilidade: (dados: { serie: number; materia: string; descricao: string; codigo_bncc?: string | null; trimestres: number[] }) => post<Habilidade>('/habilidades', dados),
  salvarHabilidade: (id: number, dados: { descricao: string; codigo_bncc?: string | null; trimestres: number[] }) => put<Habilidade>(`/habilidades/${id}`, dados),
  salvarTrimestres: (serie: number, materia: string, marcados: Record<number, number[]>) => put<{ alteradas: number; vazias: number }>('/habilidades/trimestres', { serie, materia, marcados }),
  alternarHabilidade: (id: number) => post<Habilidade>(`/habilidades/${id}/ativo`),
  moverHabilidade: (id: number, direcao: 'subir' | 'descer') => post(`/habilidades/${id}/mover`, { direcao }),
  excluirHabilidade: (id: number) => del(`/habilidades/${id}`),
  copiarHabilidades: (origem: number, serie: number, materia: string) => post<{ copiadas: number }>('/habilidades/copiar', { origem, serie, materia }),
  bncc: (serie: number, materia: string) => get<{ itens: ItemBncc[]; ja_cadastrados: string[] }>('/bncc', { serie, materia }),
  adicionarBncc: (serie: number, materia: string, codigos: string[]) => post<{ adicionadas: number }>('/bncc', { serie, materia, codigos }),

  notas: (turmaId: number, materia?: string) => get<TelaNotas>('/notas', { turma_id: turmaId, materia }),
  lancarNotas: (turmaId: number, materia: string, notas: Record<number, Record<number, number | null>>) => put<{ gravadas: number }>('/notas', { turma_id: turmaId, materia, notas }),
  importarNotas: (turmaId: number, materia: string, arquivo: File) => {
    const f = new FormData();
    f.append('turma_id', String(turmaId));
    f.append('materia', materia);
    f.append('arquivo', arquivo);
    return post<{ gravadas: number; erros: string[] }>('/notas/importar', f);
  },
  baixarPlanilhaNotas: (turmaId: number, materia: string) => baixar('/notas/planilha', { turma_id: turmaId, materia }, `notas-${materia}.csv`),

  grade: (turmaId: number, tri?: string) => get<GradeFrequencia>('/frequencias', { turma_id: turmaId, tri }),
  chamada: (turmaId: number, data: string, mes?: string) => get<ChamadaDia>('/frequencias/dia', { turma_id: turmaId, data, mes }),
  salvarChamada: (turmaId: number, data: string, aulas: number, faltaram: number[]) => put<{ faltas: number }>('/frequencias', { turma_id: turmaId, data, aulas, faltaram }),
  apagarChamada: (turmaId: number, data: string) => del<{ apagados: number }>('/frequencias', { turma_id: turmaId, data }),

  ocorrenciasAluno: (alunoId: number) => get<OcorrenciasAluno>('/ocorrencias', { aluno_id: alunoId }),
  ocorrenciasTurma: (turmaId: number) => get<OcorrenciasTurma>('/ocorrencias', { turma_id: turmaId }),
  salvarOcorrencia: (id: number | null, dados: { aluno_id: number; data: string; categoria_id: number | null; descricao: string; anexo?: File | null; remover_anexo?: boolean }) => {
    const f = new FormData();
    f.append('aluno_id', String(dados.aluno_id));
    f.append('data', dados.data);
    if (dados.categoria_id) f.append('categoria_id', String(dados.categoria_id));
    f.append('descricao', dados.descricao);
    if (dados.anexo) f.append('anexo', dados.anexo);
    if (dados.remover_anexo) f.append('remover_anexo', '1');
    return post<Ocorrencia>(id ? `/ocorrencias/${id}` : '/ocorrencias', f);
  },
  excluirOcorrencia: (id: number) => del(`/ocorrencias/${id}`),
  baixarAnexo: (o: Ocorrencia) => baixar(`/ocorrencias/${o.id}/anexo`, {}, o.anexo_nome ?? 'anexo'),
  baixarPlanilhaOcorrencias: (turmaId: number) => baixar('/ocorrencias/planilha', { turma_id: turmaId }, `ocorrencias-turma-${turmaId}.csv`),

  impressao: (params: { aluno_id?: number; turma_id?: number; tri: number; materias: string[] }) => get<Impressao>('/impressao', params),
  relatorio: (params: Partial<Record<'ano' | 'tri' | 'serie' | 'turma' | 'aluno', number>> & { materia?: string }) => get<Relatorio>('/relatorios', params),
  auditoria: (params: { de?: string; ate?: string; quem?: number; recurso?: string; texto?: string; page?: number }) => get<TelaAuditoria>('/auditoria', params),
};

/** Imagem servida por rota autenticada (foto do aluno, logo da escola) como object URL; null se não houver. */
export function useImagemAutenticada(caminho: string | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (caminho === null) {
      setUrl(null);
      return undefined;
    }
    let ativo = true;
    let criada: string | null = null;
    apiClient
      .get<Blob>(BASE + caminho, { responseType: 'blob' })
      .then((r) => {
        if (!ativo) return;
        criada = URL.createObjectURL(r.data);
        setUrl(criada);
      })
      .catch(() => ativo && setUrl(null));
    return () => {
      ativo = false;
      if (criada) URL.revokeObjectURL(criada);
    };
  }, [caminho]);
  return url;
}

/* Utilitários iguais ao PHP */

export const SERIES: Record<number, string> = { 1: '1º ano', 2: '2º ano', 3: '3º ano', 4: '4º ano', 5: '5º ano' };
export const CORES_TURNO: Record<string, string> = { Manhã: '#B45309', Tarde: '#059669', Integral: '#7C3AED' };

/** Só os dígitos do celular; acrescenta 55 quando vier só DDD + número. */
export function linkWhats(tel: string | null | undefined, mensagem = ''): string | null {
  let d = (tel ?? '').replace(/\D+/g, '');
  if (d === '') return null;
  if (d.length <= 11) d = '55' + d.replace(/^0+/, '');
  return `https://wa.me/${d}${mensagem ? `?text=${encodeURIComponent(mensagem)}` : ''}`;
}

export const dataBr = (iso: string): string => iso.slice(0, 10).split('-').reverse().join('/');
export const hojeIso = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** "7.5" → "7,5" */
export const formatarNota = (n: number | null | undefined): string => (n === null || n === undefined ? '' : String(Math.round(n * 100) / 100).replace('.', ','));

/** "7,5" → 7.5; vazio → null; inválido → undefined. */
export function lerNota(v: string): number | null | undefined {
  const t = v.trim().replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 && n <= 10 ? Math.round(n * 100) / 100 : undefined;
}

/** Idade em anos e meses a partir de aaaa-mm-dd. */
export function idade(nascimento: string | null): string | null {
  if (!nascimento) return null;
  const [a, m, d] = nascimento.split('-').map(Number);
  const hoje = new Date();
  let anos = hoje.getFullYear() - a;
  let meses = hoje.getMonth() + 1 - m;
  if (hoje.getDate() < d) meses -= 1;
  if (meses < 0) {
    anos -= 1;
    meses += 12;
  }
  return `${anos} ano${anos === 1 ? '' : 's'}${meses ? ` e ${meses} ${meses === 1 ? 'mês' : 'meses'}` : ''}`;
}
