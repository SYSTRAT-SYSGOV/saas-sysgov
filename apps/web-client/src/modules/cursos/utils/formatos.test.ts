import { describe, expect, it } from 'vitest';
import { formatarCargaHoraria, formatarData, formatarPercentual } from './formatos';
import { destinoPosLogin } from '@/pages/LoginPage';

describe('formatos do módulo Cursos', () => {
  it('formata carga horária como no certificado', () => {
    expect(formatarCargaHoraria(60)).toBe('1 hora');
    expect(formatarCargaHoraria(480)).toBe('8 horas');
    expect(formatarCargaHoraria(510)).toBe('8h30');
    expect(formatarCargaHoraria(45)).toBe('45 minutos');
  });

  it('formata data sem deslocar o dia por fuso', () => {
    expect(formatarData('2026-10-01')).toBe('01/10/2026');
    expect(formatarData('2026-10-01T00:00:00.000000Z')).toBe('01/10/2026');
  });

  it('formata percentual', () => {
    expect(formatarPercentual(75)).toBe('75%');
    expect(formatarPercentual('66.67')).toBe('66,7%');
    expect(formatarPercentual(null)).toBe('—');
  });
});

describe('destinoPosLogin (retorno ao check-in depois do login)', () => {
  it('aceita caminho relativo do app', () => {
    expect(destinoPosLogin('/cursos/check-in?t=abc')).toBe('/cursos/check-in?t=abc');
  });

  it('recusa redirecionamento para outro site', () => {
    expect(destinoPosLogin('https://malicioso.example')).toBe('/');
    expect(destinoPosLogin('//malicioso.example')).toBe('/');
    expect(destinoPosLogin('/\\malicioso.example')).toBe('/');
    expect(destinoPosLogin(null)).toBe('/');
  });
});
