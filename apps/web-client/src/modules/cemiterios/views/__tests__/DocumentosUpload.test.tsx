import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DocumentosList } from '../../components/DocumentosList';
import { cemiteriosApi } from '../../api';
import type { Sucessao, SucessaoDocumento } from '../../api';

const documentoBase: SucessaoDocumento = {
  id: 21,
  tenant_id: 1,
  sucessao_id: 1,
  tipo: 'certidao_obito',
  arquivo: 'tenant/1/sucessao/1/certidao_obito/abc.pdf',
  hash: 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234',
  created_at: '2026-09-01T10:00:00Z',
  updated_at: '2026-09-01T10:00:00Z',
};

const sucessaoComDocumentos = (documentos: SucessaoDocumento[]): Sucessao =>
  ({
    id: 1,
    tenant_id: 1,
    park_id: 1,
    concession_id: 101,
    plot_id: 201,
    via: 'inventario_judicial',
    estado: 'em_analise',
    requerente_id: null,
    titular_falecido_id: null,
    data_falecimento: null,
    processo_referencia: 'PROC-1',
    parecer: null,
    lock_version: 1,
    created_at: '2026-09-01T10:00:00Z',
    updated_at: '2026-09-01T10:00:00Z',
    deleted_at: null,
    herdeiros: [],
    documentos,
    historico: [],
  }) as Sucessao;

describe('DocumentosList', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('carrega os documentos automaticamente ao montar e exibe o hash', async () => {
    vi.spyOn(cemiteriosApi, 'sucessao').mockResolvedValue(sucessaoComDocumentos([documentoBase]));

    render(<DocumentosList sucessaoId={1} />);

    await waitFor(() => {
      expect(screen.getByText('Certidão de Óbito')).toBeInTheDocument();
    });
    expect(screen.getByText(/a1b2c3d4/)).toBeInTheDocument();
    expect(cemiteriosApi.sucessao).toHaveBeenCalledWith(1);
  });

  it('exibe mensagem quando não há documentos', async () => {
    vi.spyOn(cemiteriosApi, 'sucessao').mockResolvedValue(sucessaoComDocumentos([]));

    render(<DocumentosList sucessaoId={1} />);

    await waitFor(() => {
      expect(screen.getByText('Nenhum documento anexado a este processo.')).toBeInTheDocument();
    });
  });

  it('faz upload de um novo documento', async () => {
    vi.spyOn(cemiteriosApi, 'sucessao').mockResolvedValue(sucessaoComDocumentos([]));
    vi.spyOn(cemiteriosApi, 'uploadDocumento').mockResolvedValue(documentoBase);

    render(<DocumentosList sucessaoId={1} />);

    await waitFor(() => expect(screen.getByText('Nenhum documento anexado a este processo.')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /Enviar Documento/i }));

    await waitFor(() => expect(screen.getByText('Enviar Documento', { selector: 'h2, [id], div' })).toBeTruthy());

    const arquivo = new File(['conteudo'], 'certidao.pdf', { type: 'application/pdf' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [arquivo] } });

    fireEvent.click(screen.getByRole('button', { name: /^Enviar$/i }));

    await waitFor(() => {
      expect(cemiteriosApi.uploadDocumento).toHaveBeenCalledWith(1, 'certidao_obito', arquivo);
    });
  });

  it('baixa um documento via URL assinada (integridade/expiração)', async () => {
    vi.spyOn(cemiteriosApi, 'sucessao').mockResolvedValue(sucessaoComDocumentos([documentoBase]));
    vi.spyOn(cemiteriosApi, 'downloadDocumento').mockResolvedValue({
      download_url: 'https://fake-s3.test/doc.pdf',
      expires_at: '2026-09-01T10:15:00Z',
    });
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    render(<DocumentosList sucessaoId={1} />);

    await waitFor(() => expect(screen.getByText('Certidão de Óbito')).toBeInTheDocument());

    fireEvent.click(screen.getByTitle('Baixar'));

    await waitFor(() => {
      expect(cemiteriosApi.downloadDocumento).toHaveBeenCalledWith(1, 21);
      expect(openSpy).toHaveBeenCalledWith('https://fake-s3.test/doc.pdf', '_blank', 'noopener,noreferrer');
    });
  });

  it('remove um documento após confirmação', async () => {
    vi.spyOn(cemiteriosApi, 'sucessao').mockResolvedValue(sucessaoComDocumentos([documentoBase]));
    vi.spyOn(cemiteriosApi, 'excluirDocumento').mockResolvedValue(undefined as never);
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<DocumentosList sucessaoId={1} />);

    await waitFor(() => expect(screen.getByText('Certidão de Óbito')).toBeInTheDocument());

    fireEvent.click(screen.getByTitle('Remover'));

    await waitFor(() => {
      expect(cemiteriosApi.excluirDocumento).toHaveBeenCalledWith(1, 21);
    });
  });

  it('oculta upload e remoção quando readonly', async () => {
    vi.spyOn(cemiteriosApi, 'sucessao').mockResolvedValue(sucessaoComDocumentos([documentoBase]));

    render(<DocumentosList sucessaoId={1} readonly />);

    await waitFor(() => expect(screen.getByText('Certidão de Óbito')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /Enviar Documento/i })).not.toBeInTheDocument();
    expect(screen.queryByTitle('Remover')).not.toBeInTheDocument();
    expect(screen.getByTitle('Baixar')).toBeInTheDocument();
  });
});
