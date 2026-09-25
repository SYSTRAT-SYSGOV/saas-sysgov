import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModalFichaCadastral } from '../ModalFichaCadastral';
import type { Jazigo, Concessao, Inumacao } from '../../api';

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

const mockConcessao: Concessao = {
  id: 1,
  numero: 'CONC-2026/042',
  plot_id: 101,
  holder_id: 5,
  modalidade: 'perpetua',
  inicio: '2020-01-15',
  termino: null,
  situacao: 'regular',
  pendencia_regularizacao: false,
  concessionario: {
    id: 5,
    nome: 'Maria de Lurdes Silveira',
  },
};

const mockOcupantes: Inumacao[] = [
  {
    id: 1,
    deceased_id: 10,
    plot_id: 101,
    sepultado_em: '2021-05-10',
    situacao: 'sepultado',
    origem: 'declaracao',
    revisao_pendente: false,
    livro_referencia: 'Livro 12, fls 45',
    carencia_desde: '2021-05-10',
    service_order_id: 99,
    falecido: {
      id: 10,
      nome: 'Sebastião Silveira',
      nascimento: '1940-02-12',
      falecimento: '2021-05-08',
      idade_obito: 81,
      certidao_numero: 'CERT-884920',
    },
    ordem_servico: {
      id: 99,
      ano: 2021,
      numero: 304,
      tipo: 'sepultamento',
      plot_id: 101,
      agendada_para: null,
      equipe: 'Equipe A',
      situacao: 'concluida',
      observacao: null,
      executada_em: '2021-05-10',
    },
  },
];

describe('ModalFichaCadastral Component', () => {
  it('renderiza a ficha oficial com dados do jazigo, concessão e inumação', () => {
    render(
      <ModalFichaCadastral
        aberto={true}
        jazigo={mockJazigo}
        concessao={mockConcessao}
        ocupantes={mockOcupantes}
        onFechar={vi.fn()}
      />
    );

    expect(screen.getByText(/Ficha Cadastral de Unidade de Sepultamento/i)).toBeInTheDocument();
    expect(screen.getByText('Cemitério da Saudade')).toBeInTheDocument();
    expect(screen.getByText('JAZ-TEST-101')).toBeInTheDocument();
    expect(screen.getByText('CONC-2026/042')).toBeInTheDocument();
    expect(screen.getByText('Maria de Lurdes Silveira')).toBeInTheDocument();
    expect(screen.getByText('Sebastião Silveira')).toBeInTheDocument();
    expect(screen.getByText('CERT-884920')).toBeInTheDocument();
    expect(screen.getByText(/#304\/2021/)).toBeInTheDocument();
  });

  it('aciona window.print ao clicar em Imprimir Ficha Cadastral', () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    render(
      <ModalFichaCadastral
        aberto={true}
        jazigo={mockJazigo}
        concessao={mockConcessao}
        ocupantes={mockOcupantes}
        onFechar={vi.fn()}
      />
    );

    const botaoImprimir = screen.getByRole('button', { name: /imprimir ficha cadastral/i });
    fireEvent.click(botaoImprimir);

    expect(printSpy).toHaveBeenCalledTimes(1);
    printSpy.mockRestore();
  });

  it('não renderiza conteúdo quando jazigo for nulo', () => {
    const { container } = render(
      <ModalFichaCadastral
        aberto={false}
        jazigo={null}
        onFechar={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });
});
