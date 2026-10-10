import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const api = vi.hoisted(() => ({ lote: vi.fn(), dashboard: vi.fn(), opcoes: vi.fn(), foto: vi.fn() }));
const portal = vi.hoisted(() => ({ me: vi.fn(), lotes: vi.fn() }));
const publico = vi.hoisted(() => ({ formulario: vi.fn(), enviar: vi.fn() }));
const permissoes = vi.hoisted(() => ({ lista: new Set<string>() }));

vi.mock('./api', async (original) => ({ ...(await original<typeof import('./api')>()), inservivelApi: api, portalApi: portal, cadastroPublicoApi: publico }));
vi.mock('@/core/rbac/useCan', () => ({ useCan: () => ({ can: (p?: string) => (p ? permissoes.lista.has(p) : true) }) }));

import type { Entidade, Lote } from './api';
import { abasVisiveis, ModuloInservivelMain, type Permissoes } from './ModuloInservivelMain';
import { LoteDetalhe } from './components/LoteDetalhe';
import { CadastroEntidadePage } from './pages/CadastroEntidadePage';

/** O Checkbox do Radix mede o tamanho com ResizeObserver, que o jsdom não tem. */
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;

const sem: Permissoes = { ver: false, bens: false, lotes: false, lotesGestao: false, entidades: false, transferencias: false, aprovar: false, configuracao: false, portal: false };

beforeEach(() => {
  vi.clearAllMocks();
  permissoes.lista = new Set();
});

describe('Abas por permissão', () => {
  it('Servidor de Secretaria vê só as abas do perfil', () => {
    const ids = abasVisiveis({ ...sem, ver: true, bens: true, lotes: true, transferencias: true }).map((a) => a.id);
    expect(ids).toEqual(['dashboard', 'bens', 'lotes', 'transferencias']);
  });

  it('Gestor do Patrimônio vê todas as abas', () => {
    const tudo = { ...sem, ver: true, bens: true, lotes: true, lotesGestao: true, entidades: true, transferencias: true, aprovar: true, configuracao: true };
    expect(abasVisiveis(tudo)).toHaveLength(8);
  });

  it('Entidade vê o Portal no lugar das abas', async () => {
    permissoes.lista = new Set(['inservivel.acesso', 'inservivel.portal']);
    portal.me.mockResolvedValue({
      id: 1, razao_social: 'Associação Esperança', nome_fantasia: 'Esperança', cnpj: '11222333000181', status: 'pendente', status_rotulo: 'Pendente',
      motivo_reprovacao: null, mensagem_status: 'Seu cadastro está em análise pelo Patrimônio.', documentos_exigidos: [], documentos: [], bloqueios: [],
      alertas_documentos: [{ tipo: 'estatuto_social', nome: 'Estatuto social', validade: '2020-01-01', vencido: true }],
    } as unknown as Entidade);
    portal.lotes.mockResolvedValue({ liberado: false, mensagem: 'Seu cadastro está em análise.', lotes: [] });

    render(<MemoryRouter><ModuloInservivelMain /></MemoryRouter>);
    expect(await screen.findByText('Associação Esperança')).toBeInTheDocument();
    expect(screen.getByText('Portal da entidade')).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /Bens Inservíveis/ })).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Estatuto social');
    expect(screen.getByRole('button', { name: /Reenviar/ })).toBeInTheDocument();
  });
});

const loteBase = (gerir: boolean): Lote => ({
  id: 7, numero: '007/2026', descricao: 'Cadeiras', data_criacao: '2026-10-01', data_sorteio_prevista: null, responsavel: 'Fulano', status: 'publicado', status_rotulo: 'Publicado',
  valor_cents: 12345, bens_count: 0, criado_por: 1, created_at: null, observacoes: null, proximos_status: gerir ? [{ valor: 'aberto', rotulo: 'Aberto' }] : [],
  bens: [], documentos: [], sorteio: null, permissoes: { editar: true, gerir },
  inscricoes: [{ entidade_id: 3, razao_social: 'Lar dos Idosos', cnpj: '11222333000181', status: 'habilitada', status_rotulo: 'Habilitada', lotes_ganhos: 0, inscrita_em: null,
    bloqueios: [{ tipo: 'certidoes_negativas', nome: 'Certidões negativas', validade: '2026-01-01' }] }],
});

describe('Tela do lote', () => {
  it('Gestor sorteia e vê a inscrita bloqueada por documento vencido', async () => {
    api.lote.mockResolvedValue(loteBase(true));
    render(<LoteDetalhe loteId={7} avisar={vi.fn()} onVoltar={vi.fn()} />);
    expect(await screen.findByText('Lote 007/2026')).toBeInTheDocument();
    expect(screen.getByText('R$ 123,45')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Realizar sorteio/ })).toBeEnabled();
    expect(screen.getByText(/Documento vencido: Certidões negativas/)).toBeInTheDocument();
  });

  it('criador sem gestão não sorteia nem muda status', async () => {
    api.lote.mockResolvedValue(loteBase(false));
    render(<LoteDetalhe loteId={7} avisar={vi.fn()} onVoltar={vi.fn()} />);
    expect(await screen.findByText('Lote 007/2026')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Realizar sorteio|Voltar para Aberto|Excluir lote/ })).not.toBeInTheDocument();
  });
});

describe('Cadastro público da entidade', () => {
  const abrir = async () => {
    publico.formulario.mockResolvedValue({ orgao: { nome: 'Prefeitura de Exemplo', logo_url: null }, documentos_exigidos: [{ chave: 'estatuto_social', nome: 'Estatuto social', obrigatorio: true }] });
    render(
      <MemoryRouter initialEntries={['/inservivel/entidades/exemplo/cadastro']}>
        <Routes><Route path="/inservivel/entidades/:tenantSlug/cadastro" element={<CadastroEntidadePage />} /></Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText('Prefeitura de Exemplo')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Senha * (mínimo 8 caracteres)'), { target: { value: 'senhaForte1' } });
    fireEvent.change(screen.getByLabelText('Confirmar senha *'), { target: { value: 'senhaForte1' } });
  };

  it('sem o documento obrigatório não envia', async () => {
    await abrir();
    fireEvent.submit(screen.getByRole('button', { name: 'Enviar cadastro' }).closest('form') as HTMLFormElement);
    expect(await screen.findByText(/Envie os documentos obrigatórios: Estatuto social/)).toBeInTheDocument();
    expect(publico.enviar).not.toHaveBeenCalled();
  });

  it('com documento e aceite envia para o slug da URL', async () => {
    publico.enviar.mockResolvedValue({ ok: true, mensagem: 'Cadastro recebido. Entre pelo login.' });
    await abrir();
    fireEvent.change(screen.getByLabelText(/Estatuto social/), { target: { files: [new File(['%PDF'], 'estatuto.pdf', { type: 'application/pdf' })] } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.submit(screen.getByRole('button', { name: 'Enviar cadastro' }).closest('form') as HTMLFormElement);
    await waitFor(() => expect(publico.enviar).toHaveBeenCalledTimes(1));
    const [slug, corpo] = publico.enviar.mock.calls[0] as [string, FormData];
    expect(slug).toBe('exemplo');
    expect(corpo.get('documentos[estatuto_social]')).toBeInstanceOf(File);
    expect(corpo.get('website')).toBe('');
    expect(await screen.findByText('Cadastro recebido!')).toBeInTheDocument();
  });
});
