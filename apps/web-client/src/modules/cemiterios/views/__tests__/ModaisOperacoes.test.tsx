import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ModalNovaInumacao } from '../operacoes/ModalNovaInumacao';
import { ModalNovaExumacao } from '../operacoes/ModalNovaExumacao';
import { ModalNovaTrasladacao } from '../operacoes/ModalNovaTrasladacao';
import { cemiteriosApi } from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual('../../api');
  return {
    ...actual,
    cemiteriosApi: {
      jazigos: vi.fn().mockResolvedValue({
        data: [
          {
            id: 101,
            codigo: 'JAZ-101',
            estado: 'disponivel',
            tipo: 'gaveta',
            setor: { codigo: 'SET-A', descricao: 'Setor das Palmeiras' },
          },
        ],
      }),
      inumacoes: vi.fn().mockResolvedValue({
        data: [
          {
            id: 201,
            sepultado_em: '2023-01-15T10:00:00',
            carencia_desde: '2023-01-15T10:00:00',
            falecido: { id: 1, nome: 'Sebastião Alves da Silva' },
            jazigo: { id: 101, codigo: 'JAZ-101' },
          },
        ],
      }),
      inumar: vi.fn().mockResolvedValue({ id: 501 }),
      inumarHistorica: vi.fn().mockResolvedValue({ id: 502 }),
      exumar: vi.fn().mockResolvedValue({ id: 503 }),
      trasladar: vi.fn().mockResolvedValue({ id: 504 }),
    },
  };
});

describe('ModaisOperacoes Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ModalNovaInumacao', () => {
    it('renderiza o modal de inumação em tamanho amplo com todas as seções estruturadas', async () => {
      render(
        <ModalNovaInumacao
          aberto={true}
          modoInicial="regular"
          cemiterioAtivo={{ id: 1, nome: 'Cemitério da Saudade', codigo: 'CEM-01', tipo: 'municipal', situacao: 'ativo', endereco: 'Rua A', responsavel: 'Admin', lat: 0, lng: 0 }}
          cemiterioAtivoId={1}
          onFechar={vi.fn()}
          onSucesso={vi.fn()}
        />
      );

      // Título e seções
      expect(screen.getByText('Nova Inumação')).toBeInTheDocument();
      expect(screen.getByText('1. Identificação do Falecido')).toBeInTheDocument();
      expect(screen.getByText('2. Registro Civil e Certidão de Óbito')).toBeInTheDocument();
      expect(screen.getByText('3. Destinação e Localização do Jazigo')).toBeInTheDocument();
      expect(screen.getByText('4. Agendamento e Equipe Operacional')).toBeInTheDocument();

      // Upload amigável de certidão (sem texto quebrado do navegador)
      expect(screen.getByText('Clique para anexar a certidão digitalizada')).toBeInTheDocument();

      // Botão de confirmação
      expect(screen.getByRole('button', { name: /confirmar inumação/i })).toBeInTheDocument();
    });

    it('permite alternar para Lançamento de Inumação Histórica exibindo campo de Livro/Folha', async () => {
      render(
        <ModalNovaInumacao
          aberto={true}
          modoInicial="historica"
          cemiterioAtivo={null}
          cemiterioAtivoId={1}
          onFechar={vi.fn()}
          onSucesso={vi.fn()}
        />
      );

      expect(screen.getByText('Lançamento de Inumação Histórica')).toBeInTheDocument();
      expect(screen.getByText(/5\. Assento no Livro de Registro Histórico/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Livro B-12, Folha 45, Termo/i)).toBeInTheDocument();
    });
  });

  describe('ModalNovaExumacao', () => {
    it('renderiza o modal de exumação com suporte a Ordinária e Judicial', async () => {
      render(
        <ModalNovaExumacao
          aberto={true}
          modoInicial="ordinaria"
          cemiterioAtivoId={1}
          onFechar={vi.fn()}
          onSucesso={vi.fn()}
        />
      );

      expect(screen.getByText('Exumação Ordinária')).toBeInTheDocument();
      expect(screen.getByText('1. Sepultamento Objeto da Exumação')).toBeInTheDocument();
      expect(screen.getByText('2. Destino e Agendamento da Operação')).toBeInTheDocument();

      // Alterna para Judicial
      const abaJudicial = screen.getByRole('tab', { name: /Exumação Judicial/i });
      fireEvent.click(abaJudicial);

      expect(await screen.findByText('3. Dados do Mandado Judicial')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('0000000-00.0000.8.00.0000')).toBeInTheDocument();
      expect(screen.getByText('Clique para anexar o mandado ou decisão judicial')).toBeInTheDocument();
    });
  });

  describe('ModalNovaTrasladacao', () => {
    it('renderiza o modal de trasladação com opção de destino interno e externo', async () => {
      render(
        <ModalNovaTrasladacao
          aberto={true}
          cemiterioAtivoId={1}
          onFechar={vi.fn()}
          onSucesso={vi.fn()}
        />
      );

      expect(screen.getByText('Trasladação de Restos Mortais')).toBeInTheDocument();
      expect(screen.getByText('1. Sepultamento de Origem')).toBeInTheDocument();
      expect(screen.getByText('2. Modalidade e Local de Destino')).toBeInTheDocument();

      // Destino interno ativo por padrão
      expect(screen.getByText('Jazigo / Gaveta de Destino (Interno)')).toBeInTheDocument();

      // Alterna para Destino Externo
      const tabExterno = screen.getByRole('tab', { name: /Destino Externo/i });
      fireEvent.click(tabExterno);

      expect(await screen.findByText('Destino Externo (Município / Necrópole)')).toBeInTheDocument();
      expect(screen.getByText('Documento Sanitário / Guia de Traslado')).toBeInTheDocument();
    });
  });
});
