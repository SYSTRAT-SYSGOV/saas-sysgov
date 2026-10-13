import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LocalFiscalizavelFormPage } from '../LocalFiscalizavelFormPage';
import { vistoriaApi, type LocalFiscalizavel } from '../../api';

vi.mock('@/modules/pessoas/hooks', () => ({
  usePessoaPicker: () => ({
    buscarPessoas: vi.fn().mockResolvedValue([]),
    criarPessoaRapido: vi.fn(),
  }),
}));

// PessoaPicker e Select vêm de @sysgov/ui (Radix) — substituídos por controles simples
// pra manter o teste focado no comportamento do formulário, mesmo padrão adotado quando
// um componente de terceiro não interage bem com jsdom.
vi.mock('@sysgov/ui', async () => {
  const actual = await vi.importActual<typeof import('@sysgov/ui')>('@sysgov/ui');
  return {
    ...actual,
    PessoaPicker: (props: { onChange: (id: number | null, pessoa?: { id: number; nome: string }) => void }) => (
      <button
        type="button"
        data-testid="pessoa-picker"
        onClick={() => props.onChange(10, { id: 10, nome: 'Proprietário Teste' })}
      >
        Selecionar proprietário
      </button>
    ),
    Select: (props: { value: unknown; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder?: string }) => (
      <select
        aria-label="tipo-select"
        value={(props.value as string) ?? ''}
        onChange={(e) => props.onChange(e.target.value)}
      >
        <option value="">{props.placeholder}</option>
        {props.options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    ),
  };
});

const mockLocal: LocalFiscalizavel = {
  id: 1,
  tenant_id: 1,
  proprietario_pessoa_id: 10,
  nome: 'Fazenda Boa Vista',
  tipo: 'propriedade_rural',
  classificacao_atividade: null,
  latitude: -25.4284,
  longitude: -49.2733,
  endereco: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  proprietario: { id: 10, nome: 'Proprietário Teste' },
};

describe('LocalFiscalizavelFormPage', () => {
  it('cria um novo local fiscalizável ao submeter o formulário', async () => {
    const onSaved = vi.fn();
    vi.spyOn(vistoriaApi, 'criarLocal').mockResolvedValue({ data: mockLocal } as any);

    render(<LocalFiscalizavelFormPage localId={null} onBack={vi.fn()} onSaved={onSaved} />);

    fireEvent.click(screen.getByTestId('pessoa-picker'));
    fireEvent.change(screen.getByPlaceholderText('Ex.: Fazenda Boa Vista'), { target: { value: 'Fazenda Boa Vista' } });
    fireEvent.change(screen.getByLabelText('tipo-select'), { target: { value: 'propriedade_rural' } });
    fireEvent.change(screen.getByPlaceholderText('-25.4284'), { target: { value: '-25.43' } });
    fireEvent.change(screen.getByPlaceholderText('-49.2733'), { target: { value: '-49.27' } });

    fireEvent.click(screen.getByRole('button', { name: /Cadastrar/i }));

    await waitFor(() => {
      expect(vistoriaApi.criarLocal).toHaveBeenCalledWith(
        expect.objectContaining({
          proprietario_pessoa_id: 10,
          nome: 'Fazenda Boa Vista',
          tipo: 'propriedade_rural',
          latitude: -25.43,
          longitude: -49.27,
        }),
      );
      expect(onSaved).toHaveBeenCalledWith(mockLocal);
    });
  });

  it('carrega os dados existentes ao editar um local', async () => {
    vi.spyOn(vistoriaApi, 'obterLocal').mockResolvedValue({ data: mockLocal } as any);

    render(<LocalFiscalizavelFormPage localId={1} onBack={vi.fn()} onSaved={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Fazenda Boa Vista')).toBeInTheDocument();
    });
  });
});
