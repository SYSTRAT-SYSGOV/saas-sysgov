import { describe, expect, it } from 'vitest';
import { AxiosError } from 'axios';
import { ESTADOS, erroApi, formatarCentavos, formatarData, paraCentavos } from './api';

describe('formatarCentavos', () => {
  it('formata centavos inteiros em reais (sem float)', () => {
    expect(formatarCentavos(104500)).toBe('R$ 1.045,00');
    expect(formatarCentavos(50)).toBe('R$ 0,50');
    expect(formatarCentavos(-350)).toBe('-R$ 3,50');
  });
});

describe('paraCentavos', () => {
  it('converte texto em pt-BR ou en-US para centavos', () => {
    expect(paraCentavos('1.234,56')).toBe(123456);
    expect(paraCentavos('1234.56')).toBe(123456);
    expect(paraCentavos('R$ 100,00')).toBe(10000);
  });

  it('rejeita mais de duas casas decimais ou texto inválido', () => {
    expect(paraCentavos('1,234')).toBeNull();
    expect(paraCentavos('abc')).toBeNull();
  });
});

describe('formatarData', () => {
  it('converte ISO/YYYY-MM-DD para DD/MM/AAAA', () => {
    expect(formatarData('2026-09-22')).toBe('22/09/2026');
    expect(formatarData('2026-09-22T10:00:00Z')).toBe('22/09/2026');
  });

  it('devolve travessão para valor vazio', () => {
    expect(formatarData(null)).toBe('—');
    expect(formatarData(undefined)).toBe('—');
  });
});

describe('ESTADOS', () => {
  it('cobre todos os estados de jazigo com cor e chip', () => {
    expect(Object.keys(ESTADOS)).toEqual(['disponivel', 'concedido', 'ocupado', 'capacidade_maxima', 'manutencao']);
  });
});

describe('erroApi', () => {
  it('normaliza erro 409 com mensagem padrão quando a API não envia message', () => {
    const erro = new AxiosError('conflito', undefined, undefined, undefined, {
      status: 409, data: {}, statusText: '', headers: {}, config: {} as never,
    });
    expect(erroApi(erro)).toMatchObject({ status: 409, mensagem: 'O registro foi alterado por outra pessoa. Recarregue e tente novamente.' });
  });

  it('preserva code e errors de validação 422', () => {
    const erro = new AxiosError('validação', undefined, undefined, undefined, {
      status: 422, data: { message: 'Dados inválidos', code: 'vistoria.transicao_invalida', errors: { plot_id: ['obrigatório'] } },
      statusText: '', headers: {}, config: {} as never,
    });
    expect(erroApi(erro)).toEqual({
      status: 422, mensagem: 'Dados inválidos', codigo: 'vistoria.transicao_invalida', campos: { plot_id: ['obrigatório'] }, extra: {},
    });
  });

  it('trata falha de rede sem resposta', () => {
    expect(erroApi(new Error('network'))).toEqual({ status: 0, mensagem: 'Falha de comunicação com o servidor.' });
  });
});
