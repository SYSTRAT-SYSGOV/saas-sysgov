import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { PainelRegulatorioDrawer } from '../PainelRegulatorioDrawer';
import { BadgeAlertaRegulatorio, GrupoAlertasRegulorios } from '../BadgeAlertaRegulatorio';
import type { Jazigo, Concessao, Inumacao } from '../../api';
import type { AlertaRegulatorio } from '../../regulamentacao.utils';

describe('PainelRegulatorioDrawer & BadgeAlertaRegulatorio', () => {
  const jazigo: Pick<Jazigo, 'id' | 'codigo' | 'estado' | 'tipo' | 'ocupacao'> = {
    id: 1,
    codigo: 'JAZ-100',
    estado: 'ocupado',
    tipo: 'jazigo',
    ocupacao: 1,
  };

  it('renderiza badge individual com contador de dias', () => {
    const alerta: AlertaRegulatorio = {
      tipo: 'concessao_a_vencer',
      severidade: 'atencao',
      rotulo: 'Concessão a Vencer',
      descricao: 'Vence em 25 dias',
      dias: 25,
    };

    render(<BadgeAlertaRegulatorio alerta={alerta} />);
    expect(screen.getByText('Concessão a Vencer')).toBeInTheDocument();
    expect(screen.getByText('25d')).toBeInTheDocument();
  });

  it('renderiza grupo de alertas com indicador de excedente', () => {
    const alertas: AlertaRegulatorio[] = [
      { tipo: 'concessao_vencida', severidade: 'critico', rotulo: 'Concessão Vencida', descricao: 'Vencida' },
      { tipo: 'exumacao_elegivel', severidade: 'info', rotulo: 'Elegível p/ Exumação', descricao: 'Elegível' },
      { tipo: 'risco_estrutural', severidade: 'critico', rotulo: 'Risco', descricao: 'Risco' },
    ];

    render(<GrupoAlertasRegulorios alertas={alertas} limite={2} />);
    expect(screen.getByText('Concessão Vencida')).toBeInTheDocument();
    expect(screen.getByText('Elegível p/ Exumação')).toBeInTheDocument();
    expect(screen.getByText('+1')).toBeInTheDocument();
  });

  it('renderiza o painel regulatório no drawer com diagnóstico sanitário e concessão', () => {
    const concessao: Concessao = {
      id: 1,
      numero: 'CONC-2023/10',
      plot_id: 1,
      holder_id: 10,
      modalidade: 'temporaria',
      inicio: '2023-01-01',
      termino: '2024-01-01', // Vencida
      situacao: 'ativa',
      pendencia_regularizacao: false,
    };

    const inumacao: Inumacao = {
      id: 1,
      deceased_id: 1,
      plot_id: 1,
      sepultado_em: '2020-01-01', // Mais de 3 anos -> elegível
      situacao: 'sepultado',
      origem: 'guia',
      revisao_pendente: false,
      livro_referencia: 'Livro 1',
      carencia_desde: '2020-01-01',
      service_order_id: null,
      falecido: {
        id: 1,
        nome: 'Maria Francisca',
        nascimento: '1930-01-01',
        falecimento: '2019-12-30',
        idade_obito: 90,
        certidao_numero: '999',
      },
    };

    const onEmitirNotificacao = vi.fn();
    const onSolicitarExumacao = vi.fn();

    render(
      <PainelRegulatorioDrawer
        jazigo={jazigo}
        concessao={concessao}
        inumacoes={[inumacao]}
        onEmitirNotificacao={onEmitirNotificacao}
        onSolicitarExumacao={onSolicitarExumacao}
      />
    );

    expect(screen.getByText(/Inteligência Regulatória & Sanitária/i)).toBeInTheDocument();
    expect(screen.getByText('Concessão Vencida')).toBeInTheDocument();
    expect(screen.getByText('Maria Francisca')).toBeInTheDocument();
    expect(screen.getByText('Apto p/ Exumação')).toBeInTheDocument();

    // Acionar botão de notificação
    const btnNotif = screen.getByRole('button', { name: /Emitir Notificação ao Titular/i });
    fireEvent.click(btnNotif);
    expect(onEmitirNotificacao).toHaveBeenCalledWith(concessao);

    // Acionar botão de exumação
    const btnExum = screen.getByRole('button', { name: /Iniciar Translado ao Ossuário/i });
    fireEvent.click(btnExum);
    expect(onSolicitarExumacao).toHaveBeenCalledWith(inumacao);
  });
});
