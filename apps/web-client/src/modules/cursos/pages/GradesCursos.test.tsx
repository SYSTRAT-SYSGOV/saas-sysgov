import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { acionarMenu } from '@/test-utils/acoesMenu';

const cursosApi = vi.hoisted(() => ({ listarFundos: vi.fn(), atualizarFundo: vi.fn(), excluirFundo: vi.fn(), listarTextos: vi.fn(), atualizarTexto: vi.fn(), excluirTexto: vi.fn() }));
vi.mock('@sysgov/sdk', async (original) => ({ ...(await original<typeof import('@sysgov/sdk')>()), sysgovApi: { cursos: cursosApi } }));

import { FundosPage } from './FundosPage';
import { TextosPage } from './TextosPage';

globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;

beforeEach(() => {
  vi.clearAllMocks();
  cursosApi.listarFundos.mockResolvedValue({ fundos: [{ id: 3, nome: 'Fundo Azul', descricao: 'Arte padrão', imagem_url: 'https://x/fundo.png', orientacao: 'paisagem', ativo: true, created_at: '2026-09-01T10:00:00Z' }] });
  cursosApi.atualizarFundo.mockResolvedValue({});
  cursosApi.excluirFundo.mockResolvedValue(undefined);
  cursosApi.listarTextos.mockResolvedValue({
    textos: [{ id: 4, nome: 'Modelo NR-35', tipo_certificado: 'Treinamento', texto_principal: 'Certificamos que {NOME} concluiu o curso.', texto_complementar: '', observacoes: '', ativo: true }],
    campos: ['NOME'],
  });
  cursosApi.atualizarTexto.mockResolvedValue({});
  cursosApi.excluirTexto.mockResolvedValue(undefined);
});

describe('Fundos de certificado', () => {
  it('lista com a orientação em português, alterna o ativo pelo switch e exporta', async () => {
    render(<FundosPage />);
    expect(await screen.findByText('Fundo Azul')).toBeInTheDocument();
    expect(screen.getByText('Horizontal')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /exportar/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('switch', { name: 'Ativar Fundo Azul' }));
    await waitFor(() => expect(cursosApi.atualizarFundo).toHaveBeenCalledWith(3, { ativo: false }));
  });

  it('exclui pelo menu da linha, depois de confirmar', async () => {
    render(<FundosPage />);
    await screen.findByText('Fundo Azul');
    await acionarMenu(/Ações de Fundo Azul/, 'Excluir');
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Excluir' }));
    await waitFor(() => expect(cursosApi.excluirFundo).toHaveBeenCalledWith(3));
  });
});

describe('Modelos de texto do certificado', () => {
  it('lista o modelo, alterna o ativo e exclui pelo menu da linha', async () => {
    render(<TextosPage />);
    expect(await screen.findByText('Modelo NR-35')).toBeInTheDocument();
    expect(screen.getByText('Treinamento')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /exportar/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('switch', { name: 'Ativar Modelo NR-35' }));
    await waitFor(() => expect(cursosApi.atualizarTexto).toHaveBeenCalledWith(4, { ativo: false }));

    await acionarMenu(/Ações de Modelo NR-35/, 'Excluir');
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Excluir' }));
    await waitFor(() => expect(cursosApi.excluirTexto).toHaveBeenCalledWith(4));
  });
});
