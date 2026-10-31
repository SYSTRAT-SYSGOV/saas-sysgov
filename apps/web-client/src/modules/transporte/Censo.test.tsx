import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

const api = vi.hoisted(() => ({
  leiautes: vi.fn(), modelos: vi.fn(), salvarModelo: vi.fn(), excluirModelo: vi.fn(), aplicarModelo: vi.fn(), preValidar: vi.fn(), baixarCenso: vi.fn(), painel: vi.fn(),
}));
vi.mock('./api', async (original) => ({ ...(await original<typeof import('./api')>()), transporteApi: api }));

import type { LeiauteCenso, ModeloExportacao, Opcoes, Painel as PainelDados, PreValidacao } from './api';
import { Censo } from './components/Censo';
import { Painel } from './components/Painel';

Element.prototype.scrollIntoView ??= () => undefined;
Element.prototype.hasPointerCapture ??= () => false;
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;

const opcoes: Opcoes = {
  tipos_empresa: [], origens: [], tipos_rede: [], turnos: [], escolas: [], anos_letivos: [2026, 2025], veiculos: [], poderes_publicos: [], mediacoes: [],
  categorias_cnh: [], tipologias: [], empresas: [], motoristas: [],
  permissoes: { gerenciar_frota: true, gerenciar_rotas: true, gerenciar_alocacoes: true, exceder_capacidade: true, exportar_censo: true, auditar: true },
};

const leiaute: LeiauteCenso = {
  chave: 'basico-1', nome: 'Leiaute básico (CSV)', descricao: 'CSV próprio do SysGov, provisório.',
  campos: [
    { chave: 'aluno_nome', rotulo: 'Nome do aluno', grupo: 'identificacao', origem: 'Escola', obrigatorio: true, sensivel: false, confere: true },
    { chave: 'aluno_cpf', rotulo: 'CPF do aluno', grupo: 'identificacao', origem: 'Escola', obrigatorio: false, sensivel: true, confere: false },
    { chave: 'turma_nome', rotulo: 'Turma', grupo: 'matricula', origem: 'Escola', obrigatorio: false, sensivel: false, confere: true },
    { chave: 'placa', rotulo: 'Placa do veículo', grupo: 'transporte', origem: 'Transporte', obrigatorio: false, sensivel: false, confere: true },
  ],
};

const padrao: ModeloExportacao = { id: 1, nome: 'Registro 60 completo', leiaute: 'basico-1', campos: ['aluno_nome', 'turma_nome', 'placa'], padrao: true };

const prevalidacao = (extra: Partial<PreValidacao> = {}): PreValidacao => ({
  ano_letivo: 2026, leiaute: 'basico-1', approved: true, total_linhas: 3,
  resumo: { sem_alocacao_ativa: 0, rota_sem_veiculo: 0, rural_sem_declaracao: 0, veiculo_nao_adaptado: 0, sem_codigo_inep: 0, campo_sem_dado: 0 },
  pendencias: [], avisos: [], campos_sem_dado: [], campos: ['aluno_nome', 'turma_nome', 'placa'], campos_ignorados: [], ...extra,
});

const avisar = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  api.leiautes.mockResolvedValue([leiaute]);
  api.modelos.mockResolvedValue([padrao]);
});

const renderizar = async () => {
  render(<Censo opcoes={opcoes} avisar={avisar} />);
  await screen.findByRole('checkbox', { name: /Placa do veículo/ });
};

describe('Censo — seleção de campos', () => {
  it('abre com o modelo padrão e os obrigatórios marcados e identificados', async () => {
    await renderizar();

    expect(screen.getByRole('checkbox', { name: /Nome do aluno/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Placa do veículo/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /CPF do aluno/ })).not.toBeChecked();
    expect(screen.getAllByText('exigido pelo leiaute').length).toBeGreaterThan(0);
    expect(screen.getByText(/Este não é o leiaute oficial do Inep/)).toBeInTheDocument();
  });

  it('tentar desmarcar um obrigatório mantém marcado e explica', async () => {
    await renderizar();

    fireEvent.click(screen.getByRole('checkbox', { name: /Nome do aluno/ }));

    expect(screen.getByRole('checkbox', { name: /Nome do aluno/ })).toBeChecked();
    expect(avisar).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('exigido pelo leiaute') }));
  });

  it('desmarcar um opcional tira o campo do envio', async () => {
    api.preValidar.mockResolvedValue(prevalidacao());
    await renderizar();

    fireEvent.click(screen.getByRole('checkbox', { name: /Placa do veículo/ }));
    fireEvent.click(screen.getByRole('button', { name: /Pré-validar/ }));

    await waitFor(() => expect(api.preValidar).toHaveBeenCalled());
    const enviado = api.preValidar.mock.calls[0][0];
    expect(enviado.campos).toContain('aluno_nome');
    expect(enviado.campos).not.toContain('placa');
    expect(enviado.ano_letivo).toBe(2026);
  });

  it('campo sensível pede confirmação e só entra depois dela', async () => {
    api.preValidar.mockResolvedValue(prevalidacao());
    await renderizar();

    fireEvent.click(screen.getByRole('checkbox', { name: /CPF do aluno/ }));
    expect(screen.getByRole('checkbox', { name: /CPF do aluno/, hidden: true })).not.toBeChecked();
    expect(await screen.findByText(/é dado sensível/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar e incluir' }));

    await waitFor(() => expect(screen.getByRole('checkbox', { name: /CPF do aluno/, hidden: true })).toBeChecked());
    fireEvent.click(screen.getByRole('button', { name: /Pré-validar/ }));
    await waitFor(() => expect(api.preValidar).toHaveBeenCalled());
    expect(api.preValidar.mock.calls[0][0].campos).toContain('aluno_cpf');
    expect(api.preValidar.mock.calls[0][0].confirmar_sensiveis).toEqual(['aluno_cpf']);
  });

  it('limpar deixa só os obrigatórios', async () => {
    api.preValidar.mockResolvedValue(prevalidacao());
    await renderizar();

    fireEvent.click(screen.getByRole('button', { name: 'Limpar' }));
    fireEvent.click(screen.getByRole('button', { name: /Pré-validar/ }));

    await waitFor(() => expect(api.preValidar).toHaveBeenCalled());
    expect(api.preValidar.mock.calls[0][0].campos).toEqual(['aluno_nome']);
  });

  it('a busca filtra os campos pelo rótulo', async () => {
    await renderizar();

    fireEvent.change(screen.getByLabelText('Buscar campo'), { target: { value: 'placa' } });

    expect(screen.getByRole('checkbox', { name: /Placa do veículo/ })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /Turma/ })).not.toBeInTheDocument();
  });
});

describe('Censo — pré-validação e arquivos', () => {
  it('lista as pendências com texto e os avisos sem bloquear', async () => {
    api.preValidar.mockResolvedValue(prevalidacao({
      approved: false,
      pendencias: [{ tipo: 'rota_sem_veiculo', aluno_id: 1, aluno: 'ANA CLARA', rota: 'Rota Norte' }, { tipo: 'campo_sem_dado', aluno_id: null, aluno: null, rota: null, campo: 'placa', rotulo: 'Placa do veículo' }],
      avisos: [{ tipo: 'turno_divergente', aluno_id: 2, aluno: 'BETO', rota: 'Rota Norte' }],
    }));
    await renderizar();

    fireEvent.click(screen.getByRole('button', { name: /Pré-validar/ }));

    const regiao = await screen.findByRole('region', { name: 'Resultado da pré-validação' });
    expect(within(regiao).getByText('2 pendência(s)')).toBeInTheDocument();
    expect(within(regiao).getByText('Rota sem veículo')).toBeInTheDocument();
    expect(within(regiao).getByText(/ANA CLARA \(rota Rota Norte\)/)).toBeInTheDocument();
    expect(within(regiao).getByText('Campo selecionado sem dado cadastrado')).toBeInTheDocument();
    expect(within(regiao).getByText(/Turno da turma diferente do turno da rota: BETO/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Gerar arquivo do Censo/ })).toBeEnabled();
  });

  it('sem pendências mostra o selo de aprovado', async () => {
    api.preValidar.mockResolvedValue(prevalidacao());
    await renderizar();

    fireEvent.click(screen.getByRole('button', { name: /Pré-validar/ }));

    expect(await screen.findByText('Sem pendências')).toBeInTheDocument();
  });

  it('gerar o arquivo e o CSV de conferência chama a API com a seleção e entrega o download', async () => {
    const criar = vi.fn(() => 'blob:x');
    URL.createObjectURL = criar;
    URL.revokeObjectURL = vi.fn();
    api.baixarCenso.mockResolvedValue({ blob: new Blob(['x']), nome: 'transporte-censo-2026-basico-1.csv' });
    await renderizar();

    fireEvent.click(screen.getByRole('button', { name: /Gerar arquivo do Censo/ }));
    await waitFor(() => expect(api.baixarCenso).toHaveBeenCalledWith('arquivo', expect.objectContaining({ ano_letivo: 2026, leiaute: 'basico-1' })));
    fireEvent.click(screen.getByRole('button', { name: /CSV de conferência/ }));
    await waitFor(() => expect(api.baixarCenso).toHaveBeenCalledWith('conferencia', expect.anything()));
    expect(criar).toHaveBeenCalledTimes(2);
  });

  it('erro da API aparece como aviso', async () => {
    api.baixarCenso.mockRejectedValue({ response: { status: 422, data: { error: 'O campo sensível "CPF do aluno" exige confirmação explícita.' } } });
    await renderizar();

    fireEvent.click(screen.getByRole('button', { name: /Gerar arquivo do Censo/ }));

    await waitFor(() => expect(avisar).toHaveBeenCalledWith(expect.objectContaining({ type: 'error', message: expect.stringContaining('exige confirmação') })));
  });
});

describe('Censo — modelos', () => {
  it('salva a seleção atual com um nome', async () => {
    api.salvarModelo.mockResolvedValue({ id: 2, nome: 'Conferência da Secretaria', leiaute: 'basico-1', campos: [], padrao: false });
    await renderizar();

    fireEvent.change(screen.getByLabelText('Salvar a seleção como'), { target: { value: 'Conferência da Secretaria' } });
    fireEvent.click(screen.getByRole('button', { name: /Salvar modelo/ }));

    await waitFor(() => expect(api.salvarModelo).toHaveBeenCalledWith(null, expect.objectContaining({ nome: 'Conferência da Secretaria', leiaute: 'basico-1', campos: expect.arrayContaining(['aluno_nome', 'placa']) })));
  });

  it('reaplicar um modelo avisa dos campos que o leiaute não tem', async () => {
    const meu: ModeloExportacao = { id: 2, nome: 'Antigo', leiaute: 'basico-1', campos: ['aluno_nome', 'campo_velho'], padrao: false };
    api.modelos.mockResolvedValue([padrao, meu]);
    api.aplicarModelo.mockResolvedValue({ campos: ['aluno_nome'], ignorados: ['campo_velho'] });
    await renderizar();

    const gatilho = within(screen.getByText('Modelo').parentElement as HTMLElement).getByRole('combobox');
    fireEvent.keyDown(gatilho, { key: 'Enter' });
    fireEvent.click(await screen.findByRole('option', { name: 'Antigo' }));

    await waitFor(() => expect(api.aplicarModelo).toHaveBeenCalledWith(2, 'basico-1'));
    await waitFor(() => expect(avisar).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('campo_velho') })));
    expect(screen.getByRole('checkbox', { name: /Placa do veículo/ })).not.toBeChecked();
  });

  it('o modelo padrão não tem o botão de excluir', async () => {
    await renderizar();

    expect(screen.queryByRole('button', { name: /Excluir modelo/ })).not.toBeInTheDocument();
  });
});

describe('Painel', () => {
  const painel = (extra: Partial<PainelDados> = {}): PainelDados => ({
    ano_letivo: 2026,
    indicadores: { rotas_ativas: 3, veiculos_ativos: 4, alunos_transportados: 25, ocupacao_media: 61.5, rotas_superlotadas: 1, rotas_sem_veiculo: 1 },
    rotas: [
      { id: 1, nome: 'Rota Vermelha', escola: 'Escola A', turno: 'manha', placa: 'ABC1D23', ocupacao: { alocados: 3, capacidade: 2, percentual: 150, faixa: 'vermelho', calculavel: true }, pendencia: null },
      { id: 2, nome: 'Rota Sem Veículo', escola: 'Escola A', turno: 'tarde', placa: null, ocupacao: { alocados: 0, capacidade: null, percentual: null, faixa: null, calculavel: false }, pendencia: 'rota_sem_veiculo' },
    ],
    alertas: {
      resumo: { criticos: 1, atencao: 1 },
      data: [
        { tipo: 'vistoria', gravidade: 'critico', item_tipo: 'veiculo', item_id: 1, item: 'ABC1D23', data: '2026-10-01', dias: -30 },
        { tipo: 'cnh', gravidade: 'atencao', item_tipo: 'motorista', item_id: 2, item: 'João da Silva', data: '2026-11-12', dias: 12 },
      ],
    },
    ...extra,
  });

  it('mostra indicadores, lotação com rótulo de texto e alertas', async () => {
    api.painel.mockResolvedValue(painel());
    render(<Painel opcoes={opcoes} />);

    expect(await screen.findByText('Alunos transportados')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText('61,5%')).toBeInTheDocument();
    expect(screen.getByText('Rota Vermelha')).toBeInTheDocument();
    expect(screen.getByText('Superlotada')).toBeInTheDocument();
    expect(screen.getByText('Sem veículo')).toBeInTheDocument();
    expect(screen.getByText('Vencido')).toBeInTheDocument();
    expect(screen.getByText('1 rota(s) sem veículo')).toBeInTheDocument();
    expect(api.painel).toHaveBeenCalledWith(2026);
  });

  it('sem rotas mostra o estado vazio e ocupação média indisponível', async () => {
    api.painel.mockResolvedValue(painel({ rotas: [], indicadores: { rotas_ativas: 0, veiculos_ativos: 0, alunos_transportados: 0, ocupacao_media: null, rotas_superlotadas: 0, rotas_sem_veiculo: 0 }, alertas: { resumo: { criticos: 0, atencao: 0 }, data: [] } }));
    render(<Painel opcoes={opcoes} />);

    expect(await screen.findByText('Nenhuma rota ativa cadastrada.')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
