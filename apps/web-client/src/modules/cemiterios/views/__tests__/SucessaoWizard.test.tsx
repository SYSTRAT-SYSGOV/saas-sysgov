import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SucessaoWizard } from '../../components/SucessaoWizard';
import { cemiteriosApi } from '../../api';
import type { Concessao, Paginado, Sucessao } from '../../api';

const concessaoBase: Concessao = {
  id: 101,
  numero: 'CON-2024-001',
  plot_id: 201,
  holder_id: 301,
  tipo: 'perpetua',
  jazigo: { id: 201, codigo: 'JAZ-A-01', park_id: 1 },
  concessionario: { id: 301, nome: 'João Silva', titular_falecido: true },
} as unknown as Concessao;

const paginadoConcessoes = (data: Concessao[]): Paginado<Concessao> =>
  ({ total: data.length, per_page: 20, current_page: 1, last_page: 1, from: data.length ? 1 : 0, to: data.length, data }) as Paginado<Concessao>;

describe('SucessaoWizard', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const abrirEBuscar = async (resultados: Concessao[] = [concessaoBase]) => {
    vi.spyOn(cemiteriosApi, 'concessoes').mockResolvedValue(paginadoConcessoes(resultados));
    const onFechar = vi.fn();
    const onSucesso = vi.fn();

    render(<SucessaoWizard aberto onFechar={onFechar} onSucesso={onSucesso} />);

    fireEvent.change(screen.getByPlaceholderText(/Ex: CON-2024-001/i), { target: { value: 'CON-2024-001' } });
    fireEvent.click(screen.getByRole('button', { name: '' })); // botão de busca (ícone)

    if (resultados.length > 0) {
      await waitFor(() => expect(screen.getByText('CON-2024-001')).toBeInTheDocument());
    }

    return { onFechar, onSucesso };
  };

  it('busca e lista concessões pelo termo informado', async () => {
    await abrirEBuscar();

    expect(cemiteriosApi.concessoes).toHaveBeenCalledWith(
      expect.objectContaining({ q: 'CON-2024-001', per_page: 20 })
    );
    expect(screen.getByText(/João Silva/)).toBeInTheDocument();
  });

  it('exibe mensagem quando nenhuma concessão é encontrada', async () => {
    await abrirEBuscar([]);

    await waitFor(() => {
      expect(screen.getByText('Nenhuma concessão encontrada.')).toBeInTheDocument();
    });
  });

  it('não avança do passo 1 sem selecionar uma concessão', async () => {
    await abrirEBuscar();

    const botaoProximo = screen.getByRole('button', { name: /Próximo/i });
    expect(botaoProximo).toBeDisabled();
  });

  it('permite selecionar a via e avança para a confirmação', async () => {
    await abrirEBuscar();

    fireEvent.click(screen.getByText('CON-2024-001'));
    fireEvent.click(screen.getByRole('button', { name: /Próximo/i }));

    await waitFor(() => {
      expect(screen.getByText('Via de Sucessão')).toBeInTheDocument();
    });

    const radioAlvara = screen.getByDisplayValue('alvara_judicial');
    fireEvent.click(radioAlvara);
    expect(radioAlvara).toBeChecked();

    fireEvent.click(screen.getByRole('button', { name: /Próximo/i }));

    await waitFor(() => {
      expect(screen.getByText('Resumo da Abertura')).toBeInTheDocument();
      expect(screen.getByText('Alvará Judicial')).toBeInTheDocument();
    });
  });

  it('cria o processo de sucessão ao confirmar', async () => {
    vi.spyOn(cemiteriosApi, 'criarSucessao').mockResolvedValue({ id: 1 } as Sucessao);
    const { onFechar, onSucesso } = await abrirEBuscar();

    fireEvent.click(screen.getByText('CON-2024-001'));
    fireEvent.click(screen.getByRole('button', { name: /Próximo/i }));
    await waitFor(() => expect(screen.getByText('Via de Sucessão')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Próximo/i }));
    await waitFor(() => expect(screen.getByText('Resumo da Abertura')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /Criar Processo/i }));

    await waitFor(() => {
      expect(cemiteriosApi.criarSucessao).toHaveBeenCalledWith(
        expect.objectContaining({ concession_id: 101, via: 'inventario_judicial' })
      );
      expect(onSucesso).toHaveBeenCalled();
      expect(onFechar).toHaveBeenCalled();
    });
  });

  it('carrega automaticamente a concessão quando concessionId é informado', async () => {
    vi.spyOn(cemiteriosApi, 'concessao').mockResolvedValue(concessaoBase);
    render(<SucessaoWizard concessionId={101} aberto onFechar={vi.fn()} />);

    await waitFor(() => {
      expect(cemiteriosApi.concessao).toHaveBeenCalledWith(101);
      expect(screen.getByText('Via de Sucessão')).toBeInTheDocument();
    });
  });
});
