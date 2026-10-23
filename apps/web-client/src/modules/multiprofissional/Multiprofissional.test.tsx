import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const api = vi.hoisted(() => ({
  atendimentos: vi.fn(), salvarAtendimento: vi.fn(), excluirAtendimento: vi.fn(), alunos: vi.fn(),
  acompanhados: vi.fn(), acompanhado: vi.fn(), salvarAcompanhado: vi.fn(),
}));
vi.mock('./api', async (original) => ({ ...(await original<typeof import('./api')>()), multiApi: api }));

import type { Acompanhado, Atendimento, Opcoes } from './api';
import { dataHora } from './api';
import { Atendimentos } from './components/Atendimentos';
import { AtendimentoModal } from './components/AtendimentoModal';
import { Acompanhados } from './components/Acompanhados';

/** O Select do Radix rola até a opção e checa o ponteiro: o jsdom não tem essas APIs. */
Element.prototype.scrollIntoView ??= () => undefined;
Element.prototype.hasPointerCapture ??= () => false;
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;

const opcoes = (permissoes: Partial<Opcoes['permissoes']> = {}): Opcoes => ({
  escolas: [{ id: 1, nome: 'Escola Municipal Centro' }],
  equipes: [],
  profissionais: [{ id: 7, nome: 'Carla Psicóloga' }],
  tipos_atendimento: [{ id: 3, nome: 'Avaliação' }],
  cargos: [{ id: 2, nome: 'Psicólogo(a)' }],
  condicoes: [],
  turnos: [{ valor: 'manha', rotulo: 'Manhã' }, { valor: 'tarde', rotulo: 'Tarde' }],
  meu_profissional_id: 7,
  permissoes: { atender: true, acompanhar: true, gerenciar: false, auditar: false, ...permissoes },
});

const atendimento = (extra: Partial<Atendimento> = {}): Atendimento => ({
  id: 5, data_hora: '2026-10-13T09:00', turno: 'manha', turno_rotulo: 'Manhã', escola: { id: 1, nome: 'Escola Municipal Centro' },
  equipe: null, sigiloso: false, relato_visivel: true, relato: 'Avaliação inicial.', alunos: [{ id: 11, nome: 'ANA CLARA SOUZA' }],
  profissionais: [{ id: 7, nome: 'Carla Psicóloga' }], tipos: [{ id: 3, nome: 'Avaliação' }], autor: 'Maria', pode_editar: false, criado_em: null,
  ...extra,
});

const pagina = (data: Atendimento[]) => ({ data, current_page: 1, last_page: 1, total: data.length });

beforeEach(() => vi.clearAllMocks());

describe('Atendimentos', () => {
  it('sigiloso sem acesso aparece mascarado e sem botões de edição', async () => {
    api.atendimentos.mockResolvedValue(pagina([atendimento({ sigiloso: true, relato_visivel: false, relato: null })]));
    render(<Atendimentos opcoes={opcoes()} avisar={vi.fn()} />);

    fireEvent.click(await screen.findByText('ANA CLARA SOUZA'));
    expect(await screen.findByText('Registro sigiloso')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar atendimento' })).not.toBeInTheDocument();
  });

  it('consulta não vê o botão de registrar', async () => {
    api.atendimentos.mockResolvedValue(pagina([]));
    render(<Atendimentos opcoes={opcoes({ atender: false })} avisar={vi.fn()} />);

    expect(await screen.findByText('Nenhum atendimento encontrado.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Registrar atendimento/ })).not.toBeInTheDocument();
  });

  it('no histórico do estudante, filtra pelo aluno', async () => {
    api.atendimentos.mockResolvedValue(pagina([]));
    render(<Atendimentos opcoes={opcoes()} avisar={vi.fn()} aluno={{ id: 11, nome: 'ANA' }} />);

    await waitFor(() => expect(api.atendimentos).toHaveBeenCalledWith(expect.objectContaining({ aluno_id: 11 })));
  });
});

describe('Registro de atendimento', () => {
  it('exige estudante e já marca o próprio profissional', async () => {
    const aoSalvar = vi.fn();
    render(<AtendimentoModal opcoes={opcoes()} aoFechar={vi.fn()} aoSalvar={aoSalvar} />);

    expect(screen.getByRole('checkbox', { name: 'Carla Psicóloga' })).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Inclua ao menos um estudante.')).toBeInTheDocument();
    expect(api.salvarAtendimento).not.toHaveBeenCalled();
  });

  it('envia estudantes, profissionais e tipos escolhidos', async () => {
    api.salvarAtendimento.mockResolvedValue(atendimento());
    const aoSalvar = vi.fn();
    render(<AtendimentoModal opcoes={opcoes()} alunoInicial={{ id: 11, nome: 'ANA' }} aoFechar={vi.fn()} aoSalvar={aoSalvar} />);

    fireEvent.click(screen.getByRole('checkbox', { name: 'Avaliação' }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Registro sigiloso/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(aoSalvar).toHaveBeenCalled());
    expect(api.salvarAtendimento).toHaveBeenCalledWith(null, expect.objectContaining({
      escola_id: 1, alunos: [11], profissionais: [7], tipos: [3], sigiloso: true,
    }));
  });
});

describe('Estudantes acompanhados', () => {
  const acompanhado: Acompanhado = {
    id: 4, ativo: true, criado_em: null, condicoes: null,
    aluno: { id: 11, nome: 'ANA CLARA SOUZA', cgm: '1001', nascimento: null, situacao: 'ativo', escola: 'Escola Municipal Centro', turma: '5º A' },
    profissionais: [{ id: 7, nome: 'Carla Psicóloga', cargo: 'Psicólogo(a)', papel: null }],
  };

  it('sem acesso clínico: sem coluna de condições e sem novo acompanhamento', async () => {
    api.acompanhados.mockResolvedValue([acompanhado]);
    render(<Acompanhados opcoes={opcoes({ acompanhar: false })} avisar={vi.fn()} />);

    expect(await screen.findByText('ANA CLARA SOUZA')).toBeInTheDocument();
    expect(screen.queryByText('Condições')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Novo acompanhamento/ })).not.toBeInTheDocument();
  });
});

describe('Formatação', () => {
  it('data e hora no padrão brasileiro', () => {
    expect(dataHora('2026-10-13T09:05')).toBe('13/10/2026 09:05');
    expect(dataHora('2015-03-04')).toBe('04/03/2015');
    expect(dataHora(null)).toBe('—');
  });
});
