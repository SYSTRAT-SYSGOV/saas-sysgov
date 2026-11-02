import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

const api = vi.hoisted(() => ({
  ordensServico: vi.fn(), salvarOrdemServico: vi.fn(), concluirOrdemServico: vi.fn(), cancelarOrdemServico: vi.fn(),
  manutencoesPrevistas: vi.fn(), criarManutencaoPrevista: vi.fn(), cancelarManutencaoPrevista: vi.fn(), converterManutencaoPrevista: vi.fn(),
  veiculos: vi.fn(), registrarQuilometragem: vi.fn(), fornecedores: vi.fn(), salvarFornecedor: vi.fn(), excluirFornecedor: vi.fn(),
  gastosManutencao: vi.fn(), baixarManutencao: vi.fn(), historicoManutencao: vi.fn(),
}));
vi.mock('./api', async (original) => ({ ...(await original<typeof import('./api')>()), transporteApi: api }));

import type { Alerta, Fornecedor, GastosManutencao, ManutencaoPrevista, Opcoes, OrdemServico, Veiculo } from './api';
import { Manutencao } from './components/Manutencao';
import { TabelaAlertas } from './components/VisaoGeral';

Element.prototype.scrollIntoView ??= () => undefined;
Element.prototype.hasPointerCapture ??= () => false;
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;

const opcoes = (gerir = true): Opcoes => ({
  tipos_empresa: [], origens: [], tipos_rede: [], turnos: [], escolas: [], anos_letivos: [2026], veiculos: [{ id: 1, placa: 'ABC1D23', descricao: 'Ônibus 01', origem: 'propria' }],
  caracteristicas_trecho: [], ramos_fornecedor: [{ valor: 'mecanica', rotulo: 'Mecânica' }, { valor: 'seguro', rotulo: 'Seguro' }],
  tipos_servico: [{ valor: 'corretiva', rotulo: 'Corretiva' }, { valor: 'revisao', rotulo: 'Revisão' }],
  poderes_publicos: [], mediacoes: [], categorias_cnh: [], tipologias: [], empresas: [], motoristas: [],
  permissoes: { gerenciar_frota: true, gerenciar_rotas: true, gerenciar_alocacoes: true, exceder_capacidade: false, exportar_censo: false, importar_censo: false, configurar_leiaute_censo: false, ver_custos: false, gerenciar_parametros_custo: false, ver_manutencao: true, gerenciar_manutencao: gerir, auditar: false },
});

const ordem = (extra: Partial<OrdemServico> = {}): OrdemServico => ({
  id: 3, veiculo: { id: 1, placa: 'ABC1D23', descricao: 'Ônibus 01' }, fornecedor: { id: 9, nome: 'Oficina Central Ltda' }, tipo: 'corretiva', tipo_rotulo: 'Corretiva',
  descricao: 'Troca da embreagem', status: 'aberta', status_rotulo: 'Aberta', aberta_em: '2026-10-28', concluida_em: null, km: null, valor: null, motivo_cancelamento: null, ...extra,
});

const veiculo = (extra: Partial<Veiculo> = {}): Veiculo => ({
  id: 1, origem: 'propria', origem_rotulo: 'Própria', empresa: null, motorista_padrao: null, descricao: 'Ônibus 01', placa: 'ABC1D23', renavam: null, chassi: null, marca_modelo: null,
  ano_fabricacao: 2021, ano_modelo: null, data_licenca: null, capacidade: 40, tipo_rede: 'rural', tipologia_inep: 3, tipologia_rotulo: 'Ônibus', uso_exclusivo: true, acessivel: false,
  ativo: true, motivo_inativacao: null, vistoria_validade: null, regular: true, motivos_irregularidade: [], observacoes: null, km_atual: 40000, km_atualizado_em: '2026-10-30T10:00:00-03:00', em_manutencao: false, ...extra,
});

const fornecedor = (extra: Partial<Fornecedor> = {}): Fornecedor => ({
  id: 9, pessoa_id: 4, nome: 'Oficina Central Ltda', nome_fantasia: null, cnpj_mascarado: '11.222.333/0001-81', ramos: ['mecanica'], ramos_rotulos: ['Mecânica'], contato: null, ativo: true, observacoes: null, ...extra,
});

const prevista = (extra: Partial<ManutencaoPrevista> = {}): ManutencaoPrevista => ({
  id: 5, veiculo: { id: 1, placa: 'ABC1D23', descricao: 'Ônibus 01' }, descricao: 'Revisão dos freios', data_prevista: '2026-11-20', km_previsto: 50000, km_atual: 49600,
  km_restante: 400, dias_restantes: 18, status: 'pendente', ordem_servico_id: null, ...extra,
});

const pagina = <T,>(data: T[]) => ({ data, current_page: 1, last_page: 1, total: data.length });

beforeEach(() => {
  vi.clearAllMocks();
  api.ordensServico.mockResolvedValue(pagina([ordem()]));
  api.fornecedores.mockResolvedValue([fornecedor()]);
  api.veiculos.mockResolvedValue([veiculo()]);
  api.manutencoesPrevistas.mockResolvedValue([prevista()]);
});

const abrirAba = (nome: string) => {
  fireEvent.mouseDown(screen.getByRole('tab', { name: nome }));
  fireEvent.click(screen.getByRole('tab', { name: nome }));
};

describe('Ordens de serviço', () => {
  it('lista as abertas por padrão e quem só consulta não vê as ações', async () => {
    render(<Manutencao opcoes={opcoes(false)} avisar={vi.fn()} />);

    expect(await screen.findByText('Troca da embreagem')).toBeInTheDocument();
    expect(api.ordensServico).toHaveBeenCalledWith({ status: 'aberta', page: 1 });
    expect(screen.queryByRole('button', { name: /Nova ordem de serviço/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ações da ordem/ })).not.toBeInTheDocument();
  });

  it('exige veículo e descrição antes de abrir a ordem', async () => {
    render(<Manutencao opcoes={opcoes()} avisar={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: /Nova ordem de serviço/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Escolha o veículo.')).toBeInTheDocument();
    expect(screen.getByText(/Descreva o serviço/)).toBeInTheDocument();
    expect(api.salvarOrdemServico).not.toHaveBeenCalled();
  });

  it('concluir envia data, quilometragem e valor; o erro da API aparece no formulário', async () => {
    api.concluirOrdemServico.mockRejectedValueOnce({ response: { status: 422, data: { error: 'A quilometragem informada (39000 km) é menor que a atual do veículo (40000 km).' } } })
      .mockResolvedValueOnce(ordem({ status: 'concluida' }));
    render(<Manutencao opcoes={opcoes()} avisar={vi.fn()} />);
    fireEvent.keyDown(await screen.findByRole('button', { name: 'Ações da ordem 3' }), { key: 'Enter' });
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Concluir' }));

    const modal = await screen.findByRole('dialog');
    fireEvent.change(within(modal).getByLabelText('Quilometragem do veículo (km)'), { target: { value: '39000' } });
    fireEvent.change(within(modal).getByLabelText('Valor final (R$)'), { target: { value: '1850,5' } });
    fireEvent.click(within(modal).getByRole('button', { name: 'Concluir ordem' }));
    expect(await within(modal).findByRole('alert')).toHaveTextContent('menor que a atual');

    fireEvent.change(within(modal).getByLabelText('Quilometragem do veículo (km)'), { target: { value: '41200' } });
    fireEvent.click(within(modal).getByRole('button', { name: 'Concluir ordem' }));

    await waitFor(() => expect(api.concluirOrdemServico).toHaveBeenLastCalledWith(3, expect.objectContaining({ km: 41200, valor: 1850.5 })));
  });

  it('o formulário da ordem pede veículo, serviço, quilometragem e valor previsto', async () => {
    render(<Manutencao opcoes={opcoes()} avisar={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: /Nova ordem de serviço/ }));
    const modal = await screen.findByRole('dialog');
    fireEvent.change(within(modal).getByLabelText('Serviço *'), { target: { value: 'Revisão geral dos 40 mil' } });
    fireEvent.change(within(modal).getByLabelText('Valor previsto (R$)'), { target: { value: '900' } });
    expect(within(modal).getByText('Veículo *')).toBeInTheDocument();
    expect(within(modal).getByLabelText('Quilometragem (km)')).toBeInTheDocument();
    expect(within(modal).getByLabelText('Valor previsto (R$)')).toHaveValue('900');
  });
});

describe('Manutenção prevista', () => {
  it('mostra a previsão com o prazo em dias e em km', async () => {
    render(<Manutencao opcoes={opcoes()} avisar={vi.fn()} />);
    abrirAba('Manutenção prevista');

    expect(await screen.findByText('Revisão dos freios')).toBeInTheDocument();
    expect(screen.getByText(/em 18 dias/)).toBeInTheDocument();
    expect(screen.getByText(/faltam 400 km/)).toBeInTheDocument();
    expect(screen.getByText('No prazo')).toBeInTheDocument();
  });

  it('previsão vencida por quilometragem aparece como vencida', async () => {
    api.manutencoesPrevistas.mockResolvedValue([prevista({ data_prevista: null, dias_restantes: null, km_restante: -600 })]);
    render(<Manutencao opcoes={opcoes()} avisar={vi.fn()} />);
    abrirAba('Manutenção prevista');

    expect(await screen.findByText('Vencida')).toBeInTheDocument();
    expect(screen.getByText(/passou 600 km/)).toBeInTheDocument();
  });

  it('exige data ou quilometragem ao registrar', async () => {
    render(<Manutencao opcoes={opcoes()} avisar={vi.fn()} />);
    abrirAba('Manutenção prevista');
    fireEvent.click(await screen.findByRole('button', { name: /Registrar previsão/ }));
    const modal = await screen.findByRole('dialog');
    fireEvent.change(within(modal).getByLabelText('Manutenção *'), { target: { value: 'Troca de óleo' } });
    fireEvent.click(within(modal).getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText(/Informe a data prevista, a quilometragem prevista ou as duas/)).toBeInTheDocument();
    expect(api.criarManutencaoPrevista).not.toHaveBeenCalled();
  });

  it('converter abre a ordem preventiva pela API', async () => {
    api.converterManutencaoPrevista.mockResolvedValue(ordem());
    render(<Manutencao opcoes={opcoes()} avisar={vi.fn()} />);
    abrirAba('Manutenção prevista');
    fireEvent.keyDown(await screen.findByRole('button', { name: 'Ações da previsão Revisão dos freios' }), { key: 'Enter' });
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Converter em ordem' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Abrir ordem de serviço' }));

    await waitFor(() => expect(api.converterManutencaoPrevista).toHaveBeenCalledWith(5, null));
  });
});

describe('Quilometragem', () => {
  it('lista o hodômetro e o veículo em manutenção', async () => {
    api.veiculos.mockResolvedValue([veiculo(), veiculo({ id: 2, placa: 'XYZ9K88', km_atual: null, km_atualizado_em: null, em_manutencao: true })]);
    render(<Manutencao opcoes={opcoes()} avisar={vi.fn()} />);
    abrirAba('Quilometragem');

    expect(await screen.findByText('40.000 km')).toBeInTheDocument();
    expect(screen.getByText('não informada')).toBeInTheDocument();
    expect(screen.getByText('Em manutenção')).toBeInTheDocument();
  });

  it('abre o histórico de manutenção do veículo com o total das ordens concluídas', async () => {
    api.veiculos.mockResolvedValue([veiculo()]);
    api.historicoManutencao.mockResolvedValue([
      { id: 5, tipo: 'revisao', tipo_rotulo: 'Revisão', status: 'concluida', descricao: 'Revisão dos 40 mil km', fornecedor: 'Oficina Central Ltda', aberta_em: '2026-10-01', concluida_em: '2026-10-03', km: 40000, valor: 1500.5 },
      { id: 4, tipo: 'corretiva', tipo_rotulo: 'Corretiva', status: 'aberta', descricao: 'Troca da embreagem', fornecedor: null, aberta_em: '2026-09-20', concluida_em: null, km: null, valor: 900 },
      { id: 3, tipo: 'corretiva', tipo_rotulo: 'Corretiva', status: 'cancelada', descricao: 'Pintura', fornecedor: null, aberta_em: '2026-08-02', concluida_em: null, km: null, valor: 300 },
    ]);
    render(<Manutencao opcoes={opcoes(false)} avisar={vi.fn()} />);
    abrirAba('Quilometragem');
    fireEvent.click(await screen.findByRole('button', { name: 'Histórico de manutenção de ABC1D23' }));

    const modal = await screen.findByRole('dialog');
    expect(await within(modal).findByText('Revisão dos 40 mil km')).toBeInTheDocument();
    expect(api.historicoManutencao).toHaveBeenCalledWith(1);
    expect(within(modal).getByText('Troca da embreagem')).toBeInTheDocument();
    // só a ordem concluída entra no total (a aberta e a cancelada não)
    expect(within(modal).getByText(/Total gasto em ordens concluídas/)).toHaveTextContent('R$ 1.500,50');
  });

  it('veículo sem ordens mostra o estado vazio do histórico', async () => {
    api.veiculos.mockResolvedValue([veiculo()]);
    api.historicoManutencao.mockResolvedValue([]);
    render(<Manutencao opcoes={opcoes()} avisar={vi.fn()} />);
    abrirAba('Quilometragem');
    fireEvent.click(await screen.findByRole('button', { name: 'Histórico de manutenção de ABC1D23' }));

    expect(await screen.findByText('Este veículo ainda não tem ordens de serviço.')).toBeInTheDocument();
  });

  it('reduzir o hodômetro pede a confirmação da correção', async () => {
    api.registrarQuilometragem.mockRejectedValueOnce({ response: { status: 422, data: { error: 'A quilometragem informada (38000 km) é menor que a atual (40000 km). Confirme a correção do hodômetro para reduzi-la.' } } })
      .mockResolvedValueOnce({ id: 1, km_atual: 38000 });
    render(<Manutencao opcoes={opcoes()} avisar={vi.fn()} />);
    abrirAba('Quilometragem');
    fireEvent.click(await screen.findByRole('button', { name: 'Registrar quilometragem de ABC1D23' }));

    const modal = await screen.findByRole('dialog');
    fireEvent.change(within(modal).getByLabelText('Quilometragem atual (km) *'), { target: { value: '38000' } });
    expect(within(modal).getByText(/correção do hodômetro/)).toBeInTheDocument();
    fireEvent.click(within(modal).getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(api.registrarQuilometragem).toHaveBeenCalledWith(1, 38000, false));
    expect(await within(modal).findByRole('alert')).toHaveTextContent('Confirme a correção do hodômetro');

    fireEvent.click(within(modal).getByRole('switch', { name: 'Confirmar correção do hodômetro' }));
    fireEvent.click(within(modal).getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(api.registrarQuilometragem).toHaveBeenLastCalledWith(1, 38000, true));
  });
});

describe('Fornecedores', () => {
  it('lista com ramos e exige ao menos um ramo ao cadastrar', async () => {
    render(<Manutencao opcoes={opcoes()} avisar={vi.fn()} />);
    abrirAba('Fornecedores');

    expect(await screen.findByText('Oficina Central Ltda')).toBeInTheDocument();
    expect(screen.getByText('Mecânica')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Novo fornecedor/ }));
    const modal = await screen.findByRole('dialog');
    fireEvent.change(within(modal).getByLabelText('CNPJ *'), { target: { value: '11222333000181' } });
    fireEvent.change(within(modal).getByLabelText('Razão social *'), { target: { value: 'Posto Central' } });
    fireEvent.click(within(modal).getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Marque ao menos um ramo de atuação.')).toBeInTheDocument();
    expect(api.salvarFornecedor).not.toHaveBeenCalled();
  });

  it('envia o fornecedor com os ramos marcados', async () => {
    api.salvarFornecedor.mockResolvedValue(fornecedor());
    render(<Manutencao opcoes={opcoes()} avisar={vi.fn()} />);
    abrirAba('Fornecedores');
    fireEvent.click(await screen.findByRole('button', { name: /Novo fornecedor/ }));
    const modal = await screen.findByRole('dialog');
    fireEvent.change(within(modal).getByLabelText('CNPJ *'), { target: { value: '11222333000181' } });
    fireEvent.change(within(modal).getByLabelText('Razão social *'), { target: { value: 'Seguradora Rio Claro' } });
    fireEvent.click(within(modal).getByLabelText('Seguro'));
    fireEvent.click(within(modal).getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(api.salvarFornecedor).toHaveBeenCalledWith(null, expect.objectContaining({ cnpj: '11222333000181', razao_social: 'Seguradora Rio Claro', ramos: ['seguro'], ativo: true })));
  });

  it('o erro de exclusão (fornecedor com ordens) aparece como aviso', async () => {
    api.excluirFornecedor.mockRejectedValue({ response: { status: 409, data: { error: 'O fornecedor tem ordens de serviço; inative-o em vez de excluir.' } } });
    const avisar = vi.fn();
    render(<Manutencao opcoes={opcoes()} avisar={avisar} />);
    abrirAba('Fornecedores');
    fireEvent.keyDown(await screen.findByRole('button', { name: 'Ações do fornecedor Oficina Central Ltda' }), { key: 'Enter' });
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Excluir' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Excluir' }));

    await waitFor(() => expect(avisar).toHaveBeenCalledWith(expect.objectContaining({ type: 'error', message: expect.stringContaining('inative-o') })));
  });
});

describe('Gastos', () => {
  const gastos = (): GastosManutencao => ({
    ano: 2026, total: 1750.25, ordens: 3,
    por_veiculo: [{ nome: 'ABC1D23 — Ônibus 01', ordens: 2, valor: 1500 }, { nome: 'XYZ9K88 — Van 02', ordens: 1, valor: 250.25 }],
    por_fornecedor: [{ nome: 'Oficina Central Ltda', ordens: 2, valor: 1500 }], por_tipo: [{ nome: 'Corretiva', ordens: 2, valor: 1250.25 }],
  });

  it('totaliza o ano e agrupa por veículo, fornecedor e tipo', async () => {
    api.gastosManutencao.mockResolvedValue(gastos());
    render(<Manutencao opcoes={opcoes()} avisar={vi.fn()} />);
    abrirAba('Gastos');

    expect(await screen.findByText('Por veículo')).toBeInTheDocument();
    expect(screen.getByText('Por fornecedor')).toBeInTheDocument();
    expect(screen.getByText('Por tipo de serviço')).toBeInTheDocument();
    expect(screen.getByText('ABC1D23 — Ônibus 01')).toBeInTheDocument();
    expect(api.gastosManutencao).toHaveBeenCalledWith(2026);
  });

  it('baixa o CSV das ordens do ano', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    api.gastosManutencao.mockResolvedValue(gastos());
    api.baixarManutencao.mockResolvedValue({ blob: new Blob(['x']), nome: 'transporte-manutencao-2026.csv' });
    render(<Manutencao opcoes={opcoes()} avisar={vi.fn()} />);
    abrirAba('Gastos');

    fireEvent.click(await screen.findByRole('button', { name: /Baixar CSV das ordens/ }));

    await waitFor(() => expect(api.baixarManutencao).toHaveBeenCalledWith(2026));
  });
});

describe('Alertas de manutenção no Painel', () => {
  const alerta = (extra: Partial<Alerta>): Alerta => ({ tipo: 'manutencao', gravidade: 'atencao', item_tipo: 'veiculo', item_id: 1, item: 'ABC1D23 — Óleo', data: null, dias: null, km_restante: 400, ...extra });

  it('alerta por quilometragem mostra o que falta em km e não inventa data', () => {
    render(<TabelaAlertas alertas={[alerta({}), alerta({ gravidade: 'critico', item: 'ABC1D23 — Pneus', km_restante: -600 })]} />);

    expect(screen.getByText('faltam 400 km')).toBeInTheDocument();
    expect(screen.getByText('passou 600 km')).toBeInTheDocument();
    expect(screen.getAllByText('Manutenção prevista').length).toBe(2);
  });

  it('alerta por data continua mostrando vencimento e prazo', () => {
    render(<TabelaAlertas alertas={[alerta({ data: '2026-11-20', dias: 18, km_restante: undefined, item: 'ABC1D23 — Freios' })]} />);

    expect(screen.getByText('20/11/2026')).toBeInTheDocument();
    expect(screen.getByText('em 18 dias')).toBeInTheDocument();
  });
});
