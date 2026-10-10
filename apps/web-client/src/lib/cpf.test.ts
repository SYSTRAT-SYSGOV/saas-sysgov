import { describe, expect, it } from 'vitest';
import { cpfValido, formatarCpf } from './cpf';

describe('cpf', () => {
  it('formata enquanto digita', () => {
    expect(formatarCpf('529')).toBe('529');
    expect(formatarCpf('5299822')).toBe('529.982.2');
    expect(formatarCpf('52998224725')).toBe('529.982.247-25');
    expect(formatarCpf('529.982.247-2599')).toBe('529.982.247-25');
  });

  it('valida os dígitos verificadores', () => {
    expect(cpfValido('529.982.247-25')).toBe(true);
    expect(cpfValido('111.111.111-11')).toBe(false);
    expect(cpfValido('123.456.789-00')).toBe(false);
  });
});
