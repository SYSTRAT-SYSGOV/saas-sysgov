import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const api = vi.hoisted(() => ({
  modeloImportacao: vi.fn(), previaImportacao: vi.fn(), confirmarImportacao: vi.fn(), importacao: vi.fn(), cancelarImportacao: vi.fn(),
}));
vi.mock('./api', async (original) => ({ ...(await original<typeof import('./api')>()), transporteApi: api }));

import type { ImportacaoCsv } from './api';
import { ImportarCsv } from './components/ImportarCsv';

const imp = (extra: Partial<ImportacaoCsv> = {}): ImportacaoCsv => ({
  id: 5, tipo: 'veiculos', arquivo: 'frota.csv', status: 'previa', total: 4, validas: 2, criadas: 0, ignoradas: 0, com_erro: 2,
  divergencias: [{ linha: 4, codigo: 'capacidade_invalida', mensagem: 'A capacidade deve ser um número de 1 a 500.' }, { linha: 5, codigo: 'tipologia_invalida', mensagem: 'A tipologia Inep deve ser de 1 a 11.' }],
  avisos: [], truncado: false, mensagem: null, concluida_em: null, ...extra,
});

const arquivo = () => new File(['origem;placa\npropria;ABC1D23\n'], 'frota.csv', { type: 'text/csv' });

beforeEach(() => vi.clearAllMocks());

describe('Importar CSV', () => {
  it('mostra a ajuda do tipo e oferece o modelo', async () => {
    api.modeloImportacao.mockResolvedValue({ blob: new Blob(['x']), nome: 'modelo-transporte-motoristas.csv' });
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    render(<ImportarCsv tipo="motoristas" aoFechar={vi.fn()} aoConcluir={vi.fn()} />);

    expect(screen.getByText(/a importação não cria pessoas/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Baixar modelo/ }));

    await waitFor(() => expect(api.modeloImportacao).toHaveBeenCalledWith('motoristas'));
  });

  it('a prévia mostra válidas e divergências por linha, sem gravar, e deixa confirmar', async () => {
    api.previaImportacao.mockResolvedValue(imp());
    render(<ImportarCsv tipo="veiculos" aoFechar={vi.fn()} aoConcluir={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Arquivo CSV'), { target: { files: [arquivo()] } });

    expect(await screen.findByText('frota.csv')).toBeInTheDocument();
    expect(api.previaImportacao).toHaveBeenCalledWith('veiculos', expect.any(File));
    expect(screen.getByText('A capacidade deve ser um número de 1 a 500.')).toBeInTheDocument();
    expect(screen.getByText('A tipologia Inep deve ser de 1 a 11.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar importação de 2 linha(s)' })).toBeEnabled();
    expect(api.confirmarImportacao).not.toHaveBeenCalled();
  });

  it('sem linhas válidas não deixa confirmar', async () => {
    api.previaImportacao.mockResolvedValue(imp({ validas: 0, com_erro: 4 }));
    render(<ImportarCsv tipo="veiculos" aoFechar={vi.fn()} aoConcluir={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Arquivo CSV'), { target: { files: [arquivo()] } });

    expect(await screen.findByText('Nenhuma linha válida para importar.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Confirmar importação/ })).toBeDisabled();
  });

  it('confirmar enfileira, acompanha até concluir e avisa a tela', async () => {
    api.previaImportacao.mockResolvedValue(imp());
    api.confirmarImportacao.mockResolvedValue(imp({ status: 'na_fila' }));
    api.importacao.mockResolvedValue(imp({ status: 'concluida', criadas: 2, validas: 2 }));
    const aoConcluir = vi.fn();
    render(<ImportarCsv tipo="veiculos" aoFechar={vi.fn()} aoConcluir={aoConcluir} />);
    fireEvent.change(screen.getByLabelText('Arquivo CSV'), { target: { files: [arquivo()] } });
    fireEvent.click(await screen.findByRole('button', { name: /Confirmar importação/ }));
    expect(await screen.findByText('Processando…')).toBeInTheDocument();

    // O acompanhamento consulta a cada 1,5 s.
    expect(await screen.findByText('Concluída', {}, { timeout: 4000 })).toBeInTheDocument();
    expect(api.confirmarImportacao).toHaveBeenCalledWith(5);
    expect(aoConcluir).toHaveBeenCalledTimes(1);
  });

  it('com a fila síncrona o resultado já vem concluído', async () => {
    api.previaImportacao.mockResolvedValue(imp());
    api.confirmarImportacao.mockResolvedValue(imp({ status: 'concluida', criadas: 2 }));
    const aoConcluir = vi.fn();
    render(<ImportarCsv tipo="veiculos" aoFechar={vi.fn()} aoConcluir={aoConcluir} />);
    fireEvent.change(screen.getByLabelText('Arquivo CSV'), { target: { files: [arquivo()] } });

    fireEvent.click(await screen.findByRole('button', { name: /Confirmar importação/ }));

    expect(await screen.findByText('Concluída')).toBeInTheDocument();
    expect(aoConcluir).toHaveBeenCalledTimes(1);
    expect(api.importacao).not.toHaveBeenCalled();
  });

  it('fechar a prévia cancela e apaga o arquivo no servidor', async () => {
    api.previaImportacao.mockResolvedValue(imp());
    api.cancelarImportacao.mockResolvedValue(imp({ status: 'cancelada' }));
    const aoFechar = vi.fn();
    render(<ImportarCsv tipo="veiculos" aoFechar={aoFechar} aoConcluir={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Arquivo CSV'), { target: { files: [arquivo()] } });
    await screen.findByText('frota.csv');

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(api.cancelarImportacao).toHaveBeenCalledWith(5);
    expect(aoFechar).toHaveBeenCalled();
  });

  it('erro do envio aparece na tela', async () => {
    api.previaImportacao.mockRejectedValue({ response: { status: 422, data: { error: 'Faltam colunas obrigatórias no arquivo: PLACA. Baixe o modelo.' } } });
    render(<ImportarCsv tipo="veiculos" aoFechar={vi.fn()} aoConcluir={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Arquivo CSV'), { target: { files: [arquivo()] } });

    expect(await screen.findByText('Faltam colunas obrigatórias no arquivo: PLACA. Baixe o modelo.')).toBeInTheDocument();
  });

  it('falha no processamento mostra a mensagem', async () => {
    api.previaImportacao.mockResolvedValue(imp());
    api.confirmarImportacao.mockResolvedValue(imp({ status: 'falha', mensagem: 'O arquivo da importação não está mais disponível. Envie-o de novo.' }));
    render(<ImportarCsv tipo="veiculos" aoFechar={vi.fn()} aoConcluir={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Arquivo CSV'), { target: { files: [arquivo()] } });

    fireEvent.click(await screen.findByRole('button', { name: /Confirmar importação/ }));

    expect(await screen.findByText('Falhou')).toBeInTheDocument();
    expect(screen.getByText(/não está mais disponível/)).toBeInTheDocument();
  });
});
