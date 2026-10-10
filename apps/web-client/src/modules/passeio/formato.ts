import type { StatusChipProps } from '@sysgov/ui';
import { paraCentavos } from '@/lib/formatacao';
import type { DadosPasseio, Inscricao, MapaAssentos, Passeio, SituacaoAluno, StatusPasseio, Veiculo } from './api';

/** Regras de apresentação do Passeio (puras — testadas no vitest). */

type Variante = NonNullable<StatusChipProps['variant']>;

export const STATUS: Record<StatusPasseio, { rotulo: string; variante: Variante }> = {
  agendado: { rotulo: 'Agendado', variante: 'info' },
  em_andamento: { rotulo: 'Em andamento', variante: 'warning' },
  concluido: { rotulo: 'Concluído', variante: 'success' },
  cancelado: { rotulo: 'Cancelado', variante: 'neutral' },
};

export const OPCOES_STATUS = (Object.keys(STATUS) as StatusPasseio[]).map((s) => ({ value: s, label: STATUS[s].rotulo }));

/** Capacidades mais comuns de ônibus (atalhos no cadastro do veículo). */
export const CAPACIDADES_COMUNS = [40, 44, 46, 50, 52];

/** "07:30:00" → "07:30"; vazio → "". */
export function hora(valor: string | null | undefined): string {
  return valor ? valor.slice(0, 5) : '';
}

/** "07:30 às 12:00", ou só a saída quando não há retorno. */
export function periodoDoPasseio(p: Pick<Passeio, 'horario_saida' | 'horario_retorno'>): string {
  return p.horario_retorno ? `${hora(p.horario_saida)} às ${hora(p.horario_retorno)}` : `saída às ${hora(p.horario_saida)}`;
}

/** Campos do formulário (texto) ↔ dados da API. */
export interface FormPasseio {
  nome: string;
  data_passeio: string;
  data_limite_autorizacao: string;
  horario_saida: string;
  horario_retorno: string;
  local_saida: string;
  destino: string;
  cidade: string;
  valor: string;
  responsavel: string;
  observacoes: string;
  status: StatusPasseio;
}

export const FORM_VAZIO: FormPasseio = {
  nome: '', data_passeio: '', data_limite_autorizacao: '', horario_saida: '', horario_retorno: '', local_saida: '',
  destino: '', cidade: '', valor: '0,00', responsavel: '', observacoes: '', status: 'agendado',
};

export function formDoPasseio(p: Passeio): FormPasseio {
  return {
    nome: p.nome, data_passeio: p.data_passeio, data_limite_autorizacao: p.data_limite_autorizacao ?? '',
    horario_saida: hora(p.horario_saida), horario_retorno: hora(p.horario_retorno), local_saida: p.local_saida,
    destino: p.destino, cidade: p.cidade, valor: `${Math.floor(p.valor_centavos / 100)},${String(p.valor_centavos % 100).padStart(2, '0')}`,
    responsavel: p.responsavel, observacoes: p.observacoes ?? '', status: p.status,
  };
}

/** Converte o formulário; devolve a mensagem de erro em vez dos dados quando o valor é inválido. */
export function dadosDoForm(f: FormPasseio): DadosPasseio | string {
  const valor = paraCentavos(f.valor || '0');
  if (valor === null) return 'Informe o valor por aluno em reais (ex.: 45,00).';
  return {
    nome: f.nome.trim(), data_passeio: f.data_passeio, data_limite_autorizacao: f.data_limite_autorizacao || null,
    horario_saida: f.horario_saida, horario_retorno: f.horario_retorno || null, local_saida: f.local_saida.trim(),
    destino: f.destino.trim(), cidade: f.cidade.trim(), valor_centavos: valor, responsavel: f.responsavel.trim(),
    observacoes: f.observacoes.trim() || null, status: f.status,
  };
}

export interface FiltroInscricoes {
  turmaId: number | null;
  /** "todos" | "vai" | "nao_vai" */
  participacao: 'todos' | 'vai' | 'nao_vai';
  /** "todos" | "entregue" | "pendente" */
  termo: 'todos' | 'entregue' | 'pendente';
  /** "todos" | "pago" | "pendente" */
  pagamento: 'todos' | 'pago' | 'pendente';
  busca: string;
}

export const FILTRO_INICIAL: FiltroInscricoes = { turmaId: null, participacao: 'todos', termo: 'todos', pagamento: 'todos', busca: '' };

const semAcento = (t: string): string => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function filtrarInscricoes(lista: Inscricao[], f: FiltroInscricoes): Inscricao[] {
  const busca = semAcento(f.busca.trim());
  return lista.filter((i) => {
    if (f.turmaId !== null && i.aluno?.turma_id !== f.turmaId) return false;
    if (f.participacao !== 'todos' && i.vai !== (f.participacao === 'vai')) return false;
    if (f.termo !== 'todos' && i.autorizacao_entregue !== (f.termo === 'entregue')) return false;
    if (f.pagamento !== 'todos' && i.pago !== (f.pagamento === 'pago')) return false;
    if (busca && !semAcento(`${i.aluno?.nome ?? ''} ${i.aluno?.turma?.nome ?? ''}`).includes(busca)) return false;
    return true;
  });
}

/** Aluno da turma sem inscrição no passeio: aparece na lista com "não vai" (id negativo, sem registro na API). */
export const naoInscrito = (i: Inscricao): boolean => i.id < 0;

/**
 * Lista da turma inteira: as inscrições da turma mais os alunos ainda não inscritos (sem transferidos),
 * por número e nome — para marcar quem vai direto na aba de inscrições.
 */
export function listaDaTurma(
  inscricoes: Inscricao[],
  alunos: { id: number; numero: number | null; nome: string; situacao: SituacaoAluno }[],
  turma: { id: number; nome: string },
  passeioId: number,
): Inscricao[] {
  const inscritos = new Set(inscricoes.map((i) => i.aluno_id));
  const daTurma = inscricoes.filter((i) => i.aluno?.turma_id === turma.id);
  const faltam = alunos
    .filter((a) => a.situacao !== 'transferido' && !inscritos.has(a.id))
    .map((a): Inscricao => ({
      id: -a.id, passeio_id: passeioId, aluno_id: a.id, vai: false, autorizacao_entregue: false, pago: false, observacao: null,
      aluno: { id: a.id, nome: a.nome, numero: a.numero, turma_id: turma.id, situacao: a.situacao, telefone: null, turma },
    }));
  const ordem = (i: Inscricao) => i.aluno?.numero ?? Number.MAX_SAFE_INTEGER;
  return [...daTurma, ...faltam].sort((a, b) => ordem(a) - ordem(b) || (a.aluno?.nome ?? '').localeCompare(b.aluno?.nome ?? '', 'pt-BR'));
}

/** Inscrições agrupadas por turma (na ordem em que a API devolve: turma, número, nome). */
export function porTurma(lista: Inscricao[]): { turma: string; turmaId: number | null; inscricoes: Inscricao[] }[] {
  const grupos = new Map<string, { turma: string; turmaId: number | null; inscricoes: Inscricao[] }>();
  for (const i of lista) {
    const turma = i.aluno?.turma?.nome ?? 'Sem turma';
    const grupo = grupos.get(turma) ?? { turma, turmaId: i.aluno?.turma_id ?? null, inscricoes: [] };
    grupo.inscricoes.push(i);
    grupos.set(turma, grupo);
  }
  return [...grupos.values()];
}

export interface LinhaArrecadacao { turma: string; vao: number; pagos: number; pendentes: number; arrecadadoCentavos: number; aReceberCentavos: number }

/** Demonstrativo por turma: só quem vai entra na conta (mesma base dos indicadores da API). */
export function demonstrativo(lista: Inscricao[], valorCentavos: number): { linhas: LinhaArrecadacao[]; total: LinhaArrecadacao } {
  const linhas = porTurma(lista.filter((i) => i.vai)).map(({ turma, inscricoes }) => {
    const pagos = inscricoes.filter((i) => i.pago).length;
    const pendentes = inscricoes.length - pagos;
    return { turma, vao: inscricoes.length, pagos, pendentes, arrecadadoCentavos: pagos * valorCentavos, aReceberCentavos: pendentes * valorCentavos };
  });
  const total = linhas.reduce(
    (t, l) => ({ ...t, vao: t.vao + l.vao, pagos: t.pagos + l.pagos, pendentes: t.pendentes + l.pendentes, arrecadadoCentavos: t.arrecadadoCentavos + l.arrecadadoCentavos, aReceberCentavos: t.aReceberCentavos + l.aReceberCentavos }),
    { turma: 'Total', vao: 0, pagos: 0, pendentes: 0, arrecadadoCentavos: 0, aReceberCentavos: 0 },
  );
  return { linhas, total };
}

/** Grupos de 2 (dois termos por folha A4). */
export function emPares<T>(itens: T[]): T[][] {
  const pares: T[][] = [];
  for (let i = 0; i < itens.length; i += 2) pares.push(itens.slice(i, i + 2));
  return pares;
}

export function assentosLivres(mapa: MapaAssentos): number[] {
  const ocupados = new Set(mapa.ocupados.map((o) => o.numero));
  return Array.from({ length: mapa.capacidade }, (_, i) => i + 1).filter((n) => !ocupados.has(n));
}

/** Alunos que vão e ainda não têm assento em nenhum veículo do passeio. */
export function semAssento(inscricoes: Inscricao[], mapas: MapaAssentos[]): Inscricao[] {
  const sentados = new Set(mapas.flatMap((m) => m.ocupados.map((o) => o.aluno_id)));
  return inscricoes.filter((i) => i.vai && !sentados.has(i.aluno_id));
}

/**
 * Distribuição automática: percorre os alunos sem assento já agrupados por turma (ordem da API) e
 * ocupa os assentos livres de cada veículo em sequência — a turma tende a ficar junta no mesmo ônibus.
 */
export function distribuir(inscricoes: Inscricao[], veiculos: Veiculo[], mapas: MapaAssentos[]): { veiculoId: number; numero: number; alunoId: number }[] {
  const fila = semAssento(inscricoes, mapas);
  const vagas = veiculos.flatMap((v) => {
    const mapa = mapas.find((m) => m.veiculo_id === v.id);
    return mapa ? assentosLivres(mapa).map((numero) => ({ veiculoId: v.id, numero })) : [];
  });
  return fila.slice(0, vagas.length).map((i, k) => ({ ...vagas[k], alunoId: i.aluno_id }));
}

/** CSV (separador ;) das inscrições exibidas — gerado no navegador a partir dos dados da API. */
export function csvInscricoes(lista: Inscricao[]): string {
  const campo = (v: string | number | null | undefined): string => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const linhas = lista.map((i) => [i.aluno?.numero, i.aluno?.nome, i.aluno?.turma?.nome, i.aluno?.telefone, i.vai ? 'Sim' : 'Não', i.autorizacao_entregue ? 'Sim' : 'Não', i.pago ? 'Sim' : 'Não', i.observacao].map(campo).join(';'));
  return `﻿${['Nº', 'Aluno', 'Turma', 'Telefone', 'Vai', 'Termo entregue', 'Pago', 'Observação'].map(campo).join(';')}\n${linhas.join('\n')}\n`;
}
