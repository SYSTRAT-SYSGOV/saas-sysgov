import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

const api = vi.hoisted(() => ({
  alunosDaRota: vi.fn(), buscarAlunos: vi.fn(), alocacao: vi.fn(), alocar: vi.fn(), atualizarAlocacao: vi.fn(), encerrarAlocacao: vi.fn(), itinerario: vi.fn(),
}));
vi.mock('./api', async (original) => ({ ...(await original<typeof import('./api')>()), transporteApi: api }));

import type { Alocacao, ItemItinerario, Ocupacao, Opcoes, Rota } from './api';
import { textoOcupacao } from './formato';
import { AlunosDaRota, SeloOcupacao } from './components/AlunosDaRota';

Element.prototype.scrollIntoView ??= () => undefined;
Element.prototype.hasPointerCapture ??= () => false;
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;

const opcoes = (extra: Partial<Opcoes['permissoes']> = {}): Opcoes => ({
  tipos_empresa: [], origens: [], tipos_rede: [], turnos: [], escolas: [], anos_letivos: [2026], veiculos: [],
  poderes_publicos: [{ valor: 1, rotulo: 'Estadual' }, { valor: 2, rotulo: 'Municipal' }], mediacoes: [{ valor: 'presencial', rotulo: 'Presencial' }],
  categorias_cnh: [], tipologias: [], empresas: [], motoristas: [],
  permissoes: { gerenciar_frota: true, gerenciar_rotas: true, gerenciar_alocacoes: true, exceder_capacidade: false, auditar: false, ...extra },
});

const ocupacao = (alocados: number, capacidade: number | null = 2): Ocupacao => {
  if (capacidade === null) return { alocados, capacidade: null, percentual: null, faixa: null, calculavel: false };
  const faixa = alocados * 100 <= 80 * capacidade ? 'verde' : alocados <= capacidade ? 'amarelo' : 'vermelho';
  return { alocados, capacidade, percentual: Math.round((alocados * 1000) / capacidade) / 10, faixa, calculavel: true };
};

const rota = (extra: Partial<Rota> = {}): Rota => ({
  id: 7, nome: 'Rota Norte', escola: { id: 5, nome: 'Escola Rio Claro' }, ano_letivo: 2026, turno: 'manha', turno_rotulo: 'Manhã', tipo_rede: 'rural',
  empresa: null, veiculo: { id: 1, placa: 'ABC1D23', descricao: 'Ônibus 01' }, motorista: null, km_pavimentado: 0, km_nao_pavimentado: 0, km_total: 0,
  horario_saida: null, horario_chegada: null, horario_retorno: null, ativa: true, paradas_count: 1, ocupacao: ocupacao(1), regular: true,
  motivos_irregularidade: [], observacoes: null, ...extra,
});

const alocacao = (extra: Partial<Alocacao> = {}): Alocacao => ({
  id: 70, rota_id: 7, aluno: { id: 1, nome: 'ANA CLARA', escola: 'Escola Rio Claro', turma: '5º A', turno_turma: 'Manhã' }, parada: { id: 10, nome: 'Ponte do Rio' },
  turno: 'manha', usa_transporte_rural: true, poder_publico: 2, poder_publico_rotulo: 'Municipal', necessidade_especial: false, atendimento_curricular: true,
  mediacao_didatica: 'presencial', mediacao_didatica_rotulo: 'Presencial', pais_residencia: 'BR', data_inicio: '2026-02-10', data_fim: null, motivo_fim: null,
  justificativa_excesso: null, observacoes: null, ativa: true, avisos: [], ...extra,
});

const itinerario: ItemItinerario[] = [{
  ordem: 1, embarque_previsto: null, desembarque_previsto: null,
  parada: { id: 10, nome: 'Ponte do Rio', descricao: null, latitude: null, longitude: null, tem_coordenadas: false, cep: null, logradouro: null, numero: null, complemento: null, bairro: null, cidade: null, uf: null, referencia: null, ativa: true },
}];

/** O Select do @sysgov/ui não liga o rótulo ao botão: acha o gatilho pelo rótulo e escolhe a opção. */
async function escolher(rotulo: string, opcao: string) {
  const gatilho = within(screen.getByText(rotulo).parentElement as HTMLElement).getByRole('combobox');
  fireEvent.keyDown(gatilho, { key: 'Enter' });
  fireEvent.click(await screen.findByRole('option', { name: opcao }));
}

beforeEach(() => {
  vi.clearAllMocks();
  api.itinerario.mockResolvedValue(itinerario);
});

describe('Ocupação em texto', () => {
  it('traz alocados, capacidade e percentual, e não depende só da cor', () => {
    expect(textoOcupacao(ocupacao(20, 40))).toBe('20 de 40 (50%)');
    expect(textoOcupacao(ocupacao(3, null))).toBe('3 (sem veículo)');
    render(<SeloOcupacao ocupacao={ocupacao(41, 40)} />);
    expect(screen.getByText('Superlotada')).toBeInTheDocument();
  });

  it.each([[20, 'Folgada'], [40, 'No limite'], [41, 'Superlotada']])('%i de 40 → %s', (n, rotulo) => {
    render(<SeloOcupacao ocupacao={ocupacao(n, 40)} />);
    expect(screen.getByText(rotulo)).toBeInTheDocument();
  });

  it('rota sem veículo é pendência', () => {
    render(<SeloOcupacao ocupacao={ocupacao(0, null)} />);
    expect(screen.getByText('Sem veículo')).toBeInTheDocument();
  });
});

describe('Alunos da rota', () => {
  it('lista os alunos com a ocupação e os avisos', async () => {
    api.alunosDaRota.mockResolvedValue({ data: [alocacao({ avisos: ['turno_divergente'], necessidade_especial: true })], ocupacao: ocupacao(1) });
    render(<AlunosDaRota rota={rota()} opcoes={opcoes()} avisar={vi.fn()} aoFechar={vi.fn()} />);

    expect(await screen.findByText('ANA CLARA')).toBeInTheDocument();
    expect(screen.getByText('1 de 2 (50%)')).toBeInTheDocument();
    expect(screen.getByText('Turno da turma diferente do turno da rota')).toBeInTheDocument();
    expect(screen.getByText('Necessidade especial')).toBeInTheDocument();
    expect(screen.getByText('Ponte do Rio')).toBeInTheDocument();
  });

  it('consulta não vê alocar nem as ações', async () => {
    api.alunosDaRota.mockResolvedValue({ data: [alocacao()], ocupacao: ocupacao(1) });
    render(<AlunosDaRota rota={rota()} opcoes={opcoes({ gerenciar_alocacoes: false })} avisar={vi.fn()} aoFechar={vi.fn()} />);

    expect(await screen.findByText('ANA CLARA')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Alocar aluno/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ações de/ })).not.toBeInTheDocument();
  });

  it('busca o aluno, escolhe e envia a alocação', async () => {
    api.alunosDaRota.mockResolvedValue({ data: [], ocupacao: ocupacao(0) });
    api.buscarAlunos.mockResolvedValue([{ id: 9, nome: 'BETO LIMA', cgm: '1', escola: 'Escola Rio Claro', turma: '5º A', turno: 'Manhã' }]);
    api.alocar.mockResolvedValue(alocacao());
    render(<AlunosDaRota rota={rota()} opcoes={opcoes()} avisar={vi.fn()} aoFechar={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: /Alocar aluno/ }));
    fireEvent.change(await screen.findByLabelText('Buscar por nome ou CGM'), { target: { value: 'Bet' } });
    fireEvent.click(screen.getByRole('button', { name: /^Buscar$/ }));
    fireEvent.click(await screen.findByRole('radio'));
    // Parada do itinerário
    await escolher('Parada *', '1. Ponte do Rio');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(api.alocar).toHaveBeenCalled());
    expect(api.buscarAlunos).toHaveBeenCalledWith(7, 'Bet');
    expect(api.alocar).toHaveBeenCalledWith(7, expect.objectContaining({
      aluno_id: 9, parada_id: 10, poder_publico: null, usa_transporte_rural: true, atendimento_curricular: true, mediacao_didatica: 'presencial', pais_residencia: 'BR', necessidade_especial: false,
    }));
  });

  it('não salva sem aluno e sem parada', async () => {
    api.alunosDaRota.mockResolvedValue({ data: [], ocupacao: ocupacao(0) });
    render(<AlunosDaRota rota={rota()} opcoes={opcoes()} avisar={vi.fn()} aoFechar={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: /Alocar aluno/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Busque e escolha o aluno.')).toBeInTheDocument();
    expect(api.alocar).not.toHaveBeenCalled();
  });

  it('rota lotada sem permissão de exceção avisa e não oferece justificativa', async () => {
    api.alunosDaRota.mockResolvedValue({ data: [], ocupacao: ocupacao(2, 2) });
    render(<AlunosDaRota rota={rota({ ocupacao: ocupacao(2, 2) })} opcoes={opcoes()} avisar={vi.fn()} aoFechar={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: /Alocar aluno/ }));

    expect(await screen.findByText(/A rota está lotada \(2 de 2\)/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Justificativa/)).not.toBeInTheDocument();
  });

  it('rota lotada com permissão de exceção exige a justificativa', async () => {
    api.alunosDaRota.mockResolvedValue({ data: [], ocupacao: ocupacao(2, 2) });
    api.buscarAlunos.mockResolvedValue([{ id: 9, nome: 'BETO LIMA', cgm: null, escola: null, turma: null, turno: null }]);
    render(<AlunosDaRota rota={rota({ ocupacao: ocupacao(2, 2) })} opcoes={opcoes({ exceder_capacidade: true })} avisar={vi.fn()} aoFechar={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: /Alocar aluno/ }));
    fireEvent.change(await screen.findByLabelText('Buscar por nome ou CGM'), { target: { value: 'Bet' } });
    fireEvent.click(screen.getByRole('button', { name: /^Buscar$/ }));
    fireEvent.click(await screen.findByRole('radio'));
    await escolher('Parada *', '1. Ponte do Rio');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('A rota está lotada: informe a justificativa para alocar acima da capacidade.')).toBeInTheDocument();
    expect(api.alocar).not.toHaveBeenCalled();
  });

  it('erro de capacidade da API aparece no formulário', async () => {
    api.alunosDaRota.mockResolvedValue({ data: [], ocupacao: ocupacao(1) });
    api.buscarAlunos.mockResolvedValue([{ id: 9, nome: 'BETO LIMA', cgm: null, escola: null, turma: null, turno: null }]);
    api.alocar.mockRejectedValue({ response: { status: 409, data: { error: 'Capacidade do veículo esgotada: 2 lugares e 2 alunos alocados.' } } });
    render(<AlunosDaRota rota={rota()} opcoes={opcoes()} avisar={vi.fn()} aoFechar={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: /Alocar aluno/ }));
    fireEvent.change(await screen.findByLabelText('Buscar por nome ou CGM'), { target: { value: 'Bet' } });
    fireEvent.click(screen.getByRole('button', { name: /^Buscar$/ }));
    fireEvent.click(await screen.findByRole('radio'));
    await escolher('Parada *', '1. Ponte do Rio');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Capacidade do veículo esgotada: 2 lugares e 2 alunos alocados.')).toBeInTheDocument();
  });

  it('encerrar pede data e motivo e chama a API', async () => {
    api.alunosDaRota.mockResolvedValue({ data: [alocacao()], ocupacao: ocupacao(1) });
    api.encerrarAlocacao.mockResolvedValue(alocacao({ ativa: false }));
    render(<AlunosDaRota rota={rota()} opcoes={opcoes()} avisar={vi.fn()} aoFechar={vi.fn()} />);

    fireEvent.keyDown(await screen.findByRole('button', { name: 'Ações de ANA CLARA' }), { key: 'Enter' });
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Encerrar' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Encerrar' }));
    expect(await screen.findByText('Informe o motivo do encerramento.')).toBeInTheDocument();
    expect(api.encerrarAlocacao).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Entendi' }));
    fireEvent.change(await screen.findByLabelText('Motivo *'), { target: { value: 'Mudou de endereço' } });
    fireEvent.click(screen.getByRole('button', { name: 'Encerrar' }));

    await waitFor(() => expect(api.encerrarAlocacao).toHaveBeenCalledWith(7, 70, expect.objectContaining({ motivo: 'Mudou de endereço' })));
  });

  it('a edição carrega a ficha com a observação sensível', async () => {
    api.alunosDaRota.mockResolvedValue({ data: [alocacao({ necessidade_especial: true })], ocupacao: ocupacao(1) });
    api.alocacao.mockResolvedValue(alocacao({ necessidade_especial: true, necessidade_observacao: 'Cadeirante' }));
    render(<AlunosDaRota rota={rota()} opcoes={opcoes()} avisar={vi.fn()} aoFechar={vi.fn()} />);

    fireEvent.keyDown(await screen.findByRole('button', { name: 'Ações de ANA CLARA' }), { key: 'Enter' });
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Editar' }));

    await waitFor(() => expect(screen.getByLabelText(/Observação da necessidade/)).toHaveValue('Cadeirante'));
    expect(api.alocacao).toHaveBeenCalledWith(7, 70);
  });
});
