import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { IntegracoesView } from '../IntegracoesView';
import { meioAmbienteApi, type IntegracaoOrgaoControle } from '../../api';

const integracaoAtiva: IntegracaoOrgaoControle = {
  id: 1,
  nome: 'IBAMA — consulta',
  orgao: 'ibama',
  api_key_prefixo: 'mamb_AbC1234',
  is_active: true,
  ultimo_uso_em: null,
  envio_ativo: false,
  envio_url: null,
  created_at: '2026-10-09T10:00:00-03:00',
};

describe('IntegracoesView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(meioAmbienteApi, 'listarIntegracoes').mockResolvedValue([integracaoAtiva]);
    vi.spyOn(meioAmbienteApi, 'criarIntegracao').mockResolvedValue({ ...integracaoAtiva, id: 2, api_key: 'mamb_chave-em-texto-puro' });
    vi.spyOn(meioAmbienteApi, 'revogarIntegracao').mockResolvedValue({ ...integracaoAtiva, is_active: false });
  });

  it('lista as credenciais mostrando só o prefixo da chave', async () => {
    render(<IntegracoesView />);

    await waitFor(() => expect(screen.getByText('IBAMA — consulta')).toBeInTheDocument());
    expect(screen.getByText('mamb_AbC1234…')).toBeInTheDocument();
    expect(screen.getByText('Ativa')).toBeInTheDocument();
  });

  it('cria credencial e exibe a chave uma única vez', async () => {
    render(<IntegracoesView />);
    await waitFor(() => expect(screen.getByText('IBAMA — consulta')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'CETESB' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar Credencial' }));

    await waitFor(() => expect(screen.getByText('mamb_chave-em-texto-puro')).toBeInTheDocument());
    expect(meioAmbienteApi.criarIntegracao).toHaveBeenCalledWith({ nome: 'CETESB', orgao: 'ibama' });

    fireEvent.click(screen.getByRole('button', { name: 'Já copiei a chave' }));
    await waitFor(() => expect(screen.queryByText('mamb_chave-em-texto-puro')).not.toBeInTheDocument());
  });

  it('envia URL e token quando o envio ativo é configurado', async () => {
    render(<IntegracoesView />);
    await waitFor(() => expect(screen.getByText('IBAMA — consulta')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'INEA' } });
    fireEvent.change(screen.getByLabelText('URL de envio ativo (opcional)'), { target: { value: 'https://orgao.example.gov.br/recebimento' } });
    expect(screen.getByRole('button', { name: 'Criar Credencial' })).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Token do órgão para o envio'), { target: { value: 'segredo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar Credencial' }));

    await waitFor(() =>
      expect(meioAmbienteApi.criarIntegracao).toHaveBeenCalledWith({
        nome: 'INEA',
        orgao: 'ibama',
        envio_url: 'https://orgao.example.gov.br/recebimento',
        envio_token: 'segredo',
      }),
    );
  });

  it('revoga a credencial após confirmação no modal', async () => {
    render(<IntegracoesView />);
    await waitFor(() => expect(screen.getByText('IBAMA — consulta')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Revogar' }));
    expect(meioAmbienteApi.revogarIntegracao).not.toHaveBeenCalled();

    const botoes = await screen.findAllByRole('button', { name: 'Revogar' });
    fireEvent.click(botoes[botoes.length - 1]);

    await waitFor(() => expect(meioAmbienteApi.revogarIntegracao).toHaveBeenCalledWith(1));
  });
});
