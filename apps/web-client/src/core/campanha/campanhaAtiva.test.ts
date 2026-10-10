import { beforeEach, describe, expect, it } from 'vitest';
import { definirCampanhaAtiva, obterCampanhaAtiva, precisaCampanha } from './campanhaAtiva';

describe('campanhaAtiva', () => {
  beforeEach(() => localStorage.clear());

  it('só as rotas de dados da campanha levam o cabeçalho', () => {
    expect(precisaCampanha('/campanha/municipios?situacao=risco')).toBe(true);
    expect(precisaCampanha('/campanha/atual')).toBe(true);
    expect(precisaCampanha('/campanha/campanhas/minhas')).toBe(false);
    expect(precisaCampanha('/campanha/referencia/PR/malha')).toBe(false);
    expect(precisaCampanha('/campanhaX/teste')).toBe(false);
    expect(precisaCampanha('/escola/alunos')).toBe(false);
  });

  it('guarda a campanha por tenant', () => {
    localStorage.setItem('sysgov_active_tenant_id', '1');
    definirCampanhaAtiva(7);
    expect(obterCampanhaAtiva()).toBe(7);
    localStorage.setItem('sysgov_active_tenant_id', '2');
    expect(obterCampanhaAtiva()).toBeNull();
  });
});
