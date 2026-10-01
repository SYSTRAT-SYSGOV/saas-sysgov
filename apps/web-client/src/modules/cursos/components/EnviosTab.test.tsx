import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Envio } from '@sysgov/sdk';

// O Select (Radix) mede o próprio tamanho com ResizeObserver e rola até o item
// selecionado — nenhum dos dois existe no jsdom.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;
Element.prototype.scrollIntoView ??= () => {};

const cursosApi = vi.hoisted(() => ({
  listarEnvios: vi.fn(),
  reenviarEnvio: vi.fn(),
}));

vi.mock('@sysgov/sdk', async (original) => ({
  ...(await original<typeof import('@sysgov/sdk')>()),
  sysgovApi: { cursos: cursosApi },
}));

import { EnviosTab } from './EnviosTab';

const envios: Envio[] = [
  { id: 1, tipo: 'inscricao_criada', destinatario: 'ana@teste.gov.br', situacao: 'enviado', tentativas: 1, erro: null, enviado_em: '2026-09-30T10:00:00Z', criado_em: '2026-09-30T09:59:00Z' },
  { id: 2, tipo: 'certificado_emitido', destinatario: 'joao@teste.gov.br', situacao: 'falhou', tentativas: 3, erro: 'Connection refused', enviado_em: null, criado_em: '2026-09-30T08:00:00Z' },
];

const paginaUnica = { data: envios, current_page: 1, last_page: 1, total: 2 };

describe('EnviosTab — tarefa 6.6', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cursosApi.listarEnvios.mockResolvedValue(paginaUnica);
  });

  it('carrega e lista os envios com tipo, destinatário e situação', async () => {
    render(<EnviosTab />);

    expect(await screen.findByText('Inscrição criada')).toBeInTheDocument();
    expect(screen.getByText('Certificado emitido')).toBeInTheDocument();
    expect(screen.getByText('ana@teste.gov.br')).toBeInTheDocument();
    expect(screen.getByText('Enviado')).toBeInTheDocument();
    expect(screen.getByText('Falhou')).toBeInTheDocument();
    expect(screen.getByText('Connection refused')).toBeInTheDocument();
    expect(cursosApi.listarEnvios).toHaveBeenCalledWith({ pagina: 1, por_pagina: 25 });
  });

  it('sem envios, mostra a mensagem de lista vazia', async () => {
    cursosApi.listarEnvios.mockResolvedValue({ data: [], current_page: 1, last_page: 1, total: 0 });
    render(<EnviosTab />);
    expect(await screen.findByText('Nenhum envio encontrado para o filtro selecionado.')).toBeInTheDocument();
  });

  it('só o envio com falha mostra o botão de reenviar', async () => {
    render(<EnviosTab />);
    await screen.findByText('Inscrição criada');

    expect(screen.getAllByRole('button', { name: 'Reenviar' })).toHaveLength(1);
  });

  it('reenviar chama a API e recarrega a lista', async () => {
    cursosApi.reenviarEnvio.mockResolvedValue({ id: 2, tipo: 'certificado_emitido', destinatario: 'joao@teste.gov.br', situacao: 'pendente' });
    render(<EnviosTab />);
    await screen.findByText('Certificado emitido');

    fireEvent.click(screen.getByRole('button', { name: 'Reenviar' }));

    await waitFor(() => expect(cursosApi.reenviarEnvio).toHaveBeenCalledWith(2));
    expect(cursosApi.listarEnvios).toHaveBeenCalledTimes(2);
  });

  it('erro ao reenviar é mostrado na tela', async () => {
    cursosApi.reenviarEnvio.mockRejectedValue(new Error('Só é possível reenviar envios com falha.'));
    render(<EnviosTab />);
    await screen.findByText('Certificado emitido');

    fireEvent.click(screen.getByRole('button', { name: 'Reenviar' }));

    expect(await screen.findByText('Só é possível reenviar envios com falha.')).toBeInTheDocument();
  });

  it('trocar o filtro de situação volta pra primeira página e busca de novo', async () => {
    render(<EnviosTab />);
    await screen.findByText('Inscrição criada');

    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(await screen.findByRole('option', { name: 'Falhou' }));

    await waitFor(() => expect(cursosApi.listarEnvios).toHaveBeenLastCalledWith({ situacao: 'falhou', pagina: 1, por_pagina: 25 }));
  });
});
