import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OperadoresView } from '../OperadoresView';
import {
  cemiteriosApi,
  type HistoricoOperador,
} from '../../api';

vi.mock('@/core/rbac/useCan', () => ({
  useCan: () => ({
    can: () => true,
    cannot: () => false,
  }),
}));

const mockOperadores: any = {
  data: [
    {
      id: 1,
      tipo: 'coveiro' as const,
      nome: 'Sebastião Coveiro',
      documento_mascarado: '***.222.333-**',
      telefone: '(11) 97777-1111',
      matricula_funcional: 'MAT-9901',
      park_id: null,
      alvara_numero: null,
      alvara_validade: null,
      aso_validade: null,
      epi_ultimo_registro: null,
      is_alvara_vencido: false,
      status_alvara: 'dispensado' as const,
      status_saude_ocupacional: 'nao_informado' as const,
      situacao: 'ativo' as const,
      observacoes: 'Servidor estatutário.',
    },
    {
      id: 2,
      tipo: 'pedreiro' as const,
      nome: 'José das Obras',
      documento_mascarado: '**.333.444/0001-**',
      telefone: '(11) 98888-2222',
      matricula_funcional: null,
      park_id: null,
      alvara_numero: 'ALV-2026/044',
      alvara_validade: '2026-12-31',
      aso_validade: '2027-01-01',
      epi_ultimo_registro: null,
      is_alvara_vencido: false,
      status_alvara: 'valido' as const,
      status_saude_ocupacional: 'valido' as const,
      situacao: 'ativo' as const,
      observacoes: 'Pedreiro credenciado.',
    },
  ],
  total: 2,
  current_page: 1,
  last_page: 1,
  stats: {
    total_coveiros: 1,
    total_pedreiros: 1,
    alvaras_vencendo: 0,
    alvaras_vencidos: 0,
    aso_vencendo: 0,
    aso_vencido: 0,
  },
};

const mockHistorico: any = {
  operador: {
    id: 1,
    nome: 'Sebastião Coveiro',
    tipo: 'coveiro',
    matricula_funcional: 'MAT-9901',
    alvara_numero: null,
    status_alvara: 'dispensado',
  },
  total_operacoes: 1,
  operacoes: [
    {
      id: 101,
      plot_id: 10,
      protocolo: 'SEP-2026-0001',
      posicao: 1,
      declaracao_obito: 'DO-12345',
      tipo_urna: 'madeira',
      situacao: 'confirmada',
      observacoes: null,
      fotos: [],
      certidao_anexo: null,
      sepultado_em: '2026-08-20',
      falecido: {
        id: 1,
        nome: 'Falecido Teste',
        nascimento: '1950-01-01',
        falecimento: '2026-08-18',
        declaracao_obito: 'DO-12345',
      },
      jazigo: {
        id: 10,
        park_id: 1,
        sector_id: 1,
        codigo: 'JAZ-01',
        tipo: 'jazigo',
        capacidade: 3,
        ocupacao: 1,
        estado: 'ocupado',
        lock_version: 1,
      },
    },
  ],
  current_page: 1,
  last_page: 1,
};

describe('OperadoresView Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(cemiteriosApi, 'operadores').mockResolvedValue(mockOperadores as any);
    vi.spyOn(cemiteriosApi, 'historicoOperador').mockResolvedValue(mockHistorico as any);
    vi.spyOn(cemiteriosApi, 'parques').mockResolvedValue([]);
  });

  it('renderiza os cards de indicadores operacionais e tabela de profissionais', async () => {
    render(<OperadoresView />);

    expect(screen.getByText('Coveiros Ativos')).toBeInTheDocument();
    expect(screen.getByText('Pedreiros Credenciados')).toBeInTheDocument();
    expect(screen.getByText('Alvarás a Vencer (30 dias)')).toBeInTheDocument();
    expect(screen.getByText('Alvarás Vencidos', { selector: 'span' })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Sebastião Coveiro')).toBeInTheDocument();
      expect(screen.getByText('José das Obras')).toBeInTheDocument();
      expect(screen.getByText('Coveiro Municipal')).toBeInTheDocument();
      expect(screen.getByText('Pedreiro de Obras')).toBeInTheDocument();
      expect(screen.getByText(/Doc: \*\*\*\.222\.333-\*\*/)).toBeInTheDocument();
      expect(screen.getAllByText('ASO Válido').length).toBeGreaterThan(0);
    });
  });

  it('permite abrir o modal para cadastrar novo profissional operacional', async () => {
    render(<OperadoresView />);

    const btnNovo = screen.getByRole('button', { name: /Cadastrar Profissional/i });
    fireEvent.click(btnNovo);

    expect(screen.getByText('Cadastrar Profissional Operacional')).toBeInTheDocument();
    expect(screen.getByLabelText(/Nome Completo/i)).toBeInTheDocument();
  });

  it('permite abrir o Drawer de histórico de sepultamentos e obras do operador', async () => {
    render(<OperadoresView />);

    await waitFor(() => {
      expect(screen.getByText('Sebastião Coveiro')).toBeInTheDocument();
    });

    const botoesHistorico = screen.getAllByRole('button', { name: /Histórico/i });
    fireEvent.click(botoesHistorico[0]);

    await waitFor(() => {
      expect(screen.getByText('Histórico Operacional')).toBeInTheDocument();
      expect(screen.getByText('Falecido Teste')).toBeInTheDocument();
      expect(screen.getByText(/JAZ-01/i)).toBeInTheDocument();
    });
  });

  it('filtra por status de saúde ocupacional', async () => {
    render(<OperadoresView />);

    await waitFor(() => expect(screen.getByText('Sebastião Coveiro')).toBeInTheDocument());

    const selects = screen.getAllByRole('combobox');
    const selectSaude = selects.find((el) => el.textContent?.includes('Saúde Ocupacional')) ?? selects[selects.length - 1];
    fireEvent.change(selectSaude, { target: { value: 'vencido' } });

    await waitFor(() => {
      expect(cemiteriosApi.operadores).toHaveBeenLastCalledWith(
        expect.objectContaining({ status_saude_ocupacional: 'vencido' })
      );
    });
  });
});
