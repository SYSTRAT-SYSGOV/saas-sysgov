import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ValidationModalHost, tratarErroValidacaoGlobal } from './validationModalHost';

const erro422 = { response: { status: 422, data: { errors: { cpf: ['O CPF informado é inválido.'] } } } };

describe('ValidationModalHost', () => {
  it('sem host montado, não trata o erro (o chamador mantém o tratamento antigo)', () => {
    expect(tratarErroValidacaoGlobal(erro422)).toBe(false);
  });

  it('com host montado, abre a modal com as mensagens do 422', () => {
    render(<ValidationModalHost />);
    let tratado = false;
    act(() => {
      tratado = tratarErroValidacaoGlobal(erro422);
    });
    expect(tratado).toBe(true);
    expect(screen.getByText('O CPF informado é inválido.')).toBeTruthy();
  });

  it('não trata erros que não são 422', () => {
    render(<ValidationModalHost />);
    expect(tratarErroValidacaoGlobal({ response: { status: 500, data: { message: 'x' } } })).toBe(false);
  });
});
