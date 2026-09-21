import { describe, it, expect } from 'vitest';
import {
  calcularKpisHierarquia,
  validarIntegridadeHierarquia,
  simularCadeiaAvaliacao,
  type NivelHierarquiaItem,
} from '../HierarquiaConfigPanel.simulador';

describe('HierarquiaConfigPanel.simulador - Lógica Pura da Cadeia Avaliativa', () => {
  const mockNiveis: NivelHierarquiaItem[] = [
    {
      id: 1,
      nivel: 0,
      nome: 'Setor / Divisão',
      cargo_referencia: 'Chefe de Setor',
      regra_substituicao: 'superior_hierarquico',
      is_topo: false,
      ativo: true,
    },
    {
      id: 2,
      nivel: 1,
      nome: 'Departamento',
      cargo_referencia: 'Diretor de Departamento',
      regra_substituicao: 'substituto_legal',
      is_topo: false,
      ativo: true,
    },
    {
      id: 3,
      nivel: 2,
      nome: 'Secretaria Municipal',
      cargo_referencia: 'Secretário Municipal',
      regra_substituicao: 'superior_hierarquico',
      is_topo: true,
      avaliador_topo_role: 'controladoria',
      ativo: true,
    },
  ];

  describe('Consolidação de KPIs Executivos (calcularKpisHierarquia)', () => {
    it('consolida métricas de uma cadeia hierárquica íntegra', () => {
      const kpis = calcularKpisHierarquia(mockNiveis);

      expect(kpis.totalNiveis).toBe(3);
      expect(kpis.niveisAtivos).toBe(3);
      expect(kpis.temNivelTopo).toBe(true);
      expect(kpis.nivelTopoNome).toBe('Secretaria Municipal');
      expect(kpis.nivelTopoNumero).toBe(2);
      expect(kpis.totalSuperiorHierarquico).toBe(2);
      expect(kpis.totalSubstitutoLegal).toBe(1);
      expect(kpis.prevalenciaSubstituicao).toBe('mista');
      expect(kpis.statusIntegridade).toBe('conforme');
      expect(kpis.mensagemIntegridade).toContain('Cadeia de comando homologada');
    });

    it('identifica estado crítico quando não há nível topo definido', () => {
      const semTopo = mockNiveis.map((n) => ({ ...n, is_topo: false }));
      const kpis = calcularKpisHierarquia(semTopo);

      expect(kpis.temNivelTopo).toBe(false);
      expect(kpis.statusIntegridade).toBe('critico');
      expect(kpis.mensagemIntegridade).toBe('Nível topo da hierarquia não definido');
    });

    it('identifica alerta quando múltiplos níveis estão marcados como topo', () => {
      const multiplosTopos = mockNiveis.map((n) => ({ ...n, is_topo: true }));
      const kpis = calcularKpisHierarquia(multiplosTopos);

      expect(kpis.statusIntegridade).toBe('alerta');
      expect(kpis.mensagemIntegridade).toBe('Múltiplos níveis marcados como topo');
    });

    it('retorna status crítico para lista vazia de níveis', () => {
      const kpis = calcularKpisHierarquia([]);

      expect(kpis.totalNiveis).toBe(0);
      expect(kpis.statusIntegridade).toBe('critico');
    });
  });

  describe('Validação de Integridade Estrutural (validarIntegridadeHierarquia)', () => {
    it('valida hierarquia sequencial sem erros ou avisos graves', () => {
      const integridade = validarIntegridadeHierarquia(mockNiveis);

      expect(integridade.valida).toBe(true);
      expect(integridade.problemas).toHaveLength(0);
      expect(integridade.avisos).toHaveLength(0);
      expect(integridade.niveisOrdenados).toHaveLength(3);
      expect(integridade.niveisOrdenados[0].nivel).toBe(0);
      expect(integridade.niveisOrdenados[2].nivel).toBe(2);
    });

    it('detecta problema quando não há topo', () => {
      const semTopo = mockNiveis.map((n) => ({ ...n, is_topo: false }));
      const integridade = validarIntegridadeHierarquia(semTopo);

      expect(integridade.valida).toBe(false);
      expect(integridade.problemas[0]).toContain('não possui nenhum nível configurado como Topo');
    });

    it('detecta duplicidade de número de nível', () => {
      const duplicado: NivelHierarquiaItem[] = [
        ...mockNiveis,
        {
          id: 4,
          nivel: 1, // Mesmo nível de Departamento
          nome: 'Gerência Setorial',
          regra_substituicao: 'superior_hierarquico',
          is_topo: false,
          ativo: true,
        },
      ];

      const integridade = validarIntegridadeHierarquia(duplicado);
      expect(integridade.valida).toBe(false);
      expect(integridade.problemas).toContain('Existe duplicidade no índice de nível numérico: Nível 1.');
    });

    it('emite aviso quando há lacuna numérica na sequência', () => {
      const comLacuna: NivelHierarquiaItem[] = [
        mockNiveis[0], // Nível 0
        mockNiveis[2], // Nível 2 (pulou o 1)
      ];

      const integridade = validarIntegridadeHierarquia(comLacuna);
      expect(integridade.valida).toBe(true); // Não é bloqueante, mas gera aviso
      expect(integridade.avisos[0]).toContain('Existe uma lacuna na sequência numérica');
    });
  });

  describe('Simulação de Cadeia Avaliativa (simularCadeiaAvaliacao)', () => {
    it('resolve diretamente para a chefia imediata titular em fluxo normal', () => {
      const resultado = simularCadeiaAvaliacao(mockNiveis, {
        nivelBaseId: 1, // Nível 0: Setor
        chefiaImediataAfastada: false,
      });

      expect(resultado.regraSubstituicaoAcionada).toBe(false);
      expect(resultado.avaliadorDesignado).toBe('Chefe de Setor (Titular)');
      expect(resultado.passos).toHaveLength(1);
      expect(resultado.passos[0].status).toBe('ativo');
    });

    it('aplica ascensão hierárquica (superior_hierarquico) quando chefia imediata está afastada', () => {
      const resultado = simularCadeiaAvaliacao(mockNiveis, {
        nivelBaseId: 1, // Nível 0 tem regra 'superior_hierarquico'
        chefiaImediataAfastada: true,
        motivoAfastamento: 'Férias Regulamentares (30 dias)',
      });

      expect(resultado.regraSubstituicaoAcionada).toBe(true);
      expect(resultado.passos).toHaveLength(2);

      // Passo 1: Chefe afastado
      expect(resultado.passos[0].status).toBe('afastado');
      expect(resultado.passos[0].justificativa).toContain('Férias Regulamentares');

      // Passo 2: Diretor de Departamento assume
      expect(resultado.passos[1].papel).toBe('superior_hierarquico');
      expect(resultado.passos[1].nomeAvaliadorSimulado).toBe('Diretor de Departamento (Escalão Superior)');
      expect(resultado.avaliadorDesignado).toBe('Diretor de Departamento (Superior Imediato)');
    });

    it('aplica substituição legal formal no mesmo nível funcional', () => {
      const resultado = simularCadeiaAvaliacao(mockNiveis, {
        nivelBaseId: 2, // Nível 1 tem regra 'substituto_legal'
        chefiaImediataAfastada: true,
        motivoAfastamento: 'Licença Médica',
      });

      expect(resultado.regraSubstituicaoAcionada).toBe(true);
      expect(resultado.passos).toHaveLength(2);

      expect(resultado.passos[0].status).toBe('afastado');
      expect(resultado.passos[1].papel).toBe('substituto_legal');
      expect(resultado.passos[1].nomeAvaliadorSimulado).toContain('Substituto Formalmente Designado');
      expect(resultado.avaliadorDesignado).toContain('Substituto Legal (Departamento)');
    });

    it('avoca competência ao topo do órgão se o escalão máximo estiver afastado', () => {
      const resultado = simularCadeiaAvaliacao(mockNiveis, {
        nivelBaseId: 3, // Nível 2 (Secretaria - Topo)
        chefiaImediataAfastada: true,
      });

      expect(resultado.regraSubstituicaoAcionada).toBe(true);
      expect(resultado.avaliadorDesignado).toContain('CONTROLADORIA');
      expect(resultado.passos[resultado.passos.length - 1].papel).toBe('topo_orgao');
    });
  });
});
