import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { vistoriaApi } from '../../api';
import { campoDB } from '../db';
import { CampoHomeView } from '../CampoHomeView';

const ordemMock = {
  id: 1,
  tenant_id: 1,
  local_id: 10,
  org_unit_id: 20,
  fiscal_id: 30,
  tipo_acao: 'vistoria_rotina' as const,
  criticidade: 'alta' as const,
  status: 'agendada' as const,
  resultado: null,
  data_prevista: '2026-11-01',
  roteiro_deslocamento: null,
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
  local: { id: 10, nome: 'Fazenda Teste' },
};

describe('CampoHomeView', () => {
  beforeEach(async () => {
    localStorage.clear();
    localStorage.setItem('sysgov_auth_token', 'token-de-teste');
    await campoDB.pacoteDoDia.clear();
    await campoDB.filaSincronizacao.clear();
    vi.restoreAllMocks();
  });

  it('mostra estado vazio quando não há pacote baixado', async () => {
    render(<CampoHomeView />);

    expect(await screen.findByText('Nenhum pacote baixado')).toBeInTheDocument();
  });

  it('baixa o pacote do dia e lista as ordens', async () => {
    vi.spyOn(vistoriaApi, 'obterPacoteDoDia').mockResolvedValue({
      data: { gerado_em: '2026-10-06T12:00:00Z', ordens: [{ ordem: ordemMock, historico_local: [] }] },
    } as any);

    render(<CampoHomeView />);
    await screen.findByText('Nenhum pacote baixado');

    fireEvent.click(screen.getAllByRole('button', { name: /baixar pacote do dia/i })[0]);

    expect(await screen.findByText('Fazenda Teste')).toBeInTheDocument();
    expect(screen.getByText(/OS #1/)).toBeInTheDocument();
  });
});
