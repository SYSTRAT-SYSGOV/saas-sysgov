import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const cursosApi = vi.hoisted(() => ({
  listarAssinaturas: vi.fn(),
  criarAssinatura: vi.fn(),
  atualizarAssinatura: vi.fn(),
  enviarImagemDaAssinatura: vi.fn(),
  enviarSeloDaAssinatura: vi.fn(),
  excluirAssinatura: vi.fn(),
}));

vi.mock('@sysgov/sdk', async (original) => ({
  ...(await original<typeof import('@sysgov/sdk')>()),
  sysgovApi: { cursos: cursosApi },
}));

import { AssinaturasPage } from './AssinaturasPage';

beforeEach(() => {
  vi.clearAllMocks();
  cursosApi.listarAssinaturas.mockResolvedValue({ assinaturas: [] });
  cursosApi.criarAssinatura.mockResolvedValue({ id: 4, nome: 'Tatiana', ativa: true });
  cursosApi.enviarImagemDaAssinatura.mockResolvedValue({ id: 4 });
});

async function abrirNova() {
  render(<AssinaturasPage />);
  fireEvent.click(await screen.findByRole('button', { name: /Nova assinatura/ }));
  fireEvent.change(screen.getByLabelText(/Nome do responsável/i), { target: { value: 'Tatiana' } });
}

describe('Assinaturas', () => {
  it('oferece a área para desenhar a assinatura', async () => {
    await abrirNova();
    expect(screen.getByLabelText('Área para desenhar a assinatura')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Limpar desenho/ })).toBeDisabled();
  });

  it('assinatura nova sem desenho nem arquivo é recusada antes de gravar', async () => {
    await abrirNova();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText(/na área indicada ou envie/)).toBeInTheDocument();
    expect(cursosApi.criarAssinatura).not.toHaveBeenCalled();
  });

  it('com arquivo, grava a assinatura e envia a imagem', async () => {
    await abrirNova();
    const arquivo = new File(['png'], 'assinatura.png', { type: 'image/png' });
    const campo = document.querySelector('input[type=file]') as HTMLInputElement;
    fireEvent.change(campo, { target: { files: [arquivo] } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(cursosApi.enviarImagemDaAssinatura).toHaveBeenCalledWith(4, arquivo));
    expect(cursosApi.criarAssinatura).toHaveBeenCalledWith(expect.objectContaining({ nome: 'Tatiana', ativa: true }));
  });
});
