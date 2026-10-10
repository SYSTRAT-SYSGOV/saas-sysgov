import React from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const api = vi.hoisted(() => ({
  inscricoesEmLote: vi.fn(),
  atualizarInscricao: vi.fn(),
  excluirInscricao: vi.fn(),
  inscreverTurma: vi.fn(),
  inscreverAluno: vi.fn(),
}));
vi.mock('../api', async (original) => ({ ...(await original<typeof import('../api')>()), passeioApi: api }));
const escola = vi.hoisted(() => ({ todosAlunos: vi.fn() }));
vi.mock('../../escola/api', async (original) => ({ ...(await original<typeof import('../../escola/api')>()), escolaApi: escola }));

import { propsAba } from '../fixtures.test-utils';
import type { MapaAssentos, Veiculo } from '../api';
import { InscricoesTermos } from './InscricoesTermos';
import { TurmasPasseio } from './TurmasPasseio';
import { RelatoriosPasseio } from './RelatoriosPasseio';
import { OnibusAssentos } from './OnibusAssentos';

// O Select (Radix) usa APIs que o jsdom não tem.
beforeAll(() => {
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.scrollIntoView = vi.fn();
});

beforeEach(() => {
  vi.clearAllMocks();
  api.inscricoesEmLote.mockResolvedValue({ afetadas: 2, criadas: 0 });
  api.atualizarInscricao.mockResolvedValue({});
  api.inscreverAluno.mockResolvedValue({});
});

/** O Select (Radix) mostra o rótulo num <label> irmão do botão; abre pelo teclado e escolhe a opção. */
async function escolher(rotulo: string, opcao: string) {
  const label = screen.getByText(rotulo, { selector: 'label' });
  await act(async () => { fireEvent.keyDown(within(label.parentElement as HTMLElement).getByRole('combobox'), { key: 'Enter' }); });
  const item = await screen.findByRole('option', { name: opcao });
  await act(async () => { fireEvent.keyDown(item, { key: 'Enter' }); });
}

describe('Turmas do passeio', () => {
  it('desmarca a turma inteira com confirmação e recarrega', async () => {
    const props = propsAba();
    render(<MemoryRouter><TurmasPasseio {...props} /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: 'Desmarcar toda a turma 5º A' }));
    const dialogo = await screen.findByRole('dialog');
    expect(within(dialogo).getByText(/perdem o assento/)).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Desmarcar' }));

    await waitFor(() => expect(api.inscricoesEmLote).toHaveBeenCalledWith(7, 1, false));
    expect(props.recarregar).toHaveBeenCalled();
  });

  it('Apoio não vê os botões de turma inteira', () => {
    render(<MemoryRouter><TurmasPasseio {...propsAba({ permissoes: { passeios: false, frota: false } })} /></MemoryRouter>);
    expect(screen.queryByRole('button', { name: /toda a turma/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Abrir Cadastro Escolar/ })).toBeInTheDocument();
  });
});

describe('Inscrições e termos', () => {
  it('marca o termo pela chave e grava na API', async () => {
    render(<InscricoesTermos {...propsAba()} />);
    fireEvent.click(screen.getByRole('switch', { name: 'Termo de BRUNO LIMA entregue' }));
    await waitFor(() => expect(api.atualizarInscricao).toHaveBeenCalledWith(2, { autorizacao_entregue: true }));
  });

  it('quem não vai fica com termo e pagamento bloqueados', () => {
    render(<InscricoesTermos {...propsAba()} />);
    expect(screen.getByRole('switch', { name: 'Termo de CARLA DIAS entregue' })).toBeDisabled();
    expect(screen.getByRole('switch', { name: 'CARLA DIAS pagou' })).toBeDisabled();
    expect(screen.getByRole('switch', { name: 'Termo de BRUNO LIMA entregue' })).toBeEnabled();
    expect(screen.getByRole('switch', { name: 'BRUNO LIMA pagou' })).toBeEnabled();
  });

  it('ao escolher a turma, lista todos os alunos dela e inscreve quem for marcado para ir', async () => {
    escola.todosAlunos.mockResolvedValue([
      { id: 10, numero: 1, nome: 'ALICIA SOUZA', situacao: 'ativo' },
      { id: 20, numero: 2, nome: 'BRUNO LIMA', situacao: 'ativo' },
      { id: 55, numero: 3, nome: 'DANIEL NOVO', situacao: 'ativo' },
      { id: 66, numero: 4, nome: 'EVA SAIU', situacao: 'transferido' },
    ]);
    const props = propsAba();
    render(<InscricoesTermos {...props} />);

    await escolher('Turma', '5º A');
    await waitFor(() => expect(escola.todosAlunos).toHaveBeenCalledWith({ turma_id: 1 }));
    const vai = await screen.findByRole('switch', { name: 'DANIEL NOVO vai ao passeio' });
    expect(vai).not.toBeChecked();
    expect(screen.getByRole('switch', { name: 'Termo de DANIEL NOVO entregue' })).toBeDisabled();
    expect(screen.queryByText('EVA SAIU')).not.toBeInTheDocument();
    expect(screen.queryByText('CARLA DIAS')).not.toBeInTheDocument();

    fireEvent.click(vai);
    await waitFor(() => expect(api.inscreverAluno).toHaveBeenCalledWith(7, 55));
    expect(props.recarregar).toHaveBeenCalled();
  });

  it('Apoio vê a situação sem chaves de alteração nem inscrição', () => {
    render(<InscricoesTermos {...propsAba({ permissoes: { passeios: false, frota: false } })} />);
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Inscrever/ })).not.toBeInTheDocument();
    expect(screen.getAllByText('Pago').length).toBeGreaterThan(0);
  });
});

describe('Relatórios', () => {
  it('termos só com quem vai e com os dados do passeio, sem dados fictícios', () => {
    render(<RelatoriosPasseio {...propsAba()} />);
    expect(screen.getByText('ALICIA SOUZA')).toBeInTheDocument();
    expect(screen.getByText('BRUNO LIMA')).toBeInTheDocument();
    expect(screen.queryByText('CARLA DIAS')).not.toBeInTheDocument();
    expect(screen.getAllByText('Escola Municipal Exemplo').length).toBe(2);
    expect(screen.queryByText(/Parque Cachoeira|Araucária/)).not.toBeInTheDocument();
  });
});

describe('Lista de embarque por ônibus', () => {
  const veiculo = (id: number, identificacao: string): Veiculo => ({ id, passeio_id: 7, identificacao, placa: null, motorista: null, telefone: null, capacidade: 44, cor: null });
  const comOnibus = (extra: Parameters<typeof propsAba>[0] = {}) => {
    const props = propsAba(extra);
    const mapas: MapaAssentos[] = [
      { veiculo_id: 5, capacidade: 44, ocupados: [{ numero: 1, aluno_id: 10, aluno: 'ALICIA SOUZA', turma: '5º A' }] },
      { veiculo_id: 6, capacidade: 44, ocupados: [{ numero: 1, aluno_id: 20, aluno: 'BRUNO LIMA', turma: '5º A' }] },
    ];
    return { ...props, dados: { ...props.dados, veiculos: [veiculo(5, 'Ônibus 01'), veiculo(6, 'Ônibus 02')], mapas } };
  };

  it('cada ônibus tem o botão de imprimir a sua lista, também para o Apoio', () => {
    const props = comOnibus({ permissoes: { passeios: false, frota: false } });
    render(<OnibusAssentos {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Imprimir lista do Ônibus 01' }));
    expect(props.irPara).toHaveBeenCalledWith('relatorios', { relatorio: 'manifesto', onibus: '5' });
  });

  it('o relatório abre direto na lista do ônibus escolhido', () => {
    render(<RelatoriosPasseio {...comOnibus()} inicial={{ relatorio: 'manifesto', veiculoId: 5 }} />);
    expect(screen.getByText('Lista de embarque — Ônibus 01')).toBeInTheDocument();
    expect(screen.queryByText('Lista de embarque — Ônibus 02')).not.toBeInTheDocument();
    expect(screen.getByText('ALICIA SOUZA')).toBeInTheDocument();
    // Coluna de chamada para marcar à mão no embarque.
    const colunas = screen.getAllByRole('columnheader').map((c) => c.textContent);
    expect(colunas).toEqual(['Lugar', 'Aluno', 'Turma', 'Telefone', 'Termo', 'Pago', 'Chamada']);
  });
});
