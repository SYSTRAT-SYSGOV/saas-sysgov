import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const sysgovApiMock = vi.hoisted(() => ({
  forgotPassword: vi.fn(),
  resetPassword: vi.fn(),
  cursos: { verificarEmail: vi.fn() },
}));

vi.mock('@sysgov/sdk', async (original) => ({
  ...(await original<typeof import('@sysgov/sdk')>()),
  sysgovApi: sysgovApiMock,
}));

import { VerificarEmailPage } from './VerificarEmailPage';
import { EsqueciSenhaPage } from './EsqueciSenhaPage';
import { RedefinirSenhaPage } from './RedefinirSenhaPage';

function erro422(mensagem: string) {
  return Object.assign(new Error(mensagem), { response: { status: 422, data: { errors: { token: [mensagem] } } } });
}

describe('Verificação de e-mail — tarefa 6.3 (estados sucesso, expirado, já usado)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('cenário sucesso: mostra confirmação e o link para entrar', async () => {
    sysgovApiMock.cursos.verificarEmail.mockResolvedValue({ mensagem: 'E-mail verificado. Você já pode entrar.' });

    render(
      <MemoryRouter initialEntries={['/verificar-email?token=abc123']}>
        <VerificarEmailPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('E-mail verificado com sucesso!')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/login');
    expect(sysgovApiMock.cursos.verificarEmail).toHaveBeenCalledWith('abc123');
  });

  it('cenário expirado: mostra que o link venceu e orienta pedir um novo', async () => {
    sysgovApiMock.cursos.verificarEmail.mockRejectedValue(erro422('Link de verificação vencido. Peça um novo.'));

    render(
      <MemoryRouter initialEntries={['/verificar-email?token=velho']}>
        <VerificarEmailPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Link vencido')).toBeInTheDocument();
    expect(screen.getByText(/Link de verificação vencido/)).toBeInTheDocument();
  });

  it('cenário já usado: mostra que o link já foi usado e permite ir direto pro login', async () => {
    sysgovApiMock.cursos.verificarEmail.mockRejectedValue(erro422('Este link já foi usado. Se ainda não conseguiu entrar, peça um novo.'));

    render(
      <MemoryRouter initialEntries={['/verificar-email?token=usado']}>
        <VerificarEmailPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Link já utilizado')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Entrar' })).toBeInTheDocument();
  });

  it('token ausente na URL não chama a API e mostra link inválido', async () => {
    render(
      <MemoryRouter initialEntries={['/verificar-email']}>
        <VerificarEmailPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Link inválido')).toBeInTheDocument();
    expect(sysgovApiMock.cursos.verificarEmail).not.toHaveBeenCalled();
  });
});

describe('Esqueci minha senha', () => {
  beforeEach(() => vi.clearAllMocks());

  it('envia o pedido e mostra a mensagem genérica de sucesso', async () => {
    sysgovApiMock.forgotPassword.mockResolvedValue({ message: 'ok' });

    render(
      <MemoryRouter initialEntries={['/esqueci-senha']}>
        <EsqueciSenhaPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'ana@teste.gov.br' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar link' }));

    expect(await screen.findByTestId('esqueci-senha-enviado')).toBeInTheDocument();
    expect(sysgovApiMock.forgotPassword).toHaveBeenCalledWith('ana@teste.gov.br');
  });
});

describe('Redefinir senha', () => {
  beforeEach(() => vi.clearAllMocks());

  it('redefine a senha com sucesso', async () => {
    sysgovApiMock.resetPassword.mockResolvedValue({ message: 'ok' });

    render(
      <MemoryRouter initialEntries={['/redefinir-senha?token=xyz']}>
        <RedefinirSenhaPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: 'Senha@1234' } });
    fireEvent.change(screen.getByLabelText('Confirme a nova senha'), { target: { value: 'Senha@1234' } });
    fireEvent.click(screen.getByRole('button', { name: 'Redefinir senha' }));

    await waitFor(() => expect(sysgovApiMock.resetPassword).toHaveBeenCalledWith('xyz', 'Senha@1234', 'Senha@1234'));
    expect(await screen.findByTestId('redefinicao-concluida')).toBeInTheDocument();
  });

  it('token vencido mostra o erro devolvido pela API', async () => {
    sysgovApiMock.resetPassword.mockRejectedValue(erro422('Token inválido ou expirado.'));

    render(
      <MemoryRouter initialEntries={['/redefinir-senha?token=velho']}>
        <RedefinirSenhaPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: 'Senha@1234' } });
    fireEvent.change(screen.getByLabelText('Confirme a nova senha'), { target: { value: 'Senha@1234' } });
    fireEvent.click(screen.getByRole('button', { name: 'Redefinir senha' }));

    expect(await screen.findByText('Token inválido ou expirado.')).toBeInTheDocument();
  });
});
