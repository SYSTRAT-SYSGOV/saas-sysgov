import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { CampoInscricao } from '@sysgov/sdk';

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

import { CamposInscricaoForm } from './CamposInscricaoForm';

const campo = (extra: Partial<CampoInscricao>): CampoInscricao => ({
  id: 1,
  curso_id: 1,
  rotulo: 'Campo',
  tipo: 'texto',
  obrigatorio: false,
  opcoes: null,
  ordem: 1,
  ativo: true,
  ...extra,
});

describe('CamposInscricaoForm — tarefa 6.5', () => {
  it('sem campos, não renderiza nada', () => {
    const { container } = render(<CamposInscricaoForm campos={[]} valores={{}} onChange={() => undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('texto: um Input de texto, rótulo marca obrigatório', () => {
    const onChange = vi.fn();
    render(<CamposInscricaoForm campos={[campo({ rotulo: 'Órgão de origem', obrigatorio: true })]} valores={{}} onChange={onChange} />);

    const input = screen.getByLabelText('Órgão de origem (obrigatório)');
    fireEvent.change(input, { target: { value: 'Secretaria X' } });
    expect(onChange).toHaveBeenCalledWith(1, 'Secretaria X');
  });

  it('texto_longo: um textarea', () => {
    const onChange = vi.fn();
    render(<CamposInscricaoForm campos={[campo({ id: 2, tipo: 'texto_longo', rotulo: 'Justificativa' })]} valores={{}} onChange={onChange} />);

    const area = screen.getByLabelText('Justificativa');
    expect(area.tagName).toBe('TEXTAREA');
    fireEvent.change(area, { target: { value: 'Texto longo' } });
    expect(onChange).toHaveBeenCalledWith(2, 'Texto longo');
  });

  it('numero: Input type=number', () => {
    const onChange = vi.fn();
    render(<CamposInscricaoForm campos={[campo({ id: 3, tipo: 'numero', rotulo: 'Idade' })]} valores={{}} onChange={onChange} />);

    const input = screen.getByLabelText('Idade') as HTMLInputElement;
    expect(input.type).toBe('number');
    fireEvent.change(input, { target: { value: '30' } });
    expect(onChange).toHaveBeenCalledWith(3, '30');
  });

  it('data: Input type=date', () => {
    const onChange = vi.fn();
    render(<CamposInscricaoForm campos={[campo({ id: 4, tipo: 'data', rotulo: 'Data de nascimento' })]} valores={{}} onChange={onChange} />);

    const input = screen.getByLabelText('Data de nascimento') as HTMLInputElement;
    expect(input.type).toBe('date');
    fireEvent.change(input, { target: { value: '2000-01-01' } });
    expect(onChange).toHaveBeenCalledWith(4, '2000-01-01');
  });

  it('selecao: mostra as opções configuradas', async () => {
    render(<CamposInscricaoForm campos={[campo({ id: 5, tipo: 'selecao', rotulo: 'Unidade', opcoes: ['Sede', 'Filial'] })]} valores={{}} onChange={() => undefined} />);
    expect(await screen.findByText('Unidade')).toBeInTheDocument();
  });

  it('caixa_marcacao: Switch desmarcado por padrão, alterna para "sim"/"nao"', () => {
    const onChange = vi.fn();
    render(<CamposInscricaoForm campos={[campo({ id: 6, tipo: 'caixa_marcacao', rotulo: 'Aceita contato por WhatsApp' })]} valores={{}} onChange={onChange} />);

    const switchEl = screen.getByRole('switch', { name: 'Aceita contato por WhatsApp' });
    expect(switchEl).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(switchEl);
    expect(onChange).toHaveBeenCalledWith(6, 'sim');
  });

  it('caixa_marcacao: reflete valor "sim" já respondido como marcado', () => {
    render(
      <CamposInscricaoForm
        campos={[campo({ id: 7, tipo: 'caixa_marcacao', rotulo: 'Concordo' })]}
        valores={{ 7: 'sim' }}
        onChange={() => undefined}
      />,
    );
    expect(screen.getByRole('switch', { name: 'Concordo' })).toHaveAttribute('aria-checked', 'true');
  });
});
