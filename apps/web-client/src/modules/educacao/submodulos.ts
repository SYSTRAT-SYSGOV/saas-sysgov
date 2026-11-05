/**
 * Submódulos do módulo Educação (change educacao-modulo-submodulos). A Educação só agrupa a navegação: cada
 * submódulo continua sendo o módulo de backend de mesmo alias, com as próprias permissões e API.
 */
export const EDUCACAO_BASE = '/educacao';

export interface SubmoduloEducacao {
  /** Alias do módulo de backend (e id no MODULE_REGISTRY). */
  alias: string;
  /** Trecho da rota em /educacao/<slug>. */
  slug: string;
  rotulo: string;
  descricao: string;
}

/** Ordem de exibição na barra, na página inicial e no menu. */
export const SUBMODULOS_EDUCACAO: SubmoduloEducacao[] = [
  { alias: 'escola', slug: 'cadastro-escolar', rotulo: 'Cadastro Escolar', descricao: 'Escolas, turmas, alunos, matérias, professores e trimestres.' },
  { alias: 'pedagogico', slug: 'pedagogico', rotulo: 'Gestão Pedagógica', descricao: 'Notas, ocorrências, pré-conselho, atas e frequência.' },
  { alias: 'formatura', slug: 'formatura', rotulo: 'Formatura e Eventos', descricao: 'Formandos, convidados, pagamentos e arrecadação.' },
  { alias: 'passeio', slug: 'passeio', rotulo: 'Passeios', descricao: 'Agenda, inscrições, autorizações e frota dos passeios.' },
  { alias: 'portfolio', slug: 'portfolio', rotulo: 'Portfólio Digital', descricao: 'Trabalhos dos alunos, linha do tempo e relatório.' },
  { alias: 'transporte', slug: 'transporte', rotulo: 'Transporte Escolar', descricao: 'Frota, rotas, alunos transportados, custos e Censo.' },
];

export const rotaDoSubmodulo = (s: SubmoduloEducacao): string => `${EDUCACAO_BASE}/${s.slug}`;

/** Rota nova de um submódulo pelo alias do módulo (ex.: 'escola'). */
export const rotaPorAlias = (alias: string): string => {
  const s = SUBMODULOS_EDUCACAO.find((x) => x.alias === alias);
  return s ? rotaDoSubmodulo(s) : `/${alias}`;
};

export const ROTA_CADASTRO_ESCOLAR = rotaPorAlias('escola');
