import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ConfiguracaoPublica } from '@sysgov/sdk';

// O Switch (Radix) mede o próprio tamanho com ResizeObserver, que o jsdom não tem.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

const cursosApi = vi.hoisted(() => ({
  getConfiguracaoPublica: vi.fn(),
  atualizarConfiguracaoPublica: vi.fn(),
}));

vi.mock('@sysgov/sdk', async (original) => ({
  ...(await original<typeof import('@sysgov/sdk')>()),
  sysgovApi: { cursos: cursosApi },
}));

vi.mock('@sysgov/ui', async (original) => ({
  ...(await original<typeof import('@sysgov/ui')>()),
  RichTextEditor: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <textarea aria-label="Editor de texto" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

import { ConfiguracaoPublicaTab } from './ConfiguracaoPublicaTab';

const configBase: ConfiguracaoPublica = {
  publico_habilitado: false,
  boas_vindas: 'Bem-vindo ao catálogo de cursos.',
  termo: { texto: 'Texto do termo de uso.', versao: 2 },
  documento_obrigatorio: true,
};

describe('ConfiguracaoPublicaTab — tarefa 6.6', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cursosApi.getConfiguracaoPublica.mockResolvedValue(configBase);
  });

  it('carrega e mostra a configuração atual', async () => {
    render(<ConfiguracaoPublicaTab />);

    expect(await screen.findByText('Versão 2')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Habilitar página pública' })).not.toBeChecked();
    expect(screen.getByRole('switch', { name: 'Exigir CPF no cadastro externo' })).toBeChecked();
    const editores = screen.getAllByLabelText('Editor de texto');
    expect(editores[0]).toHaveValue('Bem-vindo ao catálogo de cursos.');
    expect(editores[1]).toHaveValue('Texto do termo de uso.');
  });

  it('erro ao carregar mostra o estado de erro com nova tentativa', async () => {
    cursosApi.getConfiguracaoPublica.mockReset();
    cursosApi.getConfiguracaoPublica.mockRejectedValueOnce(new Error('falhou')).mockResolvedValueOnce(configBase);
    render(<ConfiguracaoPublicaTab />);

    expect(await screen.findByText('Erro ao carregar')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByText('Versão 2')).toBeInTheDocument();
  });

  it('salvar envia o estado editado e mostra a mensagem de sucesso', async () => {
    cursosApi.atualizarConfiguracaoPublica.mockResolvedValue({ ...configBase, publico_habilitado: true, termo: { texto: 'Texto do termo de uso.', versao: 2 } });
    render(<ConfiguracaoPublicaTab />);
    await screen.findByText('Versão 2');

    fireEvent.click(screen.getByRole('switch', { name: 'Habilitar página pública' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(cursosApi.atualizarConfiguracaoPublica).toHaveBeenCalledWith({
        publico_habilitado: true,
        boas_vindas: 'Bem-vindo ao catálogo de cursos.',
        documento_obrigatorio: true,
        termo: { texto: 'Texto do termo de uso.' },
      }),
    );
    expect(await screen.findByText('Configuração salva com sucesso.')).toBeInTheDocument();
  });

  it('erro ao salvar é mostrado na tela', async () => {
    cursosApi.atualizarConfiguracaoPublica.mockRejectedValue(new Error('Não foi possível salvar.'));
    render(<ConfiguracaoPublicaTab />);
    await screen.findByText('Versão 2');

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Não foi possível salvar.')).toBeInTheDocument();
  });
});
