import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { acionarMenu } from '@/test-utils/acoesMenu';

// Radix (Select/Checkbox/Switch) usa APIs que o jsdom não tem.
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
Element.prototype.scrollIntoView ??= () => undefined;
Element.prototype.hasPointerCapture ??= () => false;

const api = vi.hoisted(() => ({
  vereadores: vi.fn(), excluirVereador: vi.fn(), cabos: vi.fn(), excluirCabo: vi.fn(), coordenadores: vi.fn(), municipios: vi.fn(),
  prefeitos: vi.fn(), pesquisas: vi.fn(), evolucaoPesquisas: vi.fn(), links: vi.fn(), atualizarLink: vi.fn(), qrcode: vi.fn(),
  demandas: vi.fn(), responsaveisDemanda: vi.fn(), agenda: vi.fn(), materiais: vi.fn(), remessas: vi.fn(), excluirRemessa: vi.fn(),
  opcoesFinanceiro: vi.fn(), resumoFinanceiro: vi.fn(), lancamentos: vi.fn(), comprovante: vi.fn(),
}));
vi.mock('../api', async (original) => ({ ...(await original<typeof import('../api')>()), campanhaApi: api }));

import type { PropsAba } from '../ModuloCampanhaMain';
import { VereadoresCampanha } from './VereadoresCampanha';
import { CabosCampanha } from './CabosCampanha';
import { PrefeitosCampanha } from './PrefeitosCampanha';
import { MunicipiosCampanha } from './MunicipiosCampanha';
import { PesquisasCampanha } from './PesquisasCampanha';
import { CaptacaoCampanha } from './CaptacaoCampanha';
import { DemandasCampanha } from './DemandasCampanha';
import { AgendaCampanha } from './AgendaCampanha';
import { MateriaisCampanha } from './MateriaisCampanha';
import { FinanceiroCampanha } from './FinanceiroCampanha';

const todas = { gestao: true, municipios: true, equipes: true, eleitoresVer: true, eleitoresGerir: true, demandas: true, materiais: true, financeiroVer: true, financeiroGerir: true, agenda: true, pesquisas: true };
const campanha = { id: 1, nome: 'A', ano: 2026, cargo: 'Deputado Estadual', uf: 'PR', meta_votos_global: 0, status: 'ativa', candidato: null };
const props = (p: Partial<PropsAba['permissoes']> = {}, extra: Partial<PropsAba> = {}): PropsAba => ({
  campanha: { ...campanha, cores: {}, faixas: { faixas: [], cor_acima: '#000000' } },
  recarregarCampanha: vi.fn(), avisar: vi.fn(), abrirMunicipio: vi.fn(), versao: 0, alterou: vi.fn(),
  permissoes: { ...todas, ...p }, contexto: { campanhas: [], campanha, escolher: vi.fn(), recarregarCampanhas: vi.fn() },
  ...extra,
} as unknown as PropsAba);

const londrina = { codigo_ibge: 4113700, nome: 'Londrina' };

beforeEach(() => {
  vi.clearAllMocks();
  api.municipios.mockResolvedValue([londrina]);
  api.coordenadores.mockResolvedValue([{ id: 5, nome: 'Carla Regional', tipo: 'regional', codigo_ibge: null, regiao: 'Norte', meta_votos: 0, whatsapp: null, cpf_mascarado: null }]);
});

describe('Vereadores', () => {
  const vereador = { id: 1, nome: 'Vera Lima', codigo_ibge: 4113700, partido: 'PSD', numero: 5555, votos_estimados: 1200, dobradinha: null, aliado: true, ref_mandatario_id: null };

  it('lista com município, partido e aliado, e exclui pelo menu depois de confirmar', async () => {
    api.vereadores.mockResolvedValue([vereador]);
    api.excluirVereador.mockResolvedValue(undefined);
    render(<VereadoresCampanha {...props()} />);

    expect(await screen.findByText('Vera Lima')).toBeInTheDocument();
    expect(screen.getByText('Londrina')).toBeInTheDocument();
    expect(screen.getAllByText('Aliado').length).toBeGreaterThanOrEqual(2); // cabeçalho da coluna e o chip da linha
    expect(screen.getByRole('button', { name: /exportar/i })).toBeInTheDocument();

    await acionarMenu(/Ações de Vera Lima/, 'Excluir');
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Excluir' }));
    await waitFor(() => expect(api.excluirVereador).toHaveBeenCalledWith(1));
  });

  it('sem permissão de equipes não há menu de ações', async () => {
    api.vereadores.mockResolvedValue([vereador]);
    render(<VereadoresCampanha {...props({ equipes: false })} />);
    expect(await screen.findByText('Vera Lima')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ações de/ })).not.toBeInTheDocument();
  });
});

describe('Cabos eleitorais', () => {
  it('mostra o coordenador, a ajuda de custo e exclui pelo menu', async () => {
    api.cabos.mockResolvedValue([{ id: 2, nome: 'Cabo João', cpf_mascarado: null, codigo_ibge: 4113700, bairro: 'Centro', coordenador_id: 5, votos_estimados: 300, ajuda_custo: true, valor_ajuda_centavos: 15000, whatsapp: '43999990001' }]);
    api.excluirCabo.mockResolvedValue(undefined);
    render(<CabosCampanha {...props()} />);

    expect(await screen.findByText('Cabo João')).toBeInTheDocument();
    expect(screen.getByText('Carla Regional')).toBeInTheDocument();
    expect(screen.getByText('R$ 150,00')).toBeInTheDocument();
    expect(screen.getByText('Londrina — Centro')).toBeInTheDocument();

    await acionarMenu(/Ações de Cabo João/, 'Excluir');
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Excluir' }));
    await waitFor(() => expect(api.excluirCabo).toHaveBeenCalledWith(2));
  });
});

describe('Prefeitos e Municípios', () => {
  it('prefeitos: o nome do município abre a ficha e o Apoio vê a relação como chip', async () => {
    api.prefeitos.mockResolvedValue([{ codigo_ibge: 4113700, municipio: 'Londrina', regiao: 'Norte', nome: 'Prefeito X', partido: 'MDB', vice: 'Vice Y', relacao: 'sem_informacao' }]);
    const p = props({ equipes: false });
    render(<PrefeitosCampanha {...p} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Londrina' }));
    expect(p.abrirMunicipio).toHaveBeenCalledWith(4113700);
    expect(screen.getByText('Vice Y')).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /relação/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /exportar/i })).toBeInTheDocument();
  });

  it('municípios: lista com prefeito e abre a ficha pelo nome', async () => {
    api.municipios.mockResolvedValue([{ codigo_ibge: 4113700, nome: 'Londrina', regiao_intermediaria: 'Norte', eleitores: 1000, situacao: 'em_andamento', meta_votos: 500, coordenador: { id: 5, nome: 'Carla Regional' }, prefeito: { nome: 'Prefeito X', partido: 'MDB', relacao: 'sem_informacao' } }]);
    const p = props();
    render(<MunicipiosCampanha {...p} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Abrir ficha de Londrina' }));
    expect(p.abrirMunicipio).toHaveBeenCalledWith(4113700);
    expect(screen.getByText('Carla Regional')).toBeInTheDocument();
    expect(screen.getByText(/Prefeito X/)).toBeInTheDocument();
  });
});

describe('Pesquisas, Agenda e Demandas', () => {
  it('pesquisas: lista, mostra o nosso candidato e abre pela ação da linha', async () => {
    api.pesquisas.mockResolvedValue([{ id: 1, tipo: 'externa', instituto: 'Datafolha', registro_tse: 'PR-01', codigo_ibge: null, divulgada_em: '2026-09-01', margem_erro_decimos: 20, amostra: 800, observacoes: null, resultados: [{ id: 1, nome: 'Ana', partido: null, da_campanha: true, percentual_decimos: 350 }] }]);
    api.evolucaoPesquisas.mockResolvedValue([]);
    render(<PesquisasCampanha {...props()} />);

    expect(await screen.findByText('Datafolha')).toBeInTheDocument();
    expect(screen.getAllByText('Estadual').length).toBeGreaterThan(0); // abrangência da pesquisa (sem município)
    expect(screen.getByText(/^±2/)).toBeInTheDocument(); // margem de erro
    await acionarMenu(/Ações da pesquisa Datafolha/, 'Abrir');
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('demandas: sinaliza a atrasada no prazo e o consulta não exclui', async () => {
    api.demandas.mockResolvedValue([{ id: 1, codigo_ibge: 4113700, solicitante: 'Seu José', descricao: 'Buraco na rua', categoria: 'infraestrutura', prioridade: 'alta', status: 'pendente', responsavel: { name: 'Ana' }, prazo: '2026-10-20', atrasada: true }]);
    api.responsaveisDemanda.mockResolvedValue([]);
    render(<DemandasCampanha {...props({ demandas: false })} />);

    expect(await screen.findByText('Seu José')).toBeInTheDocument();
    expect(screen.getByText('atrasada')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Abrir' })).toBeInTheDocument(); // só ação: botão direto
    expect(screen.queryByRole('button', { name: /Ações da demanda/ })).not.toBeInTheDocument();
  });

  it('agenda: mostra o tipo e o compromisso', async () => {
    api.agenda.mockResolvedValue([{ tipo: 'reuniao', id: 3, titulo: 'Reunião com lideranças', inicio: '2026-10-20T19:00:00-03:00', dia_inteiro: false, municipio: 'Londrina', alerta: false, registro: null }]);
    api.responsaveisDemanda.mockResolvedValue([]);
    render(<AgendaCampanha {...props()} />);

    expect(await screen.findByText('Reunião com lideranças')).toBeInTheDocument();
    expect(screen.getAllByText('Reunião').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /exportar/i })).toBeInTheDocument();
  });
});

describe('Captação, Materiais e Financeiro', () => {
  it('captação: alterna o ativo pelo switch e mostra o QR Code pelo menu', async () => {
    api.links.mockResolvedValue([{ id: 1, responsavel: 'Cabo João', tipo: 'cabo', descricao: null, codigo: 'ABC123', cadastros: 3, ativo: true, url: 'https://x/y' }]);
    api.atualizarLink.mockResolvedValue({});
    api.qrcode.mockResolvedValue('<svg></svg>');
    render(<CaptacaoCampanha {...props()} />);

    expect(await screen.findByText('ABC123')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('switch', { name: 'Link de Cabo João ativo' }));
    await waitFor(() => expect(api.atualizarLink).toHaveBeenCalledWith(1, { ativo: false }));

    await acionarMenu(/Ações do link de Cabo João/, 'QR Code');
    await waitFor(() => expect(api.qrcode).toHaveBeenCalledWith(1));
  });

  it('captação: link com cadastros não oferece Excluir', async () => {
    api.links.mockResolvedValue([{ id: 1, responsavel: 'Cabo João', tipo: 'cabo', descricao: null, codigo: 'ABC123', cadastros: 3, ativo: true, url: 'https://x/y' }]);
    render(<CaptacaoCampanha {...props()} />);
    await screen.findByText('ABC123');
    fireEvent.keyDown(screen.getByRole('button', { name: /Ações do link de Cabo João/ }), { key: 'Enter' });
    await screen.findByRole('menuitem', { name: 'QR Code' });
    expect(screen.queryByRole('menuitem', { name: 'Excluir' })).not.toBeInTheDocument();
  });

  it('materiais: estoque em barra, imagem separada do menu e remessa com Confirmar entrega', async () => {
    api.materiais.mockResolvedValue([{ id: 1, tipo: 'santinho', nome: 'Santinho 7x10', fornecedor: null, unidade: 'unidades', quantidade_produzida: 10000, valor_total_centavos: 35000, estoque: 2500, tem_imagem: false }]);
    api.remessas.mockResolvedValue([{ id: 4, codigo_ibge: 4113700, material: { id: 1, nome: 'Santinho 7x10' }, quantidade: 500, enviada_em: '2026-09-10', transportadora: null, motorista: null, veiculo: null, entregue: false, entregue_em: null, previsao_entrega: null, tem_foto: false }]);
    api.cabos.mockResolvedValue([]);
    render(<MateriaisCampanha {...props()} />);

    expect(await screen.findByText('Santinho 7x10', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Estoque de Santinho 7x10' })).toHaveAttribute('aria-valuenow', '25');
    expect(screen.getByLabelText('Enviar imagem de Santinho 7x10')).toBeInTheDocument();
    expect(screen.getByText('Em trânsito')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /exportar/i })).toHaveLength(2);

    await acionarMenu(/Ações da remessa para Londrina/, 'Confirmar entrega');
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('financeiro: pagina no servidor e abre o comprovante pelo menu', async () => {
    api.opcoesFinanceiro.mockResolvedValue({ categorias: { receita: {}, despesa: { combustivel: 'Combustível' } }, origens: {}, formas: {}, documentos_fiscais: {} });
    api.resumoFinanceiro.mockReturnValue(new Promise(() => undefined));
    api.lancamentos.mockResolvedValue({
      lancamentos: [{ id: 1, tipo: 'despesa', categoria: 'combustivel', valor_centavos: 5000, data: '2026-09-10', forma_pagamento: 'pix', codigo_ibge: null, contraparte_nome: 'Posto X', contraparte_documento: null, origem_recurso: null, recibo_eleitoral: null, documento_fiscal_tipo: null, documento_fiscal_numero: null, tem_comprovante: true }],
      total: 120, pagina: 1, por_pagina: 50,
    });
    api.comprovante.mockResolvedValue(new Blob(['x']));
    render(<FinanceiroCampanha {...props()} />);

    expect(await screen.findByText('Posto X')).toBeInTheDocument();
    expect(screen.getByText('Combustível')).toBeInTheDocument();
    expect(screen.getByText('Campanha geral')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /próxima/i }));
    await waitFor(() => expect(api.lancamentos).toHaveBeenLastCalledWith(expect.objectContaining({ pagina: 2 })));

    await acionarMenu(/Ações do lançamento/, 'Ver comprovante');
    await waitFor(() => expect(api.comprovante).toHaveBeenCalledWith(1));
  });
});
