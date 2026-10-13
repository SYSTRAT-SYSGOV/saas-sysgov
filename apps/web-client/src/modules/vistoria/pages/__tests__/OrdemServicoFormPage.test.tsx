import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OrdemServicoFormPage } from '../OrdemServicoFormPage';
import { vistoriaApi, type OrdemServico, type PaginatedResponse, type LocalFiscalizavel } from '../../api';

vi.mock('@/core/orgunit', () => ({
  useOrgUnit: () => ({
    unitList: [{ id: 1, name: 'Secretaria de Agricultura', code: 'SEC-AGRI', type: 'secretaria', level: 0, depth: 0 }],
    loading: false,
  }),
}));

// Select vem de @sysgov/ui (Radix) — substituído por um <select> nativo pra manter o teste
// focado no comportamento do formulário, mesmo padrão já usado em LocalFiscalizavelFormPage.test.tsx.
vi.mock('@sysgov/ui', async () => {
  const actual = await vi.importActual<typeof import('@sysgov/ui')>('@sysgov/ui');
  return {
    ...actual,
    Select: (props: { value: unknown; onChange: (v: string) => void; options: { value: string | number; label: string }[]; placeholder?: string }) => (
      <select aria-label={props.placeholder} value={(props.value as string) ?? ''} onChange={(e) => props.onChange(e.target.value)}>
        <option value="">{props.placeholder}</option>
        {props.options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    ),
  };
});

const mockLocais: PaginatedResponse<LocalFiscalizavel> = {
  data: [{
    id: 7,
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
  }],
  current_page: 1, last_page: 1, per_page: 200, from: 1, to: 1, total: 1,
};

const mockOrdem: OrdemServico = {
  id: 1,
  tenant_id: 1,
  local_id: 7,
  org_unit_id: 1,
  fiscal_id: 5,
  tipo_acao: 'vistoria_rotina',
  criticidade: 'alta',
  status: 'agendada',
  resultado: null,
  data_prevista: '2026-11-12T00:00:00.000000Z',
  roteiro_deslocamento: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('OrdemServicoFormPage', () => {
  it('cria uma nova ordem de serviço ao submeter o formulário', async () => {
    vi.spyOn(vistoriaApi, 'listarLocais').mockResolvedValue({ data: mockLocais } as any);
    vi.spyOn(vistoriaApi, 'criarOrdemServico').mockResolvedValue({ data: mockOrdem } as any);
    const onSaved = vi.fn();

    const { container } = render(<OrdemServicoFormPage onBack={vi.fn()} onSaved={onSaved} />);

    await waitFor(() => {
      expect(screen.getByLabelText('Selecione o local...')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Selecione o local...'), { target: { value: '7' } });
    fireEvent.change(screen.getByLabelText('Selecione a unidade...'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Selecione o tipo...'), { target: { value: 'vistoria_rotina' } });
    fireEvent.change(screen.getByLabelText('Média (padrão)'), { target: { value: 'alta' } });

    const dataInput = container.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(dataInput, { target: { value: '2026-11-12' } });

    fireEvent.click(screen.getByRole('button', { name: /Criar Ordem de Serviço/i }));

    await waitFor(() => {
      expect(vistoriaApi.criarOrdemServico).toHaveBeenCalledWith(
        expect.objectContaining({
          local_id: 7,
          org_unit_id: 1,
          tipo_acao: 'vistoria_rotina',
          criticidade: 'alta',
          data_prevista: '2026-11-12',
        }),
      );
      expect(onSaved).toHaveBeenCalledWith(mockOrdem);
    });
  });
});
