import React, { useState } from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FiltrosAvancadosPessoas } from '../views/FiltrosAvancadosPessoas';
import type { TipoVinculo, TipoPessoa } from '../api';

function Wrapper() {
  const [busca, setBusca] = useState('');
  const [tipo, setTipo] = useState<TipoPessoa | null>(null);
  const [tipoVinculo, setTipoVinculo] = useState<TipoVinculo | null>(null);
  const [status, setStatus] = useState<'ativo' | 'inativo' | null>(null);
  const [falecido, setFalecido] = useState<boolean | null>(null);
  const [sexo, setSexo] = useState<string | null>(null);
  const [dataNascimentoDe, setDataNascimentoDe] = useState('');
  const [dataNascimentoAte, setDataNascimentoAte] = useState('');

  return (
    <FiltrosAvancadosPessoas
      busca={busca}
      onBuscaChange={setBusca}
      tipo={tipo}
      onTipoChange={setTipo}
      tipoVinculo={tipoVinculo}
      onTipoVinculoChange={setTipoVinculo}
      status={status}
      onStatusChange={setStatus}
      falecido={falecido}
      onFalecidoChange={setFalecido}
      sexo={sexo}
      onSexoChange={setSexo}
      dataNascimentoDe={dataNascimentoDe}
      onDataNascimentoDeChange={setDataNascimentoDe}
      dataNascimentoAte={dataNascimentoAte}
      onDataNascimentoAteChange={setDataNascimentoAte}
      onLimparFiltros={() => {
        setBusca('');
        setTipoVinculo(null);
        setStatus(null);
        setFalecido(null);
        setSexo(null);
        setDataNascimentoDe('');
        setDataNascimentoAte('');
      }}
    />
  );
}

describe('FiltrosAvancadosPessoas', () => {
  it('inicia com o acordion fechado, sem os campos de filtro visíveis', () => {
    render(<Wrapper />);

    expect(screen.getByRole('button', { name: /Filtros Avançados de Pessoas/i })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Digite nome ou CPF…')).not.toBeInTheDocument();
  });

  it('conta filtros combinados (busca + faixa de data de nascimento) e permite limpar tudo', () => {
    render(<Wrapper />);

    fireEvent.click(screen.getByRole('button', { name: /Filtros Avançados de Pessoas/i }));

    expect(screen.queryByText(/filtro ativo/)).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Digite nome ou CPF…'), { target: { value: 'Maria' } });
    fireEvent.change(screen.getByLabelText('Nascimento De'), { target: { value: '1980-01-01' } });

    expect(screen.getByText('2 filtros ativos')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Maria')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1980-01-01')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Limpar filtros/i }));

    expect(screen.queryByText(/filtro ativo/)).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('Digite nome ou CPF…')).toHaveValue('');
    expect(screen.getByLabelText('Nascimento De')).toHaveValue('');
  });
});
