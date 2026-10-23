import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useFormValidationModal } from './useFormValidationModal';

function Exemplo({ erro }: { erro?: unknown }) {
  const { modal, validar, tratarErro } = useFormValidationModal();
  return (
    <div>
      {modal}
      <button onClick={() => validar([['Nome', ' '], ['E-mail', 'a@b.gov.br'], ['Grupos', []]])}>vazios</button>
      <button onClick={() => validar([['Nome', 'Ana']])}>cheio</button>
      <button onClick={() => (tratarErro(erro) ? null : screen.getByText('vazios').setAttribute('data-outro', '1'))}>erro</button>
    </div>
  );
}

describe('useFormValidationModal', () => {
  it('abre a modal com um item por campo obrigatório vazio', () => {
    render(<Exemplo />);
    fireEvent.click(screen.getByText('vazios'));
    expect(screen.getByText('O campo Nome é obrigatório.')).toBeTruthy();
    expect(screen.getByText('O campo Grupos é obrigatório.')).toBeTruthy();
    expect(screen.queryByText('O campo E-mail é obrigatório.')).toBeNull();
  });

  it('não abre a modal quando tudo está preenchido', () => {
    render(<Exemplo />);
    fireEvent.click(screen.getByText('cheio'));
    expect(screen.queryByText('Verifique os campos destacados')).toBeNull();
  });

  it('lista os erros de um 422 do backend', () => {
    const erro = { response: { status: 422, data: { errors: { email: ['O e-mail já está em uso.'] } } } };
    render(<Exemplo erro={erro} />);
    fireEvent.click(screen.getByText('erro'));
    expect(screen.getByText('O e-mail já está em uso.')).toBeTruthy();
  });

  it('não trata como validação um erro que não é 422', () => {
    render(<Exemplo erro={{ response: { status: 500, data: { message: 'x' } } }} />);
    fireEvent.click(screen.getByText('erro'));
    expect(screen.queryByText('Verifique os campos destacados')).toBeNull();
    expect(screen.getByText('vazios').getAttribute('data-outro')).toBe('1');
  });

  it('fecha a modal ao clicar em Entendi', () => {
    render(<Exemplo />);
    fireEvent.click(screen.getByText('vazios'));
    fireEvent.click(screen.getByText('Entendi'));
    expect(screen.queryByText('O campo Nome é obrigatório.')).toBeNull();
  });
});
