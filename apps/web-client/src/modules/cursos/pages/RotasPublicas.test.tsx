import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

const cursosApi = vi.hoisted(() => ({ validarCertificado: vi.fn(), checkIn: vi.fn() }));
const auth = vi.hoisted(() => ({ isAuthenticated: false, isLoading: false, user: null, permissions: [], modules: [] }));

vi.mock('@sysgov/sdk', async (original) => ({
  ...(await original<typeof import('@sysgov/sdk')>()),
  sysgovApi: { cursos: cursosApi },
}));
vi.mock('@/core/auth/useAuth', () => ({ useAuth: () => auth }));

import { AppRouter } from '@/core/router/AppRouter';
import { CheckInPage } from './CheckInPage';

const OndeEstou: React.FC = () => {
  const location = useLocation();
  return <p data-testid="local">{location.pathname + location.search}</p>;
};

describe('Rotas públicas do módulo Cursos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.isAuthenticated = false;
  });

  it('a validação de certificado abre sem sessão', async () => {
    cursosApi.validarCertificado.mockResolvedValue({
      encontrado: true,
      certificado: { codigo: 'K7M2-Q9XR-4TWB', status: 'valido', tipo: 'curso', participante: 'Ana Souza', curso: 'Gestão de Contratos', carga_horaria: '8 horas', periodo: '01/10/2026 a 31/10/2026', data_emissao: '05/11/2026', orgao: 'Prefeitura A' },
    });

    render(
      <MemoryRouter initialEntries={['/validar-certificado/K7M2-Q9XR-4TWB']}>
        <AppRouter />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Certificado válido')).toBeInTheDocument();
    expect(screen.getByText('Ana Souza')).toBeInTheDocument();
    expect(cursosApi.validarCertificado).toHaveBeenCalledWith('K7M2-Q9XR-4TWB');
  });

  it('código inexistente mostra "não encontrado"', async () => {
    cursosApi.validarCertificado.mockRejectedValue(Object.assign(new Error('404'), { response: { status: 404 } }));

    render(
      <MemoryRouter initialEntries={['/validar-certificado/ZZZZ-ZZZZ-ZZZZ']}>
        <AppRouter />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Certificado não encontrado/)).toBeInTheDocument();
  });

  it('check-in sem sessão manda ao login preservando o token', async () => {
    render(
      <MemoryRouter initialEntries={['/cursos/check-in?t=abc.def']}>
        <Routes>
          <Route path="/cursos/check-in" element={<CheckInPage />} />
          <Route path="/login" element={<OndeEstou />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByTestId('local')).toHaveTextContent('/login?voltar=%2Fcursos%2Fcheck-in%3Ft%3Dabc.def');
    expect(cursosApi.checkIn).not.toHaveBeenCalled();
  });

  it('check-in com sessão registra a presença uma vez', async () => {
    auth.isAuthenticated = true;
    cursosApi.checkIn.mockResolvedValue({ ja_registrada: false, presenca: { agendamento: { aula: { titulo: 'Aula 3' } } } });

    render(
      <MemoryRouter initialEntries={['/cursos/check-in?t=abc.def']}>
        <Routes>
          <Route path="/cursos/check-in" element={<CheckInPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Presença registrada!')).toBeInTheDocument();
    expect(cursosApi.checkIn).toHaveBeenCalledTimes(1);
    expect(cursosApi.checkIn).toHaveBeenCalledWith('abc.def');
  });
});
