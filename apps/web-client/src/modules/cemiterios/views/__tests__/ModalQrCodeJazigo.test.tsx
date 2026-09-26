import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ModalQrCodeJazigo } from '../ModalQrCodeJazigo';
import { cemiteriosApi, type Inumacao, type Jazigo } from '../../api';

const mockJazigo: Jazigo = {
  id: 101,
  park_id: 1,
  sector_id: 10,
  codigo: 'JAZ-TEST-101',
  tipo: 'jazigo',
  capacidade: 3,
  ocupacao: 1,
  estado: 'concedido',
  comprimento_m: 2.2,
  largura_m: 1.0,
  lat: -23.55052,
  lng: -46.633308,
  lock_version: 1,
  cemiterio: {
    id: 1,
    codigo: 'CEM-01',
    nome: 'Cemitério da Saudade',
    endereco: 'Rua das Flores, 100',
    tipo: 'municipal',
    situacao: 'ativo',
    responsavel: 'Carlos Silva',
    lat: null,
    lng: null,
  },
  setor: {
    id: 10,
    park_id: 1,
    codigo: 'QUADRA-A',
    descricao: 'Quadra Central',
    tipo_zona: 'jazigos',
    area_m2: 500,
  },
};

const mockOcupante: Inumacao = {
  id: 501,
  deceased_id: 9,
  plot_id: 101,
  sepultado_em: '2026-01-10',
  situacao: 'confirmada',
  origem: 'operacional',
  revisao_pendente: false,
  livro_referencia: null,
  carencia_desde: '2026-01-10',
  service_order_id: null,
  falecido: {
    id: 9,
    nome: 'Maria da Conceição',
    nascimento: '1950-05-01',
    falecimento: '2026-01-10',
    idade_obito: 75,
    certidao_numero: 'CERT-9001',
  },
};

describe('ModalQrCodeJazigo Component', () => {
  beforeEach(() => {
    vi.spyOn(cemiteriosApi, 'inumacoes').mockResolvedValue({ data: [], current_page: 1, last_page: 1, total: 0 });
  });

  it('renderiza os dados da plaqueta quando aberto com jazigo', async () => {
    const onFechar = vi.fn();
    render(
      <ModalQrCodeJazigo
        aberto={true}
        jazigo={mockJazigo}
        onFechar={onFechar}
      />
    );

    expect(screen.getByText('Cemitério da Saudade')).toBeInTheDocument();
    expect(screen.getByText('JAZ-TEST-101')).toBeInTheDocument();
    expect(screen.getByText('QUADRA-A')).toBeInTheDocument();
    expect(screen.getByText(/3 gaveta\(s\)/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /imprimir plaqueta/i })).toBeInTheDocument();

    await waitFor(() => {
      const img = screen.getByAltText(/qr code da unidade jaz-test-101/i);
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', expect.stringMatching(/^data:image\/(svg\+xml|png)/));
    });
  });

  it('aciona window.print ao clicar no botão de impressão', () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    render(
      <ModalQrCodeJazigo
        aberto={true}
        jazigo={mockJazigo}
        onFechar={vi.fn()}
      />
    );

    const botaoImprimir = screen.getByRole('button', { name: /imprimir plaqueta/i });
    fireEvent.click(botaoImprimir);

    expect(printSpy).toHaveBeenCalledTimes(1);
    printSpy.mockRestore();
  });

  it('não renderiza nada quando aberto é falso ou jazigo é nulo', () => {
    const { container } = render(
      <ModalQrCodeJazigo
        aberto={false}
        jazigo={null}
        onFechar={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('exibe o nome do ocupante quando há inumação confirmada vinculada ao jazigo', () => {
    render(
      <ModalQrCodeJazigo
        aberto={true}
        jazigo={mockJazigo}
        ocupantes={[mockOcupante]}
        onFechar={vi.fn()}
      />
    );

    expect(screen.getByText('Maria da Conceição')).toBeInTheDocument();
    expect(screen.getByText('Ocupante')).toBeInTheDocument();
  });

  it('não exibe seção de ocupante quando o jazigo não tem inumação confirmada', () => {
    render(
      <ModalQrCodeJazigo
        aberto={true}
        jazigo={mockJazigo}
        ocupantes={[]}
        onFechar={vi.fn()}
      />
    );

    expect(screen.queryByText('Ocupante')).not.toBeInTheDocument();
    expect(screen.queryByText('Ocupantes')).not.toBeInTheDocument();
  });
});
