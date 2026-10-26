import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { acionarMenu } from '@/test-utils/acoesMenu';

const api = vi.hoisted(() => ({
  equipes: vi.fn(), excluirEquipe: vi.fn(), profissionais: vi.fn(), excluirProfissional: vi.fn(),
  cadastro: vi.fn(), salvarCadastro: vi.fn(), excluirCadastro: vi.fn(), auditoria: vi.fn(),
  acompanhados: vi.fn(), acompanhado: vi.fn(), atendimentos: vi.fn(), excluirAtendimento: vi.fn(),
}));
vi.mock('./api', async (original) => ({ ...(await original<typeof import('./api')>()), multiApi: api }));

import type { Acompanhado, Atendimento, Opcoes } from './api';
import { Equipes } from './components/Equipes';
import { Profissionais } from './components/Profissionais';
import { Cadastros } from './components/Cadastros';
import { AuditoriaMulti } from './components/Auditoria';
import { Acompanhados } from './components/Acompanhados';
import { Atendimentos } from './components/Atendimentos';

/** O Select do Radix rola até a opção e checa o ponteiro: o jsdom não tem essas APIs. */
Element.prototype.scrollIntoView ??= () => undefined;
Element.prototype.hasPointerCapture ??= () => false;
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;

const opcoes = (permissoes: Partial<Opcoes['permissoes']> = {}): Opcoes => ({
  escolas: [{ id: 1, nome: 'Escola Municipal Centro' }], equipes: [], profissionais: [{ id: 7, nome: 'Carla Psicóloga' }],
  tipos_atendimento: [{ id: 3, nome: 'Avaliação' }], cargos: [{ id: 2, nome: 'Psicólogo(a)' }], condicoes: [],
  turnos: [{ valor: 'manha', rotulo: 'Manhã' }, { valor: 'tarde', rotulo: 'Tarde' }], meu_profissional_id: 7,
  permissoes: { atender: true, acompanhar: true, gerenciar: true, auditar: true, ...permissoes },
});

const atendimento = (extra: Partial<Atendimento> = {}): Atendimento => ({
  id: 5, data_hora: '2026-10-13T09:00', turno: 'manha', turno_rotulo: 'Manhã', escola: { id: 1, nome: 'Escola Municipal Centro' },
  equipe: null, sigiloso: false, relato_visivel: true, relato: 'Avaliação inicial.', alunos: [{ id: 11, nome: 'ANA CLARA SOUZA' }],
  profissionais: [{ id: 7, nome: 'Carla Psicóloga' }], tipos: [{ id: 3, nome: 'Avaliação' }], autor: 'Maria', pode_editar: true, criado_em: null,
  ...extra,
});

beforeEach(() => vi.clearAllMocks());

describe('Equipes', () => {
  const equipe = { id: 1, nome: 'Equipe Norte', turno: 'manha', ativo: true, profissionais: [{ id: 7, nome: 'Carla Psicóloga' }], escolas: [{ id: 1, nome: 'Escola Municipal Centro' }] };

  it('lista, edita e exclui pelo menu da linha', async () => {
    api.equipes.mockResolvedValue([equipe]);
    api.excluirEquipe.mockResolvedValue(true);
    const avisar = vi.fn();
    render(<Equipes opcoes={opcoes()} avisar={avisar} aoMudar={vi.fn()} />);

    expect(await screen.findByText('Equipe Norte')).toBeInTheDocument();
    expect(screen.getByText('Manhã')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /exportar/i })).toBeInTheDocument();

    await acionarMenu(/Ações de Equipe Norte/, 'Editar');
    expect(await screen.findByText('Editar equipe')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    await acionarMenu(/Ações de Equipe Norte/, 'Excluir');
    await waitFor(() => expect(api.excluirEquipe).toHaveBeenCalledWith(1));
    await waitFor(() => expect(avisar).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' })));
  });

  it('quem não gerencia vê a lista sem o menu de ações', async () => {
    api.equipes.mockResolvedValue([equipe]);
    render(<Equipes opcoes={opcoes({ gerenciar: false })} avisar={vi.fn()} aoMudar={vi.fn()} />);
    expect(await screen.findByText('Equipe Norte')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ações de/ })).not.toBeInTheDocument();
  });
});

describe('Profissionais', () => {
  it('mostra CPF mascarado e usuário, e exclui pelo menu da linha', async () => {
    api.profissionais.mockResolvedValue([
      { id: 9, nome: 'Carla Psicóloga', cpf_mascarado: '***.982.247-**', cargo: { id: 2, nome: 'Psicólogo(a)' }, registro_profissional: 'CRP 08/1234', telefone: null, ativo: true, usuario: null },
    ]);
    api.excluirProfissional.mockResolvedValue(true);
    render(<Profissionais opcoes={opcoes()} avisar={vi.fn()} aoMudar={vi.fn()} />);

    expect(await screen.findByText('***.982.247-**')).toBeInTheDocument();
    expect(screen.getByText('Sem acesso')).toBeInTheDocument();
    await acionarMenu(/Ações de Carla Psicóloga/, 'Excluir');
    await waitFor(() => expect(api.excluirProfissional).toHaveBeenCalledWith(9));
  });
});

describe('Cadastros', () => {
  it('cada lista alterna o ativo pelo switch e exclui pelo menu', async () => {
    api.cadastro.mockImplementation(async (tipo: string) => ({
      cargos: [{ id: 1, nome: 'Psicólogo(a)', ativo: true }],
      condicoes: [{ id: 2, nome: 'TEA', cid: 'F84', ativo: true }],
      'tipos-atendimento': [{ id: 3, nome: 'Avaliação', ativo: true }],
    } as Record<string, unknown>)[tipo]);
    api.salvarCadastro.mockResolvedValue({});
    api.excluirCadastro.mockResolvedValue(true);
    render(<Cadastros avisar={vi.fn()} aoMudar={vi.fn()} />);

    expect(await screen.findByText('Psicólogo(a)')).toBeInTheDocument();
    expect(screen.getByText('F84')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('switch', { name: 'Ativar Psicólogo(a)' }));
    await waitFor(() => expect(api.salvarCadastro).toHaveBeenCalledWith('cargos', expect.objectContaining({ id: 1, ativo: false })));

    // Com uma só ação o ActionsMenu mostra o botão direto; as listas vêm na ordem cargos, condições, tipos.
    const excluir = screen.getAllByRole('button', { name: 'Excluir' });
    expect(excluir).toHaveLength(3);
    fireEvent.click(excluir[1]);
    await waitFor(() => expect(api.excluirCadastro).toHaveBeenCalledWith('condicoes', 2));
  });
});

describe('Auditoria', () => {
  it('traduz a ação, resume os detalhes e pede 50 por página ao servidor', async () => {
    api.auditoria.mockResolvedValue({
      data: [{ id: 1, data: '2026-10-12T14:00:00Z', usuario: 'Maria', acao: 'equipe.criada', recurso: 'equipe:1', detalhes: { nome: 'Equipe Norte' }, ip: null }],
      current_page: 1, last_page: 1, total: 1,
    });
    render(<AuditoriaMulti />);

    expect(await screen.findByText('Criou equipe')).toBeInTheDocument();
    expect(screen.getByText('Equipe Norte')).toBeInTheDocument();
    expect(api.auditoria).toHaveBeenCalledWith({ acao: undefined, page: 1, per_page: 50 });
  });
});

describe('Acompanhados', () => {
  const acompanhado: Acompanhado = {
    id: 4, ativo: true, criado_em: null, condicoes: [{ id: 1, nome: 'TEA', cid: 'F84', diagnosticado_em: null }],
    aluno: { id: 11, nome: 'ANA CLARA SOUZA', cgm: '1001', nascimento: null, situacao: 'ativo', escola: 'Escola Municipal Centro', turma: '5º A' },
    profissionais: [{ id: 7, nome: 'Carla Psicóloga', cargo: 'Psicólogo(a)', papel: null }],
  };

  it('abre a ficha pela ação da linha e mostra as condições a quem tem acesso clínico', async () => {
    api.acompanhados.mockResolvedValue([acompanhado]);
    api.acompanhado.mockReturnValue(new Promise(() => undefined));
    render(<Acompanhados opcoes={opcoes()} avisar={vi.fn()} />);

    expect(await screen.findByText('ANA CLARA SOUZA')).toBeInTheDocument();
    expect(screen.getByText('Condições')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /exportar/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Abrir ficha' }));
    await waitFor(() => expect(api.acompanhado).toHaveBeenCalledWith(4));
  });
});

describe('Atendimentos (grade)', () => {
  const pagina = (data: Atendimento[]) => ({ data, current_page: 1, last_page: 3, total: 70 });

  it('exclui pelo menu da linha depois de confirmar, quando o usuário pode editar', async () => {
    api.atendimentos.mockResolvedValue(pagina([atendimento()]));
    api.excluirAtendimento.mockResolvedValue(undefined);
    render(<Atendimentos opcoes={opcoes()} avisar={vi.fn()} />);
    await screen.findByText('ANA CLARA SOUZA');

    await acionarMenu(/Ações do atendimento/, 'Excluir');
    const dialogo = await screen.findByRole('dialog');
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Excluir' }));
    await waitFor(() => expect(api.excluirAtendimento).toHaveBeenCalledWith(5));
  });

  it('sem permissão de editar não há menu de ações', async () => {
    api.atendimentos.mockResolvedValue(pagina([atendimento({ pode_editar: false })]));
    render(<Atendimentos opcoes={opcoes()} avisar={vi.fn()} />);
    await screen.findByText('ANA CLARA SOUZA');
    expect(screen.queryByRole('button', { name: /Ações do atendimento/ })).not.toBeInTheDocument();
  });

  it('pagina no servidor: pede a página seguinte à API', async () => {
    api.atendimentos.mockResolvedValue(pagina([atendimento()]));
    render(<Atendimentos opcoes={opcoes()} avisar={vi.fn()} />);
    await screen.findByText('ANA CLARA SOUZA');

    fireEvent.click(screen.getByRole('button', { name: /próxima/i }));
    await waitFor(() => expect(api.atendimentos).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })));
  });
});
