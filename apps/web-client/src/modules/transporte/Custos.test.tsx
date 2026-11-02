import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

const api = vi.hoisted(() => ({
  custosRotas: vi.fn(), custoRota: vi.fn(), parametrosCusto: vi.fn(), salvarParametrosCusto: vi.fn(), copiarParametrosCusto: vi.fn(),
  relatorioCustos: vi.fn(), baixarCustos: vi.fn(),
}));
vi.mock('./api', async (original) => ({ ...(await original<typeof import('./api')>()), transporteApi: api }));

import type { CustoRota, Opcoes, ParametroCusto, ParametrosCusto, RelatorioCustos } from './api';
import { Custos } from './components/Custos';

Element.prototype.scrollIntoView ??= () => undefined;
Element.prototype.hasPointerCapture ??= () => false;
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;

const opcoes = (editar = true): Opcoes => ({
  tipos_empresa: [], origens: [], tipos_rede: [], turnos: [], escolas: [{ id: 5, nome: 'Escola Rio Claro' }], anos_letivos: [2026, 2025], veiculos: [],
  caracteristicas_trecho: [], poderes_publicos: [], mediacoes: [], categorias_cnh: [], tipologias: [], empresas: [], motoristas: [],
  permissoes: { gerenciar_frota: true, gerenciar_rotas: true, gerenciar_alocacoes: true, exceder_capacidade: false, exportar_censo: false, importar_censo: false, configurar_leiaute_censo: false, ver_custos: true, gerenciar_parametros_custo: editar, auditar: false },
});

const custo = (extra: Partial<CustoRota> = {}): CustoRota => ({
  rota_id: 7, rota: 'Rota Norte', ano_letivo: 2026, turno: 'manha', escola: 'Escola Rio Claro', escola_id: 5, empresa: null, empresa_id: null, veiculo: 'ABC1D23', origem_veiculo: 'propria',
  custo_contratado_mensal: null, simulado: false, modal: 'rodoviario', completo: true, faltando: [], km_viagem: 20, km_mes: 800, km_ano: 8000, alunos: 10,
  fixo: { pessoal: 4200, administrativo: 420, depreciacao: 2424.24, remuneracao_capital: 2560, seguro: 500 },
  variavel: { combustivel: 1.5, lubrificantes: 0.012, rodagem: 0.216, pecas: 2.5 },
  custo_fixo_mensal: 10104.24, custo_variavel_km: 4.228, custo_mensal: 13486.64, custo_anual: 155074.91, custo_por_km: 19.38, custo_por_dia_letivo: 775.37,
  custo_por_aluno_mes: 1348.66, custo_por_aluno_ano: 15507.49, comparativo: null, ...extra,
});

const incompleto = (): CustoRota => custo({
  rota_id: 8, rota: 'Rota Sul', completo: false, faltando: [{ chave: 'salario_motorista', rotulo: 'Salário médio do motorista' }, { chave: 'ano_fabricacao', rotulo: 'Ano de fabricação do veículo' }],
  custo_mensal: null, custo_anual: null, custo_por_aluno_ano: null, fixo: {}, variavel: {},
});

const parametro = (extra: Partial<ParametroCusto>): ParametroCusto => ({
  chave: 'preco_combustivel', rotulo: 'Preço do combustível', unidade: 'R$/litro', escopo: 'comum', grupo: 'combustivel', min: 0, max: 1000, obrigatorio: true, padrao: null,
  ajuda: 'Preço médio do litro no ano.', valor: null, origem: null, ...extra,
});

const parametros = (): ParametrosCusto => ({
  ano: 2026,
  grupos: { calendario: 'Calendário e percurso', combustivel: 'Combustível e lubrificantes' },
  parametros: [
    parametro({ chave: 'dias_letivos_mes', rotulo: 'Dias letivos por mês', unidade: 'dias', grupo: 'calendario', padrao: 20, valor: 20, origem: 'padrao', ajuda: '' }),
    parametro({}),
    parametro({ chave: 'rod_rendimento_km_l', rotulo: 'Rendimento do veículo', unidade: 'km/litro', escopo: 'rod', valor: 4, origem: 'orgao' }),
  ],
});

const relatorio = (): RelatorioCustos => ({
  ano_letivo: 2026, linhas: [custo()],
  por_escola: [{ id: 5, nome: 'Escola Rio Claro', rotas: 2, incompletas: 1, alunos: 10, custo_anual: 155074.91, custo_por_aluno_ano: 15507.49 }],
  por_empresa: [{ id: null, nome: 'Sem empresa', rotas: 2, incompletas: 1, alunos: 10, custo_anual: 155074.91, custo_por_aluno_ano: 15507.49 }],
  totais: { rotas: 2, completas: 1, incompletas: 1, custo_anual: 155074.91, alunos: 10, custo_por_aluno_ano: 15507.49 },
});

const moeda = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v).replace(/\s/g, ' ');

beforeEach(() => {
  vi.clearAllMocks();
  api.custosRotas.mockResolvedValue([custo(), incompleto()]);
  api.parametrosCusto.mockResolvedValue(parametros());
  api.relatorioCustos.mockResolvedValue(relatorio());
});

describe('Custo das rotas', () => {
  it('avisa que é estimativa não conferida com a planilha oficial', async () => {
    render(<Custos opcoes={opcoes()} avisar={vi.fn()} />);

    expect(await screen.findByText(/não foi conferido com a planilha oficial/)).toBeInTheDocument();
  });

  it('lista as rotas com o cálculo completo e o incompleto', async () => {
    render(<Custos opcoes={opcoes()} avisar={vi.fn()} />);

    expect(await screen.findByText('Rota Norte')).toBeInTheDocument();
    expect(screen.getByText('Completo')).toBeInTheDocument();
    expect(screen.getByText('Incompleto (2)')).toBeInTheDocument();
    expect(api.custosRotas).toHaveBeenCalledWith(2026, undefined);
  });

  it('o detalhe mostra fixo, variável e totais', async () => {
    api.custoRota.mockResolvedValue(custo());
    render(<Custos opcoes={opcoes()} avisar={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Detalhar o custo de Rota Norte' }));

    const modal = await screen.findByRole('dialog');
    expect(await within(modal).findByText('Depreciação do veículo')).toBeInTheDocument();
    expect(within(modal).getByText('Rodagem (pneus e recapagem)')).toBeInTheDocument();
    expect(within(modal).getAllByText(moeda(13486.64)).length).toBeGreaterThan(0);
    expect(within(modal).getAllByText(moeda(15507.49)).length).toBeGreaterThan(0);
  });

  it('rota incompleta lista o que falta e não mostra totais', async () => {
    api.custoRota.mockResolvedValue(incompleto());
    render(<Custos opcoes={opcoes()} avisar={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Detalhar o custo de Rota Sul' }));

    const modal = await screen.findByRole('dialog');
    expect(await within(modal).findByText('Cálculo incompleto.', { exact: false })).toBeInTheDocument();
    expect(within(modal).getByText('Salário médio do motorista')).toBeInTheDocument();
    expect(within(modal).getByText('Ano de fabricação do veículo')).toBeInTheDocument();
    expect(within(modal).queryByText('Custo no mês')).not.toBeInTheDocument();
  });

  it('mostra o contratado, a diferença e o alerta de limite', async () => {
    api.custoRota.mockResolvedValue(custo({ custo_contratado_mensal: 16500, comparativo: { contratado: 16500, estimado: 13486.64, diferenca: 3013.36, percentual: 22.3, acima_do_limite: true } }));
    render(<Custos opcoes={opcoes()} avisar={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Detalhar o custo de Rota Norte' }));

    const regiao = await screen.findByRole('region', { name: 'Contratado e estimado' });
    expect(within(regiao).getByText(moeda(3013.36))).toBeInTheDocument();
    expect(within(regiao).getByText('Contrato acima do limite')).toBeInTheDocument();
  });

  it('simular pede o parâmetro e o valor antes de calcular', async () => {
    api.custoRota.mockImplementation(async (_id: number, simular?: Record<string, string>) => custo(simular && Object.keys(simular).length > 0 ? { simulado: true, custo_mensal: 14000 } : {}));
    render(<Custos opcoes={opcoes()} avisar={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Detalhar o custo de Rota Norte' }));
    const modal = await screen.findByRole('dialog');
    await within(modal).findByText('Depreciação do veículo');

    // Sem parâmetro escolhido, a simulação pede os dois campos.
    fireEvent.click(within(modal).getByRole('button', { name: 'Simular' }));
    expect(await within(modal).findByText('Escolha o parâmetro e informe o valor da simulação.')).toBeInTheDocument();
    expect(api.salvarParametrosCusto).not.toHaveBeenCalled();
  });
});

describe('Parâmetros de custo', () => {
  const abrir = async (editar = true) => {
    render(<Custos opcoes={opcoes(editar)} avisar={vi.fn()} />);
    fireEvent.mouseDown(await screen.findByRole('tab', { name: 'Parâmetros' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Parâmetros' }));
  };

  it('mostra os grupos, o padrão do calendário e deixa em branco o que é dado do órgão', async () => {
    await abrir();

    expect(await screen.findByText('Calendário e percurso')).toBeInTheDocument();
    expect(screen.getByLabelText('Dias letivos por mês * (dias)')).toHaveValue('20');
    expect(screen.getByText('padrão')).toBeInTheDocument();
    expect(screen.getByLabelText('Preço do combustível * (R$/litro)')).toHaveValue('');
    expect(screen.getByRole('button', { name: /Salvar parâmetros de 2026/ })).toBeDisabled();
  });

  it('salva só o que foi alterado; campo apagado volta ao padrão', async () => {
    api.salvarParametrosCusto.mockResolvedValue(parametros());
    await abrir();

    fireEvent.change(await screen.findByLabelText('Preço do combustível * (R$/litro)'), { target: { value: '6,25' } });
    fireEvent.change(screen.getByLabelText('Dias letivos por mês * (dias)'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /Salvar parâmetros de 2026/ }));

    await waitFor(() => expect(api.salvarParametrosCusto).toHaveBeenCalledWith(2026, { preco_combustivel: '6,25', dias_letivos_mes: null }));
  });

  it('mostra o erro de faixa devolvido pela API', async () => {
    api.salvarParametrosCusto.mockRejectedValue({ response: { status: 422, data: { error: '"Encargos sociais" deve ficar entre 0 e 300 (%).' } } });
    await abrir();

    fireEvent.change(await screen.findByLabelText('Preço do combustível * (R$/litro)'), { target: { value: '-1' } });
    fireEvent.click(screen.getByRole('button', { name: /Salvar parâmetros de 2026/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('deve ficar entre');
  });

  it('quem só consulta vê os campos bloqueados e sem salvar', async () => {
    await abrir(false);

    expect(await screen.findByLabelText('Preço do combustível * (R$/litro)')).toBeDisabled();
    expect(screen.queryByRole('button', { name: /Salvar parâmetros/ })).not.toBeInTheDocument();
    expect(screen.getByText(/não alterá-los/)).toBeInTheDocument();
  });

  it('copiar para um ano que já tem valores pede confirmação para sobrescrever', async () => {
    api.copiarParametrosCusto.mockRejectedValueOnce({ response: { status: 409, data: { error: '2026 já tem parâmetros.' } } }).mockResolvedValueOnce(5);
    await abrir();

    fireEvent.click(await screen.findByRole('button', { name: /Copiar para 2026/ }));
    expect(api.copiarParametrosCusto).toHaveBeenCalledWith(2025, 2026, false);
    fireEvent.click(await screen.findByRole('button', { name: 'Sobrescrever' }));

    await waitFor(() => expect(api.copiarParametrosCusto).toHaveBeenLastCalledWith(2025, 2026, true));
  });
});

describe('Relatório de custos', () => {
  const abrir = async () => {
    render(<Custos opcoes={opcoes()} avisar={vi.fn()} />);
    fireEvent.mouseDown(await screen.findByRole('tab', { name: 'Relatório' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Relatório' }));
  };

  it('totaliza e agrupa por escola e por empresa, avisando das rotas incompletas', async () => {
    await abrir();

    expect(await screen.findByText('Por escola')).toBeInTheDocument();
    expect(screen.getByText('Por empresa')).toBeInTheDocument();
    expect(screen.getByText('Escola Rio Claro')).toBeInTheDocument();
    expect(screen.getByText('Sem empresa')).toBeInTheDocument();
    expect(screen.getByText(/1 rota\(s\) com cálculo incompleto não entram nos totais/)).toBeInTheDocument();
  });

  it('baixa o CSV do ano', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    api.baixarCustos.mockResolvedValue({ blob: new Blob(['x']), nome: 'transporte-custos-2026.csv' });
    await abrir();

    fireEvent.click(await screen.findByRole('button', { name: /Baixar CSV/ }));

    await waitFor(() => expect(api.baixarCustos).toHaveBeenCalledWith(2026));
  });
});
