import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const api = vi.hoisted(() => ({
  opcoes: vi.fn(), alertas: vi.fn(), empresas: vi.fn(), salvarEmpresa: vi.fn(), excluirEmpresa: vi.fn(),
  motoristas: vi.fn(), salvarMotorista: vi.fn(), excluirMotorista: vi.fn(),
  veiculos: vi.fn(), salvarVeiculo: vi.fn(), excluirVeiculo: vi.fn(), vistorias: vi.fn(), registrarVistoria: vi.fn(),
  auditoria: vi.fn(),
}));
vi.mock('./api', async (original) => ({ ...(await original<typeof import('./api')>()), transporteApi: api }));

import type { Alertas, Empresa, Motorista, Opcoes, Veiculo } from './api';
import { data, prazo, rotuloDe, ROTULO_IRREGULARIDADE } from './formato';
import { Empresas } from './components/Empresas';
import { Motoristas } from './components/Motoristas';
import { Veiculos } from './components/Veiculos';
import { VisaoGeral } from './components/VisaoGeral';

/** O Select do Radix rola até a opção e checa o ponteiro: o jsdom não tem essas APIs. */
Element.prototype.scrollIntoView ??= () => undefined;
Element.prototype.hasPointerCapture ??= () => false;
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;

const opcoes = (gerenciar = true): Opcoes => ({
  tipos_empresa: [{ valor: 'prestadora', rotulo: 'Prestadora de serviço' }, { valor: 'locadora', rotulo: 'Locadora de veículos' }],
  origens: [
    { valor: 'propria', rotulo: 'Própria', tipo_empresa: null },
    { valor: 'locada', rotulo: 'Locada', tipo_empresa: 'locadora' },
    { valor: 'terceirizada', rotulo: 'Terceirizada', tipo_empresa: 'prestadora' },
  ],
  tipos_rede: [{ valor: 'rural', rotulo: 'Rural' }, { valor: 'urbana', rotulo: 'Urbana' }],
  turnos: [{ valor: 'manha', rotulo: 'Manhã' }],
  escolas: [],
  anos_letivos: [2026],
  veiculos: [],
  poderes_publicos: [],
  mediacoes: [],
  categorias_cnh: ['D', 'E'],
  tipologias: [{ valor: 3, rotulo: 'Ônibus' }],
  empresas: [{ id: 9, nome: 'Locadora Sul', tipo: 'locadora' }],
  motoristas: [],
  permissoes: { gerenciar_frota: gerenciar, gerenciar_rotas: gerenciar, gerenciar_alocacoes: gerenciar, exceder_capacidade: false, exportar_censo: true, auditar: false },
});

const veiculo = (extra: Partial<Veiculo> = {}): Veiculo => ({
  id: 1, origem: 'propria', origem_rotulo: 'Própria', empresa: null, motorista_padrao: null, descricao: 'Ônibus escolar 01', placa: 'ABC1D23',
  renavam: null, chassi: null, marca_modelo: null, ano_fabricacao: null, ano_modelo: null, data_licenca: null, capacidade: 40, tipo_rede: 'rural',
  tipologia_inep: 3, tipologia_rotulo: 'Ônibus', uso_exclusivo: true, acessivel: false, ativo: true, motivo_inativacao: null,
  vistoria_validade: '2027-03-01', regular: true, motivos_irregularidade: [], observacoes: null,
  ...extra,
});

const motorista = (extra: Partial<Motorista> = {}): Motorista => ({
  id: 2, pessoa_id: 20, nome: 'João da Silva', cpf_mascarado: '***.456.789-**', empresa: null, cnh_numero: 'CNH0001', cnh_categoria: 'D',
  cnh_primeira_habilitacao: null, cnh_validade: '2028-01-10', curso_certificado: 'C1', curso_validade: '2027-05-01',
  toxicologico_data: null, toxicologico_validade: '2027-06-01', ativo: true, elegivel: true, motivos_inelegibilidade: [], observacoes: null,
  ...extra,
});

const empresa = (extra: Partial<Empresa> = {}): Empresa => ({
  id: 3, pessoa_id: 30, nome: 'Viação Rio Claro', nome_fantasia: null, cnpj_mascarado: '11.222.333/****-**', tipo: 'prestadora',
  tipo_rotulo: 'Prestadora de serviço', contrato_numero: '12/2026', vigencia_inicio: '2026-02-01', vigencia_fim: '2026-12-31',
  contrato_vencido: false, ativa: true, observacoes: null,
  ...extra,
});

beforeEach(() => vi.clearAllMocks());

describe('Formatação', () => {
  it('data no padrão brasileiro e prazo em texto', () => {
    expect(data('2026-10-31')).toBe('31/10/2026');
    expect(data(null)).toBe('—');
    expect(prazo(0)).toBe('hoje');
    expect(prazo(12)).toBe('em 12 dias');
    expect(prazo(-3)).toBe('há 3 dias');
  });

  it('rótulo desconhecido volta a própria chave', () => {
    expect(rotuloDe(ROTULO_IRREGULARIDADE, 'vistoria_vencida')).toBe('Vistoria vencida');
    expect(rotuloDe(ROTULO_IRREGULARIDADE, 'outro')).toBe('outro');
  });
});

describe('Visão geral', () => {
  it('mostra vencidos e a vencer com a situação em texto', async () => {
    const alertas: Alertas = {
      resumo: { criticos: 1, atencao: 1 },
      data: [
        { tipo: 'vistoria', gravidade: 'critico', item_tipo: 'veiculo', item_id: 1, item: 'ABC1D23', data: '2026-10-01', dias: -30 },
        { tipo: 'cnh', gravidade: 'atencao', item_tipo: 'motorista', item_id: 2, item: 'João da Silva', data: '2026-11-12', dias: 12 },
      ],
    };
    api.alertas.mockResolvedValue(alertas);
    render(<VisaoGeral />);

    expect(await screen.findByText('Vencido')).toBeInTheDocument();
    expect(screen.getByText('A vencer')).toBeInTheDocument();
    expect(screen.getByText('ABC1D23')).toBeInTheDocument();
    expect(screen.getByText('Vistoria do DETRAN')).toBeInTheDocument();
    expect(screen.getByText('em 12 dias')).toBeInTheDocument();
  });

  it('sem pendências mostra o estado vazio', async () => {
    api.alertas.mockResolvedValue({ data: [], resumo: { criticos: 0, atencao: 0 } });
    render(<VisaoGeral />);

    expect(await screen.findByText('Nenhum documento vencido ou a vencer em 30 dias.')).toBeInTheDocument();
  });
});

describe('Veículos', () => {
  it('consulta não vê o botão de novo veículo nem as ações de edição', async () => {
    api.veiculos.mockResolvedValue([veiculo()]);
    render(<Veiculos opcoes={opcoes(false)} avisar={vi.fn()} aoMudar={vi.fn()} />);

    expect(await screen.findByText('ABC1D23')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Novo veículo/ })).not.toBeInTheDocument();
  });

  it('veículo irregular aparece com os motivos', async () => {
    api.veiculos.mockResolvedValue([veiculo({ regular: false, motivos_irregularidade: ['vistoria_vencida', 'contrato_vencido'] })]);
    render(<Veiculos opcoes={opcoes()} avisar={vi.fn()} aoMudar={vi.fn()} />);

    expect(await screen.findByText('Irregular')).toBeInTheDocument();
    expect(screen.getByText('Vistoria vencida; Contrato da empresa vencido')).toBeInTheDocument();
  });

  it('não salva sem os campos obrigatórios', async () => {
    api.veiculos.mockResolvedValue([]);
    render(<Veiculos opcoes={opcoes()} avisar={vi.fn()} aoMudar={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: /Novo veículo/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Informe a descrição do veículo.')).toBeInTheDocument();
    expect(api.salvarVeiculo).not.toHaveBeenCalled();
  });

  it('envia o veículo próprio sem empresa', async () => {
    api.veiculos.mockResolvedValue([]);
    api.salvarVeiculo.mockResolvedValue(veiculo());
    render(<Veiculos opcoes={opcoes()} avisar={vi.fn()} aoMudar={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: /Novo veículo/ }));
    fireEvent.change(await screen.findByLabelText('Descrição *'), { target: { value: 'Ônibus escolar 02' } });
    fireEvent.change(screen.getByLabelText('Placa *'), { target: { value: 'abc-1d23' } });
    fireEvent.change(screen.getByLabelText('Lugares *'), { target: { value: '44' } });
    expect(screen.getByText(/Veículo próprio da prefeitura/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(api.salvarVeiculo).toHaveBeenCalled());
    expect(api.salvarVeiculo).toHaveBeenCalledWith(null, expect.objectContaining({
      origem: 'propria', empresa_id: null, descricao: 'Ônibus escolar 02', placa: 'abc-1d23', capacidade: 44, tipologia_inep: 3, ativo: true,
    }));
  });
});

describe('Motoristas', () => {
  it('inelegível aparece com o motivo em texto', async () => {
    api.motoristas.mockResolvedValue([motorista({ elegivel: false, motivos_inelegibilidade: ['toxicologico_vencido'] })]);
    render(<Motoristas opcoes={opcoes()} avisar={vi.fn()} aoMudar={vi.fn()} />);

    expect(await screen.findByText('Inelegível')).toBeInTheDocument();
    expect(screen.getByText('Exame toxicológico vencido')).toBeInTheDocument();
  });

  it('consulta não vê o botão de novo motorista', async () => {
    api.motoristas.mockResolvedValue([motorista()]);
    render(<Motoristas opcoes={opcoes(false)} avisar={vi.fn()} aoMudar={vi.fn()} />);

    expect(await screen.findByText('João da Silva')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Novo motorista/ })).not.toBeInTheDocument();
  });

  it('exige CPF, nome e CNH', async () => {
    api.motoristas.mockResolvedValue([]);
    render(<Motoristas opcoes={opcoes()} avisar={vi.fn()} aoMudar={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: /Novo motorista/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Informe o CPF.')).toBeInTheDocument();
    expect(api.salvarMotorista).not.toHaveBeenCalled();
  });
});

describe('Empresas', () => {
  it('contrato vencido recebe o selo', async () => {
    api.empresas.mockResolvedValue([empresa({ contrato_vencido: true })]);
    render(<Empresas opcoes={opcoes()} avisar={vi.fn()} aoMudar={vi.fn()} />);

    expect(await screen.findByText('Contrato vencido')).toBeInTheDocument();
    expect(screen.getByText('01/02/2026 a 31/12/2026')).toBeInTheDocument();
  });

  it('exige contrato e vigência', async () => {
    api.empresas.mockResolvedValue([]);
    render(<Empresas opcoes={opcoes()} avisar={vi.fn()} aoMudar={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: /Nova empresa/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Informe o número do contrato.')).toBeInTheDocument();
    expect(api.salvarEmpresa).not.toHaveBeenCalled();
  });
});
