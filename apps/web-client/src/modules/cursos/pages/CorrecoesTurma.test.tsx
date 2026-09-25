import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

const cursosApi = vi.hoisted(() => ({
  filaCorrecao: vi.fn(),
  getCorrecao: vi.fn(),
  corrigirResposta: vi.fn(),
  getTurma: vi.fn(),
  listarInscritos: vi.fn(),
  encerrarTurma: vi.fn(),
}));

vi.mock('@sysgov/sdk', async (original) => ({
  ...(await original<typeof import('@sysgov/sdk')>()),
  sysgovApi: { cursos: cursosApi },
}));
vi.mock('@/core/rbac/useCan', () => ({ useCan: () => ({ can: () => true }) }));

import type { TentativaCorrecao } from '@sysgov/sdk';
import { CorrecoesTab } from '../components/CorrecoesTab';
import { TurmaDetalhePage } from './TurmaDetalhePage';

const item = (extra = {}) => ({
  id: 7, avaliacao: { id: 3, titulo: 'Prova discursiva' }, participante: { id: 1, nome: 'Ana Souza' }, inscricao_id: 5, numero: 1,
  status: 'aguardando_correcao', enviada_em: '2026-10-05T12:20:00Z', nota: null, pendentes: 2, ...extra,
});

const correcao = (extra: Partial<TentativaCorrecao> = {}): TentativaCorrecao => ({
  id: 7, avaliacao: { id: 3, titulo: 'Prova discursiva' }, inscricao_id: 5, turma_id: 1, participante: { id: 1, nome: 'Ana Souza', email: 'ana@teste.gov.br' },
  numero: 1, status: 'aguardando_correcao', iniciada_em: '2026-10-05T12:00:00Z', enviada_em: '2026-10-05T12:20:00Z', corrigida_em: null, nota: null,
  questoes: [
    {
      questao_id: 1, ordem: 1, tipo: 'objetiva', enunciado: '<p>Qual é a capital do Paraná?</p>', pontuacao: 1, orientacao_correcao: null,
      alternativas: [{ id: 11, texto: 'Curitiba', ordem: 1, correta: true }, { id: 12, texto: 'Londrina', ordem: 2, correta: false }],
      resposta: { alternativa_id: 12, texto: null }, correcao: { pontos: 0, comentario: null, corrigida_por: null, corrigida_em: '2026-10-05T12:20:00Z', pendente: false },
    },
    {
      questao_id: 2, ordem: 2, tipo: 'dissertativa', enunciado: '<p>Explique o princípio da legalidade.</p>', pontuacao: 2, orientacao_correcao: '<p>Citar o art. 37 da CF.</p>',
      alternativas: [], resposta: { alternativa_id: null, texto: 'A lei limita o Estado.\nNinguém é obrigado a nada senão em virtude de lei.' },
      correcao: { pontos: null, comentario: null, corrigida_por: null, corrigida_em: null, pendente: true },
    },
  ],
  ...extra,
});

describe('Aba Correções da turma', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cursosApi.filaCorrecao.mockResolvedValue([item()]);
    cursosApi.getCorrecao.mockResolvedValue(correcao());
  });

  it('lista as tentativas aguardando correção com o participante, a avaliação e as pendentes', async () => {
    render(<CorrecoesTab turmaId={1} aberta />);

    expect(await screen.findByText('Ana Souza')).toBeInTheDocument();
    expect(screen.getByText(/Prova discursiva/)).toBeInTheDocument();
    expect(screen.getByText('2 questões pendentes')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Corrigir' })).toBeInTheDocument();
    expect(cursosApi.filaCorrecao).toHaveBeenCalledWith(1, 'aguardando_correcao');
  });

  it('fila vazia mostra o estado vazio', async () => {
    cursosApi.filaCorrecao.mockResolvedValue([]);
    render(<CorrecoesTab turmaId={1} aberta />);

    expect(await screen.findByText('Nenhuma tentativa aguardando correção')).toBeInTheDocument();
  });

  it('as corrigidas ficam em outra aba, com a nota, e podem ser revistas enquanto a turma está aberta', async () => {
    cursosApi.filaCorrecao.mockImplementation((_t: number, status: string) => Promise.resolve(status === 'corrigida' ? [item({ status: 'corrigida', nota: '8.75', pendentes: 0 })] : []));
    render(<CorrecoesTab turmaId={1} aberta />);
    await screen.findByText('Nenhuma tentativa aguardando correção');

    fireEvent.click(screen.getByRole('tab', { name: 'Corrigidas' }));

    expect(await screen.findByText('8,75')).toBeInTheDocument();
    expect(cursosApi.filaCorrecao).toHaveBeenLastCalledWith(1, 'corrigida');
    expect(screen.getByRole('button', { name: 'Rever' })).toBeInTheDocument();
  });

  it('turma encerrada: só consulta, sem salvar correção', async () => {
    cursosApi.filaCorrecao.mockResolvedValue([item({ status: 'corrigida', nota: '5.00', pendentes: 0 })]);
    cursosApi.getCorrecao.mockResolvedValue(correcao({ status: 'corrigida', nota: '5.00' }));
    render(<CorrecoesTab turmaId={1} aberta={false} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Ver' }));

    expect(await screen.findByText(/A turma foi encerrada/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Salvar correção|Atualizar correção/ })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Pontos/)).toBeDisabled();
  });

  it('o modal mostra o gabarito e a orientação a quem corrige, e a resposta como texto puro', async () => {
    render(<CorrecoesTab turmaId={1} aberta />);
    fireEvent.click(await screen.findByRole('button', { name: 'Corrigir' }));

    expect(await screen.findByText('Citar o art. 37 da CF.')).toBeInTheDocument();
    expect(screen.getByText('correta')).toBeInTheDocument();
    expect(screen.getByText('← resposta do participante')).toBeInTheDocument();
    expect(screen.getByText(/A lei limita o Estado\./)).toBeInTheDocument();
    expect(screen.getByText(/Corrigida automaticamente/)).toHaveTextContent('Corrigida automaticamente: 0 de 1.');
  });

  it('corrige a dissertativa com pontos e comentário e, na última pendente, mostra a nota', async () => {
    cursosApi.corrigirResposta.mockResolvedValue(
      correcao({
        status: 'corrigida', nota: '8.33',
        questoes: correcao().questoes.map((q) => (q.questao_id === 2 ? { ...q, correcao: { pontos: 1.5, comentario: 'Faltou citar o artigo', corrigida_por: 9, corrigida_em: '2026-10-06T10:00:00Z', pendente: false } } : q)),
      }),
    );
    render(<CorrecoesTab turmaId={1} aberta />);
    fireEvent.click(await screen.findByRole('button', { name: 'Corrigir' }));
    await screen.findByText('Citar o art. 37 da CF.');

    fireEvent.change(screen.getByLabelText(/Pontos/), { target: { value: '1.5' } });
    fireEvent.change(screen.getByLabelText(/Comentário/), { target: { value: 'Faltou citar o artigo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar correção' }));

    await waitFor(() => expect(cursosApi.corrigirResposta).toHaveBeenCalledWith(7, 2, { pontos: 1.5, comentario: 'Faltou citar o artigo' }));
    expect(await screen.findByText('8,33')).toBeInTheDocument();
    expect(screen.getByText('Corrigida')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Atualizar correção' })).toBeInTheDocument();
  });

  it('recusa pontos acima do máximo ou negativos sem chamar a API', async () => {
    render(<CorrecoesTab turmaId={1} aberta />);
    fireEvent.click(await screen.findByRole('button', { name: 'Corrigir' }));
    await screen.findByText('Citar o art. 37 da CF.');

    fireEvent.change(screen.getByLabelText(/Pontos/), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar correção' }));
    expect(await screen.findByText('Os pontos devem ficar entre 0 e 2.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Pontos/), { target: { value: '-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar correção' }));
    expect(screen.getByText('Os pontos devem ficar entre 0 e 2.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Pontos/), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar correção' }));
    expect(cursosApi.corrigirResposta).not.toHaveBeenCalled();
  });

  it('erro do servidor na correção é mostrado', async () => {
    cursosApi.corrigirResposta.mockRejectedValue(Object.assign(new Error('422'), { response: { status: 422, data: { error: 'A turma foi encerrada: as correções não podem mais ser alteradas.' } } }));
    render(<CorrecoesTab turmaId={1} aberta />);
    fireEvent.click(await screen.findByRole('button', { name: 'Corrigir' }));
    await screen.findByText('Citar o art. 37 da CF.');

    fireEvent.change(screen.getByLabelText(/Pontos/), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar correção' }));

    expect(await screen.findByText('A turma foi encerrada: as correções não podem mais ser alteradas.')).toBeInTheDocument();
  });
});

describe('TurmaDetalhePage — nota parcial e encerramento', () => {
  const turma = {
    id: 1, curso_id: 1, nome: 'Turma 1', data_inicio: '2026-10-01', data_fim: '2026-10-31', modalidade: 'presencial', local: 'Auditório', status: 'aberta',
    vagas: 20, vagas_ocupadas: 2, lista_espera: 0, inscricoes_inicio: '2026-09-01T00:00:00Z', inscricoes_fim: '2026-09-30T00:00:00Z',
    curso: { id: 1, titulo: 'Gestão de Contratos' }, instrutores: [{ id: 2, name: 'Helena' }], agendamentos: [],
  };
  const inscrito = (id: number, nome: string, nota: number | null) => ({
    id, participante_id: id, nome, email: `${id}@teste.gov.br`, status: 'confirmada', status_label: 'Confirmada', inscrito_em: '01/09/2026 10:00',
    posicao_fila: null, frequencia: { aulas: 4, presencas: 4, percentual: 100 }, nota,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    cursosApi.getTurma.mockResolvedValue(turma);
    cursosApi.listarInscritos.mockResolvedValue([inscrito(1, 'Ana Souza', 7.5), inscrito(2, 'Bruno Lima', null)]);
    cursosApi.filaCorrecao.mockResolvedValue([item()]);
  });

  it('a lista de inscritos mostra a nota parcial de cada um', async () => {
    render(<TurmaDetalhePage turmaId={1} onVoltar={() => undefined} />);

    const ana = (await screen.findByText('Ana Souza')).closest('tr') as HTMLElement;
    expect(within(ana).getByText('7,50')).toBeInTheDocument();
    const bruno = screen.getByText('Bruno Lima').closest('tr') as HTMLElement;
    expect(within(bruno).getByText('—')).toBeInTheDocument();
  });

  it('encerramento recusado por correção pendente mostra as pendentes e leva à aba Correções', async () => {
    cursosApi.encerrarTurma.mockRejectedValue(
      Object.assign(new Error('422'), { response: { status: 422, data: { error: 'Há 1 tentativa(s) aguardando correção: Ana Souza (Prova discursiva, tentativa 1). Corrija-as antes de encerrar a turma.' } } }),
    );
    render(<TurmaDetalhePage turmaId={1} onVoltar={() => undefined} />);
    await screen.findByText('Ana Souza');

    fireEvent.click(screen.getByRole('button', { name: /Encerrar turma/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Encerrar turma', hidden: false }));

    expect(await screen.findByText(/Ana Souza \(Prova discursiva, tentativa 1\)/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ir para as correções' }));

    expect(await screen.findByText('2 questões pendentes')).toBeInTheDocument();
  });

  it('a aba Correções abre a fila da turma', async () => {
    render(<TurmaDetalhePage turmaId={1} onVoltar={() => undefined} />);
    await screen.findByText('Ana Souza');

    fireEvent.click(screen.getByRole('tab', { name: 'Correções' }));

    expect(await screen.findByText('2 questões pendentes')).toBeInTheDocument();
    expect(cursosApi.filaCorrecao).toHaveBeenCalledWith(1, 'aguardando_correcao');
    expect(screen.queryByText('Aulas agendadas')).not.toBeInTheDocument();
  });
});
