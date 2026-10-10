import { beforeEach, describe, expect, it } from 'vitest';
import { definirEscolaAtiva, obterEscolaAtiva, precisaEscola } from './escolaAtiva';

describe('escolaAtiva', () => {
  beforeEach(() => localStorage.clear());

  it('identifica as rotas dos módulos de educação', () => {
    expect(precisaEscola('/escola/alunos')).toBe(true);
    expect(precisaEscola('/pedagogico/notas?turma_id=1')).toBe(true);
    expect(precisaEscola('/formatura/configuracao')).toBe(true);
    expect(precisaEscola('/passeio/passeios')).toBe(true);
    expect(precisaEscola('/portfolio/turmas')).toBe(true);
    expect(precisaEscola('/cursos/cursos')).toBe(false);
    expect(precisaEscola('/escolaridade')).toBe(false);
    expect(precisaEscola('/escola/escolas/minhas')).toBe(false);
    expect(precisaEscola(undefined)).toBe(false);
  });

  it('guarda a escola por tenant', () => {
    localStorage.setItem('sysgov_active_tenant_id', '1');
    definirEscolaAtiva(7);
    expect(obterEscolaAtiva()).toBe(7);

    localStorage.setItem('sysgov_active_tenant_id', '2');
    expect(obterEscolaAtiva()).toBeNull();

    localStorage.setItem('sysgov_active_tenant_id', '1');
    definirEscolaAtiva(null);
    expect(obterEscolaAtiva()).toBeNull();
  });
});
