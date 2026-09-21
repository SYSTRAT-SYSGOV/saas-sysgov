import { describe, it, expect } from 'vitest';
import {
  calcularKpisPmd,
  calcularUrgenciaPrazo,
  calcularDeltaEvolucao,
  obterProgressoAcoes,
  filtrarPmds,
  gerarCsvPmd,
} from '../PmdPanel.utils';
import type { PlanoMelhoriaItem } from '../PmdPanel.utils';

const dataReferenciaFixa = new Date('2026-09-21T12:00:00Z');

const mockPmds: PlanoMelhoriaItem[] = [
  {
    id: 1,
    servidor_id: 101,
    ciclo_id: 1,
    nfc_gatilho: '62.50',
    objetivos: 'Aprimorar pontualidade e assiduidade funcional',
    prazo: '2026-09-10', // Vencido em relação a 2026-09-21
    status: 'em_andamento',
    acoes: [
      { descricao: 'Ajuste de jornada de trabalho', status: 'concluido' },
      { descricao: 'Compensação de banco de horas', status: 'pendente' },
    ],
    servidor: { id: 101, nome_completo: 'Marcos Vinicius Alves', matricula: 'MAT-2001', cargo_efetivo: 'Assistente Administrativo' },
    ciclo: { id: 1, nome: 'Ciclo 2025' },
  },
  {
    id: 2,
    servidor_id: 102,
    ciclo_id: 1,
    nfc_gatilho: '58.00',
    objetivos: 'Capacitação em atendimento ao cidadão e comunicação',
    prazo: '2026-10-05', // Vence em 14 dias (vence em breve)
    status: 'aberto',
    acoes: [
      { descricao: 'Curso de atendimento pelo portal da EGP', status: 'em_andamento' },
    ],
    servidor: { id: 102, nome_completo: 'Juliana Beatriz Lima', matricula: 'MAT-2002', cargo_efetivo: 'Recepcionista' },
    ciclo: { id: 1, nome: 'Ciclo 2025' },
  },
  {
    id: 3,
    servidor_id: 103,
    ciclo_id: 1,
    nfc_gatilho: '65.00',
    objetivos: 'Otimizar entregas de relatórios técnicos mensais',
    prazo: '2026-12-15', // Mais de 30 dias (no prazo regular)
    status: 'concluido',
    acoes: [
      { descricao: 'Padronização de modelos de parecer', status: 'concluido' },
      { descricao: 'Treinamento interno', status: 'concluido' },
    ],
    servidor: { id: 103, nome_completo: 'Fernando Oliveira', matricula: 'MAT-2003', cargo_efetivo: 'Analista de Sistemas' },
    ciclo: { id: 1, nome: 'Ciclo 2025' },
  },
  {
    id: 4,
    servidor_id: 104,
    ciclo_id: 1,
    nfc_gatilho: '60.00',
    objetivos: 'Superar deficiências no fator produtividade',
    prazo: '2026-08-01',
    status: 'verificado',
    observacoes_verificacao: 'Servidor atingiu NFC 78.50 no ciclo subsequente. Superou com mérito.',
    acoes: [
      { descricao: 'Mentoria com chefia imediata', status: 'concluido' },
    ],
    servidor: { id: 104, nome_completo: 'Camila Rodrigues', matricula: 'MAT-2004', cargo_efetivo: 'Técnico em Contabilidade' },
    ciclo: { id: 1, nome: 'Ciclo 2025' },
  },
];

describe('PmdPanel.utils', () => {
  describe('calcularUrgenciaPrazo', () => {
    it('deve identificar prazo vencido', () => {
      const res = calcularUrgenciaPrazo('2026-09-10', 'aberto', dataReferenciaFixa);
      expect(res.tipo).toBe('vencido');
      expect(res.badgeVariant).toBe('destructive');
      expect(res.diasRestantes).toBeLessThan(0);
    });

    it('deve identificar prazo que vence em breve (≤ 30 dias)', () => {
      const res = calcularUrgenciaPrazo('2026-10-05', 'aberto', dataReferenciaFixa);
      expect(res.tipo).toBe('vence_em_breve');
      expect(res.badgeVariant).toBe('warning');
      expect(res.diasRestantes).toBeGreaterThan(0);
      expect(res.diasRestantes).toBeLessThanOrEqual(30);
    });

    it('deve identificar prazo regular (> 30 dias)', () => {
      const res = calcularUrgenciaPrazo('2026-12-01', 'aberto', dataReferenciaFixa);
      expect(res.tipo).toBe('regular');
      expect(res.badgeVariant).toBe('outline');
    });

    it('deve classificar planos já verificados como concluídos independentemente da data', () => {
      const res = calcularUrgenciaPrazo('2026-01-01', 'verificado', dataReferenciaFixa);
      expect(res.tipo).toBe('concluido');
    });
  });

  describe('obterProgressoAcoes', () => {
    it('deve calcular o percentual de ações cumpridas', () => {
      const acoes = [
        { descricao: 'A1', status: 'concluido' },
        { descricao: 'A2', status: 'pendente' },
        { descricao: 'A3', status: 'concluido' },
        { descricao: 'A4', status: 'em_andamento' },
      ];
      const res = obterProgressoAcoes(acoes);
      expect(res.total).toBe(4);
      expect(res.concluidas).toBe(2);
      expect(res.percentual).toBe(50);
      expect(res.texto).toBe('2/4 (50%)');
    });

    it('deve retornar zeros para lista nula ou vazia', () => {
      const res = obterProgressoAcoes(null);
      expect(res.total).toBe(0);
      expect(res.percentual).toBe(0);
      expect(res.texto).toBe('Sem ações');
    });
  });

  describe('calcularDeltaEvolucao', () => {
    it('deve calcular evolução positiva com superação da nota de corte', () => {
      const res = calcularDeltaEvolucao('62.50', '76.00');
      expect(res.delta).toBe(13.50);
      expect(res.deltaTexto).toBe('+13,50 pts');
      expect(res.evoluiu).toBe(true);
      expect(res.superouCorte).toBe(true);
      expect(res.statusSuperacao).toBe('apto');
    });

    it('deve calcular evolução positiva insuficiente (abaixo de 70.00)', () => {
      const res = calcularDeltaEvolucao('58.00', '66.00');
      expect(res.delta).toBe(8.00);
      expect(res.deltaTexto).toBe('+8,00 pts');
      expect(res.evoluiu).toBe(true);
      expect(res.superouCorte).toBe(false);
      expect(res.statusSuperacao).toBe('insuficiente');
    });

    it('deve calcular regressão de nota com sinal negativo', () => {
      const res = calcularDeltaEvolucao('65.00', '60.00');
      expect(res.delta).toBe(-5.00);
      expect(res.deltaTexto).toBe('-5,00 pts');
      expect(res.evoluiu).toBe(false);
      expect(res.superouCorte).toBe(false);
    });
  });

  describe('calcularKpisPmd', () => {
    it('deve apurar os totais de planos e alertas de prazo corretamente', () => {
      const kpis = calcularKpisPmd(mockPmds, dataReferenciaFixa);

      expect(kpis.totalGeral).toBe(4);
      expect(kpis.totalAtivos).toBe(2); // ID 1 (em_andamento) + ID 2 (aberto)
      expect(kpis.totalConcluidosAcoes).toBe(1); // ID 3
      expect(kpis.totalVerificados).toBe(1); // ID 4
      expect(kpis.totalVencidos).toBe(1); // ID 1
      expect(kpis.totalVencendoEmBreve).toBe(1); // ID 2
      expect(kpis.mediaNfcGatilho).toBe('61,38'); // (62.5 + 58 + 65 + 60) / 4 = 245.5 / 4 = 61.375 -> 61.38
    });

    it('deve retornar valores padrão seguros para lista vazia', () => {
      const kpis = calcularKpisPmd([], dataReferenciaFixa);
      expect(kpis.totalGeral).toBe(0);
      expect(kpis.totalAtivos).toBe(0);
      expect(kpis.taxaRecuperacao).toBe('100,0%');
      expect(kpis.mediaNfcGatilho).toBe('0,00');
    });
  });

  describe('filtrarPmds', () => {
    it('deve filtrar por status', () => {
      const res = filtrarPmds(mockPmds, { status: 'aberto' }, dataReferenciaFixa);
      expect(res).toHaveLength(1);
      expect(res[0].id).toBe(2);
    });

    it('deve filtrar por urgência de prazo: vencidos', () => {
      const res = filtrarPmds(mockPmds, { urgencia: 'vencidos' }, dataReferenciaFixa);
      expect(res).toHaveLength(1);
      expect(res[0].id).toBe(1);
    });

    it('deve buscar por nome do servidor', () => {
      const res = filtrarPmds(mockPmds, { busca: 'Camila' }, dataReferenciaFixa);
      expect(res).toHaveLength(1);
      expect(res[0].servidor?.nome_completo).toBe('Camila Rodrigues');
    });

    it('deve buscar por matrícula funcional', () => {
      const res = filtrarPmds(mockPmds, { busca: 'MAT-2002' }, dataReferenciaFixa);
      expect(res).toHaveLength(1);
      expect(res[0].id).toBe(2);
    });

    it('deve buscar por palavra-chave dos objetivos', () => {
      const res = filtrarPmds(mockPmds, { busca: 'pontualidade' }, dataReferenciaFixa);
      expect(res).toHaveLength(1);
      expect(res[0].id).toBe(1);
    });
  });

  describe('gerarCsvPmd', () => {
    it('deve gerar string CSV com UTF-8 BOM e dados dos servidores', () => {
      const csv = gerarCsvPmd(mockPmds);

      expect(csv.startsWith('\uFEFF')).toBe(true);
      expect(csv).toContain('"ID";"Servidor";"Matricula";"Cargo";"Ciclo de Origem";"NFC Gatilho";"Objetivos do Plano";"Prazo Limite";"Status";"Progresso Acoes";"Parecer de Verificacao";"Data de Conclusao"');
      expect(csv).toContain('"Marcos Vinicius Alves"');
      expect(csv).toContain('"MAT-2001"');
      expect(csv).toContain('"62.50"');
      expect(csv).toContain('"1/2 (50%)"');
    });
  });
});
