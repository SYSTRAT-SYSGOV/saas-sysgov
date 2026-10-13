import { describe, expect, it } from 'vitest';
import { diasAte, formatarCnpj, rotuloUnidade, setoresDe, textoValidade, vazioParaNulo } from './formato';
import type { Unidade } from './api';

const unidades: Unidade[] = [
  { id: 1, parent_id: null, nome: 'Prefeitura', sigla: null, tipo: 'prefeitura', path: '1', secretaria: false },
  { id: 2, parent_id: 1, nome: 'Secretaria de Administração', sigla: 'SMAD', tipo: 'secretaria', path: '1.1', secretaria: true },
  { id: 3, parent_id: 2, nome: 'Departamento de Patrimônio', sigla: null, tipo: 'departamento', path: '1.1.1', secretaria: false },
  { id: 4, parent_id: 3, nome: 'Almoxarifado', sigla: null, tipo: 'setor', path: '1.1.1.1', secretaria: false },
  { id: 5, parent_id: 1, nome: 'Secretaria de Educação', sigla: 'SMED', tipo: 'secretaria', path: '1.2', secretaria: true },
  { id: 6, parent_id: 1, nome: 'Outra', sigla: null, tipo: 'setor', path: '1.10', secretaria: false },
];

describe('formato do Inservível', () => {
  it('lista só as unidades abaixo da secretaria, indentadas', () => {
    expect(setoresDe(unidades, 2)).toEqual([
      { value: '3', label: 'Departamento de Patrimônio' },
      { value: '4', label: '— Almoxarifado' },
    ]);
    expect(setoresDe(unidades, 5)).toEqual([]);
    expect(setoresDe(unidades, null)).toEqual([]);
  });

  it('formata unidade, CNPJ e vazio', () => {
    expect(rotuloUnidade({ id: 2, nome: 'Secretaria de Administração', sigla: 'SMAD' }, { id: 3, nome: 'Patrimônio', sigla: null })).toBe('SMAD · Patrimônio');
    expect(rotuloUnidade(null)).toBe('—');
    expect(formatarCnpj('11222333000181')).toBe('11.222.333/0001-81');
    expect(vazioParaNulo('  ')).toBeNull();
  });

  it('calcula a validade dos documentos', () => {
    const hoje = new Date(2026, 9, 6);
    expect(diasAte('2026-10-16', hoje)).toBe(10);
    expect(textoValidade('2026-10-05', hoje)).toBe('venceu há 1 dia');
    expect(textoValidade('2026-10-06', hoje)).toBe('vence hoje');
    expect(textoValidade('2026-10-07', hoje)).toBe('vence em 1 dia');
  });
});
