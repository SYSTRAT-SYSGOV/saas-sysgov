import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { acionarMenu } from '@/test-utils/acoesMenu';

const api = vi.hoisted(() => ({
  bens: vi.fn(), opcoes: vi.fn(), foto: vi.fn(), entidades: vi.fn(), entidade: vi.fn(), parametros: vi.fn(), excluirParametro: vi.fn(),
  transferencias: vi.fn(), aprovar: vi.fn(), solicitar: vi.fn(), termoTransferencia: vi.fn(),
}));
vi.mock('./api', async (original) => ({ ...(await original<typeof import('./api')>()), inservivelApi: api }));

import type { BemResumo, EntidadeResumo, ItemParametro, Transferencia } from './api';
import type { PropsAba, Permissoes } from './ModuloInservivelMain';
import { BensInserviveis } from './components/BensInserviveis';
import { EntidadesInservivel } from './components/EntidadesInservivel';
import { ParametrosInservivel } from './components/ParametrosInservivel';
import { SolicitacoesTransferencia } from './components/SolicitacoesTransferencia';
import { TransferenciaInterna } from './components/TransferenciaInterna';

/** Radix (Select/Checkbox/Tabs) usa APIs que o jsdom não tem. */
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
Element.prototype.scrollIntoView ??= () => undefined;
Element.prototype.hasPointerCapture ??= () => false;

const tudo: Permissoes = { ver: true, bens: true, lotes: true, lotesGestao: true, entidades: true, transferencias: true, aprovar: true, configuracao: true, portal: false };
const props = (p: Partial<Permissoes> = {}): PropsAba => ({ permissoes: { ...tudo, ...p }, avisar: vi.fn(), parametro: () => null, limparParametro: vi.fn() } as unknown as PropsAba);

const bem = (extra: Partial<BemResumo> = {}): BemResumo => ({
  id: 1, numero_patrimonial: 'PAT-001', plaqueta_antiga: null, descricao: 'Cadeira giratória', marca: null, modelo: null,
  situacao: { id: 1, nome: 'Inservível', papel: null }, estado_conservacao: { id: 1, nome: 'Regular' }, categoria: { id: 1, nome: 'Móveis' },
  secretaria: { id: 10, nome: 'Secretaria de Educação', sigla: 'SEMED' }, setor: null, valor_contabil_cents: 10000, valor_avaliado_cents: 25000, valor_referencia_cents: 25000,
  foto_principal_id: null, created_at: null, ...extra,
});
const pagina = <T,>(data: T[], extra: Record<string, number> = {}) => ({ data, meta: { current_page: 1, last_page: 3, per_page: 15, total: 40, ...extra } });

beforeEach(() => {
  vi.clearAllMocks();
  api.opcoes.mockResolvedValue({ categorias: [], estados_conservacao: [], situacoes: [], unidades: [] });
});

describe('Bens inservíveis', () => {
  it('lista com valor avaliado, pagina no servidor e muda a situação pelo menu', async () => {
    api.bens.mockResolvedValue(pagina([bem()]));
    render(<BensInserviveis {...props()} />);

    expect(await screen.findByText('PAT-001')).toBeInTheDocument();
    expect(screen.getByText('R$ 250,00')).toBeInTheDocument();
    expect(screen.getByText('Móveis · Regular')).toBeInTheDocument();
    expect(api.bens).toHaveBeenCalledWith(expect.objectContaining({ page: 1, per_page: 15 }));

    fireEvent.click(screen.getByRole('button', { name: /próxima/i }));
    await waitFor(() => expect(api.bens).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })));

    await acionarMenu(/Ações do bem PAT-001/, 'Mudar situação');
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('quem não edita bens só tem a ação "Visualizar", direto na linha', async () => {
    api.bens.mockResolvedValue(pagina([bem()]));
    render(<BensInserviveis {...props({ bens: false })} />);
    await screen.findByText('PAT-001');
    expect(screen.getByRole('button', { name: 'Visualizar' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ações do bem/ })).not.toBeInTheDocument();
  });
});

describe('Entidades', () => {
  it('lista com CNPJ formatado e abre a ficha pela ação da linha', async () => {
    const entidade: EntidadeResumo = {
      id: 5, razao_social: 'Associação Esperança', nome_fantasia: 'Esperança', cnpj: '11222333000181', email: 'a@b.org', representante_legal: 'Maria Dias',
      cidade: 'Curitiba', uf: 'PR', status: 'ativa' as never, status_rotulo: 'Ativa', lotes_ganhos: 2, created_at: '2026-09-01', bloqueada_por_documento: true,
    };
    api.entidades.mockResolvedValue(pagina([entidade]));
    api.entidade.mockReturnValue(new Promise(() => undefined));
    render(<EntidadesInservivel {...props()} />);

    expect(await screen.findByText('Associação Esperança')).toBeInTheDocument();
    expect(screen.getByText('11.222.333/0001-81')).toBeInTheDocument();
    expect(screen.getByText('Curitiba/PR')).toBeInTheDocument();
    expect(screen.getByText('Documento vencido')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Abrir ficha' }));
    await waitFor(() => expect(api.entidade).toHaveBeenCalledWith(5));
  });
});

describe('Parâmetros', () => {
  const itens: ItemParametro[] = [
    { id: 1, nome: 'Disponível', ativo: true, papel: 'disponivel' as never, bens: 10 },
    { id: 2, nome: 'Em avaliação', ativo: false, papel: null, bens: 0 },
  ];

  it('situação de sistema só edita; a comum também exclui, depois de confirmar', async () => {
    api.parametros.mockResolvedValue({ itens });
    api.excluirParametro.mockResolvedValue(undefined);
    render(<ParametrosInservivel {...props()} />);

    expect(await screen.findByText('Disponível')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument(); // sistema: ação única, botão direto
    expect(screen.getByText('Inativo')).toBeInTheDocument();

    await acionarMenu(/Ações de Em avaliação/, 'Excluir');
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Excluir' }));
    await waitFor(() => expect(api.excluirParametro).toHaveBeenCalledWith('situacoes', 2));
  });
});

describe('Transferências', () => {
  const transferencia = (extra: Partial<Transferencia> = {}): Transferencia => ({
    id: 8, status: 'solicitado' as never, status_rotulo: 'Solicitado', bem: bem(), origem: { id: 10, nome: 'Secretaria de Educação', sigla: 'SEMED' },
    destino: { id: 11, nome: 'Secretaria de Saúde', sigla: 'SEMUS' }, observacao: null, motivo_recusa: null, anunciado_por: 'Ana', solicitado_por: 'Bruno', decidido_por: null,
    data_anuncio: '2026-10-01T10:00:00Z', data_solicitacao: '2026-10-02T10:00:00Z', data_conclusao: null, pode_solicitar: false, pode_cancelar: false, pode_decidir: true, ...extra,
  });

  it('solicitações: o Patrimônio aprova ou recusa pelo menu da linha', async () => {
    api.transferencias.mockResolvedValue({ minha_secretaria: null, gestor: true, transferencias: [transferencia()] });
    api.aprovar.mockResolvedValue(undefined);
    render(<SolicitacoesTransferencia {...props()} />);

    expect(await screen.findByText('PAT-001')).toBeInTheDocument();
    expect(screen.getByText('Solicitado', { selector: 'span' })).toBeInTheDocument();
    await acionarMenu(/Ações da transferência de PAT-001/, 'Aprovar');
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Aprovar' }));
    await waitFor(() => expect(api.aprovar).toHaveBeenCalledWith(8));
  });

  it('solicitações: transferência já aceita oferece só o Termo', async () => {
    api.transferencias.mockResolvedValue({ minha_secretaria: null, gestor: true, transferencias: [transferencia({ status: 'aceito' as never, status_rotulo: 'Aceito', pode_decidir: false })] });
    api.termoTransferencia.mockResolvedValue(new Blob(['x']));
    render(<SolicitacoesTransferencia {...props()} />);
    await screen.findByText('PAT-001');
    fireEvent.click(screen.getByRole('button', { name: 'Termo' }));
    await waitFor(() => expect(api.termoTransferencia).toHaveBeenCalledWith(8));
  });

  it('transferência interna: bem anunciado pode ser solicitado, com confirmação', async () => {
    api.transferencias.mockResolvedValue({ minha_secretaria: { id: 11, nome: 'Secretaria de Saúde', sigla: 'SEMUS' }, gestor: false, transferencias: [transferencia({ status: 'anunciado' as never, status_rotulo: 'Anunciado', pode_solicitar: true, pode_decidir: false })] });
    api.solicitar.mockResolvedValue(undefined);
    render(<TransferenciaInterna {...props()} />);

    expect(await screen.findByText('PAT-001')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /exportar/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Solicitar' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Solicitar' }));
    await waitFor(() => expect(api.solicitar).toHaveBeenCalledWith(8));
  });
});
