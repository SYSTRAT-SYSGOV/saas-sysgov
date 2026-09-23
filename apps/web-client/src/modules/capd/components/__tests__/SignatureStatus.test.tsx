import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SignatureStatus } from '../SignatureStatus';

describe('SignatureStatus Component', () => {
  it('renderiza corretamente o selo interno SHA-256', () => {
    const mockHash = 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0';
    render(
      <SignatureStatus
        tipo="sha256_interno"
        hash={mockHash}
      />
    );

    expect(screen.getByText('Selo Interno SHA-256')).toBeInTheDocument();
    expect(screen.getByText('a1b2c3d4...9abcdef0')).toBeInTheDocument();
    expect(screen.queryByText(/Validar/i)).not.toBeInTheDocument();
  });

  it('renderiza corretamente a assinatura ICP-Brasil com link de validação e serial', () => {
    const mockHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    const mockUrl = 'https://validador.iti.gov.br/validate?id=trans-998877';
    const mockSerial = 'CERT-2026-BR-88990011';

    render(
      <SignatureStatus
        tipo="icp_brasil"
        hash={mockHash}
        urlDocumentoAssinado={mockUrl}
        certificadoSerial={mockSerial}
        assinadoEm="2026-09-23T14:30:00Z"
      />
    );

    expect(screen.getByText('Assinatura ICP-Brasil')).toBeInTheDocument();
    expect(screen.getByText('e3b0c442...7852b855')).toBeInTheDocument();

    const link = screen.getByRole('link', { name: /Validar/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', mockUrl);
    expect(link).toHaveAttribute('target', '_blank');

    expect(screen.getByText('SN: 88990011')).toBeInTheDocument();
  });

  it('lida com hash ausente ou nulo exibindo texto de fallback sem lançar exceção', () => {
    render(
      <SignatureStatus
        tipo="sha256_interno"
        hash={null}
      />
    );

    expect(screen.getByText('Selo Interno SHA-256')).toBeInTheDocument();
    expect(screen.getByText('Pendente')).toBeInTheDocument();
  });

  it('aplica custom className quando fornecida', () => {
    render(
      <SignatureStatus
        tipo="icp_brasil"
        hash="12345678901234567890"
        className="my-custom-class"
      />
    );

    const container = screen.getByTestId('signature-status');
    expect(container).toHaveClass('my-custom-class');
  });
});
