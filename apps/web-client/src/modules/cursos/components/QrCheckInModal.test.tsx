import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';

const cursosApi = vi.hoisted(() => ({ gerarQrCheckIn: vi.fn() }));

vi.mock('@sysgov/sdk', async (original) => ({
  ...(await original<typeof import('@sysgov/sdk')>()),
  sysgovApi: { cursos: cursosApi },
}));

import { INTERVALO_RENOVACAO_MS, QrCheckInModal } from './QrCheckInModal';

describe('QrCheckInModal', () => {
  const agendamento = { id: 42, turma_id: 1, aula_id: 1, inicio: '', fim: '', aula: { id: 1, titulo: 'Aula 1' } };

  beforeEach(() => {
    vi.useFakeTimers();
    cursosApi.gerarQrCheckIn.mockResolvedValue({ token: 't', url: 'u', qr_code: 'data:image/svg+xml;base64,AAA', expira_em: '', validade_segundos: 60 });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('gera o QR ao abrir e renova a cada 30 segundos (token vale 60s)', async () => {
    const { rerender } = render(<QrCheckInModal agendamento={agendamento} onClose={() => undefined} />);
    expect(INTERVALO_RENOVACAO_MS).toBe(30_000);
    expect(cursosApi.gerarQrCheckIn).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(cursosApi.gerarQrCheckIn).toHaveBeenCalledTimes(2);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(cursosApi.gerarQrCheckIn).toHaveBeenCalledTimes(3);
    expect(cursosApi.gerarQrCheckIn).toHaveBeenLastCalledWith(42);

    // Fechado: para de renovar.
    rerender(<QrCheckInModal agendamento={null} onClose={() => undefined} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(90_000);
    });
    expect(cursosApi.gerarQrCheckIn).toHaveBeenCalledTimes(3);
  });
});
