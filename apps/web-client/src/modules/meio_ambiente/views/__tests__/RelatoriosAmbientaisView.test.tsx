import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { RelatoriosAmbientaisView } from '../RelatoriosAmbientaisView';
import { meioAmbienteApi, type RelatorioAmbientalResumo } from '../../api';

const relatorioGee: RelatorioAmbientalResumo = {
  id: 7,
  tipo: 'gee',
  exercicio: 2025,
  gerado_por: 'Chefia',
  gerado_em: '2026-10-09T10:00:00-03:00',
};

describe('RelatoriosAmbientaisView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(meioAmbienteApi, 'listarRelatoriosAmbientais').mockResolvedValue([relatorioGee]);
    vi.spyOn(meioAmbienteApi, 'gerarRelatorioAmbiental').mockResolvedValue({ ...relatorioGee, dados: {} });
    vi.spyOn(meioAmbienteApi, 'exportarRelatorioAmbiental').mockResolvedValue(undefined);
  });

  it('lista os relatórios gerados e exporta no formato escolhido', async () => {
    render(<RelatoriosAmbientaisView />);

    await waitFor(() => expect(screen.getByText('Inventário GEE')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Exportar Inventário GEE 2025 em PDF' }));

    await waitFor(() => expect(meioAmbienteApi.exportarRelatorioAmbiental).toHaveBeenCalledWith(relatorioGee, 'pdf'));
  });

  it('gera um novo relatório e recarrega a lista', async () => {
    render(<RelatoriosAmbientaisView />);

    await waitFor(() => expect(meioAmbienteApi.listarRelatoriosAmbientais).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByLabelText('Exercício'), { target: { value: '2024' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gerar Relatório' }));

    await waitFor(() => expect(meioAmbienteApi.gerarRelatorioAmbiental).toHaveBeenCalledWith('rars', 2024));
    await waitFor(() => expect(meioAmbienteApi.listarRelatoriosAmbientais).toHaveBeenCalledTimes(2));
  });

  it('mostra a mensagem de erro da API ao falhar a geração', async () => {
    vi.spyOn(meioAmbienteApi, 'gerarRelatorioAmbiental').mockRejectedValue({ response: { data: { message: 'O exercício não pode ser futuro.' } } });

    render(<RelatoriosAmbientaisView />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Gerar Relatório' })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Gerar Relatório' }));

    await waitFor(() => expect(screen.getByText('O exercício não pode ser futuro.')).toBeInTheDocument());
  });
});
