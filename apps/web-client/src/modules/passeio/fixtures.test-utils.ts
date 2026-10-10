import { vi } from 'vitest';
import type { Turma } from '../escola/api';
import type { Inscricao, Passeio } from './api';
import type { PropsAba } from './ModuloPasseioMain';

/** Dados de teste do Passeio (só para os testes do vitest). */
export const passeio: Passeio = {
  id: 7, nome: 'Museu Oscar Niemeyer', data_passeio: '2026-10-20', data_limite_autorizacao: '2026-10-10', horario_saida: '07:30:00',
  horario_retorno: '12:00:00', local_saida: 'Portão da escola', destino: 'Museu', cidade: 'Curitiba', valor_centavos: 4500,
  responsavel: 'Profa. Ana', observacoes: null, status: 'agendado', inscricoes_count: 3, veiculos_count: 1,
};

export const inscricao = (id: number, nome: string, turmaId: number, turma: string, extra: Partial<Inscricao> = {}): Inscricao => ({
  id, passeio_id: 7, aluno_id: id * 10, vai: true, autorizacao_entregue: false, pago: false, observacao: null,
  aluno: { id: id * 10, nome, numero: id, turma_id: turmaId, situacao: 'ativo', telefone: null, turma: { id: turmaId, nome: turma } },
  ...extra,
});

export function propsAba(extra: Partial<PropsAba> = {}): PropsAba {
  const inscricoes = [
    inscricao(1, 'ALICIA SOUZA', 1, '5º A', { pago: true, autorizacao_entregue: true }),
    inscricao(2, 'BRUNO LIMA', 1, '5º A'),
    inscricao(3, 'CARLA DIAS', 2, '5º B', { vai: false }),
  ];
  return {
    ativo: passeio,
    dados: {
      passeio, inscricoes, veiculos: [], mapas: [],
      indicadores: { total_passeios: 1, alunos_inscritos: 3, alunos_que_vao: 2, autorizacoes_entregues: 1, autorizacoes_percentual: 50, arrecadado_centavos: 4500, pendente_centavos: 4500, total_veiculos: 0, capacidade_total: 0, assentos_ocupados: 0 },
      turmas: [{ id: 1, nome: '5º A', ano_letivo: 2026, turno: { id: 1, nome: 'Manhã' }, total_alunos: 2 }, { id: 2, nome: '5º B', ano_letivo: 2026, turno: { id: 1, nome: 'Manhã' }, total_alunos: 1 }] as Turma[],
    },
    recarregar: vi.fn().mockResolvedValue(undefined),
    avisar: vi.fn(),
    permissoes: { passeios: true, frota: true },
    escola: 'Escola Municipal Exemplo',
    irPara: vi.fn(),
    ...extra,
  };
}
