import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { acionarMenu } from '@/test-utils/acoesMenu';

const api = vi.hoisted(() => ({
  categorias: vi.fn(), excluirCategoria: vi.fn(), trimestres: vi.fn(), excluirTrimestre: vi.fn(), unidade: vi.fn(),
}));
const pedagogico = vi.hoisted(() => ({ cronogramas: vi.fn(), excluirCronograma: vi.fn() }));

vi.mock('../api', async (original) => ({
  ...(await original<typeof import('../api')>()),
  escolaApi: { ...api, urlLogo: '/unidade/logo' },
}));
vi.mock('../../pedagogico/api', async (original) => ({
  ...(await original<typeof import('../../pedagogico/api')>()),
  pedagogicoApi: pedagogico,
}));

import { CategoriasAdmin } from './CategoriasAdmin';
import { TrimestresAdmin } from './TrimestresAdmin';
import { SistemaAdmin } from './SistemaAdmin';

beforeEach(() => vi.clearAllMocks());

describe('Grades do Cadastro Escolar (DataTable padrão)', () => {
  it('categorias: lista, exporta e exclui pela ação da linha depois de confirmar', async () => {
    api.categorias.mockResolvedValue([{ id: 1, nome: 'Disciplina', cor: '#ff0000' }, { id: 2, nome: 'Atraso', cor: '#00ff00' }]);
    api.excluirCategoria.mockResolvedValue(undefined);
    const toast = vi.fn();
    render(<CategoriasAdmin onToast={toast} />);

    expect(await screen.findByText('Disciplina')).toBeInTheDocument();
    expect(screen.getByText('#00ff00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /exportar/i })).toBeInTheDocument();

    await acionarMenu(/Ações de Disciplina/, 'Excluir');
    fireEvent.click(await screen.findByRole('button', { name: 'Sim, excluir' }));

    await waitFor(() => expect(api.excluirCategoria).toHaveBeenCalledWith(1));
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ type: 'success', title: 'Categoria excluída' })));
  });

  it('categorias: "Editar" abre o formulário já preenchido', async () => {
    api.categorias.mockResolvedValue([{ id: 1, nome: 'Disciplina', cor: '#ff0000' }]);
    render(<CategoriasAdmin onToast={vi.fn()} />);
    await screen.findByText('Disciplina');

    await acionarMenu(/Ações de Disciplina/, 'Editar');
    expect(await screen.findByText('Editar Categoria')).toBeInTheDocument();
    expect(screen.getByLabelText('Nome')).toHaveValue('Disciplina');
  });

  it('categorias: sem registros mostra a mensagem vazia da grade', async () => {
    api.categorias.mockResolvedValue([]);
    render(<CategoriasAdmin onToast={vi.fn()} />);
    expect(await screen.findByText('Nenhuma categoria cadastrada.')).toBeInTheDocument();
  });

  it('trimestres: mostra datas e status e exclui pela ação da linha', async () => {
    api.trimestres.mockResolvedValue([
      { id: 5, ano_letivo: 2026, numero: 2, data_inicio: '2026-05-04', data_fim: '2026-08-21', situacao: 'em_andamento' },
    ]);
    api.excluirTrimestre.mockResolvedValue(undefined);
    render(<TrimestresAdmin onToast={vi.fn()} />);

    expect(await screen.findByText('2º Trimestre')).toBeInTheDocument();
    expect(screen.getByText('04/05/2026')).toBeInTheDocument();
    expect(screen.getByText('21/08/2026')).toBeInTheDocument();
    expect(screen.getByText('Em Andamento')).toBeInTheDocument();

    await acionarMenu(/Ações do 2º Trimestre de 2026/, 'Excluir');
    fireEvent.click(await screen.findByRole('button', { name: 'Sim, excluir' }));
    await waitFor(() => expect(api.excluirTrimestre).toHaveBeenCalledWith(5));
  });

  it('datas do pré-conselho: arquivo mostra o ano e a ação Excluir chama a API', async () => {
    api.unidade.mockResolvedValue({ nome: 'Escola Modelo', tem_logo: false });
    pedagogico.cronogramas.mockResolvedValue([
      { id: 9, ano_letivo: 2025, periodo: 3, data_inicio: '2025-10-01', data_fim: '2025-10-10', situacao: 'arquivo' },
    ]);
    pedagogico.excluirCronograma.mockResolvedValue(undefined);
    render(<SistemaAdmin onToast={vi.fn()} />);

    expect(await screen.findByText('Arquivo (2025)')).toBeInTheDocument();
    expect(screen.getByText('01/10/2025')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /exportar/i })).toBeInTheDocument();

    await acionarMenu(/Ações do 3º Trimestre de 2025/, 'Excluir');
    fireEvent.click(await screen.findByRole('button', { name: 'Sim, excluir' }));
    await waitFor(() => expect(pedagogico.excluirCronograma).toHaveBeenCalledWith(9));
  });
});
