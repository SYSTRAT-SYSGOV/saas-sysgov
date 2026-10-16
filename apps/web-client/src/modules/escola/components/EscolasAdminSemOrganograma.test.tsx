import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

vi.mock('../api', () => ({
  escolaApi: {
    escolas: vi.fn().mockResolvedValue([]),
    unidadesOrganograma: vi.fn().mockResolvedValue([]),
  },
  erroApi: (e: unknown) => ({ mensagem: String(e) }),
}));

import EscolasAdmin from './EscolasAdmin';

describe('EscolasAdmin — organograma vazio', () => {
  it('avisa que é preciso cadastrar a unidade no Organograma antes', async () => {
    render(<EscolasAdmin onToast={vi.fn()} />);

    fireEvent.click(await screen.findByText('Nova escola'));

    expect(await screen.findByText(/Ainda não há unidades no Organograma/)).toBeTruthy();
  });
});
