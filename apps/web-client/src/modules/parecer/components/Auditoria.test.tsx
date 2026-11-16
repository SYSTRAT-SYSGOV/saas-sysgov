import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Auditoria from './Auditoria';
import { ALTURA_CONTROLE } from './comum';

const { auditoria } = vi.hoisted(() => ({ auditoria: vi.fn() }));
vi.mock('../api', async (original) => ({ ...(await original<typeof import('../api')>()), parecerApi: { auditoria } }));

const tela = {
  de: '2026-10-17',
  ate: '2026-11-16',
  resumo: {},
  pessoas: [{ id: 3, name: 'Cleber Silva' }],
  data: [{ id: 1, data: '2026-11-16T13:22:30Z', usuario: 'Cleber Silva', acao: 'turma.configurada', recurso: 'turma', descricao: 'Turma 3º ano 3º Ano A configurada no parecer', antes: null, depois: null }],
  current_page: 1,
  last_page: 3,
  total: 250,
};

describe('Parecer — Auditoria', () => {
  it('usa a grade padrão (DataTable) com paginação do servidor', async () => {
    auditoria.mockResolvedValue(tela);
    render(<Auditoria />);

    await waitFor(() => expect(screen.getByText('Turma 3º ano 3º Ano A configurada no parecer')).toBeInTheDocument());
    for (const titulo of ['Quando', 'Quem', 'Assunto', 'O que aconteceu']) {
      expect(screen.getByRole('columnheader', { name: new RegExp(titulo) })).toBeInTheDocument();
    }
    expect(screen.getByText('Turma')).toBeInTheDocument(); // selo do assunto
    expect(screen.getByText(/250 registros/)).toBeInTheDocument(); // total vindo do servidor, não da página
  });

  it('os controles da barra de filtros têm a mesma altura (alinhados pela base)', async () => {
    auditoria.mockResolvedValue(tela);
    render(<Auditoria />);

    await waitFor(() => expect(screen.getByRole('button', { name: 'Filtrar' })).toBeInTheDocument());
    expect(ALTURA_CONTROLE).toBe('h-11');
    expect(screen.getByRole('button', { name: 'Filtrar' }).className).toContain(ALTURA_CONTROLE);
    expect(screen.getByPlaceholderText(/nome do aluno/).className).toContain(ALTURA_CONTROLE);
    for (const input of document.querySelectorAll('input[type="date"]')) expect(input.className).toContain(ALTURA_CONTROLE);
  });
});
